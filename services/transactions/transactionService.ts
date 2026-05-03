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
import { salesRepository } from '../sales/repositories/salesRepository';
import { stockMovementRepository } from '../inventory/repositories/stockMovementRepository';
import { returnsRepository } from '../returns/repositories/returnsRepository';
import { cashRepository } from '../cash/repositories/cashRepository';
import { batchRepository } from '../inventory/repositories/batchRepository';

import type { Sale, CartItem, Drug, StockMovement, ActionContext, Purchase, PurchaseReturn, Return } from '../../types';

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CheckoutResult extends TransactionResult<Sale> {
  sale?: Sale;
}

import { UndoManager } from './undoManager';

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
        const drug = inventory.find((d) => d.id === item.id || d.batches?.some(b => b.id === item.id));
        const actualDrugId = (item as any).dbId || drug?.id || item.id;
        const quantityToDeduct = stockOps.resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack || drug?.unitsPerPack);
        
        return {
          drugId: actualDrugId,
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
        // Resolve the true actualDrugId to match with global inventory (templates)
        const itemAsDb = (item as any).dbId;
        const actualDrugId = itemAsDb || item.id;
        
        // Find the parent group drug reliably
        const drug = inventory.find((d) => d.id === actualDrugId || d.batches?.some(b => b.id === actualDrugId || b.id === item.id));
        
        const alloc = bulkAllocations.find((a) => a.drugId === actualDrugId);
        const unitsToDeduct = stockOps.resolveUnits(item.quantity, !!item.isUnit, drug?.unitsPerPack || item.unitsPerPack);

        stockMutations.push({ id: actualDrugId, quantity: -unitsToDeduct });
        
        if (alloc?.allocations && alloc.allocations.length > 0) {
          // Reliable running stock calculation
          let runningStock = drug?.stock !== undefined ? drug.stock : (item.stock || 0);
          
          alloc.allocations.forEach(a => {
            movementEntries.push({
              drugId: actualDrugId,
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
      
      const dailyOrderNumber = await salesRepository.getNextDailyOrderNumber(activeBranchId);

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

      // 4. Persistence Phase — run critical writes sequentially with full undo coverage
      
      // A. Update Stock
      await inventoryService.updateStockBulk(stockMutations, true);
      undoManager.push(async () => {
        await inventoryService.updateStockBulk(
          stockMutations.map(m => ({ id: m.id, quantity: -m.quantity })),
          true
        );
      });

      // B. Log Movements
      const createdMovements = await stockMovementService.logMovementsBulk(movementEntries);
      undoManager.push(async () => {
        const movementIds = createdMovements.map(m => m.id);
        await stockMovementRepository.deleteByIds(movementIds);
      });

      // C. Create Sale
      const createdSale = await salesService.create(newSale, activeBranchId);
      undoManager.push(async () => {
        await salesRepository.delete(createdSale.id);
        // If there were any other tables linked (like sale_items), we'd delete them here too.
        // Currently, salesService.create handles everything via the JSONB 'items' column in 'sales'.
      });

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

  /**
   * Orchestrates the cancellation of a sale, ensuring stock is returned
   * and shift balance is corrected atomically.
   */
  async processCancellation(
    sale: Sale,
    inventory: Drug[],
    context: ActionContext
  ): Promise<{ success: boolean; error?: string }> {
    const { branchId: activeBranchId, performerId: currentEmployeeId, performerName, shiftId } = context;
    const undoManager = new UndoManager();

    try {
      // 1. Validations
      if (sale.status === 'cancelled') {
        throw new Error('Sale is already cancelled.');
      }

      if (sale.status === 'completed' && sale.saleType === 'delivery') {
        throw new Error('Cannot cancel a completed delivery order. Please use the Return flow instead.');
      }

      if (sale.saleType === 'walk-in' || sale.status === 'completed') {
        if (!shiftId) {
          throw new Error('An active shift must be open to cancel a completed sale and issue a refund.');
        }
      }

      // 2. Return stock for each item
      const stockUpdates: { id: string; quantity: number }[] = [];

      for (const item of sale.items) {
        const drug = inventory.find((d) => d.id === item.id);
        if (!drug) continue;

        const allocations = item.batchAllocations || [];
        
        // Return stock to batches
        await stockOps.returnStock(
          drug,
          item.quantity,
          !!item.isUnit,
          allocations,
          'correction',
          `Cancellation of Sale #${sale.serialId || sale.id}`,
          {
            branchId: activeBranchId,
            performedBy: currentEmployeeId,
            performedByName: performerName,
          },
          sale.id
        );

        // Track for bulk inventory update and undo
        const unitsToRestore = stockOps.resolveUnits(item.quantity, !!item.isUnit, drug.unitsPerPack);
        stockUpdates.push({ id: item.id, quantity: unitsToRestore });

        // Undo for batch return (re-allocate)
        undoManager.push(async () => {
          // Note: re-allocating specifically to the same batches if possible
          // This is a complex undo, but for cancellation, it's mostly about reversing the numbers.
          await inventoryService.updateStock(item.id, -unitsToRestore);
          if (allocations.length > 0) {
            await batchService.allocateStockBulk([{
              drugId: item.id,
              quantity: unitsToRestore,
              preferredBatchId: allocations[0]?.batchId
            }], activeBranchId);
          }
        });
      }

      // 3. Bulk update inventory quantities
      if (stockUpdates.length > 0) {
        await inventoryService.updateStockBulk(stockUpdates, true); // true = increment
      }

      // 4. Shift Balancing
      if (shiftId && (sale.saleType === 'walk-in' || sale.status === 'completed')) {
        const type = sale.paymentMethod === 'visa' ? 'card_return' : 'return';
        const txId = idGenerator.generateSync('transactions', activeBranchId);
        
        await cashService.addTransaction(shiftId, {
          branchId: activeBranchId,
          shiftId: shiftId,
          time: new Date().toISOString(),
          type: type,
          amount: sale.total,
          reason: `Cancellation of Sale #${sale.serialId || sale.id}`,
          userId: performerName || 'System',
          relatedSaleId: sale.id
        });

        undoManager.push(async () => {
          // We don't have a direct 'delete transaction' but we could add a reversal
          // For now, most shift transactions are additive. 
          // In a real rollback, we'd want to remove the tx record if possible.
          await cashRepository.deleteTransaction(txId);
        });
      }

      // 5. Update Sale Status
      await salesService.update(sale.id, { 
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });

      // 6. Log Audit
      auditService.log('sale.cancel', {
        userId: currentEmployeeId,
        details: `Cancelled Sale #${sale.serialId || sale.id}`,
        entityId: sale.id,
        branchId: activeBranchId,
      });

      return { success: true };

    } catch (err: any) {
      console.error('[TransactionService] Cancellation failed:', err);
      await undoManager.undoAll();
      return { success: false, error: err.message || 'Cancellation failed' };
    }
  },

  /**
   * Orchestrates the modification of a delivery order.
   * Handles stock deduction/return based on changes and records history.
   */
  async processOrderModification(
    sale: Sale,
    updates: Partial<Sale>,
    inventory: Drug[],
    context: ActionContext
  ): Promise<{ success: boolean; error?: string; modificationHistory?: any[] }> {
    const { branchId: activeBranchId, performerId: currentEmployeeId, performerName, timestamp } = context;
    const undoManager = new UndoManager();
    const modifications: any[] = [];
    
    if (!updates.items) return { success: true };

    try {
      // Logic from useEntityHandlers adapted for TransactionService
      for (const oldItem of sale.items) {
        const newItem = updates.items.find(
          (i) => i.id === oldItem.id && i.isUnit === oldItem.isUnit
        );

        const drug = inventory.find(d => d.id === oldItem.id);
        if (!drug) continue;

        if (!newItem) {
          // 1. Item was deleted - return all stock
          await stockOps.returnStock(
            drug,
            oldItem.quantity,
            !!oldItem.isUnit,
            oldItem.batchAllocations,
            'correction',
            `Item Removed from Delivery #${sale.id}`,
            { branchId: activeBranchId, performedBy: currentEmployeeId, performedByName: performerName },
            sale.id
          );

          const unitsToRestore = stockOps.resolveUnits(oldItem.quantity, !!oldItem.isUnit, drug.unitsPerPack);
          await inventoryService.updateStock(oldItem.id, unitsToRestore);

          undoManager.push(async () => {
            await inventoryService.updateStock(oldItem.id, -unitsToRestore);
            if (oldItem.batchAllocations) {
              await batchService.allocateStockBulk([{
                drugId: oldItem.id,
                quantity: unitsToRestore,
                preferredBatchId: oldItem.batchAllocations[0]?.batchId
              }], activeBranchId);
            }
          });

          modifications.push({
            type: 'item_removed',
            itemId: oldItem.id,
            itemName: oldItem.name,
            dosageForm: oldItem.dosageForm,
            previousQuantity: oldItem.quantity,
            newQuantity: 0,
            stockReturned: unitsToRestore,
          });
        } else {
          // 2. Check for quantity changes
          if (newItem.quantity !== oldItem.quantity) {
            const oldUnits = oldItem.isUnit ? oldItem.quantity : oldItem.quantity * (drug.unitsPerPack || 1);
            const newUnits = newItem.isUnit ? newItem.quantity : newItem.quantity * (drug.unitsPerPack || 1);
            const diff = oldUnits - newUnits;

            if (diff > 0) {
              // Quantity reduced - return partial stock
              await stockOps.returnStock(
                drug, diff, true, oldItem.batchAllocations, 'correction',
                `Quantity Reduced in Delivery #${sale.id}`,
                { branchId: activeBranchId, performedBy: currentEmployeeId, performedByName: performerName },
                sale.id
              );
              await inventoryService.updateStock(oldItem.id, diff);
              undoManager.push(async () => {
                await inventoryService.updateStock(oldItem.id, -diff);
                // Partial re-allocation is complex, but batchService handles it
                await batchService.allocateStockBulk([{
                  drugId: oldItem.id,
                  quantity: diff,
                  preferredBatchId: oldItem.batchAllocations![0].batchId
                }], activeBranchId);
              });

              modifications.push({
                type: 'quantity_update',
                itemId: oldItem.id,
                itemName: oldItem.name,
                dosageForm: oldItem.dosageForm,
                previousQuantity: oldItem.quantity,
                newQuantity: newItem.quantity,
                stockReturned: diff,
              });
            } else if (diff < 0) {
              // Quantity increased - allocate more
              const unitsToAdd = Math.abs(diff);
              const mutation = await stockOps.deductStock(
                drug, unitsToAdd, true, 'sale',
                `Quantity Increased in Delivery #${sale.id}`,
                { branchId: activeBranchId, performedBy: currentEmployeeId, performedByName: performerName },
                sale.id
              );

              if (mutation) {
                newItem.batchAllocations = [...(oldItem.batchAllocations || []), ...(mutation.allocations || [])];
                await inventoryService.updateStock(oldItem.id, -unitsToAdd);
                undoManager.push(async () => {
                   await inventoryService.updateStock(oldItem.id, unitsToAdd);
                   for (const alloc of mutation.allocations) {
                     await batchService.returnStock([alloc], alloc.quantity, oldItem.id, activeBranchId);
                   }
                });

                modifications.push({
                  type: 'quantity_update',
                  itemId: oldItem.id,
                  itemName: oldItem.name,
                  dosageForm: oldItem.dosageForm,
                  previousQuantity: oldItem.quantity,
                  newQuantity: newItem.quantity,
                  stockDeducted: unitsToAdd,
                });
              }
            }
          }
        }
      }

      // 3. Handle NEW items
      for (const newItem of updates.items) {
        const isNew = !sale.items.some(old => old.id === newItem.id && old.isUnit === newItem.isUnit);
        if (isNew) {
          const drug = inventory.find(d => d.id === newItem.id);
          if (drug) {
            const mutation = await stockOps.deductStock(
              drug, newItem.quantity, !!newItem.isUnit, 'sale',
              `Item Added to Delivery #${sale.id}`,
              { branchId: activeBranchId, performedBy: currentEmployeeId, performedByName: performerName },
              sale.id
            );

            if (mutation) {
              newItem.batchAllocations = mutation.allocations;
              await inventoryService.updateStock(newItem.id, -mutation.unitsChanged);
              undoManager.push(async () => {
                 await inventoryService.updateStock(newItem.id, mutation.unitsChanged);
                 for (const alloc of mutation.allocations) {
                   await batchService.returnStock([alloc], alloc.quantity, newItem.id, activeBranchId);
                 }
              });

              modifications.push({
                type: 'item_added',
                itemId: newItem.id,
                itemName: newItem.name,
                dosageForm: newItem.dosageForm,
                previousQuantity: 0,
                newQuantity: newItem.quantity,
                stockDeducted: mutation.unitsChanged,
              });
            }
          }
        }
      }

      // 4. Build history
      let modificationHistory = sale.modificationHistory || [];
      if (modifications.length > 0) {
        const historyRecord = {
          id: idGenerator.generateSync('generic', activeBranchId),
          timestamp: timestamp || new Date().toISOString(),
          modifiedBy: performerName || 'System',
          modifications,
        };
        modificationHistory = [...modificationHistory, historyRecord];
      }

      return { success: true, modificationHistory };

    } catch (err: any) {
      console.error('[TransactionService] Modification failed:', err);
      await undoManager.undoAll();
      return { success: false, error: err.message || 'Modification failed' };
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
      const currentNetTotal = (sale.netTotal !== undefined && sale.netTotal !== null) ? sale.netTotal : sale.total;
      const remainingBalance = currentNetTotal; 
      
      if (!money.isGte(remainingBalance, returnData.totalRefund)) {
        return {
          success: false,
          error: `Refund amount (${returnData.totalRefund}) exceeds remaining balance (${remainingBalance})`,
        };
      }

      const updatedReturnedQuantities = { ...(sale.itemReturnedQuantities || {}) };

      for (const returnedItem of returnData.items) {
        const drug = inventory.find(d => d.id === returnedItem.drugId);
        const saleItem = sale.items.find((i) => i.id === returnedItem.saleItemId);

        if (!saleItem) continue;
        
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
            quantityToReturn: unitsToRestore,
            drugId: returnedItem.drugId 
          });
        }
      }

      // Execution Phase with Undo Support
      const verifiedReturnDate = new Date(timestamp);

      // 1. Restore Batches (Sequential or with individual rollback)
      for (const op of batchReturnOps) {
        await batchService.returnStock(op.allocations, op.quantityToReturn, op.drugId, activeBranchId, verifiedReturnDate);
        undoManager.push(async () => {
          // Rollback: Re-deduct from these specific batches
          // This is a simplified rollback but better than nothing
          await batchService.allocateStockBulk([{
            drugId: op.drugId,
            quantity: op.quantityToReturn,
            name: 'Return Rollback',
            preferredBatchId: op.allocations[0]?.batchId
          }], activeBranchId, verifiedReturnDate);
        });
      }

      // 2. Log Movements
      const createdMovements = await stockMovementService.logMovementsBulk(movementEntries);
      undoManager.push(async () => {
        const movementIds = createdMovements.map(m => m.id);
        await stockMovementRepository.deleteByIds(movementIds);
      });

      await returnsRepository.insertReturn(returnData, currentEmployeeId);
      undoManager.push(async () => {
        await returnsRepository.deleteReturn(returnData.id);
      });

      await returnsRepository.insertReturnItems(
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
      );
      undoManager.push(async () => {
        await returnsRepository.deleteReturnItems(returnData.id);
      });

      // 5. Update Original Sale
      await salesService.update(sale.id, { 
        netTotal: money.subtract(currentNetTotal, returnData.totalRefund),
        itemReturnedQuantities: updatedReturnedQuantities 
      }, true);
      undoManager.push(async () => {
        await salesService.update(sale.id, { 
          netTotal: currentNetTotal,
          itemReturnedQuantities: sale.itemReturnedQuantities 
        }, true);
      });

      // 6. Cash Transaction (Financial impact)
      if (shiftId && returnData.totalRefund > 0) {
        const cashTx = await cashService.addTransaction(shiftId, {
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
        undoManager.push(async () => {
          await cashRepository.deleteTransaction(cashTx.id);
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
      await undoManager.undoAll();
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
      const completedPurchase = await purchaseService.approve(purchaseId, context.performerId, context.performerName);
      
      // Record Shift Transaction if Cash
      if (purchase.paymentMethod === 'cash' && context.shiftId) {
        await cashService.addTransaction(context.shiftId, {
          branchId: context.branchId,
          orgId: context.orgId,
          shiftId: context.shiftId,
          time: context.timestamp,
          type: 'out',
          amount: purchase.totalCost,
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
    const undoManager = new UndoManager();
    try {
      // 1. Create the purchase record with "Purchaser" info
      const newPurchase = await purchaseService.create({ 
        ...purchase, 
        branchId: context.branchId,
        orgId: context.orgId,
        status: 'pending',
        createdBy: context.performerId,
        createdByName: context.performerName
      }, context.branchId);

      undoManager.push(async () => {
        await stockMovementRepository.deleteByReferenceId(newPurchase.id);
        await batchRepository.deleteByPurchaseId(newPurchase.id);
        await supabase.from('purchases').delete().eq('id', newPurchase.id);
      });


      // 2. For direct purchases, we handle cash/audit directly without "Manager Approval" label
      if (purchase.paymentMethod === 'cash' && context.shiftId) {
        await cashService.addTransaction(context.shiftId, {
          branchId: context.branchId,
          orgId: context.orgId,
          shiftId: context.shiftId,
          time: context.timestamp,
          type: 'out',
          amount: purchase.totalCost,
          reason: `Direct PO #${newPurchase.invoiceId || newPurchase.id} from ${purchase.supplierName}`,
          userId: context.performerId,
        });
      }

      auditService.log('purchase.direct_create', {
        userId: context.performerId,
        details: `Direct Purchase PO #${newPurchase.invoiceId || newPurchase.id} (${context.performerName})`,
        entityId: newPurchase.id,
        branchId: context.branchId,
      });

      // 3. Immediately mark as received to update inventory
      const receivedPurchase = await purchaseService.markAsReceived(newPurchase.id, context.performerId, context.performerName);
      
      return { success: true, data: receivedPurchase };
    } catch (err: any) {
      console.error('[TransactionService] Direct purchase failed:', err);
      await undoManager.undoAll();
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
          type: 'in',
          amount: savedReturn.totalRefund,
          reason: `Purchase Return #${savedReturn.id} for PO #${originalPurchase.invoiceId || originalPurchase.id}`,
          userId: context.performerId || 'System',
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
  },
  async addTransaction(shiftId: string, tx: any): Promise<any> {
    return cashService.addTransaction(shiftId, tx);
  }
};
