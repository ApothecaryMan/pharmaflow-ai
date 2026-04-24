/**
 * Purchase Types - Purchase orders management
 */

import type { Purchase } from '../../types';

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
  getAll(branchId?: string): Promise<Purchase[]>;
  getById(id: string, branchId?: string): Promise<Purchase | null>;
  getBySupplier(supplierId: string, branchId?: string): Promise<Purchase[]>;
  getByStatus(status: 'pending' | 'completed' | 'rejected'): Promise<Purchase[]>;
  getPending(): Promise<Purchase[]>;
  filter(filters: PurchaseFilters): Promise<Purchase[]>;
  create(purchase: Omit<Purchase, 'id'>, branchId?: string, skipSync?: boolean): Promise<Purchase>;
  update(id: string, purchase: Partial<Purchase>, skipSync?: boolean): Promise<Purchase>;
  approve(id: string, approverName: string, skipSync?: boolean): Promise<Purchase>;
  reject(id: string, reason: string, skipSync?: boolean): Promise<Purchase>;
  delete(id: string, skipSync?: boolean): Promise<boolean>;
  getStats(): Promise<PurchaseStats>;
  save(purchases: Purchase[], branchId?: string): Promise<void>;
}
