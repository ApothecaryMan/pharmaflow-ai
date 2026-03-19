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

const getRawAll = (): Customer[] => {
  return storage.get<Customer[]>(StorageKeys.CUSTOMERS, []);
};

export const createCustomerService = (): CustomerService => ({
  getAll: async (branchId?: string): Promise<Customer[]> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((c) => c.branchId === effectiveBranchId);
  },

  getById: async (id: string, branchId?: string): Promise<Customer | null> => {
    const all = await customerService.getAll(branchId);
    return all.find((c) => c.id === id) || null;
  },

  getByPhone: async (phone: string, branchId?: string): Promise<Customer | null> => {
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
    // Note: hasCredit filter removed - Customer type doesn't have creditBalance
    return results;
  },

  create: async (customer: Omit<Customer, 'id'>, branchId?: string, skipSync = false): Promise<Customer> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (customer as any).branchId || settings.activeBranchId || settings.branchCode;
    const newCustomer: Customer = {
      ...customer,
      id: idGenerator.generate('customers', effectiveBranchId),
      createdAt: new Date().toISOString(),
      points: customer.points || 0,
      totalPurchases: customer.totalPurchases || 0,
      branchId: effectiveBranchId,
    } as Customer;
    all.push(newCustomer);
    storage.set(StorageKeys.CUSTOMERS, all);

    if (!skipSync) {
      await syncQueueService.enqueue('CUSTOMER', { action: 'CREATE_CUSTOMER', customer: newCustomer });
    }

    return newCustomer;
  },

  update: async (id: string, updates: Partial<Customer>, skipSync = false): Promise<Customer> => {
    const all = getRawAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    all[index] = { ...all[index], ...updates };
    storage.set(StorageKeys.CUSTOMERS, all);

    if (!skipSync) {
      await syncQueueService.enqueue('CUSTOMER', { action: 'UPDATE_CUSTOMER', id, updates });
    }

    return all[index];
  },

  delete: async (id: string, skipSync = false): Promise<boolean> => {
    const all = getRawAll();
    const initialLength = all.length;
    const filtered = all.filter((c) => c.id !== id);
    
    if (filtered.length !== initialLength) {
      storage.set(StorageKeys.CUSTOMERS, filtered);
      if (!skipSync) {
        await syncQueueService.enqueue('CUSTOMER', { action: 'DELETE_CUSTOMER', id });
      }
      return true;
    }
    return false;
  },

  addLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const all = getRawAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    all[index].points = (all[index].points || 0) + points;
    storage.set(StorageKeys.CUSTOMERS, all);
    return all[index];
  },

  redeemLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const all = getRawAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    const current = all[index].points || 0;
    if (current < points) throw new Error('Insufficient points');
    all[index].points = current - points;
    storage.set(StorageKeys.CUSTOMERS, all);
    return all[index];
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
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    const otherBranchItems = all.filter((c) => c.branchId && c.branchId !== effectiveBranchId);
    
    // Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...customers];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    storage.set(StorageKeys.CUSTOMERS, uniqueMerged);
  },
});

export const customerService = createCustomerService();
