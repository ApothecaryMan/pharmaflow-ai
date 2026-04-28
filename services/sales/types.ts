/**
 * Sales Types - Sales transactions and management
 */

import type { CartItem, Sale } from '../../types';

export type { Sale, CartItem };

export interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  customerCode?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
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
