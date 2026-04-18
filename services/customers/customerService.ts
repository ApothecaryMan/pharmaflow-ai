/**
 * Customer Service - Customer CRUD and loyalty operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Customer } from '../../types';
import { idGenerator } from '../../utils/idGenerator';

import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { syncQueueService } from '../syncQueueService';
import type { CustomerFilters, CustomerService, CustomerStats } from './types';
import { supabase } from '../../lib/supabase';

const mapCustomerToDb = (c: Partial<Customer>): any => {
  const db: any = {};
  if (c.id !== undefined) db.id = c.id;
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
};

const mapDbToCustomer = (db: any): Customer => ({
  id: db.id,
  branchId: db.branch_id,
  serialId: db.serial_id,
  code: db.code,
  name: db.name,
  phone: db.phone,
  email: db.email || undefined,
  governorate: db.governorate || undefined,
  city: db.city || undefined,
  area: db.area || undefined,
  streetAddress: db.street_address || undefined,
  insuranceProvider: db.insurance_provider || undefined,
  policyNumber: db.policy_number || undefined,
  preferredLocation: undefined, // Not in DB schema
  preferredContact: undefined, // Not in DB schema
  chronicConditions: db.chronic_conditions || [],
  totalPurchases: Number(db.total_purchases) || 0,
  points: Number(db.points) || 0,
  lastVisit: db.last_visit || new Date().toISOString(),
  notes: db.notes || undefined,
  status: db.status || 'active',
  vip: db.vip || false,
  registeredByEmployeeId: db.registered_by || undefined,
  createdAt: db.created_at || new Date().toISOString(),
});

const getRawAll = async (): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase.from('customers').select('*').limit(10000);
    if (!error && data) {
      const mapped = data.map(mapDbToCustomer);
      
      const cached = storage.get<Customer[]>(StorageKeys.CUSTOMERS, []);
      const cachedMap = new Map(cached.map(c => [c.id, c]));
      
      const finalMapped = mapped.map(c => {
        const local = cachedMap.get(c.id) || ({} as any);
        return {
          ...c,
          preferredLocation: local.preferredLocation,
          preferredContact: local.preferredContact,
        };
      });
      
      storage.set(StorageKeys.CUSTOMERS, finalMapped);
      return finalMapped;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('Failed to fetch customers from Supabase, falling back to cache', err);
    }
  }

  return storage.get<Customer[]>(StorageKeys.CUSTOMERS, []);
};

export const createCustomerService = (): CustomerService => ({
  getAll: async (branchId?: string): Promise<Customer[]> => {
    const all = await getRawAll();
    if (branchId === 'all') return all;
    
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((c) => c.branchId === effectiveBranchId);
  },

  getById: async (id: string, branchId?: string): Promise<Customer | null> => {
    try {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
      if (!error && data) {
        const mapped = mapDbToCustomer(data);
        const cached = storage.get<Customer[]>(StorageKeys.CUSTOMERS, []).find(c => c.id === id) || ({} as any);
        const finalCustomer = { ...cached, ...mapped } as Customer;
        
        // update cache
        const all = storage.get<Customer[]>(StorageKeys.CUSTOMERS, []);
        const index = all.findIndex((c) => c.id === id);
        if (index >= 0) all[index] = finalCustomer;
        else all.push(finalCustomer);
        storage.set(StorageKeys.CUSTOMERS, all);
        
        return finalCustomer;
      }
    } catch {}

    const all = await customerService.getAll(branchId);
    return all.find((c) => c.id === id) || null;
  },

  getByPhone: async (phone: string, branchId?: string): Promise<Customer | null> => {
    try {
      const { data, error } = await supabase.from('customers').select('*').eq('phone', phone).single();
      if (!error && data) {
        return mapDbToCustomer(data);
      }
    } catch {}

    const all = await customerService.getAll(branchId);
    return all.find((c) => c.phone === phone) || null;
  },

  search: async (query: string, branchId?: string): Promise<Customer[]> => {
    const all = await customerService.getAll(branchId);
    const q = query.toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q)
    );
  },

  filter: async (filters: CustomerFilters, branchId?: string): Promise<Customer[]> => {
    let results = await customerService.getAll(branchId);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q));
    }
    if (filters.isVip !== undefined) {
      results = results.filter((c) => c.vip === filters.isVip);
    }
    return results;
  },

  create: async (customer: Omit<Customer, 'id'>, branchId?: string, skipSync = false): Promise<Customer> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (customer as any).branchId || settings.activeBranchId || settings.branchCode;
    
    // Centralized ID and Code Generation
    const newCustomer: Customer = {
      ...customer,
      id: idGenerator.uuid(),
      serialId: idGenerator.generate('customers-serial', effectiveBranchId),
      code: customer.code || idGenerator.code('CUST'),
      createdAt: new Date().toISOString(),
      points: customer.points || 0,
      totalPurchases: customer.totalPurchases || 0,
      branchId: effectiveBranchId,
    } as Customer;
    
    try {
      const dbCustomer = mapCustomerToDb(newCustomer);
      const { error } = await supabase.from('customers').insert(dbCustomer);
      if (error && import.meta.env.DEV) console.warn('Supabase insert failed', error);
    } catch {}

    const all = await getRawAll();
    all.push(newCustomer);
    storage.set(StorageKeys.CUSTOMERS, all);

    if (!skipSync) {
      await syncQueueService.enqueue('CUSTOMER', { action: 'CREATE_CUSTOMER', customer: newCustomer });
    }

    return newCustomer;
  },

  update: async (id: string, updates: Partial<Customer>, skipSync = false): Promise<Customer> => {
    const all = await getRawAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    
    const updated = { ...all[index], ...updates };

    try {
      const dbUpdates = mapCustomerToDb(updates);
      const { error } = await supabase.from('customers').update(dbUpdates).eq('id', id);
      if (error && import.meta.env.DEV) console.warn('Supabase update failed', error);
    } catch {}

    all[index] = updated;
    storage.set(StorageKeys.CUSTOMERS, all);

    if (!skipSync) {
      await syncQueueService.enqueue('CUSTOMER', { action: 'UPDATE_CUSTOMER', id, updates });
    }

    return updated;
  },

  delete: async (id: string, skipSync = false): Promise<boolean> => {
    const all = await getRawAll();
    const initialLength = all.length;
    const filtered = all.filter((c) => c.id !== id);
    
    if (filtered.length !== initialLength) {
      try {
        await supabase.from('customers').delete().eq('id', id);
      } catch {}

      storage.set(StorageKeys.CUSTOMERS, filtered);
      
      if (!skipSync) {
        await syncQueueService.enqueue('CUSTOMER', { action: 'DELETE_CUSTOMER', id });
      }
      return true;
    }
    return false;
  },

  addLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const all = await getRawAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    
    const updated = { ...all[index], points: (all[index].points || 0) + points };
    
    try {
      await supabase.from('customers').update({ points: updated.points }).eq('id', id);
    } catch {}

    all[index] = updated;
    storage.set(StorageKeys.CUSTOMERS, all);
    return updated;
  },

  redeemLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const all = await getRawAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    
    const current = all[index].points || 0;
    if (current < points) throw new Error('Insufficient points');
    
    const updated = { ...all[index], points: current - points };
    
    try {
      await supabase.from('customers').update({ points: updated.points }).eq('id', id);
    } catch {}

    all[index] = updated;
    storage.set(StorageKeys.CUSTOMERS, all);
    return updated;
  },

  getStats: async (branchId?: string): Promise<CustomerStats> => {
    const all = await customerService.getAll(branchId);
    return {
      totalCustomers: all.length,
      vipCustomers: all.filter((c) => c.vip).length,
      activeCustomers: all.filter((c) => (c.totalPurchases || 0) > 0).length,
      totalLoyaltyPoints: all.reduce((sum, c) => sum + (c.points || 0), 0),
    };
  },

  getVip: async (branchId?: string): Promise<Customer[]> => {
    const all = await customerService.getAll(branchId);
    return all.filter((c) => c.vip);
  },

  save: async (customers: Customer[], branchId?: string): Promise<void> => {
    const all = storage.get<Customer[]>(StorageKeys.CUSTOMERS, []);
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      const dbCustomers = customers.map(mapCustomerToDb);
      if (dbCustomers.length > 0) {
        await supabase.from('customers').upsert(dbCustomers, { onConflict: 'id' });
      }
    } catch {}

    // 1. Keep items from OTHER branches
    const otherBranchItems = all.filter((c) => c.branchId && c.branchId !== effectiveBranchId);
    
    // 2. Prepare Branch Items
    const branchItems = customers.map(c => ({ ...c, branchId: effectiveBranchId }));
    
    // 3. Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...branchItems];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    storage.set(StorageKeys.CUSTOMERS, uniqueMerged);
  },
});

export const customerService = createCustomerService();
