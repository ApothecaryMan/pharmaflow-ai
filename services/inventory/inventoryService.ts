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
import { supabase } from '../../lib/supabase';

const MIGRATED_KEY = 'pharma_inventory_indexeddb_migrated';

const mapDrugToDb = (d: Partial<Drug>): any => {
  const db: any = {};
  if (d.id !== undefined) db.id = d.id;
  if (d.branchId !== undefined) db.branch_id = d.branchId;
  if (d.name !== undefined) db.name = d.name;
  if (d.nameArabic !== undefined) db.name_arabic = d.nameArabic;
  if (d.genericName !== undefined) db.generic_name = d.genericName;
  if (d.category !== undefined) db.category = d.category;
  if (d.price !== undefined) db.price = d.price;
  if (d.costPrice !== undefined) db.cost_price = d.costPrice;
  if (d.stock !== undefined) db.stock = d.stock;
  if (d.damagedStock !== undefined) db.damaged_stock = d.damagedStock;
  if (d.expiryDate !== undefined) db.expiry_date = d.expiryDate;
  if (d.description !== undefined) db.description = d.description;
  if (d.barcode !== undefined) db.barcode = d.barcode;
  if (d.internalCode !== undefined) db.internal_code = d.internalCode;
  if (d.unitsPerPack !== undefined) db.units_per_pack = d.unitsPerPack;
  if (d.supplierId !== undefined) db.supplier_id = d.supplierId;
  if (d.maxDiscount !== undefined) db.max_discount = d.maxDiscount;
  if (d.dosageForm !== undefined) db.dosage_form = d.dosageForm;
  if (d.minStock !== undefined) db.min_stock = d.minStock;
  if (d.origin !== undefined) db.origin = d.origin;
  if (d.manufacturer !== undefined) db.manufacturer = d.manufacturer;
  if (d.tax !== undefined) db.tax = d.tax;
  if (d.status !== undefined) db.status = d.status;
  return db;
};

const mapDbToDrug = (db: any): Drug => ({
  id: db.id,
  branchId: db.branch_id,
  name: db.name,
  nameArabic: db.name_arabic || undefined,
  genericName: db.generic_name || [],
  category: db.category,
  price: db.price,
  costPrice: db.cost_price,
  stock: db.stock,
  damagedStock: db.damaged_stock || 0,
  expiryDate: db.expiry_date || '',
  barcode: db.barcode || undefined,
  internalCode: db.internal_code || undefined,
  unitsPerPack: db.units_per_pack || 1,
  supplierId: db.supplier_id || undefined,
  maxDiscount: db.max_discount || undefined,
  dosageForm: db.dosage_form || undefined,
  minStock: db.min_stock || 0,
  origin: db.origin || undefined,
  manufacturer: db.manufacturer || undefined,
  tax: db.tax || 0,
  description: db.description || undefined,
  status: db.status || 'active',
});

