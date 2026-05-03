/**
 * Return Service - Sales and purchase return operations
 * Business logic layer that orchestrates data access via ReturnsRepository.
 */

import type { PurchaseReturn, Return } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { inventoryService } from '../inventory/inventoryService';
import { batchService } from '../inventory/batchService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { authService } from '../auth/authService';
import { returnsRepository } from './repositories/returnsRepository';
import type { ReturnService } from './types';

export const returnService: ReturnService = {
  // Sales Returns
  getAllSalesReturns: async (branchId?: string): Promise<Return[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return returnsRepository.getAllSales(effectiveBranchId);
  },

  getSalesReturnById: async (id: string): Promise<Return | null> => {
    return returnsRepository.getSalesById(id);
  },

  createSalesReturn: async (ret: Omit<Return, 'id'>, branchId?: string): Promise<Return> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (ret as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newReturn: Return = {
      ...ret,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: ret.date || new Date().toISOString(),
      processedBy: ret.processedBy || authService.getCurrentUserSync()?.employeeId
    } as Return;

    await returnsRepository.insertSalesReturn(newReturn);
    return newReturn;
  },

  // Purchase Returns
  getAllPurchaseReturns: async (branchId?: string): Promise<PurchaseReturn[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return returnsRepository.getAllPurchases(effectiveBranchId);
  },

  getPurchaseReturnById: async (id: string): Promise<PurchaseReturn | null> => {
    return returnsRepository.getPurchaseById(id);
  },

  createPurchaseReturn: async (ret: Omit<PurchaseReturn, 'id'>, branchId?: string): Promise<PurchaseReturn> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (ret as any).branchId || settings.activeBranchId || settings.branchCode;
    
    const newReturn: PurchaseReturn = {
      ...ret,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: ret.date || new Date().toISOString(),
    } as PurchaseReturn;

    // 1. Process Inventory Deductions (FEFO)
    for (const item of newReturn.items) {
      const currentStock = await batchService.getTotalStock(item.drugId, effectiveBranchId);
      
      const allocations = await batchService.allocateStock(item.drugId, item.quantityReturned, effectiveBranchId, true);
      
      if (allocations) {
        for (const allocation of allocations) {
          await stockMovementService.logMovement({
            drugId: item.drugId,
            drugName: item.name,
            branchId: effectiveBranchId,
            type: 'return_supplier',
            quantity: -allocation.quantity,
            previousStock: currentStock,
            newStock: currentStock - allocation.quantity,
            referenceId: newReturn.id,
            batchId: allocation.batchId,
            expiryDate: allocation.expiryDate,
            status: 'approved',
            orgId: settings.orgId,
          });
        }
      }

      await inventoryService.updateStock(item.drugId, -item.quantityReturned, true);
    }

    // 2. Save Return Record
    await returnsRepository.insertPurchaseReturn(newReturn);
    return newReturn;
  },

  saveSalesReturns: async (returns: Return[], branchId?: string): Promise<void> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const processedReturns = returns.map(r => ({
      ...r,
      branchId: r.branchId || effectiveBranchId,
      orgId: r.orgId || settings.orgId
    }));

    await returnsRepository.upsertSalesReturns(processedReturns);
  },

  savePurchaseReturns: async (returns: PurchaseReturn[], branchId?: string): Promise<void> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const processedReturns = returns.map(r => ({
      ...r,
      branchId: r.branchId || effectiveBranchId,
      orgId: r.orgId || settings.orgId
    }));

    await returnsRepository.upsertPurchaseReturns(processedReturns);
  },

  // Mappers (Kept for compatibility if needed elsewhere, though now mostly in repo)
  mapFromDb: (db: any) => returnsRepository.mapSalesFromDb(db),
  mapToDb: (r: Partial<Return>) => returnsRepository.mapSalesToDb(r),
  mapPurchaseReturnFromDb: (db: any) => returnsRepository.mapPurchaseFromDb(db),
  mapPurchaseReturnToDb: (r: Partial<PurchaseReturn>) => returnsRepository.mapPurchaseToDb(r),
};
