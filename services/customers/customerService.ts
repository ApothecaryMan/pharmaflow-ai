/**
 * Customer Service - Customer CRUD and loyalty operations
 * Online-Only implementation using Supabase
 */

import { BaseDomainService } from '../core/BaseDomainService';
import type { Customer } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { supabase } from '../../lib/supabase';
import type { CustomerFilters, CustomerService, CustomerStats } from './types';

class CustomerServiceImpl extends BaseDomainService<Customer> implements CustomerService {
  protected tableName = 'customers';

  protected mapDbToDomain(db: any): Customer {
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

  protected mapDomainToDb(c: Partial<Customer>): any {
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

  async getAll(branchId?: string): Promise<Customer[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName).select('*');
      if (effectiveBranchId !== 'all') {
        query = query.eq('branch_id', effectiveBranchId);
      }
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error('[CustomerService] getAll failed:', err);
      return [];
    }
  }

  async getByPhone(phone: string, branchId?: string): Promise<Customer | null> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName)
        .select('*')
        .eq('phone', phone);
      
      if (effectiveBranchId !== 'all') {
        query = query.eq('branch_id', effectiveBranchId);
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data ? this.mapDbToDomain(data) : null;
    } catch (err) {
      console.error('[CustomerService] getByPhone failed:', err);
      return null;
    }
  }

  async search(query: string, branchId?: string): Promise<Customer[]> {
    const all = await this.getAll(branchId);
    const q = query.toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q)
    );
  }

  async filter(filters: CustomerFilters, branchId?: string): Promise<Customer[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName).select('*');
      
      if (effectiveBranchId !== 'all') {
        query = query.eq('branch_id', effectiveBranchId);
      }
      
      if (filters.search) {
        const q = filters.search.toLowerCase();
        // Since we can't easily do complex OR in a single .filter call with current search logic,
        // we'll fetch all and filter in JS for now or use .or()
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,code.ilike.%${q}%`);
      }
      
      if (filters.isVip !== undefined) {
        query = query.eq('vip', filters.isVip);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => this.mapDbToDomain(item));
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

    const dbCustomer = this.mapDomainToDb(newCustomer);
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
    
    const dbCustomers = customers.map(c => this.mapDomainToDb({
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
