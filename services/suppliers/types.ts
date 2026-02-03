/**
 * Supplier Types - Supplier management
 */

import type { Supplier } from '../../types';

export type { Supplier };

export interface SupplierFilters {
  search?: string;
  active?: boolean;
}

export interface SupplierService {
  getAll(): Promise<Supplier[]>;
  getById(id: string): Promise<Supplier | null>;
  search(query: string): Promise<Supplier[]>;
  create(supplier: Omit<Supplier, 'id'>): Promise<Supplier>;
  update(id: string, supplier: Partial<Supplier>): Promise<Supplier>;
  delete(id: string): Promise<boolean>;
  save(suppliers: Supplier[]): Promise<void>;
}
