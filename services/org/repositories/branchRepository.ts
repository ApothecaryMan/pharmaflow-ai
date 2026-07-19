import { supabase } from '../../../lib/supabase';
import type { Branch } from '../../../types';

const BRANCH_LIST_COLUMNS =
  'id, org_id, code, name, status, phone, governorate, city, area, delivery_fee, monthly_sales_target';

const BRANCH_FULL_COLUMNS = `${BRANCH_LIST_COLUMNS}, address, delivery_fee, monthly_sales_target, shift_start_time, latitude, longitude, print_settings, created_at, updated_at`;

export const branchRepository = {
  tableName: 'branches',

  mapFromDb(db: any): Branch {
    return {
      id: db.id,
      orgId: db.org_id,
      code: db.code,
      name: db.name,
      phone: db.phone || undefined,
      address: db.address || undefined,
      governorate: db.governorate || undefined,
      city: db.city || undefined,
      area: db.area || undefined,
      deliveryFee: db.delivery_fee || 0,
      monthlySalesTarget: db.monthly_sales_target || 0,
      shiftStartTime: db.shift_start_time || '09:00',
      latitude: db.latitude !== null && db.latitude !== undefined ? Number(db.latitude) : undefined,
      longitude:
        db.longitude !== null && db.longitude !== undefined ? Number(db.longitude) : undefined,
      status: db.status || 'active',
      printSettings: db.print_settings || {},
      createdAt: db.created_at || new Date().toISOString(),
      updatedAt: db.updated_at || new Date().toISOString(),
    };
  },

  mapToDb(b: Partial<Branch>): any {
    const db: any = {};
    if (b.id !== undefined) db.id = b.id;
    if (b.orgId !== undefined) db.org_id = b.orgId;
    if (b.code !== undefined) db.code = b.code;
    if (b.name !== undefined) db.name = b.name;
    if (b.phone !== undefined) db.phone = b.phone;
    if (b.address !== undefined) db.address = b.address;
    if (b.governorate !== undefined) db.governorate = b.governorate;
    if (b.city !== undefined) db.city = b.city;
    if (b.area !== undefined) db.area = b.area;
    if (b.deliveryFee !== undefined) db.delivery_fee = b.deliveryFee;
    if (b.monthlySalesTarget !== undefined) db.monthly_sales_target = b.monthlySalesTarget;
    if (b.shiftStartTime !== undefined) db.shift_start_time = b.shiftStartTime;
    if (b.latitude !== undefined) db.latitude = b.latitude;
    if (b.longitude !== undefined) db.longitude = b.longitude;
    if (b.status !== undefined) db.status = b.status;
    if (b.printSettings !== undefined) db.print_settings = b.printSettings;
    return db;
  },

  async getAll(orgId: string): Promise<Branch[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(BRANCH_LIST_COLUMNS)
      .eq('org_id', orgId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getById(id: string): Promise<Branch | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(BRANCH_FULL_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async insert(branch: Branch): Promise<void> {
    const { error } = await supabase.from(this.tableName).insert(this.mapToDb(branch));
    if (error) throw error;
  },

  async update(id: string, updates: Partial<Branch>): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update(this.mapToDb(updates))
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  },
};
