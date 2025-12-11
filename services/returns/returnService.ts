/**
 * Return Service - Sales and purchase return operations
 */

import { Return, PurchaseReturn } from '../../types';
import { ReturnService } from './types';

const SALES_RETURNS_KEY = 'pharma_returns';
const PURCHASE_RETURNS_KEY = 'pharma_purchase_returns';

export const createReturnService = (): ReturnService => ({
  // Sales Returns
  getAllSalesReturns: async (): Promise<Return[]> => {
    const data = localStorage.getItem(SALES_RETURNS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getSalesReturnById: async (id: string): Promise<Return | null> => {
    const all = await returnService.getAllSalesReturns();
    return all.find(r => r.id === id) || null;
  },

  createSalesReturn: async (ret: Omit<Return, 'id'>): Promise<Return> => {
    const all = await returnService.getAllSalesReturns();
    const newReturn: Return = { 
      ...ret, 
      id: Date.now().toString()
    } as Return;
    all.push(newReturn);
    localStorage.setItem(SALES_RETURNS_KEY, JSON.stringify(all));
    return newReturn;
  },

  // Purchase Returns
  getAllPurchaseReturns: async (): Promise<PurchaseReturn[]> => {
    const data = localStorage.getItem(PURCHASE_RETURNS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getPurchaseReturnById: async (id: string): Promise<PurchaseReturn | null> => {
    const all = await returnService.getAllPurchaseReturns();
    return all.find(r => r.id === id) || null;
  },

  createPurchaseReturn: async (ret: Omit<PurchaseReturn, 'id'>): Promise<PurchaseReturn> => {
    const all = await returnService.getAllPurchaseReturns();
    const newReturn: PurchaseReturn = { 
      ...ret, 
      id: Date.now().toString()
    } as PurchaseReturn;
    all.push(newReturn);
    localStorage.setItem(PURCHASE_RETURNS_KEY, JSON.stringify(all));
    return newReturn;
  },

  // Save
  saveSalesReturns: async (returns: Return[]): Promise<void> => {
    localStorage.setItem(SALES_RETURNS_KEY, JSON.stringify(returns));
  },

  savePurchaseReturns: async (returns: PurchaseReturn[]): Promise<void> => {
    localStorage.setItem(PURCHASE_RETURNS_KEY, JSON.stringify(returns));
  }
});

export const returnService = createReturnService();
