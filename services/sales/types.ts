/**
 * Sales Types - Sales transactions and management
 */

import type { CartItem, Sale } from '../../types';

export type { Sale, CartItem };

export interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  customerCode?: string;
  search?: string;
  status?: string;
  paymentMethod?: string;
  soldByEmployeeId?: string;
  deliveryEmployeeId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SalesPageOptions {
  branchId?: string;
  orgId?: string;
  page?: number;
  pageSize?: number;
  filters?: SalesFilters;
  sort?: {
    column?: string;
    ascending?: boolean;
  };
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageTransaction: number;
  todaySales: number;
  todayRevenue: number;
}

export interface SalesService {
  getAll(branchId?: string): Promise<Sale[]>;
  getRecent(branchId?: string, limit?: number): Promise<Sale[]>;
  listPage(options: SalesPageOptions): Promise<PagedResult<Sale>>;
  getById(id: string, branchId?: string): Promise<Sale | null>;
  getByCustomer(customerId: string, branchId?: string): Promise<Sale[]>;
  getByDateRange(from: string, to: string, branchId?: string): Promise<Sale[]>;
  getToday(branchId?: string): Promise<Sale[]>;
  create(sale: Omit<Sale, 'id'>, branchId?: string): Promise<Sale>;
  update(id: string, sale: Partial<Sale>): Promise<Sale>;
  delete(id: string): Promise<boolean>;
  getStats(branchId?: string): Promise<SalesStats>;
  filter(filters: SalesFilters, branchId?: string): Promise<Sale[]>;
  save(sales: Sale[], branchId?: string): Promise<void>;

  // Mappers
  mapFromDb(db: any): Sale;
  mapToDb(s: Partial<Sale>): any;
}
