/**
 * Return Service - Sales and purchase return operations
 */

import { Return, PurchaseReturn } from '../../types';
import { ReturnService } from './types';

import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { idGenerator } from '../../utils/idGenerator';

export const createReturnService = (): ReturnService => ({
  // Sales Returns
  getAllSalesReturns: async (): Promise<Return[]> => {
    return storage.get<Return[]>(StorageKeys.RETURNS, []);
  },

  getSalesReturnById: async (id: string): Promise<Return | null> => {
    const all = await returnService.getAllSalesReturns();
    return all.find(r => r.id === id) || null;
  },

  createSalesReturn: async (ret: Omit<Return, 'id'>): Promise<Return> => {
    const all = await returnService.getAllSalesReturns();
    const newReturn: Return = { 
      ...ret, 
      id: idGenerator.generate('returns')
    } as Return;
    all.push(newReturn);
    storage.set(StorageKeys.RETURNS, all);
    return newReturn;
  },

  // Purchase Returns
  getAllPurchaseReturns: async (): Promise<PurchaseReturn[]> => {
    return storage.get<PurchaseReturn[]>(StorageKeys.PURCHASE_RETURNS, []);
  },

  getPurchaseReturnById: async (id: string): Promise<PurchaseReturn | null> => {
    const all = await returnService.getAllPurchaseReturns();
    return all.find(r => r.id === id) || null;
  },

  createPurchaseReturn: async (ret: Omit<PurchaseReturn, 'id'>): Promise<PurchaseReturn> => {
    const all = await returnService.getAllPurchaseReturns();
    const newReturn: PurchaseReturn = { 
      ...ret, 
      id: idGenerator.generate('returns')
    } as PurchaseReturn;
    all.push(newReturn);
    storage.set(StorageKeys.PURCHASE_RETURNS, all);
    return newReturn;
  },

  // Save
  saveSalesReturns: async (returns: Return[]): Promise<void> => {
    storage.set(StorageKeys.RETURNS, returns);
  },

  savePurchaseReturns: async (returns: PurchaseReturn[]): Promise<void> => {
    storage.set(StorageKeys.PURCHASE_RETURNS, returns);
  }
});

export const returnService = createReturnService();
