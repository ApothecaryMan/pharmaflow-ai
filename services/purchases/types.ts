/**
 * Purchase Types - Purchase orders management
 */

import { Purchase } from '../../types';

export type { Purchase };

export interface PurchaseFilters {
  status?: 'pending' | 'completed' | 'rejected';
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PurchaseStats {
  totalOrders: number;
  pendingOrders: number;
  totalValue: number;
}

export interface PurchaseService {
  getAll(): Promise<Purchase[]>;
  getById(id: string): Promise<Purchase | null>;
  getBySupplier(supplierId: string): Promise<Purchase[]>;
  getPending(): Promise<Purchase[]>;
  filter(filters: PurchaseFilters): Promise<Purchase[]>;
  create(purchase: Omit<Purchase, 'id'>): Promise<Purchase>;
  update(id: string, purchase: Partial<Purchase>): Promise<Purchase>;
  approve(id: string, approverName: string): Promise<Purchase>;
  reject(id: string, reason: string): Promise<Purchase>;
  receive(id: string): Promise<Purchase>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<PurchaseStats>;
  save(purchases: Purchase[]): Promise<void>;
}
