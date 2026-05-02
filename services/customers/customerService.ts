/**
 * Customer Service - Customer CRUD and loyalty operations
 * Online-Only implementation using Supabase
 */

import { BaseEntityService } from '../core/baseEntityService';
import type { Customer } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { supabase } from '../../lib/supabase';
import type { CustomerFilters, CustomerService, CustomerStats } from './types';

class CustomerServiceImpl extends BaseEntityService<Customer> implements CustomerService {
  protected tableName = 'customers';
  protected searchColumns = ['name', 'phone', 'code', 'email'];

  public mapFromDb(db: any): Customer {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      serialId: db.serial_id || '',
      code: db.code || '',
      name: db.name || '',
      phone: db.phone || '',
      email: db.email || undefined,
      governorate: db.governorate || undefined,
      city: db.city || undefined,
      area: db.area || undefined,
      streetAddress: db.street_address || undefined,
      insuranceProvider: db.insurance_provider || undefined,
      policyNumber: db.policy_number || undefined,
      preferredLocation: db.preferred_location || undefined,
      preferredContact: db.preferred_contact || undefined,
      chronicConditions: db.chronic_conditions || [],
      totalPurchases: Number(db.total_purchases) || 0,
      points: Number(db.points) || 0,
      lastVisit: db.last_visit || new Date().toISOString(),
      notes: db.notes || undefined,
      status: db.status || 'active',
      vip: db.vip || false,
      registeredByEmployeeId: db.registered_by || undefined,
      createdAt: db.created_at || new Date().toISOString(),
    };
  }

  public mapToDb(c: Partial<Customer>): any {
    const db: any = {};
    if (c.id !== undefined) db.id = c.id;
    if (c.orgId !== undefined) db.org_id = c.orgId;
    if (c.branchId !== undefined) db.branch_id = c.branchId;
    if (c.serialId !== undefined) db.serial_id = c.serialId;
    if (c.code !== undefined) db.code = c.code;
    if (c.name !== undefined) db.name = c.name;
    if (c.phone !== undefined) db.phone = c.phone;
    if (c.email !== undefined) db.email = c.email;
    if (c.governorate !== undefined) db.governorate = c.governorate;
    if (c.city !== undefined) db.city = c.city;
    if (c.area !== undefined) db.area = c.area;
    if (c.streetAddress !== undefined) db.street_address = c.streetAddress;
    if (c.insuranceProvider !== undefined) db.insurance_provider = c.insuranceProvider;
    if (c.policyNumber !== undefined) db.policy_number = c.policyNumber;
    if (c.chronicConditions !== undefined) db.chronic_conditions = c.chronicConditions;
    if (c.totalPurchases !== undefined) db.total_purchases = c.totalPurchases;
    if (c.points !== undefined) db.points = c.points;
    if (c.lastVisit !== undefined) db.last_visit = c.lastVisit;
    if (c.notes !== undefined) db.notes = c.notes;
    if (c.status !== undefined) db.status = c.status;
    if (c.vip !== undefined) db.vip = c.vip;
    if (c.registeredByEmployeeId !== undefined) db.registered_by = c.registeredByEmployeeId;
    return db;
  }

  async getByPhone(phone: string, branchId?: string): Promise<Customer | null> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName)
        .select('*')
        .eq('phone', phone);
      
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data ? this.mapFromDb(data) : null;
    } catch (err) {
      console.error('[CustomerService] getByPhone failed:', err);
      return null;
    }
  }

  async filter(filters: CustomerFilters, branchId?: string): Promise<Customer[]> {
    if (filters.search) {
      return this.search(filters.search, branchId);
    }

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
      
      if (filters.isVip !== undefined) {
        query = query.eq('vip', filters.isVip);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => this.mapFromDb(item));
    } catch (err) {
      console.error('[CustomerService] filter failed:', err);
      return [];
    }
  }

  async create(customer: Omit<Customer, 'id'>, branchId?: string): Promise<Customer> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (customer as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newCustomer: Customer = {
      ...customer,
      id: idGenerator.uuid(),
      serialId: await idGenerator.generate('customers-serial', settings.activeBranchId || '', settings.branchCode),
      code: customer.code || idGenerator.code('CUST'),
      createdAt: new Date().toISOString(),
      points: customer.points || 0,
      totalPurchases: customer.totalPurchases || 0,
      branchId: effectiveBranchId,
      orgId: settings.orgId,
    } as Customer;

    const dbCustomer = this.mapToDb(newCustomer);
    const { error } = await supabase.from(this.tableName).insert(dbCustomer);
    if (error) throw error;

    return newCustomer;
  }

  async addLoyaltyPoints(id: string, points: number): Promise<Customer> {
    const customer = await this.getById(id);
    if (!customer) throw new Error('Customer not found');
    
    const updatedPoints = (customer.points || 0) + points;
    return this.update(id, { points: updatedPoints });
  }

  async redeemLoyaltyPoints(id: string, points: number): Promise<Customer> {
    const customer = await this.getById(id);
    if (!customer) throw new Error('Customer not found');
    
    const current = customer.points || 0;
    if (current < points) throw new Error('Insufficient points');
    
    const updatedPoints = current - points;
    return this.update(id, { points: updatedPoints });
  }

  async getStats(branchId?: string): Promise<CustomerStats> {
    const all = await this.getAll(branchId);
    return {
      totalCustomers: all.length,
      vipCustomers: all.filter((c) => c.vip).length,
      activeCustomers: all.filter((c) => (c.totalPurchases || 0) > 0).length,
      totalLoyaltyPoints: all.reduce((sum, c) => sum + (c.points || 0), 0),
    };
  }

  async getVip(branchId?: string): Promise<Customer[]> {
    return this.filter({ isVip: true }, branchId);
  }

  async save(customers: Customer[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const dbCustomers = customers.map(c => this.mapToDb({
      ...c,
      branchId: c.branchId || effectiveBranchId,
      orgId: c.orgId || settings.orgId
    }));

    if (dbCustomers.length > 0) {
      const { error } = await supabase.from(this.tableName).upsert(dbCustomers);
      if (error) throw error;
    }
  }
}

export const customerService = new CustomerServiceImpl();
