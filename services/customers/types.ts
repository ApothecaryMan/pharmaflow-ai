/**
 * Customer Types - Customer management
 */

import type { Customer } from '../../types';

export type { Customer };

export interface CustomerFilters {
  search?: string;
  isVip?: boolean;
  hasCredit?: boolean;
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
  getByPhone(phone: string): Promise<Customer | null>;
  search(query: string): Promise<Customer[]>;
  filter(filters: CustomerFilters): Promise<Customer[]>;
  create(customer: Omit<Customer, 'id'>, branchId?: string, skipSync?: boolean): Promise<Customer>;
  update(id: string, customer: Partial<Customer>, skipSync?: boolean): Promise<Customer>;
  delete(id: string, skipSync?: boolean): Promise<boolean>;
  addLoyaltyPoints(id: string, points: number, skipSync?: boolean): Promise<Customer>;
  redeemLoyaltyPoints(id: string, points: number, skipSync?: boolean): Promise<Customer>;
  getStats(): Promise<CustomerStats>;
  getVip(): Promise<Customer[]>;
  save(customers: Customer[], branchId?: string): Promise<void>;
}
