/**
 * Return Service - Sales and purchase return operations
 * Online-Only implementation using Supabase
 */

import { BaseDomainService } from '../core/BaseDomainService';
import type { PurchaseReturn, Return, StockMovement } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { inventoryService } from '../inventory/inventoryService';
import { batchService } from '../inventory/batchService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { supabase } from '../../lib/supabase';
import { authService } from '../auth/authService';
import type { ReturnService } from './types';

// Sales Returns Internal Service
class SalesReturnServiceImpl extends BaseDomainService<Return> {
  protected tableName = 'returns';

  protected mapDbToDomain(db: any): Return {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      date: db.date,
      saleId: db.sale_id,
      returnType: db.return_type || 'partial',
      items: db.items || [],
      totalRefund: db.total_refund || db.total_amount || 0,
      reason: db.reason,
      notes: db.notes,
      processedBy: db.processed_by || db.employee_id,
    };
  }

  protected mapDomainToDb(r: Partial<Return>): any {
    const db: any = {};
    if (r.id !== undefined) db.id = r.id;
    if (r.orgId !== undefined) db.org_id = r.orgId;
    if (r.branchId !== undefined) db.branch_id = r.branchId;
    if (r.date !== undefined) db.date = r.date;
    if (r.saleId !== undefined) db.sale_id = r.saleId;
    if (r.returnType !== undefined) db.return_type = r.returnType;
    if (r.items !== undefined) db.items = r.items;
    if (r.totalRefund !== undefined) db.total_refund = r.totalRefund;
    if (r.reason !== undefined) db.reason = r.reason;
    if (r.notes !== undefined) db.notes = r.notes;
    if (r.processedBy !== undefined) db.processed_by = r.processedBy;
    return db;
  }
}

// Purchase Returns Internal Service
class PurchaseReturnServiceImpl extends BaseDomainService<PurchaseReturn> {
  protected tableName = 'purchase_returns';

  protected mapDbToDomain(db: any): PurchaseReturn {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      date: db.date,
      purchaseId: db.purchase_id,
      supplierId: db.supplier_id,
      supplierName: db.supplier_name_snapshot,
      items: db.items || [],
      totalRefund: db.total_refund,
      status: db.status || 'completed',
      notes: db.notes,
    };
  }

  protected mapDomainToDb(r: Partial<PurchaseReturn>): any {
    const db: any = {};
    if (r.id !== undefined) db.id = r.id;
    if (r.orgId !== undefined) db.org_id = r.orgId;
    if (r.branchId !== undefined) db.branch_id = r.branchId;
    if (r.date !== undefined) db.date = r.date;
    if (r.purchaseId !== undefined) db.purchase_id = r.purchaseId;
    if (r.supplierId !== undefined) db.supplier_id = r.supplierId;
    if (r.supplierName !== undefined) db.supplier_name_snapshot = r.supplierName;
    if (r.items !== undefined) db.items = r.items;
    if (r.totalRefund !== undefined) db.total_refund = r.totalRefund;
    if (r.status !== undefined) db.status = r.status;
    if (r.notes !== undefined) db.notes = r.notes;
    return db;
  }
}

const salesReturnInternal = new SalesReturnServiceImpl();
const purchaseReturnInternal = new PurchaseReturnServiceImpl();

