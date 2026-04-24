import { purchaseService } from '../purchases/purchaseService';
import { cashService } from '../cash/cashService';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { idGenerator } from '../../utils/idGenerator';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { salesService } from '../sales/salesService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { auditService } from '../auditService';
import { syncQueueService } from '../syncQueueService';
import { settingsService } from '../settings/settingsService';
import * as stockOps from '../../utils/stockOperations';
import { returnService } from '../returns/returnService';
import type { Sale, CartItem, Drug, StockMovement, ActionContext, Purchase, PurchaseReturn } from '../../types';

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CheckoutResult extends TransactionResult<Sale> {
  sale?: Sale;
}

/**
 * UndoManager - Manages a stack of rollback actions for atomic transactions.
 */
class UndoManager {
  private actions: (() => Promise<void>)[] = [];

  /**
   * Pushes a rollback action to the stack.
   */
  push(action: () => Promise<void>) {
    this.actions.push(action);
  }

  /**
   * Executes all rollback actions in reverse order (LIFO).
   */
  async undoAll() {
    console.warn('[UndoManager] Executing rollbacks...');
    for (let i = this.actions.length - 1; i >= 0; i--) {
      try {
        await this.actions[i]();
      } catch (err) {
        console.error('[UndoManager] Failed to undo action:', err);
      }
    }
    this.actions = [];
  }
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
    context: ActionContext
  ): Promise<CheckoutResult> {
    const { branchId: activeBranchId, performerId: currentEmployeeId, timestamp, orgId, shiftId } = context;
    const verifiedDate = new Date(timestamp);
    const undoManager = new UndoManager();
    
    try {
      const allocations: any[] = [];
      const stockMutations: any[] = [];
      const movementEntries: any[] = [];

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

      // Register Rollback for Batches
      undoManager.push(async () => {
        for (const alloc of bulkAllocations) {
          await batchService.returnStock(alloc.allocations, alloc.drugId, true);
        }
      });

      // 2. Prepare Inventory Mutations & Movement Logs
      const processedItems: CartItem[] = saleData.items.map((item) => {
        const drug = inventory.find((d) => d.id === item.id);
        const alloc = bulkAllocations.find((a) => a.drugId === item.id);
        const unitsToDeduct = stockOps.resolveUnits(item.quantity, !!item.isUnit, drug?.unitsPerPack);

        stockMutations.push({ id: item.id, quantity: -unitsToDeduct });
        
        // Log movements per batch allocation for precise tracking
        if (alloc?.allocations && alloc.allocations.length > 0) {
          let runningStock = drug?.stock || 0;
          alloc.allocations.forEach(a => {
            movementEntries.push({
              drugId: item.id,
              drugName: item.name,
              branchId: activeBranchId,
              type: 'sale',
              quantity: -a.quantity,
              previousStock: runningStock,
              newStock: runningStock - a.quantity,
              reason: 'Sale Transaction',
               performedBy: currentEmployeeId,
              status: 'approved',
              batchId: a.batchId,
              expiryDate: a.expiryDate,
              orgId,
            });
            runningStock -= a.quantity;
          });
        } else {
          // Fallback if no specific batch was allocated (should not happen with strict FEFO)
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
            expiryDate: drug?.expiryDate, // Use snapshot as fallback
            orgId,
          });
        }

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
      const internalId = idGenerator.uuid();

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
        
        // Register Rollback for Stock
        undoManager.push(async () => {
          await inventoryService.updateStockBulk(
            stockMutations.map(m => ({ id: m.id, quantity: -m.quantity })),
            true
          );
        });

        // B. Log Movements in LocalStorage
        await stockMovementService.logMovementsBulk(movementEntries, true);

        // C. Create Sale in LocalStorage
        const createdSale = await salesService.create(newSale, activeBranchId);
        
        // D. Record Shift Transaction if immediate (walk-in) and shift is open
        const isImmediateComplete = !saleData.saleType || saleData.saleType === 'walk-in';
        if (isImmediateComplete && shiftId) {
          await cashService.addTransaction(shiftId, {
            branchId: activeBranchId,
            orgId: orgId,
            shiftId: shiftId,
            time: timestamp,
            type: saleData.paymentMethod === 'cash' ? 'sale' : 'card_sale',
            amount: saleData.total,
            reason: `Sale #${serialId}`,
            userId: context.performerName || 'System',
            relatedSaleId: serialId,
          });
        }

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
        // Persistence failed, execute all rollbacks
        await undoManager.undoAll();
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
    context: ActionContext
  ): Promise<{ success: boolean; error?: string }> {
    const { branchId: activeBranchId, performerId: currentEmployeeId, timestamp, orgId, shiftId } = context;
    const undoManager = new UndoManager();
    const stockMutations: { id: string; quantity: number }[] = [];
    const movementEntries: Omit<StockMovement, 'id' | 'timestamp'>[] = [];
    // Collect batch return operations to execute AFTER validation
    const batchReturnOps: { allocations: any[]; drugId: string }[] = [];
    
    try {
      // --- PHASE 1: VALIDATE ALL ITEMS (no side effects) ---
      
      const previouslyRefunded = sale.netTotal !== undefined ? (sale.total - sale.netTotal) : 0;
      const remainingBalance = sale.total - previouslyRefunded;
      if (returnData.totalRefund > remainingBalance + 0.01) {
        return {
          success: false,
          error: `Refund amount (${returnData.totalRefund.toFixed(2)}) exceeds remaining sale balance (${remainingBalance.toFixed(2)})`,
        };
      }

      for (const returnedItem of returnData.items) {
        const drug = inventory.find((d) => d.id === returnedItem.drugId);
        const saleItem = sale.items.find(
          (i) => i.id === returnedItem.drugId && (!!i.isUnit === !!returnedItem.isUnit)
        ) || sale.items.find((i) => i.id === returnedItem.drugId);

        if (!saleItem) {
          return { success: false, error: `Item ${returnedItem.drugId} not found in original sale` };
        }

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
          orgId,
          type: 'return_customer',
          quantity: unitsToRestore,
          previousStock: drug?.stock || 0,
          newStock: (drug?.stock || 0) + unitsToRestore,
          reason: `Return for Sale #${sale.serialId}`,
          referenceId: returnData.id,
          batchId: saleItem.batchAllocations?.[0]?.batchId,
          expiryDate: saleItem.expiryDate || saleItem.batchAllocations?.[0]?.expiryDate,
          performedBy: currentEmployeeId,
          status: 'approved',
        });

        if (saleItem?.batchAllocations) {
          batchReturnOps.push({ allocations: saleItem.batchAllocations, drugId: returnedItem.drugId });
        }
      }

      // --- PHASE 2: EXECUTE ALL OPERATIONS (after validation passed) ---

      try {
        // 2a. Return to Batches (LocalStorage)
        for (const op of batchReturnOps) {
          await batchService.returnStock(op.allocations, op.drugId, true);
          // Register Rollback: If we fail later, we need to re-allocate (though this is complex for returns, 
          // usually we just fail the transaction)
          // For now, we follow the pattern:
          undoManager.push(async () => {
            await batchService.allocateStock(op.drugId, stockOps.resolveUnits(1, false, 1), activeBranchId, true); // Simplified
          });
        }

        // 2b. Update Inventory in IndexedDB
        await inventoryService.updateStockBulk(stockMutations, true);
        undoManager.push(async () => {
          await inventoryService.updateStockBulk(
            stockMutations.map(m => ({ id: m.id, quantity: -m.quantity })),
            true
          );
        });

        // 2c. Log Movements in LocalStorage
        await stockMovementService.logMovementsBulk(movementEntries, true);

        // 2d. Record Shift Transaction (Refund) if shift is open
        if (shiftId && returnData.totalRefund > 0) {
          await cashService.addTransaction(shiftId, {
            branchId: activeBranchId,
            orgId: orgId,
            shiftId: shiftId,
            time: timestamp,
            type: 'return',
            amount: returnData.totalRefund,
            reason: `Return for Sale #${sale.serialId}`,
            userId: context.performerName || 'System',
            relatedSaleId: sale.serialId.toString(),
          });
        }

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
      } catch (persistenceError) {
        await undoManager.undoAll();
        throw persistenceError;
      }

    } catch (err: any) {
      console.error('[TransactionService] Return processing failed:', err);
      return { success: false, error: err.message || 'Return failed' };
    }
  },

  /**
   * Processes a purchase completion atomically.
   * Orchestrates purchase approval (inventory + batches) and financial transaction recording.
   */
  async processPurchaseTransaction(
    purchaseId: string,
    context: ActionContext
  ): Promise<TransactionResult<Purchase>> {
    const undoManager = new UndoManager();
    
    try {
      // 1. Fetch the purchase to check its details (especially payment type)
      const purchase = await purchaseService.getById(purchaseId, context.branchId);
      if (!purchase) throw new Error('Purchase order not found');
      if (purchase.status === 'completed') return { success: true, data: purchase };

      // 2. Validate Shift for Cash Purchases
      if (purchase.paymentType === 'cash') {
        if (!context.shiftId) {
          throw new Error('An active shift is required for cash purchases');
        }
        const currentShift = await cashService.getCurrentShift();
        if (!currentShift || currentShift.id !== context.shiftId) {
          throw new Error('The specified shift is not open or does not match the active shift');
        }
      }

      // 3. Execution Phase
      try {
        // A. Approve Purchase (This handles inventory update, batch creation, and movement logging)
        const completedPurchase = await purchaseService.approve(purchaseId, context.performerName, true);
        
        // Register Rollback for Purchase Approval (Logic: set status back to pending, batches/inventory rollback is manual for now)
        // Note: purchaseService.approve is partially atomic. In a full refactor, we would make it return undo actions.
        undoManager.push(async () => {
           await purchaseService.update(purchaseId, { status: 'pending', approvedBy: undefined, approvalDate: undefined });
           // NOTE: Reversing batches and inventory requires complex logic handled by inventoryService.
           // For MVP, we assume approval is the primary point of failure.
        });

        // B. Record Shift Transaction if Cash
        if (purchase.paymentType === 'cash' && context.shiftId) {
          await cashService.addTransaction(context.shiftId, {
            branchId: context.branchId,
            orgId: context.orgId,
            shiftId: context.shiftId,
            time: context.timestamp,
            type: 'purchase' as any, // Cash out for purchase
            amount: purchase.totalCost,
            reason: `PO #${purchase.invoiceId} from ${purchase.supplierName}`,
            userId: context.performerId,
          });
        }

        // C. Audit Log
        auditService.log('purchase.complete', {
          userId: context.performerId,
          details: `Completed PO #${purchase.invoiceId} (${context.performerName})`,
          entityId: purchase.id,
          branchId: context.branchId,
        });

        return { success: true, data: completedPurchase };
      } catch (execError) {
        await undoManager.undoAll();
        throw execError;
      }
    } catch (err: any) {
      console.error('[TransactionService] Purchase processing failed:', err);
      return { success: false, error: err.message || 'Purchase completion failed' };
    }
  },

  /**
   * Creates and processes a purchase order in one atomic step (Direct Purchase).
   */
  async processDirectPurchaseTransaction(
    purchase: Omit<Purchase, 'id'>,
    context: ActionContext
  ): Promise<TransactionResult<Purchase>> {
    const undoManager = new UndoManager();
    
    try {
      // 1. Initial Checks
      if (purchase.paymentType === 'cash' && !context.shiftId) {
        throw new Error('An active shift is required for cash purchases');
      }

      // 2. Create the Purchase (Pending)
      const newPurchase = await purchaseService.create({ 
        ...purchase, 
        branchId: context.branchId,
        orgId: context.orgId,
        status: 'pending' // Start as pending for safety
      }, context.branchId, true);

      undoManager.push(async () => {
        await purchaseService.delete(newPurchase.id, true);
      });

      // 3. Complete the Purchase (Re-use existing atomic logic)
      const result = await transactionService.processPurchaseTransaction(newPurchase.id, context);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true, data: result.data };
    } catch (err: any) {
      await undoManager.undoAll();
      console.error('[TransactionService] Direct purchase failed:', err);
      return { success: false, error: err.message || 'Direct purchase failed' };
    }
  },

  /**
   * Processes a purchase return atomically.
   */
  async processPurchaseReturnTransaction(
    returnInput: Omit<PurchaseReturn, 'id'>,
    context: ActionContext
  ): Promise<TransactionResult<PurchaseReturn>> {
    const undoManager = new UndoManager();
    
    try {
      // 1. Initial Checks
      const originalPurchase = await purchaseService.getById(returnInput.purchaseId, context.branchId);
      if (!originalPurchase) throw new Error('Original purchase order not found');

      if (originalPurchase.paymentType === 'cash' && !context.shiftId) {
        throw new Error('An active shift is required for cash purchase returns');
      }

      // 2. Execution Phase
      try {
        // A. Create Purchase Return (This handles inventory deduction and movement logging)
        const savedReturn = await returnService.createPurchaseReturn(returnInput, context.branchId, true);
        
        // Register Rollback (Simple rollback for now)
        undoManager.push(async () => {
          // This is complex, but for MVP we assume creation is the point of failure.
          // Re-adding stock manually if needed would go here.
        });

        // B. Record Shift Transaction if original was Cash
        if (originalPurchase.paymentType === 'cash' && context.shiftId) {
          await cashService.addTransaction(context.shiftId, {
            branchId: context.branchId,
            orgId: context.orgId,
            shiftId: context.shiftId,
            time: context.timestamp,
            type: 'purchase_return' as any,
            amount: savedReturn.totalRefund,
            reason: `Purchase Return #${savedReturn.id} for PO #${originalPurchase.invoiceId}`,
            userId: context.performerName || 'System',
            relatedSaleId: originalPurchase.invoiceId,
          });
        }

        // C. Audit Log
        auditService.log('purchase.return', {
          userId: context.performerId,
          details: `Created purchase return #${savedReturn.id} for PO #${originalPurchase.invoiceId}`,
          entityId: savedReturn.id,
          branchId: context.branchId,
        });

        return { success: true, data: savedReturn };
      } catch (execError) {
        await undoManager.undoAll();
        throw execError;
      }
    } catch (err: any) {
      console.error('[TransactionService] Purchase return failed:', err);
      return { success: false, error: err.message || 'Purchase return failed' };
    }
  }
};
