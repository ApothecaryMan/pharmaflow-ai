import { BaseDomainService } from '../core/BaseDomainService';
import type { Drug } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { batchService } from './batchService';
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { settingsService } from '../settings/settingsService';
import type { InventoryFilters, InventoryService, InventoryStats } from './types';
import { supabase } from '../../lib/supabase';

class InventoryServiceImpl extends BaseDomainService<Drug> implements InventoryService {
  protected tableName = 'drugs';

  public mapFromDb(db: any): Drug {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      name: db.name,
      nameArabic: db.name_arabic || undefined,
      genericName: db.generic_name || [],
      category: db.category,
      price: db.price,
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
  }

  public mapToDb(d: Partial<Drug>): any {
    const db: any = {};
    if (d.id !== undefined) db.id = d.id;
    if (d.orgId !== undefined) db.org_id = d.orgId;
    if (d.branchId !== undefined) db.branch_id = d.branchId;
    if (d.name !== undefined) db.name = d.name;
    if (d.nameArabic !== undefined) db.name_arabic = d.nameArabic;
    if (d.genericName !== undefined) db.generic_name = d.genericName;
    if (d.category !== undefined) db.category = d.category;
    if (d.price !== undefined) db.price = d.price;
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
  }

  // --- Specialized Methods ---

