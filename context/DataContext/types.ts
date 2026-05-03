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
} from '../../types';

export type {
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
};

export interface DataState {
  inventory: Drug[];
  sales: Sale[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  returns: Return[];
  customers: Customer[];
  employees: Employee[];
  currentEmployee: Employee | null;
  batches: StockBatch[];
  branches: any[];
  isLoading: boolean;
}

export interface DataActions {
  // Inventory
  setInventory: (inventory: Drug[] | ((prev: Drug[]) => Drug[])) => void;
  addProduct: (product: Omit<Drug, 'id'>) => Promise<Drug>;
  updateProduct: (id: string, updates: Partial<Drug>) => Promise<Drug>;
  updateStock: (id: string, quantity: number) => Promise<void>;

  // Sales
  setSales: (sales: Sale[] | ((prev: Sale[]) => Sale[])) => void;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale>;
  completeSale: (
    saleData: {
      items: CartItem[];
      customerName: string;
      customerCode?: string;
      paymentMethod: 'cash' | 'visa';
      saleType?: 'walk-in' | 'delivery';
      total: number;
      subtotal: number;
      globalDiscount: number;
    },
    context: ActionContext
  ) => Promise<Sale>;

  // Suppliers
  setSuppliers: (suppliers: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier>;

  // Purchases
  setPurchases: (purchases: Purchase[] | ((prev: Purchase[]) => Purchase[])) => void;
  addPurchase: (purchase: Omit<Purchase, 'id'>, context?: ActionContext) => Promise<Purchase>;
  approvePurchase: (id: string, context: ActionContext) => Promise<void>;
  markAsReceived: (id: string, receiverId: string, receiverName: string) => Promise<void>;
  rejectPurchase: (id: string) => Promise<void>;

  // Returns
  setReturns: (returns: Return[] | ((prev: Return[]) => Return[])) => void;
  setPurchaseReturns: (
    returns: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])
  ) => void;
  processSalesReturn: (
    returnData: {
      id: string;
      saleId: string;
      items: { drugId: string; quantityReturned: number; isUnit?: boolean; refundAmount?: number }[];
      totalRefund: number;
      date: string;
    },
    sale: Sale,
    context: ActionContext
  ) => Promise<void>;
  createPurchaseReturn: (
    ret: Omit<PurchaseReturn, 'id'>,
    context: ActionContext
  ) => Promise<PurchaseReturn>;
  addReturn: (ret: Omit<Return, 'id'>) => Promise<Return>;

  // Customers
  setCustomers: (customers: Customer[] | ((prev: Customer[]) => Customer[])) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  // Employees
  setEmployees: (employees: Employee[] | ((prev: Employee[]) => Employee[])) => void;
  addEmployee: (employee: Employee) => Promise<Employee>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;

  // Batches
  setBatches: (batches: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => void;
  syncBatches: () => Promise<void>;

  // Refresh all data from storage
  refreshAll: () => Promise<void>;

  // Switch to a different branch and reload all data
  switchBranch: (branchId: string, skipClearEmployee?: boolean) => Promise<void>;

  // Switch to a different organization
  switchOrg: (orgId: string) => Promise<void>;

  // Get current active branch ID
  activeBranchId: string;
  activeOrgId: string;
}

export type DataContextType = DataState & DataActions;
