/**
 * Purchase Types - Purchase orders management
 */

import type { Purchase } from '../../types';

export type { Purchase };

export interface PurchaseFilters {
  status?: 'pending' | 'completed' | 'rejected' | 'received';
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
  getByStatus(status: 'pending' | 'completed' | 'rejected' | 'received', branchId?: string): Promise<Purchase[]>;
  getPending(branchId?: string): Promise<Purchase[]>;
  filter(filters: PurchaseFilters, branchId?: string): Promise<Purchase[]>;
  create(purchase: Omit<Purchase, 'id'>, branchId?: string): Promise<Purchase>;
  update(id: string, updates: Partial<Purchase>): Promise<Purchase>;
  approve(id: string, approverName: string): Promise<Purchase>;
  markAsReceived(id: string, receiverName: string): Promise<Purchase>;
  reject(id: string, reason: string): Promise<Purchase>;
  delete(id: string): Promise<boolean>;
  getStats(branchId?: string): Promise<PurchaseStats>;
  save(purchases: Purchase[], branchId?: string): Promise<void>;

  // Mappers
  mapFromDb(db: any): Purchase;
  mapToDb(p: Partial<Purchase>): any;
}
