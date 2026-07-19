import { supabase } from '../../lib/supabase';
import type { Drug } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
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
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    try {
      const drug = await inventoryRepository.getByBarcode(
        barcode,
        settings.orgId,
        effectiveBranchId
      );
      if (drug) return drug;
    } catch {}

    const all = await this.getAll(effectiveBranchId);
    return all.find((d) => d.barcode === barcode) || null;
  }

  async search(query: string, branchId?: string): Promise<Drug[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return inventoryRepository.search(query, effectiveBranchId, settings.orgId);
  }

  async filter(filters: InventoryFilters, branchId?: string): Promise<Drug[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return inventoryRepository.filterBy(filters, effectiveBranchId, settings.orgId);
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
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return inventoryRepository.getStats(effectiveBranchId, settings.orgId);
  }

  async getLowStock(threshold = 10, branchId?: string): Promise<Drug[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return inventoryRepository.getLowStock(threshold, effectiveBranchId, settings.orgId);
  }

  async getExpiringSoon(days = 30, branchId?: string): Promise<Drug[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return inventoryRepository.getExpiringSoon(days, effectiveBranchId, settings.orgId);
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
