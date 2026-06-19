import { supabase } from '../../lib/supabase';
import type { Drug } from '../../types';
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { idGenerator } from '../../utils/idGenerator';
import { authService } from '../auth/authService';
import { permissionsService } from '../auth/permissionsService';
import { BaseDomainService } from '../core/baseDomainService';
import { settingsService } from '../settings/settingsService';
import { batchService } from './batchService';
import { inventoryRepository } from './repositories/inventoryRepository';
import type {
  InventoryFilters,
  InventoryService,
  InventoryStats,
  ProcessStockAdjustmentPayload,
} from './types';

class InventoryServiceImpl extends BaseDomainService<Drug> implements InventoryService {
  protected tableName = 'drugs';

  public mapFromDb(db: any): Drug {
    return inventoryRepository.mapFromDb(db);
  }

  public mapToDb(d: Partial<Drug>): any {
    return inventoryRepository.mapToDb(d);
  }

  // --- Specialized Methods ---

  async getAll(branchId?: string): Promise<Drug[]> {
    return inventoryRepository.getAll(branchId);
  }

  async getById(id: string): Promise<Drug | null> {
    return inventoryRepository.getById(id);
  }

  async getAllBranches(branchId?: string): Promise<Drug[]> {
    return inventoryRepository.getAll(branchId);
  }

  async getByBarcode(barcode: string, branchId?: string): Promise<Drug | null> {
    try {
      const drug = await inventoryRepository.getByBarcode(barcode);
      if (drug) return drug;
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
        (d.genericName && d.genericName.some((g) => g.toLowerCase().includes(q))) ||
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
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.genericName && d.genericName.some((g) => g.toLowerCase().includes(q)))
      );
    }
    return results;
  }

  async create(drug: Omit<Drug, 'id'>, branchId?: string): Promise<Drug> {
    const settings = await settingsService.getAll();
    const effectiveBranchId =
      branchId || (drug as any).branchId || settings.activeBranchId || settings.branchCode;

    const internalCode = drug.internalCode || (await idGenerator.code('DRUG', effectiveBranchId));

    const newDrug: Drug = {
      ...drug,
      id: idGenerator.uuid(),
      internalCode,
      branchId: effectiveBranchId,
      orgId: (drug as any).orgId || settings.orgId,
      status: drug.status || 'active',
    } as Drug;

    await inventoryRepository.insert(newDrug);

    await batchService.createBatch(
      {
        drugId: newDrug.id,
        quantity: newDrug.stock,
        expiryDate: newDrug.expiryDate,
        costPrice: newDrug.costPrice,
        batchNumber: 'INITIAL',
        dateReceived: new Date().toISOString(),
        branchId: effectiveBranchId,
        orgId: newDrug.orgId,
        version: 1,
      },
      effectiveBranchId
    );

    return newDrug;
  }

  async update(id: string, updates: Partial<Drug>): Promise<Drug> {
    return inventoryRepository.update(id, updates);
  }

  async processStockAdjustment(payload: ProcessStockAdjustmentPayload): Promise<void> {
    if (payload.adjustments.length === 0) return;

    const { error } = await supabase.rpc('process_stock_adjustment', { p_payload: payload });
    if (error) throw error;
  }

  async getStats(branchId?: string): Promise<InventoryStats> {
    const all = await this.getAll(branchId);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      totalProducts: all.length,
      totalValue: all.reduce(
        (sum, d) => sum + (d.publicPrice || 0) * ((d.stock || 0) / (d.unitsPerPack || 1)),
        0
      ),
      lowStockCount: all.filter((d) => (d.stock || 0) < (d.minStock || 10) && (d.stock || 0) > 0)
        .length,
      expiringSoonCount: all.filter((d) => parseExpiryEndOfMonth(d.expiryDate) <= thirtyDays)
        .length,
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

    const processedInventory = inventory.map((drug) => ({
      ...drug,
      id: idGenerator.isUuid(drug.id) ? drug.id : idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
    }));

    await inventoryRepository.upsert(processedInventory);
  }
}

export const inventoryService = new InventoryServiceImpl();
