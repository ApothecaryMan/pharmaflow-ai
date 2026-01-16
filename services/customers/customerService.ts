/**
 * Customer Service - Customer CRUD and loyalty operations
 */

import { Customer } from '../../types';
import { CustomerService, CustomerFilters, CustomerStats } from './types';

import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

import { idGenerator } from '../../utils/idGenerator';

export const createCustomerService = (): CustomerService => ({
  getAll: async (): Promise<Customer[]> => {
    return storage.get<Customer[]>(StorageKeys.CUSTOMERS, []);
  },

  getById: async (id: string): Promise<Customer | null> => {
    const all = await customerService.getAll();
    return all.find(c => c.id === id) || null;
  },

  getByPhone: async (phone: string): Promise<Customer | null> => {
    const all = await customerService.getAll();
    return all.find(c => c.phone === phone) || null;
  },

  search: async (query: string): Promise<Customer[]> => {
    const all = await customerService.getAll();
    const q = query.toLowerCase();
    return all.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q)
    );
  },

  filter: async (filters: CustomerFilters): Promise<Customer[]> => {
    let results = await customerService.getAll();
    
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
    if (filters.isVip !== undefined) {
      results = results.filter(c => c.vip === filters.isVip);
    }
    // Note: hasCredit filter removed - Customer type doesn't have creditBalance
    return results;
  },

  create: async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    const all = await customerService.getAll();
    const newCustomer: Customer = { 
      ...customer, 
      id: idGenerator.generate('customers'),
      createdAt: new Date().toISOString(),
      points: customer.points || 0,
      totalPurchases: customer.totalPurchases || 0
    } as Customer;
    all.push(newCustomer);
    storage.set(StorageKeys.CUSTOMERS, all);
    return newCustomer;
  },

  update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    const all = await customerService.getAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    all[index] = { ...all[index], ...updates };
    storage.set(StorageKeys.CUSTOMERS, all);
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await customerService.getAll();
    const filtered = all.filter(c => c.id !== id);
    storage.set(StorageKeys.CUSTOMERS, filtered);
    return true;
  },

  addLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const all = await customerService.getAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    all[index].points = (all[index].points || 0) + points;
    storage.set(StorageKeys.CUSTOMERS, all);
    return all[index];
  },

  redeemLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const all = await customerService.getAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    const current = all[index].points || 0;
    if (current < points) throw new Error('Insufficient points');
    all[index].points = current - points;
    storage.set(StorageKeys.CUSTOMERS, all);
    return all[index];
  },

  getStats: async (): Promise<CustomerStats> => {
    const all = await customerService.getAll();
    return {
      totalCustomers: all.length,
      vipCustomers: all.filter(c => c.vip).length,
      activeCustomers: all.filter(c => (c.totalPurchases || 0) > 0).length,
      totalLoyaltyPoints: all.reduce((sum, c) => sum + (c.points || 0), 0)
    };
  },

  getVip: async (): Promise<Customer[]> => {
    const all = await customerService.getAll();
    return all.filter(c => c.vip);
  },

  save: async (customers: Customer[]): Promise<void> => {
    storage.set(StorageKeys.CUSTOMERS, customers);
  }
});

export const customerService = createCustomerService();
