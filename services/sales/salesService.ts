/**
 * Sales Service - Sales transaction operations
 */

import { Sale } from '../../types';
import { SalesService, SalesFilters, SalesStats } from './types';

const STORAGE_KEY = 'pharma_sales';

export const createSalesService = (): SalesService => ({
  getAll: async (): Promise<Sale[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getById: async (id: string): Promise<Sale | null> => {
    const all = await salesService.getAll();
    return all.find(s => s.id === id) || null;
  },

  getByCustomer: async (customerId: string): Promise<Sale[]> => {
    const all = await salesService.getAll();
    return all.filter(s => s.customerCode === customerId);
  },

  getByDateRange: async (from: string, to: string): Promise<Sale[]> => {
    const all = await salesService.getAll();
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return all.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  },

  getToday: async (): Promise<Sale[]> => {
    const all = await salesService.getAll();
    const today = new Date().toISOString().split('T')[0];
    return all.filter(s => s.date.startsWith(today));
  },

  create: async (sale: Omit<Sale, 'id'>): Promise<Sale> => {
    const all = await salesService.getAll();
    const newSale: Sale = { ...sale, id: Date.now().toString() } as Sale;
    all.push(newSale);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newSale;
  },

  update: async (id: string, updates: Partial<Sale>): Promise<Sale> => {
    const all = await salesService.getAll();
    const index = all.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Sale not found');
    all[index] = { ...all[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await salesService.getAll();
    const filtered = all.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  getStats: async (): Promise<SalesStats> => {
    const all = await salesService.getAll();
    const today = new Date().toISOString().split('T')[0];
    const todaySales = all.filter(s => s.date.startsWith(today));
    
    return {
      totalSales: all.length,
      totalRevenue: all.reduce((sum, s) => sum + s.total, 0),
      averageTransaction: all.length > 0 ? all.reduce((sum, s) => sum + s.total, 0) / all.length : 0,
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0)
    };
  },

  filter: async (filters: SalesFilters): Promise<Sale[]> => {
    let results = await salesService.getAll();
    
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      results = results.filter(s => new Date(s.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      results = results.filter(s => new Date(s.date) <= to);
    }
    if (filters.customerCode) {
      results = results.filter(s => s.customerCode === filters.customerCode);
    }
    if (filters.paymentMethod) {
      results = results.filter(s => s.paymentMethod === filters.paymentMethod);
    }
    if (filters.minAmount !== undefined) {
      results = results.filter(s => s.total >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      results = results.filter(s => s.total <= filters.maxAmount!);
    }
    return results;
  },

  save: async (sales: Sale[]): Promise<void> => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  }
});

export const salesService = createSalesService();
