/**
 * Sales Service - Sales transaction operations
 * Business logic layer that orchestrates data access via SalesRepository.
 */

import { BaseDomainService } from '../core/baseDomainService';
import { money } from '../../utils/money';
import type { Sale } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { salesRepository } from './repositories/salesRepository';
import type { SalesFilters, SalesService, SalesStats } from './types';

class SalesServiceImpl extends BaseDomainService<Sale> implements SalesService {
  protected tableName = 'sales';

  public mapFromDb(db: any): Sale {
    return salesRepository.mapFromDb(db);
  }

  public mapToDb(s: Partial<Sale>): any {
    return salesRepository.mapToDb(s);
  }

  async getAll(branchId?: string): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return salesRepository.getAll(effectiveBranchId, settings.orgId);
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
    const today = new Date().toISOString().split('T')[0];
    return this.getByDateRange(`${today}T00:00:00`, `${today}T23:59:59`, branchId);
  }

  async create(sale: Omit<Sale, 'id'>, branchId?: string): Promise<Sale> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (sale as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newSale: Sale = {
      ...sale,
      id: (sale as any).id || idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: (sale as any).orgId || settings.orgId,
      date: sale.date || new Date().toISOString(),
      netTotal: sale.netTotal ?? sale.total,
    } as Sale;

    await salesRepository.insert(newSale);
    return newSale;
  }

  async update(id: string, updates: Partial<Sale>, skipFetch: boolean = false): Promise<Sale> {
    await salesRepository.update(id, updates);
    if (skipFetch) return { id, ...updates } as any;
    const updated = await this.getById(id);
    if (!updated) throw new Error('Sale not found after update');
    return updated;
  }

  async getStats(branchId?: string): Promise<SalesStats> {
    const all = await this.getAll(branchId);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = all.filter((s) => s.date.startsWith(today));

    const totalRev = all.reduce((sum, s) => money.add(sum, s.total), 0);
    const todayRev = todaySales.reduce((sum, s) => money.add(sum, s.total), 0);

    return {
      totalSales: all.length,
      totalRevenue: totalRev,
      averageTransaction:
        all.length > 0 ? money.divide(totalRev, all.length) : 0,
      todaySales: todaySales.length,
      todayRevenue: todayRev,
    };
  }

  async filter(filters: SalesFilters, branchId?: string): Promise<Sale[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return salesRepository.findByFilters(filters, effectiveBranchId, settings.orgId);
  }

  async save(sales: Sale[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const processedSales = sales.map(s => ({
      ...s,
      branchId: s.branchId || effectiveBranchId,
      orgId: s.orgId || settings.orgId
    }));

    await salesRepository.upsert(processedSales);
  }
}

export const salesService = new SalesServiceImpl();
