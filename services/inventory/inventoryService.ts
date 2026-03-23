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
import { syncQueueService } from '../syncQueueService';
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
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
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

  create: async (drug: Omit<Drug, 'id'>, branchId?: string, skipSync = false): Promise<Drug> => {
    // Priority: explicit param > entity's own branchId > settingsService fallback
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (drug as any).branchId || settings.activeBranchId || settings.branchCode;
    const newDrug: Drug = {
      ...drug,
      id: idGenerator.generate('inventory', effectiveBranchId),
      branchId: effectiveBranchId,
    } as Drug;
    
    await drugCacheService.upsert(newDrug);

    // Create initial stock batch for the new drug
    await batchService.createBatch({
      drugId: newDrug.id,
      quantity: newDrug.stock,
      expiryDate: newDrug.expiryDate,
      costPrice: newDrug.costPrice,
      batchNumber: 'INITIAL',
      dateReceived: new Date().toISOString(),
      branchId: effectiveBranchId,
      version: 1,
    }, undefined, true); // skipSync=true because drug create sync covers initial state

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_ADJUSTMENT', { action: 'CREATE_DRUG', drug: newDrug });
    }

    return newDrug;
  },

  update: async (id: string, updates: Partial<Drug>, skipSync = false): Promise<Drug> => {
    const drug = await drugCacheService.getById(id);
    if (!drug) throw new Error('Drug not found');
    
    const updated = { ...drug, ...updates };
    await drugCacheService.upsert(updated);

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_ADJUSTMENT', { action: 'UPDATE_DRUG', id, updates });
    }

    return updated;
  },

  updateStock: async (id: string, quantity: number, skipSync = false): Promise<Drug> => {
    const drug = await drugCacheService.getById(id);
    if (!drug) throw new Error('Drug not found');
    
    // 1. Update Batch System
    const settings = await settingsService.getAll();
    const branchId = drug.branchId || settings.activeBranchId || settings.branchCode;
    
    if (quantity > 0) {
      await batchService.createBatch({
        drugId: id,
        quantity: quantity,
        expiryDate: drug.expiryDate,
        costPrice: drug.costPrice,
        batchNumber: 'STOCK-UPDATE',
        dateReceived: new Date().toISOString(),
        branchId: branchId,
        version: 1,
      }, branchId, true);
    } else if (quantity < 0) {
      await batchService.allocateStock(id, Math.abs(quantity), branchId, true);
    }

    // 2. Update Drug Record
    const updated = { ...drug, stock: (drug.stock || 0) + quantity };
    await drugCacheService.upsert(updated);

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_ADJUSTMENT', { action: 'UPDATE_STOCK', id, quantity });
    }

    return updated;
  },

  updateStockBulk: async (
    mutations: { id: string; quantity: number }[],
    skipSync = false
  ): Promise<void> => {
    await drugCacheService.updateStockBulk(mutations);

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_ADJUSTMENT', { action: 'UPDATE_STOCK_BULK', mutations });
    }
  },

  delete: async (id: string, skipSync = false): Promise<boolean> => {
    await drugCacheService.remove(id);
    
    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_ADJUSTMENT', { action: 'DELETE_DRUG', id });
    }

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

  save: async (inventory: Drug[], branchId?: string): Promise<void> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    // Use the branch-aware saveAll from drugCacheService which 
    // handles atomic deletion of old branch records.
    await drugCacheService.saveAll(inventory, effectiveBranchId);
  },
});

export const inventoryService = createInventoryService();
