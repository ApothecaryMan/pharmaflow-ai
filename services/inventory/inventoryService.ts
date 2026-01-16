/**
 * Inventory Service - Drug/Product CRUD operations
 */

import { Drug } from '../../types';
import { InventoryService, InventoryFilters, InventoryStats } from './types';

import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

import { idGenerator } from '../../utils/idGenerator';

export const createInventoryService = (): InventoryService => ({
  getAll: async (): Promise<Drug[]> => {
    return storage.get<Drug[]>(StorageKeys.INVENTORY, []);
  },

  getById: async (id: string): Promise<Drug | null> => {
    const all = await inventoryService.getAll();
    return all.find(d => d.id === id) || null;
  },

  getByBarcode: async (barcode: string): Promise<Drug | null> => {
    const all = await inventoryService.getAll();
    return all.find(d => d.barcode === barcode) || null;
  },

  search: async (query: string): Promise<Drug[]> => {
    const all = await inventoryService.getAll();
    const q = query.toLowerCase();
    return all.filter(d => 
      d.name.toLowerCase().includes(q) ||
      d.genericName?.toLowerCase().includes(q) ||
      d.barcode?.includes(q) ||
      d.internalCode?.toLowerCase().includes(q)
    );
  },

  filter: async (filters: InventoryFilters): Promise<Drug[]> => {
    let results = await inventoryService.getAll();
    
    if (filters.category) {
      results = results.filter(d => d.category === filters.category);
    }
    if (filters.lowStock) {
      results = results.filter(d => d.stock < 10);
    }
    if (filters.expiringSoon) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + filters.expiringSoon);
      results = results.filter(d => new Date(d.expiryDate) <= threshold);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.genericName?.toLowerCase().includes(q)
      );
    }
    return results;
  },

  create: async (drug: Omit<Drug, 'id'>): Promise<Drug> => {
    const all = await inventoryService.getAll();
    const newDrug: Drug = { ...drug, id: idGenerator.generate('inventory') } as Drug;
    all.push(newDrug);
    storage.set(StorageKeys.INVENTORY, all);
    return newDrug;
  },

  update: async (id: string, updates: Partial<Drug>): Promise<Drug> => {
    const all = await inventoryService.getAll();
    const index = all.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Drug not found');
    all[index] = { ...all[index], ...updates };
    storage.set(StorageKeys.INVENTORY, all);
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await inventoryService.getAll();
    const filtered = all.filter(d => d.id !== id);
    storage.set(StorageKeys.INVENTORY, filtered);
    return true;
  },

  updateStock: async (id: string, quantity: number): Promise<Drug> => {
    const all = await inventoryService.getAll();
    const index = all.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Drug not found');
    all[index].stock += quantity;
    storage.set(StorageKeys.INVENTORY, all);
    return all[index];
  },

  getStats: async (): Promise<InventoryStats> => {
    const all = await inventoryService.getAll();
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      totalProducts: all.length,
      totalValue: all.reduce((sum, d) => sum + (d.price * d.stock), 0),
      lowStockCount: all.filter(d => d.stock < 10 && d.stock > 0).length,
      expiringSoonCount: all.filter(d => new Date(d.expiryDate) <= thirtyDays).length,
      outOfStockCount: all.filter(d => d.stock === 0).length
    };
  },

  getLowStock: async (threshold = 10): Promise<Drug[]> => {
    const all = await inventoryService.getAll();
    return all.filter(d => d.stock < threshold);
  },

  getExpiringSoon: async (days = 30): Promise<Drug[]> => {
    const all = await inventoryService.getAll();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return all.filter(d => new Date(d.expiryDate) <= threshold);
  },

  save: async (inventory: Drug[]): Promise<void> => {
    storage.set(StorageKeys.INVENTORY, inventory);
  }
});

export const inventoryService = createInventoryService();
