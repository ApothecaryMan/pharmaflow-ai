/**
 * Supplier Service - Supplier CRUD operations
 * Online-Only implementation using Supabase
 */

import { BaseEntityService } from '../core/BaseEntityService';
import type { Supplier } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { supabase } from '../../lib/supabase';
import type { SupplierService } from './types';

class SupplierServiceImpl extends BaseEntityService<Supplier> implements SupplierService {
  protected tableName = 'suppliers';
  protected searchColumns = ['name', 'contact_person', 'phone', 'email'];

  protected mapDbToDomain(db: any): Supplier {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      name: db.name,
      contactPerson: db.contact_person || '',
      phone: db.phone || '',
      email: db.email || '',
      address: db.address || '',
      status: db.status || 'active',
      createdAt: db.created_at || new Date().toISOString(),
      updatedAt: db.updated_at || new Date().toISOString(),
    };
  }

  protected mapDomainToDb(s: Partial<Supplier>): any {
    const db: any = {};
    if (s.id !== undefined) db.id = s.id;
    if (s.orgId !== undefined) db.org_id = s.orgId;
    if (s.branchId !== undefined) db.branch_id = s.branchId;
    if (s.name !== undefined) db.name = s.name;
    if (s.contactPerson !== undefined) db.contact_person = s.contactPerson;
    if (s.phone !== undefined) db.phone = s.phone;
    if (s.email !== undefined) db.email = s.email;
    if (s.address !== undefined) db.address = s.address;
    if (s.status !== undefined) db.status = s.status;
    return db;
  }

  async create(supplier: Omit<Supplier, 'id'>, branchId?: string): Promise<Supplier> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (supplier as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newSupplier: Supplier = {
      ...supplier,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
    } as Supplier;

    const dbSupplier = this.mapDomainToDb(newSupplier);
    const { error } = await supabase.from(this.tableName).insert(dbSupplier);
    if (error) throw error;

    return newSupplier;
  }

  async save(suppliers: Supplier[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const dbSuppliers = suppliers.map(s => this.mapDomainToDb({
      ...s,
      branchId: s.branchId || effectiveBranchId,
      orgId: s.orgId || settings.orgId
    }));

    if (dbSuppliers.length > 0) {
      const { error } = await supabase.from(this.tableName).upsert(dbSuppliers);
      if (error) throw error;
    }
  }
}

export const supplierService = new SupplierServiceImpl();
