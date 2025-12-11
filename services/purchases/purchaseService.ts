/**
 * Purchase Service - Purchase order operations
 */

import { Purchase } from '../../types';
import { PurchaseService, PurchaseFilters, PurchaseStats } from './types';

const STORAGE_KEY = 'pharma_purchases';

export const createPurchaseService = (): PurchaseService => ({
  getAll: async (): Promise<Purchase[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getById: async (id: string): Promise<Purchase | null> => {
    const all = await purchaseService.getAll();
    return all.find(p => p.id === id) || null;
  },

  getBySupplier: async (supplierId: string): Promise<Purchase[]> => {
    const all = await purchaseService.getAll();
    return all.filter(p => p.supplierId === supplierId);
  },

  getPending: async (): Promise<Purchase[]> => {
    const all = await purchaseService.getAll();
    return all.filter(p => p.status === 'pending');
  },

  filter: async (filters: PurchaseFilters): Promise<Purchase[]> => {
    let results = await purchaseService.getAll();
    
    if (filters.status) {
      results = results.filter(p => p.status === filters.status);
    }
    if (filters.supplierId) {
      results = results.filter(p => p.supplierId === filters.supplierId);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      results = results.filter(p => new Date(p.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      results = results.filter(p => new Date(p.date) <= to);
    }
    return results;
  },

  create: async (purchase: Omit<Purchase, 'id'>): Promise<Purchase> => {
    const all = await purchaseService.getAll();
    const newPurchase: Purchase = { 
      ...purchase, 
      id: Date.now().toString(),
      status: 'pending'
    } as Purchase;
    all.push(newPurchase);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newPurchase;
  },

  update: async (id: string, updates: Partial<Purchase>): Promise<Purchase> => {
    const all = await purchaseService.getAll();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = { ...all[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[index];
  },

  approve: async (id: string, approverName: string): Promise<Purchase> => {
    const all = await purchaseService.getAll();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = { 
      ...all[index], 
      status: 'completed',
      approvedBy: approverName,
      approvalDate: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[index];
  },

  reject: async (id: string, reason: string): Promise<Purchase> => {
    const all = await purchaseService.getAll();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = { 
      ...all[index], 
      status: 'rejected'
      // Note: reason stored in service layer only, not in Purchase type
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[index];
  },

  receive: async (id: string): Promise<Purchase> => {
    const all = await purchaseService.getAll();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = { 
      ...all[index], 
      status: 'completed'
      // Note: receivedAt stored in service layer only, not in Purchase type
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await purchaseService.getAll();
    const filtered = all.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  getStats: async (): Promise<PurchaseStats> => {
    const all = await purchaseService.getAll();
    return {
      totalOrders: all.length,
      pendingOrders: all.filter(p => p.status === 'pending').length,
      totalValue: all.reduce((sum, p) => sum + (p.totalCost || 0), 0)
    };
  },

  save: async (purchases: Purchase[]): Promise<void> => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  }
});

export const purchaseService = createPurchaseService();
