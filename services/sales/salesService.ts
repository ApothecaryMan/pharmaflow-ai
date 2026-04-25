/**
 * Sales Service - Sales transaction operations
 * Online-Only implementation using Supabase
 */

import { BaseDomainService } from '../core/BaseDomainService';
import type { Sale } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { supabase } from '../../lib/supabase';
import type { SalesFilters, SalesService, SalesStats } from './types';

class SalesServiceImpl extends BaseDomainService<Sale> implements SalesService {
  protected tableName = 'sales';

  protected mapDbToDomain(db: any): Sale {
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
    };
  }

  protected mapDomainToDb(s: Partial<Sale>): any {
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
    return db;
  }

  async getAll(branchId?: string): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName).select('*');
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error('[SalesService] getAll failed:', err);
      return [];
    }
  }

  async getByCustomer(customerId: string, branchId?: string): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName)
        .select('*')
        .eq('customer_code', customerId);
      
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error('[SalesService] getByCustomer failed:', err);
      return [];
    }
  }

  async getByDateRange(from: string, to: string, branchId?: string): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName)
        .select('*')
        .gte('date', from)
        .lte('date', to);
      
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error('[SalesService] getByDateRange failed:', err);
      return [];
    }
  }

  async getToday(branchId?: string): Promise<Sale[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDateRange(`${today}T00:00:00`, `${today}T23:59:59`, branchId);
  }

  async create(sale: Omit<Sale, 'id'>, branchId?: string): Promise<Sale> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (sale as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newSale: Sale = {
      ...sale,
      id: (sale as any).id || idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: (sale as any).orgId || settings.orgId,
      date: sale.date || new Date().toISOString(),
    } as Sale;

    const dbSale = this.mapDomainToDb(newSale);
    const { error } = await supabase.from(this.tableName).insert(dbSale);
    if (error) throw error;

    return newSale;
  }

  async getStats(branchId?: string): Promise<SalesStats> {
    const all = await this.getAll(branchId);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = all.filter((s) => s.date.startsWith(today));

    return {
      totalSales: all.length,
      totalRevenue: all.reduce((sum, s) => sum + s.total, 0),
      averageTransaction:
        all.length > 0 ? all.reduce((sum, s) => sum + s.total, 0) / all.length : 0,
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
    };
  }

  async filter(filters: SalesFilters, branchId?: string): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName).select('*');
      
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      
      if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('date', filters.dateTo);
      if (filters.customerCode) query = query.eq('customer_code', filters.customerCode);
      if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
      if (filters.minAmount !== undefined) query = query.gte('total', filters.minAmount);
      if (filters.maxAmount !== undefined) query = query.lte('total', filters.maxAmount);
      
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error('[SalesService] filter failed:', err);
      return [];
    }
  }

  async save(sales: Sale[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const dbSales = sales.map(s => this.mapDomainToDb({
      ...s,
      branchId: s.branchId || effectiveBranchId,
      orgId: s.orgId || settings.orgId
    }));

    if (dbSales.length > 0) {
      const { error } = await supabase.from(this.tableName).upsert(dbSales);
      if (error) throw error;
    }
  }
}

export const salesService = new SalesServiceImpl();
