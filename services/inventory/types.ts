/**
 * Inventory Types - Drug/Product management
 */

import type { Drug } from '../../types';

export type { Drug };

export interface InventoryFilters {
  category?: string;
  lowStock?: boolean;
  expiringSoon?: number; // days
  search?: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  expiringSoonCount: number;
  outOfStockCount: number;
}

export interface InventoryService {
  getAll(branchId?: string): Promise<Drug[]>;
  getAllBranches(branchId?: string): Promise<Drug[]>;
  getById(id: string): Promise<Drug | null>;
  getByBarcode(barcode: string): Promise<Drug | null>;
  search(query: string): Promise<Drug[]>;
  filter(filters: InventoryFilters): Promise<Drug[]>;
  create(drug: Omit<Drug, 'id'>, branchId?: string): Promise<Drug>;
  update(id: string, drug: Partial<Drug>): Promise<Drug>;
  updateStock(id: string, quantity: number, skipBatch?: boolean, batchId?: string): Promise<Drug>;
  updateStockCount(id: string, quantity: number): Promise<void>;
  updateStockBulk(mutations: { id: string; quantity: number; batchId?: string }[], skipBatch?: boolean): Promise<void>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<InventoryStats>;
  getLowStock(threshold?: number): Promise<Drug[]>;
  getExpiringSoon(days?: number): Promise<Drug[]>;
  save(inventory: Drug[], branchId?: string): Promise<void>;
}
