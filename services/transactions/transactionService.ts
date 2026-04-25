/**
 * Transaction Service - Orchestrates atomic operations across services
 * Online-Only implementation
 */

import { purchaseService } from '../purchases/purchaseService';
import { cashService } from '../cash/cashService';
import { idGenerator } from '../../utils/idGenerator';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { salesService } from '../sales/salesService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { auditService } from '../auditService';
import { returnService } from '../returns/returnService';
import { settingsService } from '../settings/settingsService';
import * as stockOps from '../../utils/stockOperations';
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

  push(action: () => Promise<void>) {
    this.actions.push(action);
  }

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
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode || 'PF';
    try {
      const stockMutations: { id: string; quantity: number }[] = [];
      const movementEntries: any[] = [];

      // 1. Allocate Batches
      const allocationRequests = saleData.items.map((item) => {
        const drug = inventory.find((d) => d.id === item.id);
        const quantityToDeduct = stockOps.resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack || drug?.unitsPerPack);
        return {
          drugId: item.id,
          quantity: quantityToDeduct,
          name: item.name,
        };
      });

      const bulkAllocations = await batchService.allocateStockBulk(allocationRequests, activeBranchId);

      // Register Rollback for Batches
      undoManager.push(async () => {
        for (const alloc of bulkAllocations) {
          await batchService.returnStock(alloc.allocations, alloc.drugId, activeBranchId);
        }
      });

      // 2. Prepare Inventory Mutations & Movement Logs
      const processedItems: CartItem[] = saleData.items.map((item) => {
        const drug = inventory.find((d) => d.id === item.id);
        const alloc = bulkAllocations.find((a) => a.drugId === item.id);
        const unitsToDeduct = stockOps.resolveUnits(item.quantity, !!item.isUnit, drug?.unitsPerPack);

        stockMutations.push({ id: item.id, quantity: -unitsToDeduct });
        
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
        }

        return {
          ...item,
          batchAllocations: alloc?.allocations || [],
        };
      });

      // 3. Generate IDs
      // Online-Only Strategy: Use atomic DB sequences via idGenerator
      const serialId = await idGenerator.generate('sales', activeBranchId, branchCode);
      const dailyOrderNumberStr = await idGenerator.generateSync('generic', activeBranchId); // Using generic for daily order fallback
      const dailyOrderNumber = parseInt(dailyOrderNumberStr.split('-')[1], 10);
      const internalId = idGenerator.uuid();

      movementEntries.forEach(m => m.referenceId = internalId); // Link to internal ID

      const newSale: Sale = {
        ...saleData,
        id: internalId,
        serialId,
        branchId: activeBranchId,
        orgId,
        date: verifiedDate.toISOString(),
        soldByEmployeeId: currentEmployeeId,
        status: saleData.saleType === 'delivery' ? 'pending' : 'completed',
        updatedAt: verifiedDate.toISOString(),
        dailyOrderNumber,
        items: processedItems,
      } as Sale;

      // 4. Persistence Phase
      // A. Update Stock
      await inventoryService.updateStockBulk(stockMutations, true);
      
      undoManager.push(async () => {
        await inventoryService.updateStockBulk(
          stockMutations.map(m => ({ id: m.id, quantity: -m.quantity }))
        );
      });

      // B. Log Movements
      await stockMovementService.logMovementsBulk(movementEntries);

      // C. Create Sale
      const createdSale = await salesService.create(newSale, activeBranchId);
      
      // D. Record Shift Transaction
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
          userId: context.performerId || 'System',
          relatedSaleId: internalId,
        });
      }

      auditService.log('sale.complete', {
        userId: currentEmployeeId,
        details: `Completed Sale #${serialId} - Total: ${saleData.total}`,
        entityId: internalId,
        branchId: activeBranchId,
      });

      return { success: true, sale: createdSale };

    } catch (err: any) {
      console.error('[TransactionService] Fatal error:', err);
      await undoManager.undoAll();
      return { success: false, error: err.message || 'Transaction failed' };
    }
  },

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
    const movementEntries: any[] = [];
    const batchReturnOps: { allocations: any[]; drugId: string }[] = [];
    
    try {
      // Validation
      const previouslyRefunded = sale.netTotal !== undefined ? (sale.total - sale.netTotal) : 0;
      const remainingBalance = sale.total - previouslyRefunded;
      if (returnData.totalRefund > remainingBalance + 0.01) {
        return {
          success: false,
          error: `Refund amount exceeds remaining balance`,
        };
      }

      for (const returnedItem of returnData.items) {
        const drug = inventory.find((d) => d.id === returnedItem.drugId);
        const saleItem = sale.items.find((i) => i.id === returnedItem.drugId);

        if (!saleItem) continue;
        
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

      // Execution
      for (const op of batchReturnOps) {
        await batchService.returnStock(op.allocations, op.drugId, activeBranchId);
      }

      await inventoryService.updateStockBulk(stockMutations, true);
      await stockMovementService.logMovementsBulk(movementEntries);

      if (shiftId && returnData.totalRefund > 0) {
        await cashService.addTransaction(shiftId, {
          branchId: activeBranchId,
          orgId: orgId,
          shiftId: shiftId,
          time: timestamp,
          type: 'return',
          amount: returnData.totalRefund,
          reason: `Return for Sale #${sale.serialId}`,
          userId: context.performerId || 'System',
          relatedSaleId: sale.id,
        });
      }

      auditService.log('sale.return', {
        userId: currentEmployeeId,
        details: `Processed Return for Sale #${sale.serialId} - Refund: ${returnData.totalRefund}`,
        entityId: returnData.id,
        branchId: activeBranchId,
      });

      return { success: true };

    } catch (err: any) {
      console.error('[TransactionService] Return processing failed:', err);
      return { success: false, error: err.message || 'Return failed' };
    }
  },

  async processPurchaseTransaction(
    purchaseId: string,
    context: ActionContext
  ): Promise<TransactionResult<Purchase>> {
    try {
      const purchase = await purchaseService.getById(purchaseId);
      if (!purchase) throw new Error('Purchase order not found');
      if (purchase.status === 'completed') return { success: true, data: purchase };

      // Approve Purchase
      const completedPurchase = await purchaseService.approve(purchaseId, context.performerName);
      
      // Record Shift Transaction if Cash
      if (purchase.paymentMethod === 'cash' && context.shiftId) {
        await cashService.addTransaction(context.shiftId, {
          branchId: context.branchId,
          orgId: context.orgId,
          shiftId: context.shiftId,
          time: context.timestamp,
          type: 'purchase',
          amount: purchase.totalCost,
          relatedSaleId: purchase.id,
          reason: `PO #${purchase.invoiceId || purchase.id} from ${purchase.supplierName}`,
          userId: context.performerId,
        });
      }

      auditService.log('purchase.complete', {
        userId: context.performerId,
        details: `Completed PO #${purchase.invoiceId || purchase.id} (${context.performerName})`,
        entityId: purchase.id,
        branchId: context.branchId,
      });

      return { success: true, data: completedPurchase };
    } catch (err: any) {
      console.error('[TransactionService] Purchase processing failed:', err);
      return { success: false, error: err.message || 'Purchase completion failed' };
    }
  },

  async processDirectPurchaseTransaction(
    purchase: Omit<Purchase, 'id'>,
    context: ActionContext
  ): Promise<TransactionResult<Purchase>> {
    try {
      const newPurchase = await purchaseService.create({ 
        ...purchase, 
        branchId: context.branchId,
        orgId: context.orgId,
        status: 'pending'
      }, context.branchId);

      const result = await transactionService.processPurchaseTransaction(newPurchase.id, context);
      if (!result.success) throw new Error(result.error);

      // For direct purchases, we immediately mark as received to update inventory
      const receivedPurchase = await purchaseService.markAsReceived(newPurchase.id, context.performerName);
      
      return { success: true, data: receivedPurchase };
    } catch (err: any) {
      console.error('[TransactionService] Direct purchase failed:', err);
      return { success: false, error: err.message || 'Direct purchase failed' };
    }
  },

  async processPurchaseReturnTransaction(
    returnInput: Omit<PurchaseReturn, 'id'>,
    context: ActionContext
  ): Promise<TransactionResult<PurchaseReturn>> {
    try {
      const originalPurchase = await purchaseService.getById(returnInput.purchaseId);
      if (!originalPurchase) throw new Error('Original purchase order not found');

      const savedReturn = await returnService.createPurchaseReturn(returnInput, context.branchId);
      
      if (originalPurchase.paymentMethod === 'cash' && context.shiftId) {
        await cashService.addTransaction(context.shiftId, {
          branchId: context.branchId,
          orgId: context.orgId,
          shiftId: context.shiftId,
          time: context.timestamp,
          type: 'purchase_return',
          amount: savedReturn.totalRefund,
          reason: `Purchase Return #${savedReturn.id} for PO #${originalPurchase.invoiceId || originalPurchase.id}`,
          userId: context.performerId || 'System',
          relatedSaleId: originalPurchase.id,
        });
      }

      auditService.log('purchase.return', {
        userId: context.performerId,
        details: `Created purchase return #${savedReturn.id} for PO #${originalPurchase.invoiceId || originalPurchase.id}`,
        entityId: savedReturn.id,
        branchId: context.branchId,
      });

      return { success: true, data: savedReturn };
    } catch (err: any) {
      console.error('[TransactionService] Purchase return failed:', err);
      return { success: false, error: err.message || 'Purchase return failed' };
    }
  }
};
