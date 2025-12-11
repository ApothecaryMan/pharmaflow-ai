/**
 * Supplier Service - Supplier CRUD operations
 */

import { Supplier } from '../../types';
import { SupplierService } from './types';

const STORAGE_KEY = 'pharma_suppliers';

export const createSupplierService = (): SupplierService => ({
  getAll: async (): Promise<Supplier[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  },

  create: async (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => {
    const all = await supplierService.getAll();
    const newSupplier: Supplier = { ...supplier, id: Date.now().toString() } as Supplier;
    all.push(newSupplier);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newSupplier;
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
    const all = await supplierService.getAll();
    const index = all.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Supplier not found');
    all[index] = { ...all[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await supplierService.getAll();
    const filtered = all.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  save: async (suppliers: Supplier[]): Promise<void> => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
  }
});

export const supplierService = createSupplierService();
