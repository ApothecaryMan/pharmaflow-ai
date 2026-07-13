/**
 * Sales Service - Sales transaction operations
 * Business logic layer that orchestrates data access via SalesRepository.
 */

import type { Sale } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { BaseDomainService } from '../core/baseDomainService';
import { dateRangeService } from '../financials/dateRangeService';
import { settingsService } from '../settings/settingsService';
import timeService from '../timeService';
import { salesRepository } from './repositories/salesRepository';
import type {
  PagedResult,
  SalesFilters,
  SalesPageOptions,
  SalesService,
  SalesStats,
} from './types';

class SalesServiceImpl extends BaseDomainService<Sale> implements SalesService {
  protected tableName = 'sales';

  public mapFromDb(db: Record<string, unknown>): Sale {
    return salesRepository.mapFromDb(db);
  }

  public mapToDb(s: Partial<Sale>): Record<string, unknown> {
    return salesRepository.mapToDb(s);
  }

  async getAll(branchId?: string): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return salesRepository.getAll(effectiveBranchId, settings.orgId);
  }

  async getRecent(branchId?: string, limit = 100): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return salesRepository.getRecent(effectiveBranchId, settings.orgId, limit);
  }

  async listPage(options: SalesPageOptions): Promise<PagedResult<Sale>> {
    const settings = await settingsService.getAll();
    return salesRepository.listPage({
      ...options,
      branchId: options.branchId || settings.activeBranchId || settings.branchCode,
      orgId: options.orgId || settings.orgId,
    });
  }

  async getById(id: string): Promise<Sale | null> {
    return salesRepository.getById(id);
  }

  async getByCustomer(customerId: string, branchId?: string): Promise<Sale[]> {
    return this.filter({ customerCode: customerId }, branchId);
  }

  async getByDateRange(from: string, to: string, branchId?: string): Promise<Sale[]> {
    return this.filter({ dateFrom: from, dateTo: to }, branchId);
  }

  async getToday(branchId?: string): Promise<Sale[]> {
    const today = dateRangeService.getLocalDateString();
    return this.getByDateRange(`${today}T00:00:00`, `${today}T23:59:59`, branchId);
  }

  async create(sale: Omit<Sale, 'id'>, branchId?: string): Promise<Sale> {
    const settings = await settingsService.getAll();
    const effectiveBranchId =
      branchId || sale.branchId || settings.activeBranchId || settings.branchCode;

    const newSale: Sale = {
      ...sale,
      id: ('id' in sale ? (sale as Sale).id : undefined) || idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: sale.orgId || settings.orgId,
      date: sale.date || timeService.getVerifiedDate().toISOString(),
      netTotal: sale.netTotal ?? sale.total,
    } as Sale;

    await salesRepository.insert(newSale);
    return newSale;
  }

  async update(id: string, updates: Partial<Sale>, skipFetch: boolean = false): Promise<Sale> {
    await salesRepository.update(id, updates);
    if (skipFetch) return { id, ...updates } as unknown as Sale;
    const updated = await this.getById(id);
    if (!updated) throw new Error('Sale not found after update');
    return updated;
  }

  async getStats(branchId?: string): Promise<SalesStats> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return salesRepository.getStats(effectiveBranchId, settings.orgId);
  }

  async filter(filters: SalesFilters, branchId?: string): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return salesRepository.findByFilters(filters, effectiveBranchId, settings.orgId);
  }

  async save(sales: Sale[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    const processedSales = sales.map((s) => ({
      ...s,
      branchId: s.branchId || effectiveBranchId,
      orgId: s.orgId || settings.orgId,
    }));

    await salesRepository.upsert(processedSales);
  }
}

export const salesService = new SalesServiceImpl();
