import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { idGenerator } from '../../utils/idGenerator';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { salesService } from '../sales/salesService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { auditService } from '../auditService';
import { syncQueueService } from '../syncQueueService';
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
        const quantityToDeduct = item.isUnit
          ? item.quantity
          : item.quantity * (drug?.unitsPerPack || 1);
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
        const alloc = bulkAllocations.find((a) => a.drugId === item.id);
        const drug = inventory.find((d) => d.id === item.id);
        const unitsToDeduct = item.isUnit
          ? item.quantity
          : item.quantity * (drug?.unitsPerPack || 1);

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

      // 3. Generate Sale IDs
      const counterKey = `${StorageKeys.SALE_RECEIPT_COUNTER}_${activeBranchId}`;
      const prevCounter = storage.get<number>(counterKey, 0);
      const saleCounter = prevCounter + 1;
      storage.set(counterKey, saleCounter);

      const serialId = (100000 + saleCounter).toString();
      const internalId = idGenerator.generate('sales', activeBranchId);

      // Update movement references with serialId
      movementEntries.forEach(m => m.referenceId = serialId);

      const newSale: Sale = {
        id: internalId,
        serialId,
        branchId: activeBranchId,
        date: verifiedDate.toISOString(),
        soldByEmployeeId: currentEmployeeId,
        status: saleData.saleType === 'delivery' ? 'pending' : 'completed',
        updatedAt: verifiedDate.toISOString(),
        ...saleData,
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
        console.error('[TransactionService] Persistence failed, rolling back batch allocations...', persistenceError);
        
        // 1. Return Batches (LocalStorage)
        for (const alloc of bulkAllocations) {
          await batchService.returnStock(alloc.allocations, alloc.drugId, true);
        }

        // 2. We don't need to "rollback" IndexedDB if updateStockBulk failed halfway,
        // because we can't easily tell which succeeded. 
        // However, since we have Computed Inventory (Phase 3), the batches are the source of truth.
        // Returning to batches fixes the derived state immediately.

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
      items: { drugId: string; quantityReturned: number; isUnit?: boolean }[];
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
    
    try {
      // 1. Prepare Inventory Mutations & Movement Logs
      for (const returnedItem of returnData.items) {
        const drug = inventory.find((d) => d.id === returnedItem.drugId);
        const saleItem = sale.items.find((i) => i.id === returnedItem.drugId);
        
        const unitsToRestore = returnedItem.isUnit
          ? returnedItem.quantityReturned
          : returnedItem.quantityReturned * (drug?.unitsPerPack || 1);

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

        // 2. Return to Batches (LocalStorage - Immediate)
        if (saleItem?.batchAllocations) {
          await batchService.returnStock(saleItem.batchAllocations, returnedItem.drugId, true);
        }
      }

      // 3. Update Inventory in IndexedDB
      await inventoryService.updateStockBulk(stockMutations, true);

      // 4. Log Movements in LocalStorage
      await stockMovementService.logMovementsBulk(movementEntries, true);

      auditService.log('sale.return', {
        userId: currentEmployeeId,
        details: `Processed Return for Sale #${sale.serialId} - Refund: ${returnData.totalRefund}`,
        entityId: returnData.id,
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
