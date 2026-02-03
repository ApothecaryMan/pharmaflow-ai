/**
 * Purchase Service - Purchase order operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Purchase, PurchaseStatus } from '../../types';
import { idGenerator } from '../../utils/idGenerator';

import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import type { PurchaseFilters, PurchaseService, PurchaseStats } from './types';

const getRawAll = (): Purchase[] => {
  return storage.get<Purchase[]>(StorageKeys.PURCHASES, []);
};

export const createPurchaseService = (): PurchaseService => ({
  getAll: async (): Promise<Purchase[]> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    return all.filter((p) => !p.branchId || p.branchId === branchCode);
  },

  getById: async (id: string): Promise<Purchase | null> => {
    const all = await purchaseService.getAll();
    return all.find((p) => p.id === id) || null;
  },

  getBySupplier: async (supplierId: string): Promise<Purchase[]> => {
    const all = await purchaseService.getAll();
    return all.filter((p) => p.supplierId === supplierId);
  },

  getByStatus: async (status: PurchaseStatus): Promise<Purchase[]> => {
    const all = await purchaseService.getAll();
    return all.filter((p) => p.status === status);
  },

  getPending: async (): Promise<Purchase[]> => {
    const all = await purchaseService.getAll();
    return all.filter((p) => p.status === 'pending');
  },

  filter: async (filters: PurchaseFilters): Promise<Purchase[]> => {
    let results = await purchaseService.getAll();

    if (filters.status) {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters.supplierId) {
      results = results.filter((p) => p.supplierId === filters.supplierId);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      results = results.filter((p) => new Date(p.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      results = results.filter((p) => new Date(p.date) <= to);
    }
    return results;
  },

  create: async (purchase: Omit<Purchase, 'id'>): Promise<Purchase> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const newPurchase: Purchase = {
      ...purchase,
      id: Date.now().toString(),
      status: 'pending',
      branchId: settings.branchCode,
    } as Purchase;
    all.push(newPurchase);
    storage.set(StorageKeys.PURCHASES, all);
    return newPurchase;
  },

  update: async (id: string, updates: Partial<Purchase>): Promise<Purchase> => {
    const all = getRawAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = { ...all[index], ...updates };
    storage.set(StorageKeys.PURCHASES, all);
    return all[index];
  },

  approve: async (id: string, approverName: string): Promise<Purchase> => {
    const all = getRawAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = {
      ...all[index],
      status: 'completed',
      approvedBy: approverName,
      approvalDate: new Date().toISOString(),
    };
    storage.set(StorageKeys.PURCHASES, all);
    return all[index];
  },

  reject: async (id: string, reason: string): Promise<Purchase> => {
    const all = getRawAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = {
      ...all[index],
      status: 'rejected',
      // Note: reason stored in service layer only, not in Purchase type
    };
    storage.set(StorageKeys.PURCHASES, all);
    return all[index];
  },

  receive: async (id: string): Promise<Purchase> => {
    const all = getRawAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = {
      ...all[index],
      status: 'completed',
      // Note: receivedAt stored in service layer only, not in Purchase type
    };
    storage.set(StorageKeys.PURCHASES, all);
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = getRawAll();
    const filtered = all.filter((p) => p.id !== id);
    storage.set(StorageKeys.PURCHASES, filtered);
    return true;
  },

  getStats: async (): Promise<PurchaseStats> => {
    const all = await purchaseService.getAll();
    return {
      totalOrders: all.length,
      pendingOrders: all.filter((p) => p.status === 'pending').length,
      totalValue: all.reduce((sum, p) => sum + (p.totalCost || 0), 0),
    };
  },

  save: async (purchases: Purchase[]): Promise<void> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    const otherBranchItems = all.filter((p) => p.branchId && p.branchId !== branchCode);
    const merged = [...otherBranchItems, ...purchases];
    storage.set(StorageKeys.PURCHASES, merged);
  },
});

export const purchaseService = createPurchaseService();
