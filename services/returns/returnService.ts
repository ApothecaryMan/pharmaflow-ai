/**
 * Return Service - Sales and purchase return operations
 * Business logic layer that orchestrates data access via ReturnsRepository.
 */

import type { PurchaseReturn, Return } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { authService } from '../auth/authService';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { settingsService } from '../settings/settingsService';
import { returnsRepository } from './repositories/returnsRepository';
import type { ReturnService, ReturnsPageOptions } from './types';

export const returnService: ReturnService = {
  // Sales Returns
  getAllSalesReturns: async (branchId?: string): Promise<Return[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return returnsRepository.getAllSales(effectiveBranchId, settings.orgId);
  },

  getRecentSalesReturns: async (branchId?: string, limit: number = 100): Promise<Return[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return returnsRepository.getRecentSales(effectiveBranchId, settings.orgId, limit);
  },

  listSalesReturnsPage: async (options: ReturnsPageOptions): Promise<{ rows: Return[]; total: number; page: number; pageSize: number }> => {
    const settings = await settingsService.getAll();
    return returnsRepository.listSalesReturnsPage({
      ...options,
      branchId: options.branchId || settings.activeBranchId || settings.branchCode,
      orgId: options.orgId || settings.orgId,
    });
  },

  getSalesReturnById: async (id: string): Promise<Return | null> => {
    return returnsRepository.getSalesById(id);
  },

  createSalesReturn: async (ret: Omit<Return, 'id'>, branchId?: string): Promise<Return> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId =
      branchId || (ret as any).branchId || settings.activeBranchId || settings.branchCode;

    const newReturn: Return = {
      ...ret,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: ret.date || new Date().toISOString(),
      processedBy: ret.processedBy || authService.getCurrentUserSync()?.employeeId,
    } as Return;

    await returnsRepository.insertSalesReturn(newReturn);
    return newReturn;
  },

  // Purchase Returns
  getAllPurchaseReturns: async (branchId?: string): Promise<PurchaseReturn[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return returnsRepository.getAllPurchases(effectiveBranchId, settings.orgId);
  },

  getRecentPurchaseReturns: async (branchId?: string, limit: number = 100): Promise<PurchaseReturn[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return returnsRepository.getRecentPurchase(effectiveBranchId, settings.orgId, limit);
  },

  getPurchaseReturnById: async (id: string): Promise<PurchaseReturn | null> => {
    return returnsRepository.getPurchaseById(id);
  },

  listPurchaseReturnsPage: async (options: ReturnsPageOptions): Promise<{ rows: PurchaseReturn[]; total: number; page: number; pageSize: number }> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = options.branchId || settings.activeBranchId || settings.branchCode;
    return returnsRepository.listPurchaseReturnsPage({
      ...options,
      branchId: effectiveBranchId,
      orgId: settings.orgId,
    });
  },

  createPurchaseReturn: async (
    ret: Omit<PurchaseReturn, 'id'>,
    branchId?: string
  ): Promise<PurchaseReturn> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId =
      branchId || (ret as any).branchId || settings.activeBranchId || settings.branchCode;

    const newReturn: PurchaseReturn = {
      ...ret,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: ret.date || new Date().toISOString(),
    } as PurchaseReturn;

    // 1. Process Inventory Deductions (FEFO)
    for (const item of newReturn.items) {
      // allocateStock with commitChanges=true (default) updates the batches.
      // The DB Trigger will automatically log movements and update drugs.stock.
      const allocations = await batchService.allocateStock(
        item.drugId,
        item.quantityReturned,
        effectiveBranchId,
        true
      );

      if (!allocations) {
        throw new Error(`Insufficient stock for drug: ${item.name}`);
      }
    }

    // 2. Save Return Record
    await returnsRepository.insertPurchaseReturn(newReturn);
    return newReturn;
  },

  saveSalesReturns: async (returns: Return[], branchId?: string): Promise<void> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    const processedReturns = returns.map((r) => ({
      ...r,
      branchId: r.branchId || effectiveBranchId,
      orgId: r.orgId || settings.orgId,
    }));

    await returnsRepository.upsertSalesReturns(processedReturns);
  },

  savePurchaseReturns: async (returns: PurchaseReturn[], branchId?: string): Promise<void> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    const processedReturns = returns.map((r) => ({
      ...r,
      branchId: r.branchId || effectiveBranchId,
      orgId: r.orgId || settings.orgId,
    }));

    await returnsRepository.upsertPurchaseReturns(processedReturns);
  },

  // Mappers (Kept for compatibility if needed elsewhere, though now mostly in repo)
  mapFromDb: (db: any) => returnsRepository.mapSalesFromDb(db),
  mapToDb: (r: Partial<Return>) => returnsRepository.mapSalesToDb(r),
  mapPurchaseReturnFromDb: (db: any) => returnsRepository.mapPurchaseFromDb(db),
  mapPurchaseReturnToDb: (r: Partial<PurchaseReturn>) => returnsRepository.mapPurchaseToDb(r),
};
