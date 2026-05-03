import { useInventoryHandlers } from './inventory/useInventoryHandlers';
import { useSalesHandlers } from './sales/useSalesHandlers';
import { usePurchaseHandlers } from './purchases/usePurchaseHandlers';
import { useCustomerHandlers } from './customers/useCustomerHandlers';
import { useSupplierHandlers } from './suppliers/useSupplierHandlers';
import { useEmployeeHandlers } from './hr/useEmployeeHandlers';
import { useShift } from './sales/useShift';
import type {
  ActionContext,
  CartItem,
  Customer,
  Drug,
  Employee,
  Purchase,
  PurchaseReturn,
  Return,
  Sale,
  StockBatch,
  Supplier,
} from '../types';

export interface SaleData {
  items: CartItem[];
  customerName: string;
  customerCode?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerStreetAddress?: string;
  paymentMethod: 'cash' | 'visa';
  saleType?: 'walk-in' | 'delivery';
  deliveryFee?: number;
  globalDiscount: number;
  subtotal: number;
  total: number;
  processingTimeMinutes?: number;
}

export interface EntityHandlers {
  handleAddDrug: (drug: Drug) => Promise<void>;
  handleUpdateDrug: (drug: Drug) => Promise<void>;
  handleDeleteDrug: (id: string) => Promise<void>;
  handleRestock: (id: string, qty: number, isUnit?: boolean) => void;
  handleAddSupplier: (supplier: Supplier) => void;
  handleUpdateSupplier: (supplier: Supplier) => void;
  handleDeleteSupplier: (id: string) => void;
  handleAddCustomer: (customer: Customer) => void;
  handleUpdateCustomer: (customer: Customer) => void;
  handleDeleteCustomer: (id: string) => void;
  handlePurchaseComplete: (purchase: Purchase) => Promise<boolean>;
  handleApprovePurchase: (purchaseId: string) => Promise<void>;
  handleMarkAsReceived: (purchaseId: string) => Promise<void>;
  handleRejectPurchase: (purchaseId: string, reason?: string) => void;
  handleCompleteSale: (saleData: SaleData) => Promise<boolean>;
  handleUpdateSale: (saleId: string, updates: Partial<Sale>) => void;
  handleProcessReturn: (returnData: Return) => void;
  handleCreatePurchaseReturn: (returnData: PurchaseReturn) => Promise<void>;
  handleAddEmployee: (employee: Employee) => Promise<void>;
  handleUpdateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  handleDeleteEmployee: (id: string) => Promise<void>;
  enrichedCustomers: Customer[];
}

export interface UseEntityHandlersParams {
  inventory: Drug[];
  setInventory: React.Dispatch<React.SetStateAction<Drug[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: React.Dispatch<React.SetStateAction<PurchaseReturn[]>>;
  returns: Return[];
  setReturns: React.Dispatch<React.SetStateAction<Return[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  batches: StockBatch[];
  setBatches: (batches: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => void;
  currentEmployeeId: string | null;
  activeBranchId: string;
  activeOrgId: string;
  isLoading: boolean;
  addPurchase?: (purchase: Omit<Purchase, 'id'>, context?: ActionContext) => Promise<Purchase>;
  approvePurchase?: (id: string, context: ActionContext) => Promise<void>;
  markAsReceived?: (id: string, receiverId: string, receiverName: string) => Promise<void>;
  completeSale: (saleData: any, context: ActionContext) => Promise<Sale>;
  processSalesReturn: (returnData: any, sale: Sale, context: ActionContext) => Promise<void>;
  createPurchaseReturn: (ret: Omit<PurchaseReturn, 'id'>, context: ActionContext) => Promise<PurchaseReturn>;
  getVerifiedDate: () => Date;
  validateTransactionTime: (date: Date) => { valid: boolean; message?: string };
  updateLastTransactionTime: (time: number) => void;
}

/**
 * Hook for managing all entity CRUD operations.
 * Thin wrapper that composes domain hooks to maintain backward compatibility.
 */
export function useEntityHandlers(params: UseEntityHandlersParams): EntityHandlers {
  const { currentShift, addTransaction } = useShift();

  const inventoryHandlers = useInventoryHandlers({
    inventory: params.inventory,
    setInventory: params.setInventory,
    setBatches: params.setBatches,
    currentEmployeeId: params.currentEmployeeId,
    employees: params.employees,
    activeBranchId: params.activeBranchId,
  });

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

  const customerHandlers = useCustomerHandlers({
    currentEmployeeId: params.currentEmployeeId,
    employees: params.employees,
    activeBranchId: params.activeBranchId,
    customers: params.customers,
    setCustomers: params.setCustomers,
    sales: params.sales,
    getVerifiedDate: params.getVerifiedDate,
  });

  const supplierHandlers = useSupplierHandlers({
    currentEmployeeId: params.currentEmployeeId,
    activeBranchId: params.activeBranchId,
    suppliers: params.suppliers,
    setSuppliers: params.setSuppliers,
    purchases: params.purchases,
  });

  const employeeHandlers = useEmployeeHandlers({
    currentEmployeeId: params.currentEmployeeId,
    employees: params.employees,
    setEmployees: params.setEmployees,
    activeBranchId: params.activeBranchId,
    activeOrgId: params.activeOrgId,
    sales: params.sales,
    purchases: params.purchases,
    customers: params.customers,
  });

  return {
    ...inventoryHandlers,
    ...salesHandlers,
    ...purchaseHandlers,
    ...customerHandlers,
    ...supplierHandlers,
    ...employeeHandlers,
  };
}
