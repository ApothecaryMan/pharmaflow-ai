/**
 * Customer Types - Customer management
 */

import { Customer } from '../../types';

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
  getAll(): Promise<Customer[]>;
  getById(id: string): Promise<Customer | null>;
  getByPhone(phone: string): Promise<Customer | null>;
  search(query: string): Promise<Customer[]>;
  filter(filters: CustomerFilters): Promise<Customer[]>;
  create(customer: Omit<Customer, 'id'>): Promise<Customer>;
  update(id: string, customer: Partial<Customer>): Promise<Customer>;
  delete(id: string): Promise<boolean>;
  addLoyaltyPoints(id: string, points: number): Promise<Customer>;
  redeemLoyaltyPoints(id: string, points: number): Promise<Customer>;
  getStats(): Promise<CustomerStats>;
  getVip(): Promise<Customer[]>;
  save(customers: Customer[]): Promise<void>;
}
