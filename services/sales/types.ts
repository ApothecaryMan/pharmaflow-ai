/**
 * Sales Types - Sales transactions and management
 */

import { Sale, CartItem } from '../../types';

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
  getAll(): Promise<Sale[]>;
  getById(id: string): Promise<Sale | null>;
  getByCustomer(customerId: string): Promise<Sale[]>;
  getByDateRange(from: string, to: string): Promise<Sale[]>;
  getToday(): Promise<Sale[]>;
  create(sale: Omit<Sale, 'id'>): Promise<Sale>;
  update(id: string, sale: Partial<Sale>): Promise<Sale>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<SalesStats>;
  filter(filters: SalesFilters): Promise<Sale[]>;
  save(sales: Sale[]): Promise<void>;
}
