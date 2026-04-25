/**
 * Customer Types - Customer management
 */

import type { Customer } from '../../types';

export type { Customer };

export interface CustomerFilters {
  search?: string;
  isVip?: boolean;
  hasCredit?: boolean;
  status?: string;
}

export interface CustomerStats {
  totalCustomers: number;
  vipCustomers: number;
  activeCustomers: number;
  totalLoyaltyPoints: number;
}

export interface CustomerService {
  getAll(branchId?: string): Promise<Customer[]>;
  getById(id: string): Promise<Customer | null>;
  getByPhone(phone: string, branchId?: string): Promise<Customer | null>;
  search(query: string, branchId?: string): Promise<Customer[]>;
  filter(filters: CustomerFilters, branchId?: string): Promise<Customer[]>;
  create(customer: Omit<Customer, 'id'>, branchId?: string): Promise<Customer>;
  update(id: string, updates: Partial<Customer>): Promise<Customer>;
  delete(id: string): Promise<boolean>;
  addLoyaltyPoints(id: string, points: number): Promise<Customer>;
  redeemLoyaltyPoints(id: string, points: number): Promise<Customer>;
  getStats(branchId?: string): Promise<CustomerStats>;
  getVip(branchId?: string): Promise<Customer[]>;
  save(customers: Customer[], branchId?: string): Promise<void>;
}
