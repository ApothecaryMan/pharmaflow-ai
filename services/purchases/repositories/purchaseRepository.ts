import { supabase } from '../../../lib/supabase';
import type { Purchase } from '../../../types';
import type { PurchaseFilters, PurchasesPageOptions } from '../types';

export const purchaseRepository = {
  tableName: 'purchases',

  mapFromDb(db: any): Purchase {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      date: db.date,
      supplierId: db.supplier_id,
      supplierName: db.supplier_name_snapshot,
      items: db.items || [],
      subtotal: db.subtotal,
      discount: db.discount,
      totalTax: db.total_tax,
      totalCost: db.total_cost,
      paymentMethod: db.payment_type || 'cash',
      status: db.status,
      approvedBy: db.approved_by,
      approvalDate: db.approval_date,
      receivedBy: db.received_by,
      receivedAt: db.received_at,
      externalInvoiceId: db.external_invoice_id,
      createdBy: db.created_by,
      createdByName: db.created_by_name,
      invoiceId: db.invoice_id,
      version: db.version,
    };
  },

  mapToDb(p: Partial<Purchase>): any {
    const db: any = {};
    if (p.id !== undefined) db.id = p.id;
    if (p.orgId !== undefined) db.org_id = p.orgId;
    if (p.branchId !== undefined) db.branch_id = p.branchId;
    if (p.date !== undefined) db.date = p.date;
    if (p.supplierId !== undefined) db.supplier_id = p.supplierId;
    if (p.supplierName !== undefined) db.supplier_name_snapshot = p.supplierName;
    if (p.items !== undefined) db.items = p.items;
    if (p.subtotal !== undefined) db.subtotal = p.subtotal;
    if (p.discount !== undefined) db.discount = p.discount;
    if (p.totalTax !== undefined) db.total_tax = p.totalTax;
    if (p.totalCost !== undefined) db.total_cost = p.totalCost;
    if (p.paymentMethod !== undefined) db.payment_type = p.paymentMethod;
    if (p.status !== undefined) db.status = p.status;
    if (p.approvedBy !== undefined) db.approved_by = p.approvedBy;
    if (p.approvalDate !== undefined) db.approval_date = p.approvalDate;
    if (p.receivedBy !== undefined) db.received_by = p.receivedBy;
    if (p.receivedAt !== undefined) db.received_at = p.receivedAt;
    if (p.externalInvoiceId !== undefined) db.external_invoice_id = p.externalInvoiceId;
    if (p.invoiceId !== undefined) db.invoice_id = p.invoiceId;
    if (p.version !== undefined) db.version = p.version;
    if (p.createdBy !== undefined) db.created_by = p.createdBy;
    if (p.createdByName !== undefined) db.created_by_name = p.createdByName;
    return db;
  },

  async getAll(effectiveBranchId: string, orgId?: string): Promise<Purchase[]> {
    let query = supabase.from(this.tableName).select('*');
    if (effectiveBranchId && effectiveBranchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getRecent(
    effectiveBranchId: string,
    orgId?: string,
    limit: number = 100
  ): Promise<Purchase[]> {
    let query = supabase.from(this.tableName).select('*');
    if (effectiveBranchId && effectiveBranchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('date', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getById(id: string): Promise<Purchase | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async findByFilters(
    filters: PurchaseFilters,
    effectiveBranchId: string,
    orgId?: string
  ): Promise<Purchase[]> {
    let query = supabase.from(this.tableName).select('*');
    if (effectiveBranchId && effectiveBranchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async listPage(
    options: PurchasesPageOptions
  ): Promise<{ rows: Purchase[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(Math.max(1, options.pageSize || 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const filters = options.filters || {};
    const effectiveBranchId = options.branchId || '';
    const isAll =
      typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    let query = supabase.from(this.tableName).select('*', { count: 'exact' });

    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && options.orgId) {
      query = query.eq('org_id', options.orgId);
    }

    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);

    if (filters.search?.trim()) {
      const term = filters.search.trim().replace(/[%_,]/g, '');
      query = query.or(
        [
          `id.ilike.%${term}%`,
          `invoice_id.ilike.%${term}%`,
          `external_invoice_id.ilike.%${term}%`,
          `supplier_name_snapshot.ilike.%${term}%`,
        ].join(',')
      );
    }

    const sortColumn = options.sort?.column || 'date';
    const ascending = options.sort?.ascending ?? false;

    const { data, error, count } = await query.order(sortColumn, { ascending }).range(from, to);

    if (error) throw error;

    return {
      rows: (data || []).map((item) => this.mapFromDb(item)),
      total: count || 0,
      page,
      pageSize,
    };
  },

  async insert(purchase: Purchase): Promise<Purchase> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(this.mapToDb(purchase))
      .select()
      .single();
    if (error) throw error;
    return this.mapFromDb(data);
  },

  async update(id: string, updates: Partial<Purchase>): Promise<Purchase> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(this.mapToDb(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapFromDb(data);
  },

  async upsert(purchases: Purchase[]): Promise<void> {
    if (purchases.length === 0) return;
    const dbPurchases = purchases.map((p) => this.mapToDb(p));
    const { error } = await supabase.from(this.tableName).upsert(dbPurchases);
    if (error) throw error;
  },
};