export const returnService: ReturnService = {
  // Sales Returns
  getAllSalesReturns: async (branchId?: string): Promise<Return[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from('returns').select('*');
      if (effectiveBranchId !== 'all') {
        query = query.eq('branch_id', effectiveBranchId);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => (salesReturnInternal as any).mapDbToDomain(item));
    } catch (err) {
      console.error('[ReturnService] getAllSalesReturns failed:', err);
      return [];
    }
  },

  getSalesReturnById: async (id: string): Promise<Return | null> => {
    return salesReturnInternal.getById(id);
  },

  createSalesReturn: async (ret: Omit<Return, 'id'>, branchId?: string): Promise<Return> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (ret as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newReturn: Return = {
      ...ret,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: ret.date || new Date().toISOString(),
    } as Return;

    // 1. Update Inventory and log movements
    for (const item of newReturn.items) {
      const drugId = (item as any).drugId || (item as any).id;
      const currentStock = await batchService.getTotalStock(drugId, effectiveBranchId);
      
      await stockMovementService.logMovement({
        drugId,
        drugName: (item as any).name || (item as any).nameSnapshot,
        branchId: effectiveBranchId,
        orgId: settings.orgId,
        type: 'return_customer',
        quantity: item.quantityReturned,
        previousStock: currentStock,
        newStock: currentStock + item.quantityReturned,
        referenceId: newReturn.id,
        performedBy: authService.getCurrentUserSync()?.employeeId || 'System',
        status: 'approved'
      });

      await inventoryService.updateStock(drugId, item.quantityReturned, true);
    }

    // 2. Save Return Record
    const dbReturn = (salesReturnInternal as any).mapDomainToDb({
      ...newReturn,
      processedBy: newReturn.processedBy || authService.getCurrentUserSync()?.employeeId
    });
    const { error } = await supabase.from('returns').insert(dbReturn);
    if (error) throw error;

    return newReturn;
  },

  // Purchase Returns
  getAllPurchaseReturns: async (branchId?: string): Promise<PurchaseReturn[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from('purchase_returns').select('*');
      if (effectiveBranchId !== 'all') {
        query = query.eq('branch_id', effectiveBranchId);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => (purchaseReturnInternal as any).mapDbToDomain(item));
    } catch (err) {
      console.error('[ReturnService] getAllPurchaseReturns failed:', err);
      return [];
    }
  },

  getPurchaseReturnById: async (id: string, branchId?: string): Promise<PurchaseReturn | null> => {
    return purchaseReturnInternal.getById(id);
  },

  createPurchaseReturn: async (ret: Omit<PurchaseReturn, 'id'>, branchId?: string): Promise<PurchaseReturn> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (ret as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newReturn: PurchaseReturn = {
      ...ret,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: ret.date || new Date().toISOString(),
    } as PurchaseReturn;

    // 1. Process Inventory Deductions (FEFO)
    for (const item of newReturn.items) {
      const currentStock = await batchService.getTotalStock(item.drugId, effectiveBranchId);
      
      // Allocate from batches
      const allocations = await batchService.allocateStock(item.drugId, item.quantityReturned, effectiveBranchId, true);
      
      if (allocations) {
        for (const allocation of allocations) {
          await stockMovementService.logMovement({
            drugId: item.drugId,
            drugName: item.name,
            branchId: effectiveBranchId,
            type: 'return_supplier',
            quantity: -allocation.quantity,
            previousStock: currentStock,
            newStock: currentStock - allocation.quantity,
            referenceId: newReturn.id,
            batchId: allocation.batchId,
            expiryDate: allocation.expiryDate,
            performedBy: authService.getCurrentUserSync()?.employeeId || 'System',
            status: 'approved',
            orgId: settings.orgId,
          });
        }
      }

      await inventoryService.updateStock(item.drugId, -item.quantityReturned, true);
    }

    // 2. Save Return Record
    const dbReturn = (purchaseReturnInternal as any).mapDomainToDb(newReturn);
    const { error } = await supabase.from('purchase_returns').insert(dbReturn);
    if (error) throw error;

    return newReturn;
  },

  // Save methods (used for seeding/syncing)
  saveSalesReturns: async (returns: Return[], branchId?: string): Promise<void> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const dbReturns = returns.map(r => (salesReturnInternal as any).mapDomainToDb({
      ...r,
      branchId: r.branchId || effectiveBranchId,
      orgId: r.orgId || settings.orgId
    }));

    if (dbReturns.length > 0) {
      const { error } = await supabase.from('returns').upsert(dbReturns);
      if (error) throw error;
    }
  },

  savePurchaseReturns: async (returns: PurchaseReturn[], branchId?: string): Promise<void> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const dbReturns = returns.map(r => (purchaseReturnInternal as any).mapDomainToDb({
      ...r,
      branchId: r.branchId || effectiveBranchId,
      orgId: r.orgId || settings.orgId
    }));

    if (dbReturns.length > 0) {
      const { error } = await supabase.from('purchase_returns').upsert(dbReturns);
      if (error) throw error;
    }
  },
};
