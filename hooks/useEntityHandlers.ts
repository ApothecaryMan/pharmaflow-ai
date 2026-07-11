import type React from 'react';
import type {
  ActionContext,
  Customer,
  Drug,
  Employee,
  Purchase,
  PurchaseReturn,
  Return,
  Sale,
  StockBatch,
} from '../types';
import { usePurchaseHandlers } from './purchases/usePurchaseHandlers';
import type { SaleData } from './sales/useSalesHandlers';
import { useSalesHandlers } from './sales/useSalesHandlers';
import { useShift } from './sales/useShift';

export type { SaleData };

export interface EntityHandlers {
  handleCompleteSale: (saleData: SaleData) => Promise<boolean>;
  handleUpdateSale: (saleId: string, updates: Partial<Sale>) => void;
  handleProcessReturn: (returnData: Return) => void;
  handlePurchaseComplete: (purchase: Purchase) => Promise<boolean>;
  handleApprovePurchase: (purchaseId: string) => Promise<void>;
  handleMarkAsReceived: (purchaseId: string) => Promise<void>;
  handleRejectPurchase: (purchaseId: string, reason?: string) => void;
  handleCreatePurchaseReturn: (returnData: PurchaseReturn) => Promise<void>;
}

export interface UseEntityHandlersParams {
  inventory: Drug[];
  setInventory: React.Dispatch<React.SetStateAction<Drug[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: React.Dispatch<React.SetStateAction<PurchaseReturn[]>>;
  returns: Return[];
  setReturns: React.Dispatch<React.SetStateAction<Return[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  employees: Employee[];
  batches: StockBatch[];
  setBatches: (batches: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => void;
  currentEmployeeId: string | null;
  activeBranchId: string;
  activeOrgId: string;
  isLoading: boolean;
  addPurchase?: (purchase: Omit<Purchase, 'id'>, context?: ActionContext) => Promise<Purchase>;
  approvePurchase?: (id: string, context: ActionContext) => Promise<void>;
  markAsReceived?: (
    id: string,
    receiverId: string,
    receiverName: string,
    shiftId?: string
  ) => Promise<void>;
  completeSale: (saleData: any, context: ActionContext) => Promise<Sale>;
  processSalesReturn: (returnData: any, sale: Sale, context: ActionContext) => Promise<void>;
  createPurchaseReturn: (
    ret: Omit<PurchaseReturn, 'id'>,
    context: ActionContext
  ) => Promise<PurchaseReturn>;
  getVerifiedDate: () => Date;
  validateTransactionTime: (date: Date) => { valid: boolean; message?: string };
  updateLastTransactionTime: (time: number) => void;
}

export function useEntityHandlers(params: UseEntityHandlersParams) {
  const { currentShift, addTransaction } = useShift();

  const salesHandlers = useSalesHandlers({
    currentEmployeeId: params.currentEmployeeId,
    employees: params.employees,
    activeBranchId: params.activeBranchId,
    activeOrgId: params.activeOrgId,
    inventory: params.inventory,
    setInventory: params.setInventory,
    sales: params.sales,
    setSales: params.setSales,
    setBatches: params.setBatches,
    setCustomers: params.setCustomers,
    setReturns: params.setReturns,
    currentShift,
    addTransaction,
    getVerifiedDate: params.getVerifiedDate,
    validateTransactionTime: params.validateTransactionTime,
    updateLastTransactionTime: params.updateLastTransactionTime,
    completeSale: params.completeSale,
    processSalesReturn: params.processSalesReturn,
  });

  const purchaseHandlers = usePurchaseHandlers({
    currentEmployeeId: params.currentEmployeeId,
    employees: params.employees,
    activeBranchId: params.activeBranchId,
    activeOrgId: params.activeOrgId,
    purchases: params.purchases,
    setPurchases: params.setPurchases,
    purchaseReturns: params.purchaseReturns,
    setPurchaseReturns: params.setPurchaseReturns,
    currentShift,
    addPurchase: params.addPurchase,
    approvePurchase: params.approvePurchase,
    markAsReceived: params.markAsReceived,
    createPurchaseReturn: params.createPurchaseReturn,
  });

  return {
    ...salesHandlers,
    ...purchaseHandlers,
  };
}
