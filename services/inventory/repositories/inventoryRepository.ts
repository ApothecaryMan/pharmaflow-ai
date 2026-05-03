import { supabase } from '../../../lib/supabase';
import type { Drug } from '../../../types';

export const inventoryRepository = {
  tableName: 'drugs',

  mapFromDb(db: any): Drug {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      name: db.name,
      nameAr: db.name_ar || undefined,
      genericName: db.generic_name || [],
      category: db.category,
      publicPrice: db.public_price,
      unitPrice: db.unit_price,
      costPrice: db.cost_price,
      unitCostPrice: db.unit_cost_price,
      stock: db.stock,
      damagedStock: db.damaged_stock || 0,
      expiryDate: db.expiry_date || '',
      barcode: db.barcode || undefined,
      internalCode: db.internal_code || undefined,
      unitsPerPack: db.units_per_pack || 1,
      supplierId: db.supplier_id || undefined,
      maxDiscount: db.max_discount || undefined,
      dosageForm: db.dosage_form || undefined,
      minStock: db.min_stock || 0,
      origin: db.origin || undefined,
      manufacturer: db.manufacturer || undefined,
      tax: db.tax || 0,
      status: db.status || 'active',
      description: db.description || undefined,
      additionalBarcodes: db.additional_barcodes || [],
      itemRank: db.item_rank || 'normal',
    };
  },

  mapToDb(d: Partial<Drug>): any {
    const db: any = {};
    if (d.id !== undefined) db.id = d.id;
    if (d.orgId !== undefined) db.org_id = d.orgId;
    if (d.branchId !== undefined) db.branch_id = d.branchId;
    if (d.name !== undefined) db.name = d.name;
    if (d.nameAr !== undefined) db.name_ar = d.nameAr;
    if (d.genericName !== undefined) db.generic_name = d.genericName;
    if (d.category !== undefined) db.category = d.category;
    if (d.publicPrice !== undefined) db.public_price = d.publicPrice;
    if (d.unitPrice !== undefined) db.unit_price = d.unitPrice;
    if (d.costPrice !== undefined) db.cost_price = d.costPrice;
    if (d.unitCostPrice !== undefined) db.unit_cost_price = d.unitCostPrice;
    if (d.stock !== undefined) db.stock = d.stock;
    if (d.damagedStock !== undefined) db.damaged_stock = d.damagedStock;
    if (d.expiryDate !== undefined) {
      if (d.expiryDate === '') db.expiry_date = null;
      else if (d.expiryDate.length === 7 && /^\d{4}-\d{2}$/.test(d.expiryDate)) db.expiry_date = `${d.expiryDate}-01`;
      else db.expiry_date = d.expiryDate;
    }
    if (d.description !== undefined) db.description = d.description;
    if (d.additionalBarcodes !== undefined) db.additional_barcodes = d.additionalBarcodes;
    if (d.itemRank !== undefined) db.item_rank = d.itemRank;
    if (d.barcode !== undefined) db.barcode = d.barcode;
    if (d.internalCode !== undefined) db.internal_code = d.internalCode;
    if (d.unitsPerPack !== undefined) db.units_per_pack = d.unitsPerPack;
    if (d.supplierId !== undefined) db.supplier_id = d.supplierId;
    if (d.maxDiscount !== undefined) db.max_discount = d.maxDiscount;
    if (d.dosageForm !== undefined) db.dosage_form = d.dosageForm;
    if (d.minStock !== undefined) db.min_stock = d.minStock;
    if (d.origin !== undefined) db.origin = d.origin;
    if (d.manufacturer !== undefined) db.manufacturer = d.manufacturer;
    if (d.tax !== undefined) db.tax = d.tax;
    if (d.status !== undefined) db.status = d.status;
    return db;
  },

  async getAll(branchId?: string): Promise<Drug[]> {
    let query = supabase.from(this.tableName).select('*');
    if (branchId) query = query.eq('branch_id', branchId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(item => this.mapFromDb(item));
  },

  async getById(id: string): Promise<Drug | null> {
    const { data, error } = await supabase.from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async getByBarcode(barcode: string): Promise<Drug | null> {
    const { data, error } = await supabase.from(this.tableName)
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async insert(drug: Drug): Promise<void> {
    const { error } = await supabase.from(this.tableName).insert(this.mapToDb(drug));
    if (error) throw error;
  },

  async update(id: string, updates: Partial<Drug>): Promise<Drug> {
    const { data, error } = await supabase.from(this.tableName)
      .update(this.mapToDb(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapFromDb(data);
  },

  async atomicIncrement(id: string, delta: number): Promise<number> {
    const { data, error } = await supabase.rpc('atomic_increment_stock', {
      p_drug_id: id,
      p_delta: delta,
    });
    if (error) throw error;
    return data;
  },

  async upsert(drugs: Drug[]): Promise<void> {
    if (drugs.length === 0) return;
    const dbDrugs = drugs.map(d => this.mapToDb(d));
    const { error } = await supabase.from(this.tableName).upsert(dbDrugs, { onConflict: 'id' });
    if (error) throw error;
  }
};
