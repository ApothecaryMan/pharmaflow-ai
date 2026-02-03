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
  getAll(): Promise<Drug[]>;
  getById(id: string): Promise<Drug | null>;
  getByBarcode(barcode: string): Promise<Drug | null>;
  search(query: string): Promise<Drug[]>;
  filter(filters: InventoryFilters): Promise<Drug[]>;
  create(drug: Omit<Drug, 'id'>): Promise<Drug>;
  update(id: string, drug: Partial<Drug>): Promise<Drug>;
  delete(id: string): Promise<boolean>;
  updateStock(id: string, quantity: number): Promise<Drug>;
  getStats(): Promise<InventoryStats>;
  getLowStock(threshold?: number): Promise<Drug[]>;
  getExpiringSoon(days?: number): Promise<Drug[]>;
  save(inventory: Drug[]): Promise<void>;
}
