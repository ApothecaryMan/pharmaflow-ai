/**
 * Return Types - Sales and purchase returns
 */

import type { PurchaseReturn, Return } from '../../types';

export type { Return, PurchaseReturn };

export interface ReturnsPageOptions {
  branchId?: string;
  orgId?: string;
  page?: number;
  pageSize?: number;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    reason?: string;
  };
  sort?: {
    column?: string;
    ascending?: boolean;
  };
}

export interface ReturnService {
  getAllSalesReturns(branchId?: string): Promise<Return[]>;
  getRecentSalesReturns(branchId?: string, limit?: number): Promise<Return[]>;
  getSalesReturnById(id: string): Promise<Return | null>;
  listSalesReturnsPage(options: ReturnsPageOptions): Promise<{ rows: Return[]; total: number; page: number; pageSize: number }>;
  createSalesReturn(ret: Omit<Return, 'id'>, branchId?: string): Promise<Return>;

  // Purchase Returns
  getAllPurchaseReturns(branchId?: string): Promise<PurchaseReturn[]>;
  getRecentPurchaseReturns(branchId?: string, limit?: number): Promise<PurchaseReturn[]>;
  getPurchaseReturnById(id: string, branchId?: string): Promise<PurchaseReturn | null>;
  createPurchaseReturn(ret: Omit<PurchaseReturn, 'id'>, branchId?: string): Promise<PurchaseReturn>;

  // Save
  saveSalesReturns(returns: Return[], branchId?: string): Promise<void>;
  savePurchaseReturns(returns: PurchaseReturn[], branchId?: string): Promise<void>;

  // Mappers
  mapFromDb(db: any): Return;
  mapToDb(r: Partial<Return>): any;
  mapPurchaseReturnFromDb(db: any): PurchaseReturn;
  mapPurchaseReturnToDb(r: Partial<PurchaseReturn>): any;
}
