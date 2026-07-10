import { supabase } from '../../../lib/supabase';
import type { Sale } from '../../../types';
import { money } from '../../../utils/money';
import { dateRangeService } from '../../financials/dateRangeService';
import type { PagedResult, SalesFilters, SalesPageOptions } from '../types';

const SALE_LIST_COLUMNS = [
  'id',
  'serial_id',
  'org_id',
  'branch_id',
  'date',
  'updated_at',
  'customer_code',
  'customer_name',
  'customer_phone',
  'customer_address',
  'customer_street_address',
  'subtotal',
  'global_discount',
  'tax',
  'total',
  'payment_method',
  'status',
  'sold_by_employee_id',
  'shift_id',
  'sale_type',
  'delivery_fee',
  'delivery_employee_id',
  'processing_time_min',
  'shift_transaction_recorded',
  'version',
  'net_total',
  'item_returned_quantities',
  'daily_order_number',
  'items',
].join(',');

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
      subtotal: money.fromSmallestUnit(money.toSmallestUnit(db.subtotal || 0)),
      globalDiscount: db.global_discount || 0,
      tax: money.fromSmallestUnit(money.toSmallestUnit(db.tax || 0)),
      total: money.fromSmallestUnit(money.toSmallestUnit(db.total || 0)),
      paymentMethod: db.payment_method,
      status: db.status,
      soldByEmployeeId: db.sold_by_employee_id,
      shiftId: db.shift_id,
      notes: db.notes,
      saleType: db.sale_type || 'walk-in',
      deliveryFee: money.fromSmallestUnit(money.toSmallestUnit(db.delivery_fee || 0)),
      deliveryEmployeeId: db.delivery_employee_id,
      processingTimeMinutes: db.processing_time_min,
      shiftTransactionRecorded: db.shift_transaction_recorded,
      modificationHistory: db.modification_history || [],
      version: db.version,
      netTotal: money.fromSmallestUnit(money.toSmallestUnit(db.net_total ?? db.total ?? 0)),
      hasReturns:
        !!db.item_returned_quantities && Object.keys(db.item_returned_quantities).length > 0,
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
    if (s.subtotal !== undefined)
      db.subtotal = money.fromSmallestUnit(money.toSmallestUnit(s.subtotal || 0));
    if (s.globalDiscount !== undefined) db.global_discount = s.globalDiscount;
    if (s.tax !== undefined) db.tax = money.fromSmallestUnit(money.toSmallestUnit(s.tax || 0));
    if (s.total !== undefined)
      db.total = money.fromSmallestUnit(money.toSmallestUnit(s.total || 0));
    if (s.paymentMethod !== undefined) db.payment_method = s.paymentMethod;
    if (s.status !== undefined) db.status = s.status;
    if (s.soldByEmployeeId !== undefined) db.sold_by_employee_id = s.soldByEmployeeId;
    if (s.shiftId !== undefined) db.shift_id = s.shiftId;
    if (s.notes !== undefined) db.notes = s.notes;
    if (s.saleType !== undefined) db.sale_type = s.saleType;
    if (s.deliveryFee !== undefined)
      db.delivery_fee = money.fromSmallestUnit(money.toSmallestUnit(s.deliveryFee || 0));
    if (s.deliveryEmployeeId !== undefined) db.delivery_employee_id = s.deliveryEmployeeId;
    if (s.processingTimeMinutes !== undefined) db.processing_time_min = s.processingTimeMinutes;
    if (s.shiftTransactionRecorded !== undefined)
      db.shift_transaction_recorded = s.shiftTransactionRecorded;
    if (s.modificationHistory !== undefined) db.modification_history = s.modificationHistory;
    if (s.version !== undefined) db.version = s.version;
    if (s.netTotal !== undefined)
      db.net_total = money.fromSmallestUnit(money.toSmallestUnit(s.netTotal || 0));
    if (s.itemReturnedQuantities !== undefined)
      db.item_returned_quantities = s.itemReturnedQuantities;
    if (s.dailyOrderNumber !== undefined) db.daily_order_number = s.dailyOrderNumber;
    return db;
  },

  async getAll(effectiveBranchId: string, orgId?: string): Promise<Sale[]> {
    let query = supabase.from(this.tableName).select('*');
    const isAll =
      typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getRecent(effectiveBranchId: string, orgId?: string, limit = 100): Promise<Sale[]> {
    let query = supabase.from(this.tableName).select(SALE_LIST_COLUMNS);
    const isAll =
      typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query.order('date', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async listPage(options: SalesPageOptions): Promise<PagedResult<Sale>> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(Math.max(1, options.pageSize || 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const filters = options.filters || {};
    const effectiveBranchId = options.branchId || '';
    const isAll =
      typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';

    let query = supabase.from(this.tableName).select(SALE_LIST_COLUMNS, { count: 'exact' });

    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && options.orgId) {
      query = query.eq('org_id', options.orgId);
    }

    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);
    if (filters.customerCode) query = query.eq('customer_code', filters.customerCode);
    if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
    if (filters.soldByEmployeeId) query = query.eq('sold_by_employee_id', filters.soldByEmployeeId);
    if (filters.deliveryEmployeeId)
      query = query.eq('delivery_employee_id', filters.deliveryEmployeeId);
    if (filters.status && filters.status !== 'returned') query = query.eq('status', filters.status);
    if (filters.minAmount !== undefined) query = query.gte('total', filters.minAmount);
    if (filters.maxAmount !== undefined) query = query.lte('total', filters.maxAmount);
    if (filters.search?.trim()) {
      const term = filters.search.trim().replace(/[%_,]/g, '');
      query = query.or(
        [
          `id.ilike.%${term}%`,
          `customer_name.ilike.%${term}%`,
          `customer_code.ilike.%${term}%`,
          `customer_phone.ilike.%${term}%`,
        ].join(',')
      );
    }

    const sortColumn = options.sort?.column || 'date';
    const ascending = options.sort?.ascending ?? false;
    const { data, error, count } = await query.order(sortColumn, { ascending }).range(from, to);

    if (error) throw error;

    let rows = (data || []).map((item) => this.mapFromDb(item));
    if (filters.status === 'returned') {
      rows = rows.filter((sale) => {
        const returnedQuantities = sale.itemReturnedQuantities || {};
        return (
          (sale.netTotal !== undefined && sale.netTotal < sale.total) ||
          Object.keys(returnedQuantities).length > 0
        );
      });
    }

    return {
      rows,
      total: count || 0,
      page,
      pageSize,
    };
  },

  async getById(id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async findByFilters(
    filters: SalesFilters,
    effectiveBranchId: string,
    orgId?: string
  ): Promise<Sale[]> {
    let query = supabase.from(this.tableName).select('*');
    if (effectiveBranchId && effectiveBranchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (orgId) {
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
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getNextDailyOrderNumber(branchId: string): Promise<number> {
    const today = dateRangeService.getLocalDateString();
    const { data, error } = await supabase
      .from(this.tableName)
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
    const { error } = await supabase
      .from(this.tableName)
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
    const dbSales = sales.map((s) => this.mapToDb(s));
    const { error } = await supabase.from(this.tableName).upsert(dbSales);
    if (error) throw error;
  },
};
