/**
 * Supplier Service - Supplier CRUD operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Supplier } from '../../types';
import { idGenerator } from '../../utils/idGenerator';

import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import type { SupplierService } from './types';

const getRawAll = (): Supplier[] => {
  return storage.get<Supplier[]>(StorageKeys.SUPPLIERS, []);
};

export const createSupplierService = (): SupplierService => ({
  getAll: async (branchId?: string): Promise<Supplier[]> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((s) => s.branchId === effectiveBranchId);
  },

  getById: async (id: string, branchId?: string): Promise<Supplier | null> => {
    const all = await supplierService.getAll(branchId);
    return all.find((s) => s.id === id) || null;
  },

  search: async (query: string, branchId?: string): Promise<Supplier[]> => {
    const all = await supplierService.getAll(branchId);
    const q = query.toLowerCase();
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  },

  create: async (supplier: Omit<Supplier, 'id'>, branchId?: string): Promise<Supplier> => {
    const all = getRawAll();
    // Priority: explicit param > entity's own branchId > settingsService fallback
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (supplier as any).branchId || settings.activeBranchId || settings.branchCode;
    const newSupplier: Supplier = {
      ...supplier,
      id: idGenerator.generate('suppliers', effectiveBranchId),
      branchId: effectiveBranchId,
    } as Supplier;
    all.push(newSupplier);
    storage.set(StorageKeys.SUPPLIERS, all);
    return newSupplier;
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
    const all = getRawAll();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Supplier not found');
    all[index] = { ...all[index], ...updates };
    storage.set(StorageKeys.SUPPLIERS, all);
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = getRawAll();
    const filtered = all.filter((s) => s.id !== id);
    storage.set(StorageKeys.SUPPLIERS, filtered);
    return true;
  },

  save: async (suppliers: Supplier[], branchId?: string): Promise<void> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    const otherBranchItems = all.filter((s) => s.branchId && s.branchId !== effectiveBranchId);
    
    // Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...suppliers];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    storage.set(StorageKeys.SUPPLIERS, uniqueMerged);
  },
});

export const supplierService = createSupplierService();
