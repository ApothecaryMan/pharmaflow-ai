/**
 * Return Service - Sales and purchase return operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { PurchaseReturn, Return } from '../../types';
import { idGenerator } from '../../utils/idGenerator';

import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { inventoryService } from '../inventory/inventoryService';
import { batchService } from '../inventory/batchService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { syncQueueService } from '../syncQueueService';
import type { ReturnService } from './types';
import type { StockMovement } from '../../types';

const getRawSalesReturns = (): Return[] => {
  return storage.get<Return[]>(StorageKeys.RETURNS, []);
};

const getRawPurchaseReturns = (): PurchaseReturn[] => {
  return storage.get<PurchaseReturn[]>(StorageKeys.PURCHASE_RETURNS, []);
};

export const createReturnService = (): ReturnService => ({
  // Sales Returns
  getAllSalesReturns: async (branchId?: string): Promise<Return[]> => {
    const all = getRawSalesReturns();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((r) => r.branchId === effectiveBranchId);
  },

  getSalesReturnById: async (id: string, branchId?: string): Promise<Return | null> => {
    const all = await returnService.getAllSalesReturns(branchId);
    return all.find((r) => r.id === id) || null;
  },

  createSalesReturn: async (ret: Omit<Return, 'id'>, branchId?: string, skipSync = false): Promise<Return> => {
    const all = getRawSalesReturns();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (ret as any).branchId || settings.activeBranchId || settings.branchCode;
    const newReturn: Return = {
      ...ret,
      id: idGenerator.generate('returns', effectiveBranchId),
      branchId: effectiveBranchId,
    } as Return;

    all.push(newReturn);
    storage.set(StorageKeys.RETURNS, all);

    if (!skipSync) {
      // Sales returns are usually handled by transactionService, but if called directly:
      await syncQueueService.enqueue('RETURN', { action: 'CREATE_RETURN', return: newReturn });
    }

    return newReturn;
  },

  // Purchase Returns
  getAllPurchaseReturns: async (branchId?: string): Promise<PurchaseReturn[]> => {
    const all = getRawPurchaseReturns();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((r) => r.branchId === effectiveBranchId);
  },

  getPurchaseReturnById: async (id: string, branchId?: string): Promise<PurchaseReturn | null> => {
    const all = await returnService.getAllPurchaseReturns(branchId);
    return all.find((r) => r.id === id) || null;
  },

  createPurchaseReturn: async (ret: Omit<PurchaseReturn, 'id'>, branchId?: string, skipSync = false): Promise<PurchaseReturn> => {
    const all = getRawPurchaseReturns();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (ret as any).branchId || settings.activeBranchId || settings.branchCode;
    const newReturn: PurchaseReturn = {
      ...ret,
      id: idGenerator.generate('returns', effectiveBranchId),
      branchId: effectiveBranchId,
    } as PurchaseReturn;

    // 1. Process Inventory Deductions (FEFO)
    const movements: StockMovement[] = [];
    for (const item of newReturn.items) {
      const currentStock = await batchService.getTotalStock(item.drugId);
      
      // Allocate from batches
      const allocations = await batchService.allocateStock(item.drugId, item.quantityReturned, undefined, true);
      
      for (const allocation of allocations) {
        const movement = await stockMovementService.logMovement({
          drugId: item.drugId,
          drugName: item.name,
          branchId: effectiveBranchId,
          type: 'return_supplier',
          quantity: -allocation.quantity,
          previousStock: currentStock, // Snapshot before this item's allocation (simplified)
          newStock: currentStock - allocation.quantity,
          referenceId: newReturn.id,
          batchId: allocation.batchId,
          performedBy: storage.get(StorageKeys.CURRENT_EMPLOYEE_ID, 'System'),
          status: 'approved',
        }, true);
        movements.push(movement);
      }

      await inventoryService.updateStock(item.drugId, -item.quantityReturned, true);
    }

    // 2. Save Return Record
    all.push(newReturn);
    storage.set(StorageKeys.PURCHASE_RETURNS, all);

    // 3. Atomic Sync
    if (!skipSync) {
      await syncQueueService.enqueue('PURCHASE_RETURN_TRANSACTION', {
        action: 'CREATE_PURCHASE_RETURN',
        purchaseReturn: newReturn,
        movements,
      });
    }

    return newReturn;
  },

  // Save
  saveSalesReturns: async (returns: Return[], branchId?: string): Promise<void> => {
    const all = getRawSalesReturns();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    const otherBranchItems = all.filter((r) => r.branchId && r.branchId !== effectiveBranchId);
    
    // Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...returns];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    storage.set(StorageKeys.RETURNS, uniqueMerged);
  },

  savePurchaseReturns: async (returns: PurchaseReturn[], branchId?: string): Promise<void> => {
    const all = getRawPurchaseReturns();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    const otherBranchItems = all.filter((r) => r.branchId && r.branchId !== effectiveBranchId);
    
    // Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...returns];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    storage.set(StorageKeys.PURCHASE_RETURNS, uniqueMerged);
  },
});

export const returnService = createReturnService();
