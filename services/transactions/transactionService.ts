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
import { money } from '../../utils/money';
import { returnService } from '../returns/returnService';
import { settingsService } from '../settings/settingsService';
import * as stockOps from '../../utils/stockOperations';
import { supabase } from '../../lib/supabase';
import type { Sale, CartItem, Drug, StockMovement, ActionContext, Purchase, PurchaseReturn, Return } from '../../types';

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
          // Support explicit batch selection if available, else default to the item id (which may be the batch itself in the current UI)
          preferredBatchId: item.preferredBatchId || item.id
        };
      });

      const bulkAllocations = await batchService.allocateStockBulk(allocationRequests, activeBranchId, verifiedDate);

      // Register Rollback for Batches
      undoManager.push(async () => {
        for (const alloc of bulkAllocations) {
          const totalToRestore = alloc.allocations.reduce((sum, a) => sum + a.quantity, 0);
          await batchService.returnStock(alloc.allocations, totalToRestore, alloc.drugId, activeBranchId);
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
      const internalId = idGenerator.uuid();
      
      // Calculate Daily Order Number atomically in DB to prevent race conditions
      const { data: dailyOrderNumber, error: dailyNumError } = await supabase.rpc('get_next_daily_order_number', {
        p_branch_id: activeBranchId
      });
      
      if (dailyNumError) {
        console.warn('[TransactionService] Failed to get atomic daily number, falling back to 1', dailyNumError);
      }
      // Generate the Global Serial ID (e.g. PF-0042)
      const serialId = await idGenerator.generate('sales', activeBranchId, branchCode);
      movementEntries.forEach(m => m.referenceId = internalId);

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

      // 4. Persistence Phase — run independent writes in parallel
      // Register stock undo before parallel execution
      undoManager.push(async () => {
        await inventoryService.updateStockBulk(
          stockMutations.map(m => ({ id: m.id, quantity: -m.quantity }))
        );
      });

      // A+B+C: Stock update, movement log, and sale creation write to different tables
      const [, , createdSale] = await Promise.all([
        inventoryService.updateStockBulk(stockMutations, true),   // A. Update Stock
        stockMovementService.logMovementsBulk(movementEntries),    // B. Log Movements
        salesService.create(newSale, activeBranchId),              // C. Create Sale
      ]);

      // D. Shift Transaction + Audit — fire-and-forget (non-critical, shouldn't block checkout)
      const isImmediateComplete = !saleData.saleType || saleData.saleType === 'walk-in';
      if (isImmediateComplete && shiftId) {
        cashService.addTransaction(shiftId, {
          branchId: activeBranchId,
          orgId: orgId,
          shiftId: shiftId,
          time: timestamp,
          type: saleData.paymentMethod === 'cash' ? 'sale' : 'card_sale',
          amount: saleData.total,
          reason: `Sale #${serialId}`,
          userId: context.performerId || 'System',
          relatedSaleId: internalId,
        }).catch(err => console.warn('[TransactionService] Shift transaction failed (non-blocking):', err));
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
    returnData: Return,
    inventory: Drug[],
    sale: Sale,
    context: ActionContext
  ): Promise<{ success: boolean; error?: string }> {
    const { branchId: activeBranchId, performerId: currentEmployeeId, timestamp, orgId, shiftId } = context;
    const undoManager = new UndoManager();
    const stockMutations: { id: string; quantity: number }[] = [];
    const movementEntries: any[] = [];
    const batchReturnOps: { allocations: any[]; quantityToReturn: number; drugId: string }[] = [];
    
    try {
      // Validation using high-precision money engine
      // BUG-012: Handle null netTotal from database (defaults to total if null)
      const currentNetTotal = (sale.netTotal !== undefined && sale.netTotal !== null) ? sale.netTotal : sale.total;
      const previouslyRefunded = money.subtract(sale.total, currentNetTotal);
      const remainingBalance = currentNetTotal; // Simplified: remaining is what's left after previous refunds
      
      if (!money.isGte(remainingBalance, returnData.totalRefund)) {
        return {
          success: false,
          error: `Refund amount (${returnData.totalRefund}) exceeds remaining balance (${remainingBalance})`,
        };
      }

      const updatedReturnedQuantities = { ...(sale.itemReturnedQuantities || {}) };

      for (const returnedItem of returnData.items) {
        const drug = inventory.find(d => d.id === returnedItem.drugId);
        // Find the specific sale item using saleItemId
        const saleItem = sale.items.find((i) => i.id === returnedItem.saleItemId);

        if (!saleItem) continue;
        
        // Update the tracked returned quantities for this specific line item
        const lineKey = returnedItem.isUnit ? `${saleItem.id}_unit` : `${saleItem.id}_pack`;
        const currentReturned = updatedReturnedQuantities[lineKey] || 0;
        updatedReturnedQuantities[lineKey] = currentReturned + returnedItem.quantityReturned;

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
          batchReturnOps.push({ 
            allocations: saleItem.batchAllocations, 
            quantityToReturn: unitsToRestore, // Fix: Pass actual units returned, not full allocation
            drugId: returnedItem.drugId 
          });
        }
      }

      // Execution
      // Phase 1: Parallel Batch & Movement Prep
      // BUG-FIX: Parallelize returnStock calls and movement logging
      const verifiedReturnDate = new Date(timestamp);
      await Promise.all(batchReturnOps.map(op => 
        batchService.returnStock(op.allocations, op.quantityToReturn, op.drugId, activeBranchId, verifiedReturnDate)
      ));

      // Phase 2: Parallel Independent Writes (Movements, Return Record, Items, Cash, Sale Update)
      // Note: We remove inventoryService.updateStockBulk because the trg_sync_stock DB trigger 
      // automatically updates drug stock when movements are logged.
      const persistOps = [
        stockMovementService.logMovementsBulk(movementEntries),
        (supabase as any).from('returns').insert({
          id: returnData.id,
          serial_id: returnData.serialId,
          branch_id: activeBranchId,
          org_id: orgId,
          sale_id: returnData.saleId,
          date: returnData.date,
          return_type: returnData.returnType,
          total_refund: returnData.totalRefund,
          reason: returnData.reason,
          notes: returnData.notes,
          processed_by: currentEmployeeId,
        }),
        (supabase as any).from('return_items').insert(
          returnData.items.map(item => ({
            branch_id: activeBranchId,
            return_id: returnData.id,
            drug_id: item.drugId,
            name: item.name,
            quantity_returned: item.quantityReturned,
            is_unit: item.isUnit,
            public_price: item.publicPrice,
            refund_amount: item.refundAmount,
            reason: item.reason || returnData.reason,
            condition: item.condition,
            dosage_form: item.dosageForm,
          }))
        ),
        salesService.update(sale.id, { 
          netTotal: money.subtract(currentNetTotal, returnData.totalRefund),
          itemReturnedQuantities: updatedReturnedQuantities 
        }, true) // true = skipFetch for speed
      ];

      // Add cash transaction if needed
      if (shiftId && returnData.totalRefund > 0) {
        persistOps.push(cashService.addTransaction(shiftId, {
          branchId: activeBranchId,
          orgId: orgId,
          shiftId: shiftId,
          time: timestamp,
          type: 'return',
          amount: returnData.totalRefund,
          reason: `Return for Sale #${sale.serialId}`,
          userId: context.performerId || 'System',
          relatedSaleId: sale.id,
        }));
      }

      const results = await Promise.all(persistOps);
      
      // Check for errors in Supabase inserts
      const errors = results.filter((r: any) => r?.error).map((r: any) => r.error);
      if (errors.length > 0) {
        throw errors[0];
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
