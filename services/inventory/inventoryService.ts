/**
 * Inventory Service - Drug/Product CRUD operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Drug } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { validateStock } from '../../utils/inventory';
import * as batchService from './batchService';
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';

import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import type { InventoryFilters, InventoryService, InventoryStats } from './types';
import { drugCacheService } from './drugCacheService';

const MIGRATED_KEY = 'pharma_inventory_indexeddb_migrated';

const getRawAll = async (): Promise<Drug[]> => {
  // Try to load from IndexedDB
  let drugs = await drugCacheService.loadAll();

  // Migration Logic: If empty and not migrated, check localStorage
  if (drugs.length === 0 && !storage.get<boolean>(MIGRATED_KEY, false)) {
    const oldData = storage.get<Drug[]>(StorageKeys.INVENTORY, []);
    if (oldData.length > 0) {
      console.log(`📦 Migrating ${oldData.length} drugs from localStorage to IndexedDB...`);
      await drugCacheService.saveAll(oldData);
      drugs = oldData;
    }
    storage.set(MIGRATED_KEY, true);
  }

  return drugs;
};

export const createInventoryService = (): InventoryService => ({
  getAll: async (branchId?: string): Promise<Drug[]> => {
    const all = await getRawAll();
    const effectiveBranchId = branchId || (await settingsService.getAll()).branchCode;
    return all.filter((d) => d.branchId === effectiveBranchId);
  },

  getAllBranches: async (branchId?: string): Promise<Drug[]> => {
    const all = await getRawAll();
    if (branchId) {
      return all.filter((d) => d.branchId === branchId);
    }
    return all;
  },

  getById: async (id: string): Promise<Drug | null> => {
    return drugCacheService.getById(id);
  },

  getByBarcode: async (barcode: string, branchId?: string): Promise<Drug | null> => {
    const all = await inventoryService.getAll(branchId);
    return all.find((d) => d.barcode === barcode) || null;
  },

  search: async (query: string, branchId?: string): Promise<Drug[]> => {
    const all = await inventoryService.getAll(branchId);
    const q = query.toLowerCase();
    return all.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.genericName && d.genericName.some(g => g.toLowerCase().includes(q))) ||
        d.barcode?.includes(q) ||
        d.internalCode?.toLowerCase().includes(q)
    );
  },

  filter: async (filters: InventoryFilters, branchId?: string): Promise<Drug[]> => {
    let results = await inventoryService.getAll(branchId);

    if (filters.category) {
      results = results.filter((d) => d.category === filters.category);
    }
    if (filters.lowStock) {
      results = results.filter((d) => d.stock < 10);
    }
    if (filters.expiringSoon) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + filters.expiringSoon);
      results = results.filter((d) => parseExpiryEndOfMonth(d.expiryDate) <= threshold);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (d) => d.name.toLowerCase().includes(q) || (d.genericName && d.genericName.some(g => g.toLowerCase().includes(q)))
      );
    }
    return results;
  },

  create: async (drug: Omit<Drug, 'id'>, branchId?: string): Promise<Drug> => {
    const effectiveBranchId = branchId || (await settingsService.getAll()).branchCode;
    const newDrug: Drug = {
      ...drug,
      id: idGenerator.generate('inventory'),
      branchId: effectiveBranchId,
    } as Drug;
    
    await drugCacheService.upsert(newDrug);

    // Create initial stock batch for the new drug
    batchService.createBatch({
      drugId: newDrug.id,
      quantity: newDrug.stock,
      expiryDate: newDrug.expiryDate,
      costPrice: newDrug.costPrice,
      batchNumber: 'INITIAL',
      dateReceived: new Date().toISOString(),
    });

    return newDrug;
  },

  update: async (id: string, updates: Partial<Drug>): Promise<Drug> => {
    const drug = await drugCacheService.getById(id);
    if (!drug) throw new Error('Drug not found');
    
    const updated = { ...drug, ...updates };
    await drugCacheService.upsert(updated);
    return updated;
  },

  updateStock: async (id: string, quantity: number): Promise<Drug> => {
    const drug = await drugCacheService.getById(id);
    if (!drug) throw new Error('Drug not found');
    
    const updated = { ...drug, stock: (drug.stock || 0) + quantity };
    await drugCacheService.upsert(updated);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    await drugCacheService.remove(id);
    return true;
  },

  getStats: async (branchId?: string): Promise<InventoryStats> => {
    const all = await inventoryService.getAll(branchId);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      totalProducts: all.length,
      totalValue: all.reduce((sum, d) => sum + d.price * d.stock, 0),
      lowStockCount: all.filter((d) => d.stock < 10 && d.stock > 0).length,
      expiringSoonCount: all.filter((d) => parseExpiryEndOfMonth(d.expiryDate) <= thirtyDays).length,
      outOfStockCount: all.filter((d) => d.stock === 0).length,
    };
  },

  getLowStock: async (threshold = 10, branchId?: string): Promise<Drug[]> => {
    const all = await inventoryService.getAll(branchId);
    return all.filter((d) => d.stock < threshold);
  },

  getExpiringSoon: async (days = 30, branchId?: string): Promise<Drug[]> => {
    const all = await inventoryService.getAll(branchId);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return all.filter((d) => parseExpiryEndOfMonth(d.expiryDate) <= threshold);
  },

  save: async (inventory: Drug[]): Promise<void> => {
    // Note: We avoid doing full-array save in the new architecture 
    // to benefit from differential writes, but we keep this for compatibility 
    // with parts of the app that still use bulk replacement.
    const all = await drugCacheService.loadAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    const otherBranchItems = all.filter((d) => d.branchId && d.branchId !== branchCode);

    const merged = [...otherBranchItems, ...inventory];
    await drugCacheService.saveAll(merged);
  },
});

export const inventoryService = createInventoryService();
