import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { idGenerator } from '../../utils/idGenerator';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { salesService } from '../sales/salesService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { auditService } from '../auditService';
import { syncQueueService } from '../syncQueueService';
import * as stockOps from '../../utils/stockOperations';
import type { Sale, CartItem, Drug, StockMovement } from '../../types';

export interface CheckoutResult {
  success: boolean;
  sale?: Sale;
  error?: string;
}

export const transactionService = {
  /**
   * Processes a complete sale transaction atomically across all services.
   * Includes batch allocation, inventory deduction, movement logging, and sale creation.
   */
  async processCheckout(
    saleData: {
      items: CartItem[];
      customerName: string;
      customerCode?: string;
      paymentMethod: 'cash' | 'visa';
      saleType?: 'walk-in' | 'delivery';
      total: number;
      subtotal: number;
      globalDiscount: number;
    },
    inventory: Drug[],
    activeBranchId: string,
    currentEmployeeId: string,
    verifiedDate: Date = new Date()
  ): Promise<CheckoutResult> {
    const allocations: { drugId: string; allocations: any[] }[] = [];
    const stockMutations: { id: string; quantity: number }[] = [];
    const movementEntries: Omit<StockMovement, 'id' | 'timestamp'>[] = [];
    
    try {
      // 1. Allocate Batches (LocalStorage - Atomic in its own loop)
      const allocationRequests = saleData.items.map((item) => {
        const drug = inventory.find((d) => d.id === item.id);
        const quantityToDeduct = stockOps.resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack || drug?.unitsPerPack);
        return {
          drugId: item.id,
          quantity: quantityToDeduct,
          name: item.name,
        };
      });

      const bulkAllocations = await batchService.allocateStockBulk(allocationRequests, activeBranchId, true);
      allocations.push(...bulkAllocations);

      // 2. Prepare Inventory Mutations & Movement Logs
      const processedItems: CartItem[] = saleData.items.map((item) => {
        const drug = inventory.find((d) => d.id === item.id);
        const alloc = bulkAllocations.find((a) => a.drugId === item.id);
        const unitsToDeduct = stockOps.resolveUnits(item.quantity, !!item.isUnit, drug?.unitsPerPack);

        stockMutations.push({ id: item.id, quantity: -unitsToDeduct });
        
        movementEntries.push({
          drugId: item.id,
          drugName: item.name,
          branchId: activeBranchId,
          type: 'sale',
          quantity: -unitsToDeduct,
          previousStock: drug?.stock || 0,
          newStock: (drug?.stock || 0) - unitsToDeduct,
          reason: 'Sale Transaction',
          performedBy: currentEmployeeId,
          status: 'approved',
        });

        return {
          ...item,
          batchAllocations: alloc?.allocations || [],
        };
      });

      // 3. Generate Sale IDs (Atomic increment to minimize race window)
      const counterKey = `${StorageKeys.SALE_RECEIPT_COUNTER}_${activeBranchId}`;
      const saleCounter = storage.increment(counterKey, 0);

      // Generate Daily Order Number (Atomic increment)
      const todayString = verifiedDate.toISOString().split('T')[0];
      const dailyCounterKey = `${StorageKeys.DAILY_ORDER_COUNTER}_${activeBranchId}_${todayString}`;
      const dailyOrderNumber = storage.increment(dailyCounterKey, 0);

      const serialId = (100000 + saleCounter).toString();
      const internalId = idGenerator.generate('sales', activeBranchId);

      // Update movement references with serialId
      movementEntries.forEach(m => m.referenceId = serialId);

      const newSale: Sale = {
        ...saleData,
        id: internalId,
        serialId,
        branchId: activeBranchId,
        date: verifiedDate.toISOString(),
        soldByEmployeeId: currentEmployeeId,
        status: saleData.saleType === 'delivery' ? 'pending' : 'completed',
        updatedAt: verifiedDate.toISOString(),
        dailyOrderNumber,
        items: processedItems,
      } as Sale;

      // 4. Persistence Phase
      try {
        // A. Update Stock in IndexedDB
        await inventoryService.updateStockBulk(stockMutations, true);

        // B. Log Movements in LocalStorage
        await stockMovementService.logMovementsBulk(movementEntries, true);

        // C. Create Sale in LocalStorage
        const createdSale = await salesService.create(newSale, activeBranchId);
        
        auditService.log('sale.complete', {
          userId: currentEmployeeId,
          details: `Completed Sale #${serialId} - Total: ${saleData.total}`,
          entityId: serialId,
          branchId: activeBranchId,
        });

        // ENQUEUE ATOMIC SYNC ACTION
        await syncQueueService.enqueue('SALE_TRANSACTION', {
          sale: createdSale,
          movements: movementEntries,
          batchAllocations: allocations,
        });

        return { success: true, sale: createdSale };
      } catch (persistenceError) {
        // --- CRITICAL ROLLBACK ---
        console.error('[TransactionService] Persistence failed, rolling back...', persistenceError);
        
        // 1. Return Batches (LocalStorage)
        for (const alloc of bulkAllocations) {
          await batchService.returnStock(alloc.allocations, alloc.drugId, true);
        }

        // 2. Rollback IndexedDB stock mutations (reverse the deductions)
        try {
          await inventoryService.updateStockBulk(
            stockMutations.map(m => ({ id: m.id, quantity: -m.quantity })),
            true
          );
        } catch (rollbackError) {
          console.error('[TransactionService] IndexedDB rollback also failed:', rollbackError);
        }

        throw persistenceError;
      }

    } catch (err: any) {
      console.error('[TransactionService] Fatal error:', err);
      return { success: false, error: err.message || 'Transaction failed' };
    }
  },

  /**
   * Processes a customer return atomically.
   * Handles stock restoration in IndexedDB, batch returns in LocalStorage,
   * movement logging, and sale record updating.
   */
  async processReturn(
    returnData: {
      id: string;
      saleId: string;
      items: { drugId: string; quantityReturned: number; isUnit?: boolean; refundAmount?: number }[];
      totalRefund: number;
      date: string;
    },
    inventory: Drug[],
    sale: Sale,
    activeBranchId: string,
    currentEmployeeId: string
  ): Promise<{ success: boolean; error?: string }> {
    const stockMutations: { id: string; quantity: number }[] = [];
    const movementEntries: Omit<StockMovement, 'id' | 'timestamp'>[] = [];
    // Collect batch return operations to execute AFTER validation
    const batchReturnOps: { allocations: any[]; drugId: string }[] = [];
    
    try {
      // --- PHASE 1: VALIDATE ALL ITEMS (no side effects) ---
      
      // BUG-R4: Validate cumulative refund doesn't exceed remaining sale balance
      const previouslyRefunded = sale.netTotal !== undefined ? (sale.total - sale.netTotal) : 0;
      const remainingBalance = sale.total - previouslyRefunded;
      if (returnData.totalRefund > remainingBalance + 0.01) { // +0.01 for floating point tolerance
        return {
          success: false,
          error: `Refund amount (${returnData.totalRefund.toFixed(2)}) exceeds remaining sale balance (${remainingBalance.toFixed(2)})`,
        };
      }

      for (const returnedItem of returnData.items) {
        const drug = inventory.find((d) => d.id === returnedItem.drugId);
        // BUG-R2: Match BOTH drugId AND isUnit to find the correct sale line item
        const saleItem = sale.items.find(
          (i) => i.id === returnedItem.drugId && (!!i.isUnit === !!returnedItem.isUnit)
        ) || sale.items.find((i) => i.id === returnedItem.drugId); // Fallback to any match

        if (!saleItem) {
          return { success: false, error: `Item ${returnedItem.drugId} not found in original sale` };
        }

        // BUG-006: Validate return quantity doesn't exceed what's returnable
        // Use a composite key that considers isUnit for accurate tracking
        const returnKey = returnedItem.isUnit ? `${returnedItem.drugId}_unit` : returnedItem.drugId;
        const alreadyReturned = sale.itemReturnedQuantities?.[returnKey] 
          || sale.itemReturnedQuantities?.[returnedItem.drugId] || 0;
        const maxReturnable = saleItem.quantity - alreadyReturned;
        if (returnedItem.quantityReturned > maxReturnable) {
          return {
            success: false,
            error: `Cannot return ${returnedItem.quantityReturned} of ${drug?.name || returnedItem.drugId}. Max returnable: ${maxReturnable}`,
          };
        }
        
        const unitsToRestore = stockOps.resolveUnits(returnedItem.quantityReturned, !!returnedItem.isUnit, drug?.unitsPerPack);

        stockMutations.push({ id: returnedItem.drugId, quantity: unitsToRestore });

        movementEntries.push({
          drugId: returnedItem.drugId,
          drugName: drug?.name || 'Unknown Drug',
          branchId: activeBranchId,
          type: 'return_customer',
          quantity: unitsToRestore,
          previousStock: drug?.stock || 0,
          newStock: (drug?.stock || 0) + unitsToRestore,
          reason: `Return for Sale #${sale.serialId}`,
          referenceId: returnData.id,
          performedBy: currentEmployeeId,
          status: 'approved',
        });

        // BUG-R1: Collect batch operations, don't execute yet
        if (saleItem?.batchAllocations) {
          batchReturnOps.push({ allocations: saleItem.batchAllocations, drugId: returnedItem.drugId });
        }
      }

      // --- PHASE 2: EXECUTE ALL OPERATIONS (after validation passed) ---

      // 2a. Return to Batches (LocalStorage)
      for (const op of batchReturnOps) {
        await batchService.returnStock(op.allocations, op.drugId, true);
      }

      // 2b. Update Inventory in IndexedDB
      await inventoryService.updateStockBulk(stockMutations, true);

      // 2c. Log Movements in LocalStorage
      await stockMovementService.logMovementsBulk(movementEntries, true);

      auditService.log('sale.return', {
        userId: currentEmployeeId,
        details: `Processed Return for Sale #${sale.serialId} - Refund: ${returnData.totalRefund}`,
        entityId: returnData.id,
        branchId: activeBranchId,
      });

      // ENQUEUE ATOMIC SYNC ACTION
      await syncQueueService.enqueue('RETURN_TRANSACTION', {
        return: returnData,
        movements: movementEntries,
        saleId: sale.id,
      });

      return { success: true };

    } catch (err: any) {
      console.error('[TransactionService] Return processing failed:', err);
      return { success: false, error: err.message || 'Return failed' };
    }
  }
};
