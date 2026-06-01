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
import { auditService } from '../audit/auditService';
import { money } from '../../utils/money';
import { returnService } from '../returns/returnService';
import { settingsService } from '../settings/settingsService';
import { resolveUnits } from '../../utils/stockUtils';
import * as stockOps from '../../utils/stockOperations';
import { supabase } from '../../lib/supabase';
import { salesRepository } from '../sales/repositories/salesRepository';
import { stockMovementRepository } from '../inventory/repositories/stockMovementRepository';
import { returnsRepository } from '../returns/repositories/returnsRepository';
import { cashRepository } from '../cash/repositories/cashRepository';
import { batchRepository } from '../inventory/repositories/batchRepository';
import { calculateSalePoints } from '../customers/loyaltyUtils';

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
  /**
   * Orchestrates the checkout process by invoking the atomic process_checkout RPC.
   * Includes performance monitoring and comprehensive error handling.
   */
  async processCheckout(
    saleData: {
      items: CartItem[];
      customerName: string;
      customerCode?: string;
      customerPhone?: string;
      paymentMethod: 'cash' | 'visa';
      saleType?: 'walk-in' | 'delivery';
      total: number;
      subtotal: number;
      globalDiscount: number;
      deliveryFee?: number;
    },
    _inventory: Drug[], // Kept for signature compatibility, unused now
    context: ActionContext
  ): Promise<CheckoutResult> {
    const perfLabel = `[TransactionService] processCheckout:${context.branchId}:${Date.now()}`;
    console.time(perfLabel);

    try {
      // 1. Build structured payload (Factory Pattern)
      const payload = this._buildCheckoutPayload(saleData, context);

      // 2. Invoke the Atomic RPC
      const { data, error } = await supabase.rpc('process_checkout', {
        p_payload: payload
      });

      console.timeEnd(perfLabel);

      if (error) {
        console.error('[TransactionService] RPC error:', error);
        return { success: false, error: error.message || 'Server error during checkout' };
      }

      if (data && !data.success) {
        console.error('[TransactionService] Transaction logic failed:', data.error);
        return { success: false, error: data.error || 'Transaction failed' };
      }

      // 3. Return the result
      return { 
        success: true, 
        sale: data as unknown as Sale 
      };

    } catch (err: any) {
      console.timeEnd(perfLabel);
      console.error('[TransactionService] Fatal error:', err);
      return { success: false, error: err.message || 'Checkout failed' };
    }
  },

  /**
   * Internal factory to standardize the checkout payload structure.
   */
  _buildCheckoutPayload(saleData: any, context: ActionContext) {
    const earnedPoints = calculateSalePoints(saleData as Sale).totalEarned;

    return {
      branchId: context.branchId,
      orgId: context.orgId,
      shiftId: context.shiftId,
      timestamp: context.timestamp,
      performerId: context.performerId,
      performerName: context.performerName,
      
      items: saleData.items.map((item: CartItem) => ({
        id: item.id,
        name: item.name,
        dosageForm: item.dosageForm,
        quantity: item.quantity,
        isUnit: !!item.isUnit,
        publicPrice: item.publicPrice,
        discount: item.discount || 0,
      })),
      
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      customerCode: saleData.customerCode,
      earnedPoints,
      paymentMethod: saleData.paymentMethod,
      saleType: saleData.saleType || 'walk-in',
      status: saleData.status || 'completed',
      deliveryFee: saleData.deliveryFee || 0,
      globalDiscount: saleData.globalDiscount || 0,
      total: saleData.total,
      subtotal: saleData.subtotal
    };
  },


  /**
   * Orchestrates the cancellation of a sale, ensuring stock is returned
   * and shift balance is corrected atomically.
   */
  async processCancellation(
    sale: Sale,
    _inventory: Drug[],
    context: ActionContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('process_cancellation', {
        p_payload: {
          saleId: sale.id,
          branchId: context.branchId,
          orgId: context.orgId,
          performerId: context.performerId,
          performerName: context.performerName
        }
      });

      if (error) {
        console.error('[TransactionService] RPC error:', error);
        return { success: false, error: error.message || 'Server error during cancellation' };
      }

      if (data && !data.success) {
        return { success: false, error: data.error || 'Cancellation failed' };
      }

      return { success: true };

    } catch (err: any) {
      console.error('[TransactionService] Cancellation failed:', err);
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
    _inventory: Drug[],
    context: ActionContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('process_order_modification', {
        p_payload: {
          saleId: sale.id,
          branchId: context.branchId,
          orgId: context.orgId,
          performerId: context.performerId,
          performerName: context.performerName,
          total: updates.total ?? sale.total,
          subtotal: updates.subtotal ?? sale.subtotal,
          globalDiscount: updates.globalDiscount ?? sale.globalDiscount,
          items: (updates.items || sale.items).map(item => ({
            id: item.id,
            name: (item as any).name,
            dosageForm: (item as any).dosageForm,
            quantity: item.quantity,
            isUnit: !!item.isUnit,
            publicPrice: item.publicPrice,
            discount: item.discount || 0
          }))
        }
      });

      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'Modification failed' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('[TransactionService] Modification fatal error:', err);
      return { success: false, error: err.message || 'Unexpected error during modification' };
    }
  },

  async processReturn(
    returnData: Return,
    _inventory: Drug[],
    sale: Sale,
    context: ActionContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = {
        saleId: sale.id,
        branchId: context.branchId,
        orgId: context.orgId,
        performerId: context.performerId,
        performerName: context.performerName,
        returnType: returnData.returnType,
        reason: returnData.reason,
        notes: returnData.notes,
        items: returnData.items.map(item => ({
          drugId: item.drugId,
          saleItemId: item.saleItemId,
          quantity: item.quantityReturned,
          isUnit: !!item.isUnit,
          condition: item.condition
        }))
      };

      const { data, error } = await supabase.rpc('process_return', {
        p_payload: payload
      });

      if (error) {
        console.error('[TransactionService] RPC error:', error);
        return { success: false, error: error.message || 'Server error during return processing' };
      }

      if (data && !data.success) {
        return { success: false, error: data.error || 'Return failed' };
      }

      return { success: true };

    } catch (err: any) {
      console.error('[TransactionService] Return failed:', err);
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
          shiftId: context.shiftId,
          time: context.timestamp,
          type: 'purchase',
          amount: -purchase.totalCost,
          reason: `Purchase #${purchase.id}`,
          userId: context.performerId
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
          type: 'purchase',
          amount: -purchase.totalCost,
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
          type: 'purchase_return',
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
