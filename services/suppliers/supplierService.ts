/**
 * Supplier Service - Supplier CRUD operations
 * Online-Only implementation using Supabase
 */

import { BaseEntityService } from '../core/baseEntityService';
import type { Supplier } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { supabase } from '../../lib/supabase';
import type { SupplierService } from './types';

class SupplierServiceImpl extends BaseEntityService<Supplier> implements SupplierService {
  protected tableName = 'suppliers';
  protected searchColumns = ['name', 'contact_person', 'phone', 'email'];

  public mapFromDb(db: any): Supplier {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      name: db.name,
      contactPerson: db.contact_person || '',
      phone: db.phone || '',
      email: db.email || '',
      address: db.address || '',
      governorate: db.governorate || '',
      city: db.city || '',
      area: db.area || '',
      supplierCode: db.supplier_code || '',
      status: db.status || 'active',
      createdAt: db.created_at || new Date().toISOString(),
      updatedAt: db.updated_at || new Date().toISOString(),
    };
  }

  public mapToDb(s: Partial<Supplier>): any {
    const db: any = {};
    if (s.id !== undefined) db.id = s.id;
    if (s.orgId !== undefined) db.org_id = s.orgId;
    if (s.branchId !== undefined) db.branch_id = s.branchId;
    if (s.name !== undefined) db.name = s.name;
    if (s.contactPerson !== undefined) db.contact_person = s.contactPerson;
    if (s.phone !== undefined) db.phone = s.phone;
    if (s.email !== undefined) db.email = s.email;
    if (s.address !== undefined) db.address = s.address;
    if (s.governorate !== undefined) db.governorate = s.governorate;
    if (s.city !== undefined) db.city = s.city;
    if (s.area !== undefined) db.area = s.area;
    if (s.supplierCode !== undefined) db.supplier_code = s.supplierCode;
    if (s.status !== undefined) db.status = s.status;
    return db;
  }

  async create(supplier: Omit<Supplier, 'id'>, branchId?: string): Promise<Supplier> {
    const settings = await settingsService.getAll();
    
    // Validate branchId is a valid UUID, otherwise fallback to settings
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const effectiveBranchId = (branchId && isUuid(branchId)) 
      ? branchId 
      : (settings.activeBranchId || (supplier as any).branchId);
    
    if (!effectiveBranchId || !isUuid(effectiveBranchId)) {
      throw new Error('Valid Branch ID is required for supplier creation');
    }

    // Call the ATOMIC RPC
    const { data, error } = await supabase.rpc('create_supplier', {
      p_supplier: supplier,
      p_branch_id: effectiveBranchId,
      p_org_id: settings.orgId
    });

    if (error) {
      console.error('RPC Error:', error);
      throw error;
    }

    return this.mapFromDb(data);
  }

  async save(suppliers: Supplier[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const dbSuppliers = suppliers.map(s => this.mapToDb({
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
