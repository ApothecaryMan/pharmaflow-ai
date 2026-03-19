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
  getById(id: string): Promise<Sale | null>;
  getByCustomer(customerId: string, branchId?: string): Promise<Sale[]>;
  getByDateRange(from: string, to: string, branchId?: string): Promise<Sale[]>;
  getToday(branchId?: string): Promise<Sale[]>;
  create(sale: Omit<Sale, 'id'>, branchId?: string, skipSync?: boolean): Promise<Sale>;
  update(id: string, sale: Partial<Sale>, skipSync?: boolean): Promise<Sale>;
  delete(id: string, skipSync?: boolean): Promise<boolean>;
  getStats(branchId?: string): Promise<SalesStats>;
  filter(filters: SalesFilters, branchId?: string): Promise<Sale[]>;
  save(sales: Sale[], branchId?: string): Promise<void>;
}
