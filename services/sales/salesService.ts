/**
 * Sales Service - Sales transaction operations
 */

import { Sale } from '../../types';
import { SalesService, SalesFilters, SalesStats } from './types';

import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

import { idGenerator } from '../../utils/idGenerator';

export const createSalesService = (): SalesService => ({
  getAll: async (): Promise<Sale[]> => {
    return storage.get<Sale[]>(StorageKeys.SALES, []);
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
    const newSale: Sale = { ...sale, id: idGenerator.generate('sales') } as Sale;
    all.push(newSale);
    storage.set(StorageKeys.SALES, all);
    return newSale;
  },

  update: async (id: string, updates: Partial<Sale>): Promise<Sale> => {
    const all = await salesService.getAll();
    const index = all.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Sale not found');
    all[index] = { ...all[index], ...updates };
    storage.set(StorageKeys.SALES, all);
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await salesService.getAll();
    const filtered = all.filter(s => s.id !== id);
    storage.set(StorageKeys.SALES, filtered);
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
    storage.set(StorageKeys.SALES, sales);
  }
});

export const salesService = createSalesService();
