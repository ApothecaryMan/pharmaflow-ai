/**
 * Purchase Types - Purchase orders management
 */

import type { Purchase, PurchaseStatus } from '../../types';

export type { Purchase };

export interface PurchaseFilters {
  status?: PurchaseStatus;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PurchasesPageOptions {
  branchId?: string;
  orgId?: string;
  page?: number;
  pageSize?: number;
  filters?: PurchaseFilters;
  sort?: {
    column?: string;
    ascending?: boolean;
  };
}

export interface PurchaseStats {
  totalOrders: number;
  pendingOrders: number;
  totalValue: number;
}

export interface PurchaseService {
  getAll(branchId?: string): Promise<Purchase[]>;
  getRecent(branchId?: string, limit?: number): Promise<Purchase[]>;
  getById(id: string, branchId?: string): Promise<Purchase | null>;
  getBySupplier(supplierId: string, branchId?: string): Promise<Purchase[]>;
  getByStatus(status: PurchaseStatus, branchId?: string): Promise<Purchase[]>;
  getPending(branchId?: string): Promise<Purchase[]>;
  filter(filters: PurchaseFilters, branchId?: string): Promise<Purchase[]>;
  listPage(
    options: PurchasesPageOptions
  ): Promise<{ rows: Purchase[]; total: number; page: number; pageSize: number }>;
  getNextInvoiceId(branchId?: string): Promise<string>;
  create(purchase: Omit<Purchase, 'id'>, branchId?: string): Promise<Purchase>;
  update(id: string, updates: Partial<Purchase>): Promise<Purchase>;
  approve(id: string, approverId: string, approverName: string): Promise<Purchase>;
  markAsReceived(
    id: string,
    receiverId: string,
    receiverName: string,
    shiftId?: string
  ): Promise<Purchase>;
  reject(id: string, reason: string): Promise<Purchase>;
  delete(id: string): Promise<boolean>;
  getStats(branchId?: string): Promise<PurchaseStats>;
  save(purchases: Purchase[], branchId?: string): Promise<void>;

  // Mappers
  mapFromDb(db: any): Purchase;
  mapToDb(p: Partial<Purchase>): any;
}
