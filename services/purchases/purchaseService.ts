/**
 * Purchase Service - Purchase order operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Purchase, PurchaseStatus } from '../../types';
import { idGenerator } from '../../utils/idGenerator';

import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { inventoryService } from '../inventory/inventoryService';
import { batchService } from '../inventory/batchService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { syncQueueService } from '../syncQueueService';
import * as stockOps from '../../utils/stockOperations';
import type { PurchaseFilters, PurchaseService, PurchaseStats } from './types';
import type { StockMovement, StockBatch } from '../../types';

const getRawAll = (): Purchase[] => {
  return storage.get<Purchase[]>(StorageKeys.PURCHASES, []);
};

export const createPurchaseService = (): PurchaseService => ({
  getAll: async (branchId?: string): Promise<Purchase[]> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((p) => p.branchId === effectiveBranchId);
  },

  getById: async (id: string, branchId?: string): Promise<Purchase | null> => {
    const all = await purchaseService.getAll(branchId);
    return all.find((p) => p.id === id) || null;
  },

  getBySupplier: async (supplierId: string, branchId?: string): Promise<Purchase[]> => {
    const all = await purchaseService.getAll(branchId);
    return all.filter((p) => p.supplierId === supplierId);
  },

  getByStatus: async (status: PurchaseStatus, branchId?: string): Promise<Purchase[]> => {
    const all = await purchaseService.getAll(branchId);
    return all.filter((p) => p.status === status);
  },

  getPending: async (branchId?: string): Promise<Purchase[]> => {
    const all = await purchaseService.getAll(branchId);
    return all.filter((p) => p.status === 'pending');
  },

  filter: async (filters: PurchaseFilters, branchId?: string): Promise<Purchase[]> => {
    let results = await purchaseService.getAll(branchId);

    if (filters.status) {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters.supplierId) {
      results = results.filter((p) => p.supplierId === filters.supplierId);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      results = results.filter((p) => new Date(p.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      results = results.filter((p) => new Date(p.date) <= to);
    }
    return results;
  },

  create: async (purchase: Omit<Purchase, 'id'>, branchId?: string, skipSync = false): Promise<Purchase> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (purchase as any).branchId || settings.activeBranchId || settings.branchCode;
    const newPurchase: Purchase = {
      ...purchase,
      id: idGenerator.generate('purchases', effectiveBranchId),
      status: 'pending',
      branchId: effectiveBranchId,
    } as Purchase;

    all.push(newPurchase);
    storage.set(StorageKeys.PURCHASES, all);

    if (!skipSync) {
      await syncQueueService.enqueue('PURCHASE', { action: 'CREATE_PURCHASE', purchase: newPurchase });
    }

    return newPurchase;
  },

  update: async (id: string, updates: Partial<Purchase>, skipSync = false): Promise<Purchase> => {
    const all = getRawAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = { ...all[index], ...updates };
    storage.set(StorageKeys.PURCHASES, all);

    if (!skipSync) {
      await syncQueueService.enqueue('PURCHASE', { action: 'UPDATE_PURCHASE', id, updates });
    }

    return all[index];
  },

  approve: async (id: string, approverName: string, skipSync = false): Promise<Purchase> => {
    const all = getRawAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    
    const purchase = all[index];
    if (purchase.status === 'completed') return purchase;

    // 1. Update Inventory and Create Batches
    const movements: StockMovement[] = [];
    const newBatches: StockBatch[] = [];

    for (const item of purchase.items) {
      const currentStock = await batchService.getTotalStock(item.drugId);
      const unitsToAdd = stockOps.resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack);

      const batch = await batchService.createBatch({
        drugId: item.drugId,
        quantity: unitsToAdd,
        expiryDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        costPrice: item.costPrice,
        purchaseId: purchase.id,
        dateReceived: new Date().toISOString(),
        branchId: purchase.branchId,
        version: 1,
      }, purchase.branchId, true);
      newBatches.push(batch);

      const movement = await stockMovementService.logMovement({
        drugId: item.drugId,
        drugName: item.name,
        branchId: purchase.branchId || '',
        type: 'purchase',
        quantity: unitsToAdd,
        previousStock: currentStock,
        newStock: currentStock + unitsToAdd,
        referenceId: purchase.id,
        batchId: batch.id,
        performedBy: approverName,
        status: 'approved',
      }, true);
      movements.push(movement);
    }

    await inventoryService.updateStockBulk(
      purchase.items.map(i => ({ 
        id: i.drugId, 
        quantity: stockOps.resolveUnits(i.quantity, !!i.isUnit, i.unitsPerPack) 
      })),
      true
    );

    // 2. Update Purchase Status
    all[index] = {
      ...purchase,
      status: 'completed',
      approvedBy: approverName,
      approvalDate: new Date().toISOString(),
    };
    storage.set(StorageKeys.PURCHASES, all);

    // 3. Sync Atomic Transaction
    if (!skipSync) {
      await syncQueueService.enqueue('PURCHASE_TRANSACTION', {
        action: 'APPROVE_PURCHASE',
        purchase: all[index],
        movements,
        batches: newBatches,
      });
    }

    return all[index];
  },

  reject: async (id: string, reason: string, skipSync = false): Promise<Purchase> => {
    const all = getRawAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Purchase not found');
    all[index] = {
      ...all[index],
      status: 'rejected',
    };
    storage.set(StorageKeys.PURCHASES, all);

    if (!skipSync) {
      await syncQueueService.enqueue('PURCHASE', { action: 'UPDATE_PURCHASE', id, updates: { status: 'rejected' } });
    }

    return all[index];
  },

  receive: async (id: string, skipSync = false): Promise<Purchase> => {
    // Attempt to get current user/employee for the approval log
    const currentEmployeeId = storage.get(StorageKeys.CURRENT_EMPLOYEE_ID, 'System');
    return purchaseService.approve(id, currentEmployeeId, skipSync);
  },

  delete: async (id: string, skipSync = false): Promise<boolean> => {
    const all = getRawAll();
    const initialLength = all.length;
    const filtered = all.filter((p) => p.id !== id);
    
    if (filtered.length !== initialLength) {
      storage.set(StorageKeys.PURCHASES, filtered);
      if (!skipSync) {
        await syncQueueService.enqueue('PURCHASE', { action: 'DELETE_PURCHASE', id });
      }
      return true;
    }
    return false;
  },

  getStats: async (branchId?: string): Promise<PurchaseStats> => {
    const all = await purchaseService.getAll(branchId);
    return {
      totalOrders: all.length,
      pendingOrders: all.filter((p) => p.status === 'pending').length,
      totalValue: all.reduce((sum, p) => sum + (p.totalCost || 0), 0),
    };
  },

  save: async (purchases: Purchase[], branchId?: string): Promise<void> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    const otherBranchItems = all.filter((p) => p.branchId && p.branchId !== effectiveBranchId);
    
    // Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...purchases];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    storage.set(StorageKeys.PURCHASES, uniqueMerged);
  },
});

export const purchaseService = createPurchaseService();
