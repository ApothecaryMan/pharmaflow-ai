/**
 * Return Service - Sales and purchase return operations
 */

import { StorageKeys } from '../../config/storageKeys';
import type { PurchaseReturn, Return } from '../../types';
import { idGenerator } from '../../utils/idGenerator';

import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import type { ReturnService } from './types';

const getRawSalesReturns = (): Return[] => {
  return storage.get<Return[]>(StorageKeys.RETURNS, []);
};

const getRawPurchaseReturns = (): PurchaseReturn[] => {
  return storage.get<PurchaseReturn[]>(StorageKeys.PURCHASE_RETURNS, []);
};

export const createReturnService = (): ReturnService => ({
  // Sales Returns
  getAllSalesReturns: async (): Promise<Return[]> => {
    const all = getRawSalesReturns();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    return all.filter((r) => !r.branchId || r.branchId === branchCode);
  },

  getSalesReturnById: async (id: string): Promise<Return | null> => {
    const all = await returnService.getAllSalesReturns();
    return all.find((r) => r.id === id) || null;
  },

  createSalesReturn: async (ret: Omit<Return, 'id'>): Promise<Return> => {
    const all = getRawSalesReturns();
    const settings = await settingsService.getAll();
    const newReturn: Return = {
      ...ret,
      id: idGenerator.generate('returns'),
      branchId: settings.branchCode,
    } as Return;
    all.push(newReturn);
    storage.set(StorageKeys.RETURNS, all);
    return newReturn;
  },

  // Purchase Returns
  getAllPurchaseReturns: async (): Promise<PurchaseReturn[]> => {
    const all = getRawPurchaseReturns();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    return all.filter((r) => !r.branchId || r.branchId === branchCode);
  },

  getPurchaseReturnById: async (id: string): Promise<PurchaseReturn | null> => {
    const all = await returnService.getAllPurchaseReturns();
    return all.find((r) => r.id === id) || null;
  },

  createPurchaseReturn: async (ret: Omit<PurchaseReturn, 'id'>): Promise<PurchaseReturn> => {
    const all = getRawPurchaseReturns();
    const settings = await settingsService.getAll();
    const newReturn: PurchaseReturn = {
      ...ret,
      id: idGenerator.generate('returns'),
      branchId: settings.branchCode,
    } as PurchaseReturn;
    all.push(newReturn);
    storage.set(StorageKeys.PURCHASE_RETURNS, all);
    return newReturn;
  },

  // Save
  // Save
  saveSalesReturns: async (returns: Return[]): Promise<void> => {
    const all = getRawSalesReturns();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    const otherBranchItems = all.filter((r) => r.branchId && r.branchId !== branchCode);
    const merged = [...otherBranchItems, ...returns];
    storage.set(StorageKeys.RETURNS, merged);
  },

  savePurchaseReturns: async (returns: PurchaseReturn[]): Promise<void> => {
    const all = getRawPurchaseReturns();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    const otherBranchItems = all.filter((r) => r.branchId && r.branchId !== branchCode);
    const merged = [...otherBranchItems, ...returns];
    storage.set(StorageKeys.PURCHASE_RETURNS, merged);
  },
});

export const returnService = createReturnService();
