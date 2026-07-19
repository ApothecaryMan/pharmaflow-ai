import { supabase } from '../../../lib/supabase';
import type { Drug } from '../../../types';
import type { InventoryFilters, InventoryStats } from '../types';

const LIST_COLUMNS =
  'id, org_id, branch_id, name, generic_name, category, public_price, unit_price, cost_price, unit_cost_price, stock, damaged_stock, expiry_date, barcode, internal_code, units_per_pack, supplier_id, max_discount, dosage_form, min_stock, origin, manufacturer, tax, status, description';

const FULL_COLUMNS = `${LIST_COLUMNS}, description, additional_barcodes, item_rank`;

export const inventoryRepository = {
  tableName: 'drugs',

  mapFromDb(db: any): Drug {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      name: db.name,
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
      else if (d.expiryDate.length === 7 && /^\d{4}-\d{2}$/.test(d.expiryDate))
        db.expiry_date = `${d.expiryDate}-01`;
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

  async getAll(branchId?: string, orgId?: string): Promise<Drug[]> {
    let query = supabase.from(this.tableName).select(LIST_COLUMNS);

    if (branchId && branchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', branchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getById(id: string): Promise<Drug | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(FULL_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async getByBarcode(barcode: string, orgId?: string, branchId?: string): Promise<Drug | null> {
    let query = supabase
      .from(this.tableName)
      .select(FULL_COLUMNS)
      .eq('barcode', barcode);

    if (branchId && branchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', branchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async insert(drug: Drug): Promise<void> {
    const { error } = await supabase.from(this.tableName).insert(this.mapToDb(drug));
    if (error) throw error;
  },

  async update(id: string, updates: Partial<Drug>): Promise<Drug> {
    const { data, error } = await supabase
      .from(this.tableName)
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
    const dbDrugs = drugs.map((d) => this.mapToDb(d));
    const { error } = await supabase.from(this.tableName).upsert(dbDrugs, { onConflict: 'id' });
    if (error) throw error;
  },

  async search(query: string, branchId?: string, orgId?: string): Promise<Drug[]> {
    const q = query.toLowerCase();
    // NOTE: generic_name (JSONB array) is intentionally excluded from the DB search
    // because PostgREST ilike does not support JSONB arrays. The old client-side
    // search iterated all drugs in JS to match generic names — a 2x bandwidth cost.
    // Users should search by trade name, barcode, or internal code instead.
    let supabaseQuery = supabase
      .from(this.tableName)
      .select(LIST_COLUMNS)
      .or(`name.ilike.%${q}%,barcode.ilike.%${q}%,internal_code.ilike.%${q}%`)
      .limit(200);

    if (branchId && branchId.toLowerCase() !== 'all') {
      supabaseQuery = supabaseQuery.eq('branch_id', branchId);
    } else if (orgId) {
      supabaseQuery = supabaseQuery.eq('org_id', orgId);
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async filterBy(
    filters: InventoryFilters,
    branchId?: string,
    orgId?: string
  ): Promise<Drug[]> {
    let query = supabase.from(this.tableName).select(LIST_COLUMNS);

    if (branchId && branchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', branchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }

    if (filters.category) query = query.eq('category', filters.category);
    if (filters.lowStock) query = query.lt('stock', 10);
    if (filters.expiringSoon) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + filters.expiringSoon);
      const dateStr = threshold.toISOString().split('T')[0];
      query = query.lte('expiry_date', dateStr);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      query = query.or(`name.ilike.%${q}%,barcode.ilike.%${q}%,internal_code.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getLowStock(threshold = 10, branchId?: string, orgId?: string): Promise<Drug[]> {
    let query = supabase
      .from(this.tableName)
      .select(LIST_COLUMNS)
      .lt('stock', threshold);

    if (branchId && branchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', branchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getExpiringSoon(days = 30, branchId?: string, orgId?: string): Promise<Drug[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    const dateStr = threshold.toISOString().split('T')[0];

    let query = supabase
      .from(this.tableName)
      .select(LIST_COLUMNS)
      .lte('expiry_date', dateStr);

    if (branchId && branchId.toLowerCase() !== 'all') {
      query = query.eq('branch_id', branchId);
    } else if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getStats(branchId?: string, orgId?: string): Promise<InventoryStats> {
    const applyFilter = (q: any) => {
      if (branchId && branchId.toLowerCase() !== 'all') return q.eq('branch_id', branchId);
      if (orgId) return q.eq('org_id', orgId);
      return q;
    };

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dateStr = thirtyDays.toISOString().split('T')[0];

    const [{ count: totalCount }, { data: valueData }, { count: expiringCount }] =
      await Promise.all([
        applyFilter(
          supabase.from(this.tableName).select('*', { count: 'exact', head: true })
        ),
        applyFilter(
          supabase.from(this.tableName).select('public_price, stock, units_per_pack')
        ),
        applyFilter(
          supabase
            .from(this.tableName)
            .select('*', { count: 'exact', head: true })
            .lte('expiry_date', dateStr)
        ),
      ]);

    const totalValue = (valueData || []).reduce(
      (sum, d) => sum + (d.public_price || 0) * ((d.stock || 0) / (d.units_per_pack || 1)),
      0
    );

    const { data: stockData } = await applyFilter(
      supabase.from(this.tableName).select('stock, min_stock')
    );
    const lowStockCount = (stockData || []).filter(
      (d) => (d.stock || 0) < (d.min_stock || 10) && (d.stock || 0) > 0
    ).length;
    const outOfStockCount = (stockData || []).filter((d) => (d.stock || 0) <= 0).length;

    return {
      totalProducts: totalCount || 0,
      totalValue,
      lowStockCount,
      expiringSoonCount: expiringCount || 0,
      outOfStockCount,
    };
  },
};
