import { supabase } from '../../../lib/supabase';
import type { Supplier } from '../../../types';

export const supplierRepository = {
  tableName: 'suppliers',

  mapFromDb(db: any): Supplier {
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
  },

  mapToDb(s: Partial<Supplier>): any {
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
  },

  async getAll(effectiveBranchId: string, orgId?: string): Promise<Supplier[]> {
    let query = supabase.from(this.tableName).select('*');
    const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
    
    if (effectiveBranchId && !isAll) {
      query = query.eq('branch_id', effectiveBranchId);
    } else if (isAll && orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(item => this.mapFromDb(item));
  },

  async getById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase.from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async createWithRpc(supplier: Omit<Supplier, 'id'>, branchId: string, orgId: string): Promise<Supplier> {
    const { data, error } = await supabase.rpc('create_supplier', {
      p_supplier: supplier,
      p_branch_id: branchId,
      p_org_id: orgId
    });
    if (error) throw error;
    return this.mapFromDb(data);
  },

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase.from(this.tableName)
      .update(this.mapToDb(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapFromDb(data);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async upsert(suppliers: Supplier[]): Promise<void> {
    if (suppliers.length === 0) return;
    const dbSuppliers = suppliers.map(s => this.mapToDb(s));
    const { error } = await supabase.from(this.tableName).upsert(dbSuppliers);
    if (error) throw error;
  }
};
