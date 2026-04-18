/**
 * Supplier Service - Supplier CRUD operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Supplier } from '../../types';
import { idGenerator } from '../../utils/idGenerator';

import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { syncQueueService } from '../syncQueueService';
import type { SupplierService } from './types';
import { supabase } from '../../lib/supabase';

const mapSupplierToDb = (s: Partial<Supplier>): any => {
  const db: any = {};
  if (s.id !== undefined) db.id = s.id;
  if (s.branchId !== undefined) db.branch_id = s.branchId;
  if (s.name !== undefined) db.name = s.name;
  if (s.contactPerson !== undefined) db.contact_person = s.contactPerson;
  if (s.phone !== undefined) db.phone = s.phone;
  if (s.email !== undefined) db.email = s.email;
  if (s.address !== undefined) db.address = s.address;
  if (s.status !== undefined) db.status = s.status;
  return db;
};

const mapDbToSupplier = (db: any): Supplier => ({
  id: db.id,
  branchId: db.branch_id,
  name: db.name,
  contactPerson: db.contact_person || '',
  phone: db.phone || '',
  email: db.email || '',
  address: db.address || '',
  status: db.status || 'active',
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

const getRawAll = async (): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase.from('suppliers').select('*').limit(5000);
    if (!error && data) {
      const mapped = data.map(mapDbToSupplier);
      storage.set(StorageKeys.SUPPLIERS, mapped);
      return mapped;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('Failed to fetch suppliers from Supabase, falling back to cache', err);
    }
  }

  return storage.get<Supplier[]>(StorageKeys.SUPPLIERS, []);
};

export const createSupplierService = (): SupplierService => ({
  getAll: async (branchId?: string): Promise<Supplier[]> => {
    const all = await getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((s) => s.branchId === effectiveBranchId);
  },

  getById: async (id: string, branchId?: string): Promise<Supplier | null> => {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
      if (!error && data) {
        const mapped = mapDbToSupplier(data);
        const all = storage.get<Supplier[]>(StorageKeys.SUPPLIERS, []);
        const index = all.findIndex((s) => s.id === id);
        if (index >= 0) all[index] = mapped;
        else all.push(mapped);
        storage.set(StorageKeys.SUPPLIERS, all);
        return mapped;
      }
    } catch {}

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

  create: async (supplier: Omit<Supplier, 'id'>, branchId?: string, skipSync = false): Promise<Supplier> => {
    const all = await getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (supplier as any).branchId || settings.activeBranchId || settings.branchCode;
    const newSupplier: Supplier = {
      ...supplier,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
    } as Supplier;

    try {
      const dbSupplier = mapSupplierToDb(newSupplier);
      const { error } = await supabase.from('suppliers').insert(dbSupplier);
      if (error && import.meta.env.DEV) console.warn('Supabase insert failed', error);
    } catch {}

    all.push(newSupplier);
    storage.set(StorageKeys.SUPPLIERS, all);

    if (!skipSync) {
      await syncQueueService.enqueue('SUPPLIER', { action: 'CREATE_SUPPLIER', supplier: newSupplier });
    }

    return newSupplier;
  },

  update: async (id: string, updates: Partial<Supplier>, skipSync = false): Promise<Supplier> => {
    const all = await getRawAll();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Supplier not found');
    
    const updated = { ...all[index], ...updates };

    try {
      const dbUpdates = mapSupplierToDb(updates);
      const { error } = await supabase.from('suppliers').update(dbUpdates).eq('id', id);
      if (error && import.meta.env.DEV) console.warn('Supabase update failed', error);
    } catch {}

    all[index] = updated;
    storage.set(StorageKeys.SUPPLIERS, all);

    if (!skipSync) {
      await syncQueueService.enqueue('SUPPLIER', { action: 'UPDATE_SUPPLIER', id, updates });
    }

    return updated;
  },

  delete: async (id: string, skipSync = false): Promise<boolean> => {
    const all = await getRawAll();
    const initialLength = all.length;
    const filtered = all.filter((s) => s.id !== id);
    
    if (filtered.length !== initialLength) {
      try {
        await supabase.from('suppliers').delete().eq('id', id);
      } catch {}

      storage.set(StorageKeys.SUPPLIERS, filtered);
      
      if (!skipSync) {
        await syncQueueService.enqueue('SUPPLIER', { action: 'DELETE_SUPPLIER', id });
      }
      return true;
    }
    return false;
  },

  save: async (suppliers: Supplier[], branchId?: string): Promise<void> => {
    const all = storage.get<Supplier[]>(StorageKeys.SUPPLIERS, []);
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      const dbSuppliers = suppliers.map(mapSupplierToDb);
      if (dbSuppliers.length > 0) {
        await supabase.from('suppliers').upsert(dbSuppliers, { onConflict: 'id' });
      }
    } catch {}

    // 1. Keep items from OTHER branches
    const otherBranchItems = all.filter((s) => s.branchId && s.branchId !== effectiveBranchId);
    
    // 2. Prepare Branch Items
    const branchItems = suppliers.map(s => ({ ...s, branchId: effectiveBranchId }));
    
    // 3. Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...branchItems];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    storage.set(StorageKeys.SUPPLIERS, uniqueMerged);
  },
});

export const supplierService = createSupplierService();
