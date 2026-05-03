/**
 * Supplier Service - Supplier CRUD operations
 * Business logic layer that orchestrates data access via SupplierRepository.
 */

import { BaseEntityService } from '../core/baseEntityService';
import type { Supplier } from '../../types';
import { settingsService } from '../settings/settingsService';
import { supplierRepository } from './repositories/supplierRepository';
import type { SupplierService } from './types';

class SupplierServiceImpl extends BaseEntityService<Supplier> implements SupplierService {
  protected tableName = 'suppliers';
  protected searchColumns = ['name', 'contact_person', 'phone', 'email'];

  public mapFromDb(db: any): Supplier {
    return supplierRepository.mapFromDb(db);
  }

  public mapToDb(s: Partial<Supplier>): any {
    return supplierRepository.mapToDb(s);
  }

  async getAll(branchId?: string): Promise<Supplier[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return supplierRepository.getAll(effectiveBranchId, settings.orgId);
  }

  async getById(id: string): Promise<Supplier | null> {
    return supplierRepository.getById(id);
  }

  async create(supplier: Omit<Supplier, 'id'>, branchId?: string): Promise<Supplier> {
    const settings = await settingsService.getAll();
    
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const effectiveBranchId = (branchId && isUuid(branchId)) 
      ? branchId 
      : (settings.activeBranchId || (supplier as any).branchId);
    
    if (!effectiveBranchId || !isUuid(effectiveBranchId)) {
      throw new Error('Valid Branch ID is required for supplier creation');
    }

    return supplierRepository.createWithRpc(supplier, effectiveBranchId, settings.orgId);
  }

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    return supplierRepository.update(id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return supplierRepository.delete(id);
  }

  async save(suppliers: Supplier[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const processedSuppliers = suppliers.map(s => ({
      ...s,
      branchId: s.branchId || effectiveBranchId,
      orgId: s.orgId || settings.orgId
    }));

    await supplierRepository.upsert(processedSuppliers);
  }
}

export const supplierService = new SupplierServiceImpl();