const getRawAll = async (): Promise<Drug[]> => {
  try {
    const { data, error } = await supabase.from('drugs').select('*').limit(10000);
    if (!error && data) {
      const mapped = data.map(mapDbToDrug);
      
      const cached = await drugCacheService.loadAll();
      const cachedMap = new Map(cached.map(d => [d.id, d]));
      
      const finalMapped = mapped.map(d => {
        const c = (cachedMap.get(d.id) || {}) as Partial<Drug>;
        return {
          ...d,
          dbId: c.dbId,
          class: c.class,
          itemRank: c.itemRank,
        };
      });
      
      if (finalMapped.length > 0) {
        await drugCacheService.saveAll(finalMapped, finalMapped[0]?.branchId);
      }
      return finalMapped;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('Failed to fetch from supabase, fallback to local', err);
    }
  }

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
    try {
      const { data, error } = await supabase.from('drugs').select('*').eq('id', id).single();
      if (!error && data) {
        const mapped = mapDbToDrug(data);
        const cached = await drugCacheService.getById(id) || {};
        const finalDrug = { ...cached, ...mapped } as Drug;
        await drugCacheService.upsert(finalDrug);
        return finalDrug;
      }
    } catch {}

    return drugCacheService.getById(id);
  },

  getByBarcode: async (barcode: string, branchId?: string): Promise<Drug | null> => {
    try {
      const { data, error } = await supabase.from('drugs').select('*').eq('barcode', barcode).single();
      if (!error && data) {
        const mapped = mapDbToDrug(data);
        const cached = await drugCacheService.getById(mapped.id) || {};
        const finalDrug = { ...cached, ...mapped } as Drug;
        await drugCacheService.upsert(finalDrug);
        return finalDrug;
      }
    } catch {}

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
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (drug as any).branchId || settings.activeBranchId || settings.branchCode;
    const newDrug: Drug = {
      ...drug,
      id: idGenerator.generate('inventory', effectiveBranchId),
      branchId: effectiveBranchId,
    } as Drug;
    
    try {
      const dbDrug = mapDrugToDb(newDrug);
      const { error } = await supabase.from('drugs').insert(dbDrug);
      if (error && import.meta.env.DEV) console.warn('Supabase insert failed', error);
    } catch {}

    await drugCacheService.upsert(newDrug);

    await batchService.createBatch({
      drugId: newDrug.id,
      quantity: newDrug.stock,
      expiryDate: newDrug.expiryDate,
      costPrice: newDrug.costPrice,
      batchNumber: 'INITIAL',
      dateReceived: new Date().toISOString(),
      branchId: effectiveBranchId,
      version: 1,
    }, undefined, true);

    if (!skipSync) {
      await syncQueueService.enqueue('DRUG', { action: 'CREATE_DRUG', drug: newDrug });
    }

    return newDrug;
  },

  update: async (id: string, updates: Partial<Drug>, skipSync = false): Promise<Drug> => {
    const drug = await drugCacheService.getById(id);
    if (!drug) throw new Error('Drug not found');
    
    const updated = { ...drug, ...updates };

    try {
      const dbUpdates = mapDrugToDb(updates);
      const { error } = await supabase.from('drugs').update(dbUpdates).eq('id', id);
      if (error && import.meta.env.DEV) console.warn('Supabase update failed', error);
    } catch {}

    await drugCacheService.upsert(updated);

    if (!skipSync) {
      await syncQueueService.enqueue('DRUG', { action: 'UPDATE_DRUG', id, updates });
    }

    return updated;
  },

  updateStock: async (id: string, quantity: number, skipSync = false): Promise<Drug> => {
    const drug = await drugCacheService.getById(id);
    if (!drug) throw new Error('Drug not found');
    
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
      // BUG-S4: Check allocateStock result — null means insufficient stock
      const allocResult = await batchService.allocateStock(id, Math.abs(quantity), branchId, true);
      if (!allocResult) {
        throw new Error(`Insufficient batch stock to deduct ${Math.abs(quantity)} units from drug ${id}`);
      }
    }

    const updated = { ...drug, stock: Math.max(0, (drug.stock || 0) + quantity) };
    
    try {
      const dbUpdates = mapDrugToDb({ stock: updated.stock });
      const { error } = await supabase.from('drugs').update(dbUpdates).eq('id', id);
      if (error && import.meta.env.DEV) console.warn('Supabase stock update failed', error);
    } catch {}

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

    try {
      for (const m of mutations) {
         const drug = await drugCacheService.getById(m.id);
         if (drug) {
           await supabase.from('drugs').update({ stock: drug.stock }).eq('id', m.id);
         }
      }
    } catch {}

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_ADJUSTMENT', { action: 'UPDATE_STOCK_BULK', mutations });
    }
  },

  delete: async (id: string, skipSync = false): Promise<boolean> => {
    try {
      await supabase.from('drugs').delete().eq('id', id);
    } catch {}

    await drugCacheService.remove(id);
    
    if (!skipSync) {
      await syncQueueService.enqueue('DRUG', { action: 'DELETE_DRUG', id });
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
    
    try {
      const dbDrugs = inventory.map(mapDrugToDb);
      if (dbDrugs.length > 0) {
        await supabase.from('drugs').upsert(dbDrugs, { onConflict: 'id' });
      }
    } catch {}

    await drugCacheService.saveAll(inventory, effectiveBranchId);
  },
});

export const inventoryService = createInventoryService();
