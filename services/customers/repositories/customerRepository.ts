import { supabase } from '../../../lib/supabase';
import type { Customer } from '../../../types';
import type { CustomerFilters } from '../types';

export const customerRepository = {
  tableName: 'customers',

  mapFromDb(db: any): Customer {
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
  },

  mapToDb(c: Partial<Customer>): any {
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
  },

  async getAll(effectiveBranchId: string, orgId?: string): Promise<Customer[]> {
    let query = supabase.from(this.tableName).select('*');
    const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
    
    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(item => this.mapFromDb(item));
  },

  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase.from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async getByPhone(phone: string, effectiveBranchId: string, orgId?: string): Promise<Customer | null> {
    let query = supabase.from(this.tableName).select('*').eq('phone', phone);
    const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
    
    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async findByFilters(filters: CustomerFilters, effectiveBranchId: string, orgId?: string): Promise<Customer[]> {
    let query = supabase.from(this.tableName).select('*');
    const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
    
    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && orgId) {
      query = query.eq('org_id', orgId);
    }
    
    if (filters.isVip !== undefined) query = query.eq('vip', filters.isVip);
    if (filters.status) query = query.eq('status', filters.status);
    
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(item => this.mapFromDb(item));
  },

  async insert(customer: Customer): Promise<void> {
    const { error } = await supabase.from(this.tableName).insert(this.mapToDb(customer));
    if (error) throw error;
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase.from(this.tableName)
      .update(this.mapToDb(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapFromDb(data);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async upsert(customers: Customer[]): Promise<void> {
    if (customers.length === 0) return;
    const dbCustomers = customers.map(c => this.mapToDb(c));
    const { error } = await supabase.from(this.tableName).upsert(dbCustomers);
    if (error) throw error;
  }
};
