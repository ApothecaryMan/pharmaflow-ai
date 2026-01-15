/**
 * Customer Service - Customer CRUD and loyalty operations
 */

import { Customer } from '../../types';
import { CustomerService, CustomerFilters, CustomerStats } from './types';

const STORAGE_KEY = 'pharma_customers';

export const createCustomerService = (): CustomerService => ({
  getAll: async (): Promise<Customer[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      points: customer.points || 0,
      totalPurchases: customer.totalPurchases || 0
    } as Customer;
    all.push(newCustomer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newCustomer;
  },

  update: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    const all = await customerService.getAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    all[index] = { ...all[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await customerService.getAll();
    const filtered = all.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  addLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const all = await customerService.getAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    all[index].points = (all[index].points || 0) + points;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[index];
  },

  redeemLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const all = await customerService.getAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    const current = all[index].points || 0;
    if (current < points) throw new Error('Insufficient points');
    all[index].points = current - points;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  }
});

export const customerService = createCustomerService();
