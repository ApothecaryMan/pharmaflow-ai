/**
 * Customer Service - Customer CRUD and loyalty operations
 * Business logic layer that orchestrates data access via CustomerRepository.
 */

import { BaseEntityService } from '../core/baseEntityService';
import type { Customer } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { customerRepository } from './repositories/customerRepository';
import type { CustomerFilters, CustomerService, CustomerStats } from './types';

class CustomerServiceImpl extends BaseEntityService<Customer> implements CustomerService {
  protected tableName = 'customers';
  protected searchColumns = ['name', 'phone', 'code', 'email'];

  public mapFromDb(db: any): Customer {
    return customerRepository.mapFromDb(db);
  }

  public mapToDb(c: Partial<Customer>): any {
    return customerRepository.mapToDb(c);
  }

  async getAll(branchId?: string): Promise<Customer[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return customerRepository.getAll(effectiveBranchId, settings.orgId);
  }

  async getById(id: string): Promise<Customer | null> {
    return customerRepository.getById(id);
  }

  async getByPhone(phone: string, branchId?: string): Promise<Customer | null> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return customerRepository.getByPhone(phone, effectiveBranchId, settings.orgId);
  }

  async filter(filters: CustomerFilters, branchId?: string): Promise<Customer[]> {
    if (filters.search) {
      return this.search(filters.search, branchId);
    }

    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return customerRepository.findByFilters(filters, effectiveBranchId, settings.orgId);
  }

  async create(customer: Omit<Customer, 'id'>, branchId?: string): Promise<Customer> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (customer as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newCustomer: Customer = {
      ...customer,
      id: idGenerator.uuid(),
      serialId: await idGenerator.generate('customers-serial', settings.activeBranchId || '', settings.branchCode),
      code: customer.code || idGenerator.code('CUST'),
      createdAt: new Date().toISOString(),
      points: customer.points || 0,
      totalPurchases: customer.totalPurchases || 0,
      branchId: effectiveBranchId,
      orgId: settings.orgId,
    } as Customer;

    await customerRepository.insert(newCustomer);
    return newCustomer;
  }

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    return customerRepository.update(id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return customerRepository.delete(id);
  }

  async addLoyaltyPoints(id: string, points: number): Promise<Customer> {
    const customer = await this.getById(id);
    if (!customer) throw new Error('Customer not found');
    
    const updatedPoints = (customer.points || 0) + points;
    return this.update(id, { points: updatedPoints });
  }

  async redeemLoyaltyPoints(id: string, points: number): Promise<Customer> {
    const customer = await this.getById(id);
    if (!customer) throw new Error('Customer not found');
    
    const current = customer.points || 0;
    if (current < points) throw new Error('Insufficient points');
    
    const updatedPoints = current - points;
    return this.update(id, { points: updatedPoints });
  }

  async getStats(branchId?: string): Promise<CustomerStats> {
    const all = await this.getAll(branchId);
    return {
      totalCustomers: all.length,
      vipCustomers: all.filter((c) => c.vip).length,
      activeCustomers: all.filter((c) => (c.totalPurchases || 0) > 0).length,
      totalLoyaltyPoints: all.reduce((sum, c) => sum + (c.points || 0), 0),
    };
  }

  async getVip(branchId?: string): Promise<Customer[]> {
    return this.filter({ isVip: true }, branchId);
  }

  async save(customers: Customer[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const processedCustomers = customers.map(c => ({
      ...c,
      branchId: c.branchId || effectiveBranchId,
      orgId: c.orgId || settings.orgId
    }));

    await customerRepository.upsert(processedCustomers);
  }
}

export const customerService = new CustomerServiceImpl();
