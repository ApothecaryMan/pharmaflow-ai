/**
 * Return Types - Sales and purchase returns
 */

import { Return, PurchaseReturn } from '../../types';

export type { Return, PurchaseReturn };

export interface ReturnService {
  // Sales Returns
  getAllSalesReturns(): Promise<Return[]>;
  getSalesReturnById(id: string): Promise<Return | null>;
  createSalesReturn(ret: Omit<Return, 'id'>): Promise<Return>;
  
  // Purchase Returns
  getAllPurchaseReturns(): Promise<PurchaseReturn[]>;
  getPurchaseReturnById(id: string): Promise<PurchaseReturn | null>;
  createPurchaseReturn(ret: Omit<PurchaseReturn, 'id'>): Promise<PurchaseReturn>;
  
  // Save
  saveSalesReturns(returns: Return[]): Promise<void>;
  savePurchaseReturns(returns: PurchaseReturn[]): Promise<void>;
}
