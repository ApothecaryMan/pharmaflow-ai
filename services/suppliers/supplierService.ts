/**
 * Supplier Service - Supplier CRUD operations
 */

import { Supplier } from '../../types';
import { SupplierService } from './types';
import { settingsService } from '../settings/settingsService';

import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

import { idGenerator } from '../../utils/idGenerator';

const getRawAll = (): Supplier[] => {
  return storage.get<Supplier[]>(StorageKeys.SUPPLIERS, []);
};

export const createSupplierService = (): SupplierService => ({
  getAll: async (): Promise<Supplier[]> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    return all.filter(s => !s.branchId || s.branchId === branchCode);
  },

  getById: async (id: string): Promise<Supplier | null> => {
    const all = await supplierService.getAll();
    return all.find(s => s.id === id) || null;
  },

  search: async (query: string): Promise<Supplier[]> => {
    const all = await supplierService.getAll();
    const q = query.toLowerCase();
    return all.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  },

  create: async (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const newSupplier: Supplier = { 
      ...supplier, 
      id: idGenerator.generate('suppliers'),
      branchId: settings.branchCode
    } as Supplier;
    all.push(newSupplier);
    storage.set(StorageKeys.SUPPLIERS, all);
    return newSupplier;
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
    const all = getRawAll();
    const index = all.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Supplier not found');
    all[index] = { ...all[index], ...updates };
    storage.set(StorageKeys.SUPPLIERS, all);
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = getRawAll();
    const filtered = all.filter(s => s.id !== id);
    storage.set(StorageKeys.SUPPLIERS, filtered);
    return true;
  },

  save: async (suppliers: Supplier[]): Promise<void> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    const otherBranchItems = all.filter(s => s.branchId && s.branchId !== branchCode);
    const merged = [...otherBranchItems, ...suppliers];
    storage.set(StorageKeys.SUPPLIERS, merged);
  }
});

export const supplierService = createSupplierService();
