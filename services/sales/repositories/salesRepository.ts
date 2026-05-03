import { supabase } from '../../../lib/supabase';
import type { Sale } from '../../../types';
import type { SalesFilters } from '../types';

export const salesRepository = {
  tableName: 'sales',

  mapFromDb(db: any): Sale {
    return {
      id: db.id,
      serialId: db.serial_id,
      orgId: db.org_id,
      branchId: db.branch_id,
      date: db.date,
      updatedAt: db.updated_at,
      customerCode: db.customer_code,
      customerName: db.customer_name,
      customerPhone: db.customer_phone,
      customerAddress: db.customer_address,
      customerStreetAddress: db.customer_street_address,
      items: db.items || [],
      subtotal: db.subtotal,
      globalDiscount: db.global_discount,
      tax: db.tax,
      total: db.total,
      paymentMethod: db.payment_method,
      status: db.status,
      soldByEmployeeId: db.sold_by_employee_id,
      shiftId: db.shift_id,
      notes: db.notes,
      saleType: db.sale_type || 'walk-in',
      deliveryFee: db.delivery_fee,
      deliveryEmployeeId: db.delivery_employee_id,
      processingTimeMinutes: db.processing_time_min,
      shiftTransactionRecorded: db.shift_transaction_recorded,
      modificationHistory: db.modification_history || [],
      version: db.version,
      netTotal: db.net_total,
      itemReturnedQuantities: db.item_returned_quantities || {},
      dailyOrderNumber: db.daily_order_number,
    };
  },

  mapToDb(s: Partial<Sale>): any {
    const db: any = {};
    if (s.id !== undefined) db.id = s.id;
    if (s.serialId !== undefined) db.serial_id = s.serialId;
    if (s.orgId !== undefined) db.org_id = s.orgId;
    if (s.branchId !== undefined) db.branch_id = s.branchId;
    if (s.date !== undefined) db.date = s.date;
    if (s.updatedAt !== undefined) db.updated_at = s.updatedAt;
    if (s.customerCode !== undefined) db.customer_code = s.customerCode;
    if (s.customerName !== undefined) db.customer_name = s.customerName;
    if (s.customerPhone !== undefined) db.customer_phone = s.customerPhone;
    if (s.customerAddress !== undefined) db.customer_address = s.customerAddress;
    if (s.customerStreetAddress !== undefined) db.customer_street_address = s.customerStreetAddress;
    if (s.items !== undefined) db.items = s.items;
    if (s.subtotal !== undefined) db.subtotal = s.subtotal;
    if (s.globalDiscount !== undefined) db.global_discount = s.globalDiscount;
    if (s.tax !== undefined) db.tax = s.tax;
    if (s.total !== undefined) db.total = s.total;
    if (s.paymentMethod !== undefined) db.payment_method = s.paymentMethod;
    if (s.status !== undefined) db.status = s.status;
    if (s.soldByEmployeeId !== undefined) db.sold_by_employee_id = s.soldByEmployeeId;
    if (s.shiftId !== undefined) db.shift_id = s.shiftId;
    if (s.notes !== undefined) db.notes = s.notes;
    if (s.saleType !== undefined) db.sale_type = s.saleType;
    if (s.deliveryFee !== undefined) db.delivery_fee = s.deliveryFee;
    if (s.deliveryEmployeeId !== undefined) db.delivery_employee_id = s.deliveryEmployeeId;
    if (s.processingTimeMinutes !== undefined) db.processing_time_min = s.processingTimeMinutes;
    if (s.shiftTransactionRecorded !== undefined) db.shift_transaction_recorded = s.shiftTransactionRecorded;
    if (s.modificationHistory !== undefined) db.modification_history = s.modificationHistory;
    if (s.version !== undefined) db.version = s.version;
    if (s.netTotal !== undefined) db.net_total = s.netTotal;
    if (s.itemReturnedQuantities !== undefined) db.item_returned_quantities = s.itemReturnedQuantities;
    if (s.dailyOrderNumber !== undefined) db.daily_order_number = s.dailyOrderNumber;
    return db;
  },

  async getAll(effectiveBranchId: string, orgId?: string): Promise<Sale[]> {
    let query = supabase.from(this.tableName).select('*');
    const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
    
    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => this.mapFromDb(item));
  },

  async getById(id: string): Promise<Sale | null> {
    const { data, error } = await supabase.from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async findByFilters(filters: SalesFilters, effectiveBranchId: string, orgId?: string): Promise<Sale[]> {
    let query = supabase.from(this.tableName).select('*');
    const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
    
    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && orgId) {
      query = query.eq('org_id', orgId);
    }
    
    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);
    if (filters.customerCode) query = query.eq('customer_code', filters.customerCode);
    if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
    if (filters.minAmount !== undefined) query = query.gte('total', filters.minAmount);
    if (filters.maxAmount !== undefined) query = query.lte('total', filters.maxAmount);
    
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => this.mapFromDb(item));
  },

  async getNextDailyOrderNumber(branchId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from(this.tableName)
      .select('daily_order_number')
      .eq('branch_id', branchId)
      .gte('date', `${today}T00:00:00`)
      .order('daily_order_number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    return (data?.[0]?.daily_order_number || 0) + 1;
  },

  async insert(sale: Sale): Promise<void> {
    const { error } = await supabase.from(this.tableName).insert(this.mapToDb(sale));
    if (error) throw error;
  },

  async update(id: string, updates: Partial<Sale>): Promise<void> {
    const { error } = await supabase.from(this.tableName)
      .update(this.mapToDb(updates))
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async upsert(sales: Sale[]): Promise<void> {
    if (sales.length === 0) return;
    const dbSales = sales.map(s => this.mapToDb(s));
    const { error } = await supabase.from(this.tableName).upsert(dbSales);
    if (error) throw error;
  }
};
