import { supabase } from '../../../lib/supabase';
import type { Return, PurchaseReturn } from '../../../types';

export const returnsRepository = {
  salesTableName: 'returns',
  purchaseTableName: 'purchase_returns',

  // --- Sales Return Mappers ---
  mapSalesFromDb(db: any): Return {
    return {
      id: db.id,
      serialId: db.serial_id,
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
  },

  mapSalesToDb(r: Partial<Return>): any {
    const db: any = {};
    if (r.id !== undefined) db.id = r.id;
    if (r.serialId !== undefined) db.serial_id = r.serialId;
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
  },

  // --- Purchase Return Mappers ---
  mapPurchaseFromDb(db: any): PurchaseReturn {
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
  },

  mapPurchaseToDb(r: Partial<PurchaseReturn>): any {
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
  },

  // --- Sales Return Methods ---
  async getAllSales(effectiveBranchId: string): Promise<Return[]> {
    let query = supabase.from(this.salesTableName).select('*');
    if (effectiveBranchId !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => this.mapSalesFromDb(item));
  },

  async getSalesById(id: string): Promise<Return | null> {
    const { data, error } = await supabase.from(this.salesTableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapSalesFromDb(data) : null;
  },

  async insertReturn(ret: Return, processedBy?: string): Promise<void> {
    const dbData = this.mapSalesToDb(ret);
    if (processedBy) dbData.processed_by = processedBy;
    const { error } = await supabase.from(this.salesTableName).insert(dbData);
    if (error) throw error;
  },

  async insertSalesReturn(ret: Return): Promise<void> {
    return this.insertReturn(ret);
  },

  async deleteReturn(id: string): Promise<boolean> {
    const { error } = await supabase.from(this.salesTableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async insertReturnItems(items: any[]): Promise<void> {
    const { error } = await supabase.from('return_items').insert(items);
    if (error) throw error;
  },

  async deleteReturnItems(returnId: string): Promise<boolean> {
    const { error } = await supabase.from('return_items').delete().eq('return_id', returnId);
    if (error) throw error;
    return true;
  },

  async upsertSalesReturns(returns: Return[]): Promise<void> {
    if (returns.length === 0) return;
    const dbReturns = returns.map(r => this.mapSalesToDb(r));
    const { error } = await supabase.from(this.salesTableName).upsert(dbReturns);
    if (error) throw error;
  },

  // --- Purchase Return Methods ---
  async getAllPurchases(effectiveBranchId: string): Promise<PurchaseReturn[]> {
    let query = supabase.from(this.purchaseTableName).select('*');
    if (effectiveBranchId !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => this.mapPurchaseFromDb(item));
  },

  async getPurchaseById(id: string): Promise<PurchaseReturn | null> {
    const { data, error } = await supabase.from(this.purchaseTableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapPurchaseFromDb(data) : null;
  },

  async insertPurchaseReturn(ret: PurchaseReturn): Promise<void> {
    const { error } = await supabase.from(this.purchaseTableName).insert(this.mapPurchaseToDb(ret));
    if (error) throw error;
  },

  async upsertPurchaseReturns(returns: PurchaseReturn[]): Promise<void> {
    if (returns.length === 0) return;
    const dbReturns = returns.map(r => this.mapPurchaseToDb(r));
    const { error } = await supabase.from(this.purchaseTableName).upsert(dbReturns);
    if (error) throw error;
  }
};
