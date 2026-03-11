/**
 * Sales Service - Sales transaction operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Sale } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { getAllShardKeys, getPreviousShardKeys, getShardKey } from '../../utils/sharding';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import type { SalesFilters, SalesService, SalesStats } from './types';

const getShardForDate = (date: string | Date): Sale[] => {
  const key = getShardKey(StorageKeys.SALES, date);
  return storage.get<Sale[]>(key, []);
};

// Helper: Load Current Month + Previous Month only (Active Window)
const loadActiveShards = (): Sale[] => {
  const currentKey = getShardKey(StorageKeys.SALES, new Date());
  // Load current + 1 month back for safety (returns, editing recent sales)
  const prevKeys = getPreviousShardKeys(StorageKeys.SALES, 1);
  const keysToCheck = [currentKey, ...prevKeys];

  // Deduplicate keys just in case
  const uniqueKeys = Array.from(new Set(keysToCheck));

  return uniqueKeys.flatMap((key) => storage.get<Sale[]>(key, []));
};

export const createSalesService = (): SalesService => ({
  getAll: async (branchId?: string): Promise<Sale[]> => {
    const all = loadActiveShards();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((s) => s.branchId === effectiveBranchId);
  },

  getById: async (id: string): Promise<Sale | null> => {
    // 1. Try Active Shards first (Fast path)
    const active = loadActiveShards();
    const found = active.find((s) => s.id === id);
    if (found) return found;

    // 2. Deep Search: Scan all history (Slow path, but necessary for returns)
    const allKeys = getAllShardKeys(StorageKeys.SALES);
    for (const key of allKeys) {
      // Skip keys we already checked (optimally) or just scan all
      const shard = storage.get<Sale[]>(key, []);
      const match = shard.find((s) => s.id === id);
      if (match) return match;
    }

    return null;
  },

  getByCustomer: async (customerId: string, branchId?: string): Promise<Sale[]> => {
    const all = await salesService.getAll(branchId);
    return all.filter((s) => s.customerCode === customerId);
  },

  getByDateRange: async (from: string, to: string, branchId?: string): Promise<Sale[]> => {
    const all = await salesService.getAll(branchId);
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return all.filter((s) => {
      const saleDate = new Date(s.date);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  },

  getToday: async (branchId?: string): Promise<Sale[]> => {
    const all = await salesService.getAll(branchId);
    const today = new Date().toISOString().split('T')[0];
    return all.filter((s) => s.date.startsWith(today));
  },

  create: async (sale: Omit<Sale, 'id'>, branchId?: string): Promise<Sale> => {
    // Priority: explicit param > entity's own branchId > settingsService fallback
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (sale as any).branchId || settings.activeBranchId || settings.branchCode;
    const newSale: Sale = {
      ...sale,
      id: idGenerator.generate('sales', effectiveBranchId),
      branchId: effectiveBranchId,
    } as Sale;

    // Write to specific shard based on Sale Date
    const shardKey = getShardKey(StorageKeys.SALES, newSale.date);
    const shard = storage.get<Sale[]>(shardKey, []);

    shard.push(newSale);
    storage.set(shardKey, shard);

    return newSale;
  },

  update: async (id: string, updates: Partial<Sale>): Promise<Sale> => {
    // We need to find the sale first to know its date (and thus its shard)
    // NOTE: This assumes the sale is in the "Active Window" (Recent).
    // If updating a very old sale, we might miss it if we only search active shards.
    // Enhanced search: Try active first, if fail, we might need to scan index (future improvement)

    const all = loadActiveShards();
    const foundIndex = all.findIndex((s) => s.id === id);
    let shardKey = '';

    if (foundIndex === -1) {
      // Fallback: If we have the date in updates, use it.
      // If not, we can't efficiently find it without an index.
      // For now, assume active window updates only (Standard POS usage).
      throw new Error('Sale not found in recent history');
    }

    const sale = all[foundIndex];
    shardKey = getShardKey(StorageKeys.SALES, sale.date);

    // Re-read specific shard to ensure atomic write on that key
    const shard = storage.get<Sale[]>(shardKey, []);
    const shardIndex = shard.findIndex((s) => s.id === id);

    if (shardIndex !== -1) {
      shard[shardIndex] = { ...shard[shardIndex], ...updates };
      storage.set(shardKey, shard);
      return shard[shardIndex];
    }

    throw new Error('Concurrency Error: Sale not found in shard');
  },

  delete: async (id: string): Promise<boolean> => {
    const all = loadActiveShards();
    const sale = all.find((s) => s.id === id);
    if (!sale) return false;

    const shardKey = getShardKey(StorageKeys.SALES, sale.date);
    const shard = storage.get<Sale[]>(shardKey, []);
    const filtered = shard.filter((s) => s.id !== id);

    if (filtered.length !== shard.length) {
      storage.set(shardKey, filtered);
      return true;
    }
    return false;
  },

  getStats: async (branchId?: string): Promise<SalesStats> => {
    const all = await salesService.getAll(branchId);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = all.filter((s) => s.date.startsWith(today));

    return {
      totalSales: all.length,
      totalRevenue: all.reduce((sum, s) => sum + s.total, 0),
      averageTransaction:
        all.length > 0 ? all.reduce((sum, s) => sum + s.total, 0) / all.length : 0,
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
    };
  },

  filter: async (filters: SalesFilters, branchId?: string): Promise<Sale[]> => {
    let results = await salesService.getAll(branchId);

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      results = results.filter((s) => new Date(s.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      results = results.filter((s) => new Date(s.date) <= to);
    }
    if (filters.customerCode) {
      results = results.filter((s) => s.customerCode === filters.customerCode);
    }
    if (filters.paymentMethod) {
      results = results.filter((s) => s.paymentMethod === filters.paymentMethod);
    }
    if (filters.minAmount !== undefined) {
      results = results.filter((s) => s.total >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      results = results.filter((s) => s.total <= filters.maxAmount!);
    }
    return results;
  },

  save: async (sales: Sale[], branchId?: string): Promise<void> => {
    // 1. Group sales by Shard Key
    const shards: Record<string, Sale[]> = {};

    sales.forEach((sale) => {
      const key = getShardKey(StorageKeys.SALES, sale.date);
      if (!shards[key]) shards[key] = [];
      shards[key].push(sale);
    });

    const effectiveBranchId = branchId || (await settingsService.getAll()).branchCode;

    // 2. Process each relevant shard
    Object.entries(shards).forEach(([key, branchSales]) => {
      const currentShard = storage.get<Sale[]>(key, []);

      // Keep items from OTHER branches
      const otherBranchSales = currentShard.filter((s) => s.branchId && s.branchId !== effectiveBranchId);

      // Combine and deduplicate by ID
      const merged = [...otherBranchSales, ...branchSales];
      const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
      
      storage.set(key, uniqueMerged);
    });
  },
});

export const salesService = createSalesService();
