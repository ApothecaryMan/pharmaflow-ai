import { supabase } from '../../../lib/supabase';
import type { PurchaseReturn, Return } from '../../../types';
import type { ReturnsPageOptions } from '../types';

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
      items: (db.items || []).map((item: any) => ({
        drugId: item.drug_id,
        saleItemId: item.sale_item_id,
        name: item.name,
        quantityReturned: item.quantity_returned,
        isUnit: item.is_unit,
        publicPrice: item.public_price,
        refundAmount: item.refund_amount,
        reason: item.reason,
        condition: item.condition,
        dosageForm: item.dosage_form,
        expiryDate: item.expiry_date,
      })),
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
      items: (db.items || []).map((item: any) => ({
        drugId: item.drug_id,
        name: item.name,
        quantityReturned: item.quantity_returned,
        isUnit: item.is_unit,
        costPrice: item.cost_price,
        refundAmount: item.refund_amount,
        dosageForm: item.dosage_form,
      })),
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
    if (r.totalRefund !== undefined) db.total_refund = r.totalRefund;
    if (r.status !== undefined) db.status = r.status;
    if (r.notes !== undefined) db.notes = r.notes;
    return db;
  },

  // --- Sales Return Methods ---
  async getAllSales(effectiveBranchId: string, orgId?: string): Promise<Return[]> {
    let query = supabase.from(this.salesTableName).select('*, items:return_items(*)');
    if (effectiveBranchId && effectiveBranchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => this.mapSalesFromDb(item));
  },

  async getRecentSales(
    effectiveBranchId: string,
    orgId?: string,
    limit: number = 100
  ): Promise<Return[]> {
    let query = supabase.from(this.salesTableName).select('*, items:return_items(*)');
    if (effectiveBranchId && effectiveBranchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('date', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((item) => this.mapSalesFromDb(item));
  },

  async getSalesById(id: string): Promise<Return | null> {
    const { data, error } = await supabase
      .from(this.salesTableName)
      .select('*, items:return_items(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapSalesFromDb(data) : null;
  },

  async listSalesReturnsPage(
    options: ReturnsPageOptions
  ): Promise<{ rows: Return[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(Math.max(1, options.pageSize || 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const filters = options.filters || {};
    const effectiveBranchId = options.branchId || '';
    const isAll =
      typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    let query = supabase
      .from(this.salesTableName)
      .select('*, items:return_items(*)', { count: 'exact' });

    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && options.orgId) {
      query = query.eq('org_id', options.orgId);
    }

    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);
    if (filters.reason) query = query.eq('reason', filters.reason);

    if (filters.search?.trim()) {
      const term = filters.search.trim().replace(/[%_,]/g, '');
      query = query.or(
        [`id.ilike.%${term}%`, `serial_id.ilike.%${term}%`, `sale_id.ilike.%${term}%`].join(',')
      );
    }

    const sortColumn = options.sort?.column || 'date';
    const ascending = options.sort?.ascending ?? false;

    const { data, error, count } = await query.order(sortColumn, { ascending }).range(from, to);

    if (error) throw error;

    return {
      rows: (data || []).map((item) => this.mapSalesFromDb(item)),
      total: count || 0,
      page,
      pageSize,
    };
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
    const dbReturns = returns.map((r) => this.mapSalesToDb(r));
    const { error } = await supabase.from(this.salesTableName).upsert(dbReturns);
    if (error) throw error;
  },

  // --- Purchase Return Methods ---
  async getAllPurchases(effectiveBranchId: string, orgId?: string): Promise<PurchaseReturn[]> {
    let query = supabase.from(this.purchaseTableName).select('*, items:purchase_return_items(*)');
    if (effectiveBranchId && effectiveBranchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => this.mapPurchaseFromDb(item));
  },

  async getRecentPurchase(
    effectiveBranchId: string,
    orgId?: string,
    limit: number = 100
  ): Promise<PurchaseReturn[]> {
    let query = supabase.from(this.purchaseTableName).select('*, items:purchase_return_items(*)');
    if (effectiveBranchId && effectiveBranchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('date', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((item) => this.mapPurchaseFromDb(item));
  },

  async getPurchaseById(id: string): Promise<PurchaseReturn | null> {
    const { data, error } = await supabase
      .from(this.purchaseTableName)
      .select('*, items:purchase_return_items(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapPurchaseFromDb(data) : null;
  },

  async listPurchaseReturnsPage(
    options: ReturnsPageOptions
  ): Promise<{ rows: PurchaseReturn[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(Math.max(1, options.pageSize || 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const filters = options.filters || {};
    const effectiveBranchId = options.branchId || '';
    const isAll =
      typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    let query = supabase
      .from(this.purchaseTableName)
      .select('*, items:purchase_return_items(*)', { count: 'exact' });

    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && options.orgId) {
      query = query.eq('org_id', options.orgId);
    }

    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);

    if (filters.search?.trim()) {
      const term = filters.search.trim().replace(/[%_,]/g, '');
      query = query.or(
        [`id.ilike.%${term}%`, `purchase_id.ilike.%${term}%`, `supplier_name.ilike.%${term}%`].join(
          ','
        )
      );
    }

    const sortColumn = options.sort?.column || 'date';
    const ascending = options.sort?.ascending ?? false;

    const { data, error, count } = await query.order(sortColumn, { ascending }).range(from, to);

    if (error) throw error;

    return {
      rows: (data || []).map((item) => this.mapPurchaseFromDb(item)),
      total: count || 0,
      page,
      pageSize,
    };
  },

  async insertPurchaseReturn(ret: PurchaseReturn): Promise<void> {
    const { error } = await supabase.from(this.purchaseTableName).insert(this.mapPurchaseToDb(ret));
    if (error) throw error;
  },

  async upsertPurchaseReturns(returns: PurchaseReturn[]): Promise<void> {
    if (returns.length === 0) return;
    const dbReturns = returns.map((r) => this.mapPurchaseToDb(r));
    const { error } = await supabase.from(this.purchaseTableName).upsert(dbReturns);
    if (error) throw error;
  },
};
