/**
 * Return Types - Sales and purchase returns
 */

import type { PurchaseReturn, Return } from '../../types';

export type { Return, PurchaseReturn };

export interface ReturnService {
  // Sales Returns
  getAllSalesReturns(branchId?: string): Promise<Return[]>;
  getSalesReturnById(id: string): Promise<Return | null>;
  createSalesReturn(ret: Omit<Return, 'id'>): Promise<Return>;

  // Purchase Returns
  getAllPurchaseReturns(branchId?: string): Promise<PurchaseReturn[]>;
  getPurchaseReturnById(id: string): Promise<PurchaseReturn | null>;
  createPurchaseReturn(ret: Omit<PurchaseReturn, 'id'>): Promise<PurchaseReturn>;

  // Save
  saveSalesReturns(returns: Return[], branchId?: string): Promise<void>;
  savePurchaseReturns(returns: PurchaseReturn[], branchId?: string): Promise<void>;
}