  async getAllBranches(branchId?: string): Promise<Drug[]> {
    try {
      let query = supabase.from(this.tableName).select('*');
      if (branchId) query = query.eq('branch_id', branchId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(item => this.mapFromDb(item));
    } catch (err) {
      console.error('[InventoryService] getAllBranches failed:', err);
      return [];
    }
  }

  async getByBarcode(barcode: string, branchId?: string): Promise<Drug | null> {
    try {
      const { data, error } = await supabase.from(this.tableName)
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();
      if (!error && data) return this.mapFromDb(data);
    } catch {}

    const all = await this.getAll(branchId);
    return all.find((d) => d.barcode === barcode) || null;
  }

  async search(query: string, branchId?: string): Promise<Drug[]> {
    const all = await this.getAll(branchId);
    const q = query.toLowerCase();
    return all.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.genericName && d.genericName.some(g => g.toLowerCase().includes(q))) ||
        d.barcode?.includes(q) ||
        d.internalCode?.toLowerCase().includes(q)
    );
  }

  async filter(filters: InventoryFilters, branchId?: string): Promise<Drug[]> {
    let results = await this.getAll(branchId);

    if (filters.category) results = results.filter((d) => d.category === filters.category);
    if (filters.lowStock) results = results.filter((d) => (d.stock || 0) < 10);
    if (filters.expiringSoon) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + filters.expiringSoon);
      results = results.filter((d) => parseExpiryEndOfMonth(d.expiryDate) <= threshold);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (d) => d.name.toLowerCase().includes(q) || (d.genericName && d.genericName.some(g => g.toLowerCase().includes(q)))
      );
    }
    return results;
  }

  async create(drug: Omit<Drug, 'id'>, branchId?: string): Promise<Drug> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (drug as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newDrug: Drug = {
      ...drug,
      id: idGenerator.uuid(),
      internalCode: drug.internalCode || idGenerator.code('DRUG'),
      branchId: effectiveBranchId,
      orgId: (drug as any).orgId || settings.orgId,
      status: drug.status || 'active',
    } as Drug;
    
    const dbDrug = this.mapToDb(newDrug);
    const { error } = await supabase.from(this.tableName).insert(dbDrug);
    if (error) throw error;

    await batchService.createBatch({
      drugId: newDrug.id,
      quantity: newDrug.stock,
      expiryDate: newDrug.expiryDate,
      costPrice: newDrug.costPrice,
      batchNumber: 'INITIAL',
      dateReceived: new Date().toISOString(),
      branchId: effectiveBranchId,
      orgId: newDrug.orgId,
      version: 1,
    }, effectiveBranchId);

    return newDrug;
  }

  async updateStock(id: string, quantity: number, skipBatch: boolean = false, batchId?: string, skipFetch: boolean = false): Promise<Drug> {
    if (skipBatch) {
      // Fast path: atomic increment, no read needed — safe for concurrent access
      const { data, error } = await supabase.rpc('atomic_increment_stock', {
        p_drug_id: id,
        p_delta: quantity,
      });
      if (error) throw error;
      
      if (skipFetch) {
        return { id, stock: 0 } as any; // Minimal object
      }

      // Return a minimal Drug object — caller usually discards it
      return { id, stock: data } as any;
    }

    // Slow path: needs drug data for batch operations
    const drug = await this.getById(id);
    if (!drug) throw new Error('Drug not found');
    
    const settings = await settingsService.getAll();
    const branchId = drug.branchId || settings.activeBranchId || settings.branchCode;
    
    if (quantity > 0) {
      if (batchId) {
        // Specific batch update
        await batchService.updateBatchQuantity(batchId, quantity);
      } else {
        // Generic increase: Merge into existing or create new
        await batchService.createBatch({
          drugId: id,
          quantity: quantity,
          expiryDate: drug.expiryDate,
          costPrice: drug.costPrice,
          batchNumber: 'STOCK-UPDATE',
          dateReceived: new Date().toISOString(),
          branchId: branchId,
          orgId: settings.orgId,
          version: 1,
        }, branchId);
      }
    } else if (quantity < 0) {
      // Decrease: use specific batch if provided, else FEFO
      const allocResult = await batchService.allocateStock(
        id, 
        Math.abs(quantity), 
        branchId, 
        true, 
        batchId // Pass preferredBatchId
      );
      
      if (!allocResult) {
        throw new Error(`Insufficient batch stock for drug ${id}`);
      }
    }

    const { data, error } = await supabase.rpc('atomic_increment_stock', {
      p_drug_id: id,
      p_delta: quantity,
    });
    if (error) throw error;

    return { ...drug, stock: data };
  }

  async updateStockCount(id: string, quantity: number): Promise<void> {
    const drug = await this.getById(id);
    if (!drug) throw new Error('Drug not found');
    
    const updatedStock = Math.max(0, (drug.stock || 0) + quantity);
    const { error } = await supabase.from(this.tableName)
      .update({ stock: updatedStock })
      .eq('id', id);
      
    if (error) throw error;
  }

  async updateStockBulk(mutations: { id: string; quantity: number; batchId?: string }[], skipBatch: boolean = false, skipFetch: boolean = true): Promise<void> {
    if (skipBatch) {
      // When skipping batch ops, all updates are independent — run in parallel
      await Promise.all(mutations.map(m => this.updateStock(m.id, m.quantity, true, undefined, skipFetch)));
    } else {
      for (const m of mutations) {
        await this.updateStock(m.id, m.quantity, skipBatch, m.batchId, skipFetch);
      }
    }
  }

  async getStats(branchId?: string): Promise<InventoryStats> {
    const all = await this.getAll(branchId);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      totalProducts: all.length,
      totalValue: all.reduce((sum, d) => sum + (d.price || 0) * (d.stock || 0), 0),
      lowStockCount: all.filter((d) => (d.stock || 0) < (d.minStock || 10) && (d.stock || 0) > 0).length,
      expiringSoonCount: all.filter((d) => parseExpiryEndOfMonth(d.expiryDate) <= thirtyDays).length,
      outOfStockCount: all.filter((d) => (d.stock || 0) <= 0).length,
    };
  }

  async getLowStock(threshold = 10, branchId?: string): Promise<Drug[]> {
    const all = await this.getAll(branchId);
    return all.filter((d) => (d.stock || 0) < threshold);
  }

  async getExpiringSoon(days = 30, branchId?: string): Promise<Drug[]> {
    const all = await this.getAll(branchId);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return all.filter((d) => parseExpiryEndOfMonth(d.expiryDate) <= threshold);
  }

  async save(inventory: Drug[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const processedInventory = inventory.map(drug => ({
      ...drug,
      id: idGenerator.isUuid(drug.id) ? drug.id : idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId
    }));

    const dbDrugs = processedInventory.map(d => this.mapToDb(d));
    if (dbDrugs.length > 0) {
      await supabase.from(this.tableName).upsert(dbDrugs, { onConflict: 'id' });
    }
  }
}

export const inventoryService = new InventoryServiceImpl();
