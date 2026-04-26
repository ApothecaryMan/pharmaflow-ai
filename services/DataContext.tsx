/**
 * Data Context - Unified state management using services
 * Online-Only implementation
 */

import type React from 'react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { branchService } from './branchService';
import { authService } from './auth/authService';
import { customerService } from './customers';
import { employeeService } from './hr';
import { batchService, inventoryService } from './inventory';
import { purchaseService } from './purchases';
import { returnService } from './returns';
import { salesService } from './sales';
import { settingsService } from './settings/settingsService';
import { supplierService } from './suppliers';
import { useComputedInventory } from '../hooks/useComputedInventory';
import { transactionService } from './transactions/transactionService';

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
  markAsReceived: (id: string, receiverName: string) => Promise<void>;
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
  switchBranch: (branchId: string) => Promise<void>;

  // Switch to a different organization
  switchOrg: (orgId: string) => Promise<void>;

  // Get current active branch ID
  activeBranchId: string;
  activeOrgId: string;
}

export type DataContextType = DataState & DataActions;

const DataContext = createContext<DataContextType | null>(null);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

interface DataProviderProps {
  children: ReactNode;
  initialInventory?: Drug[];
  initialSuppliers?: Supplier[];
}

export const DataProvider: React.FC<DataProviderProps> = ({ children, initialInventory, initialSuppliers }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [rawInventory, setRawInventory] = useState<Drug[]>(initialInventory || []);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [suppliers, setSuppliersState] = useState<Supplier[]>(initialSuppliers || []);
  const [purchases, setPurchasesState] = useState<Purchase[]>([]);
  const [purchaseReturns, setPurchaseReturnsState] = useState<PurchaseReturn[]>([]);
  const [returns, setReturnsState] = useState<Return[]>([]);
  const [customers, setCustomersState] = useState<Customer[]>([]);
  const [employees, setEmployeesState] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [batches, setBatchesState] = useState<StockBatch[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const lastLoadedBranchId = useRef<string>('');
  const inventory = useComputedInventory(rawInventory, batches, activeBranchId);

  const refreshAll = useCallback(async (targetBranchId?: string, targetOrgId?: string) => {
    const branchId = targetBranchId || activeBranchId;
    const orgId = targetOrgId || activeOrgId;
    if (!branchId || !orgId) return;

    try {
      const [inv, sal, sup, pur, pRet, ret, cust, emp, bat, allBranches] = await Promise.all([
        inventoryService.getAll(branchId),
        salesService.getAll(branchId),
        supplierService.getAll(branchId),
        purchaseService.getAll(branchId),
        returnService.getAllPurchaseReturns(branchId),
        returnService.getAllSalesReturns(branchId),
        customerService.getAll(branchId),
        employeeService.getAll(branchId),
        batchService.getAllBatches(branchId),
        branchService.getAll(orgId),
      ]);

      const currentSession = authService.getCurrentUserSync();
      const loggedInEmployee = emp.find(e => e.id === currentSession?.employeeId) || null;

      setRawInventory(inv);
      setSalesState(sal);
      setSuppliersState(sup);
      setPurchasesState(pur);
      setPurchaseReturnsState(pRet);
      setReturnsState(ret);
      setCustomersState(cust);
      setEmployeesState(emp);
      setCurrentEmployee(loggedInEmployee);
      setBatchesState(bat);
      setBranches(allBranches);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [activeBranchId, activeOrgId]);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const { orgService } = await import('./org/orgService');
        const defaultOrgId = orgService.getActiveOrgId() || '';
        const allBranches = await branchService.getAll(defaultOrgId);
        
        if (allBranches.length === 0) {
          setIsLoading(false);
          return;
        }

        const activeBranch = await branchService.getActive();
        const session = await authService.getCurrentUser();
        
        let finalBranchId = session?.branchId || activeBranch?.id || allBranches[0].id;

        if (!allBranches.some(b => b.id === finalBranchId)) {
          finalBranchId = allBranches[0].id;
          await branchService.setActive(finalBranchId);
        }

        setBranches(allBranches);
        setActiveBranchId(finalBranchId);
        setActiveOrgId(defaultOrgId);
        lastLoadedBranchId.current = finalBranchId;

        await settingsService.setMultiple({ 
          activeBranchId: finalBranchId,
          branchCode: allBranches.find(b => b.id === finalBranchId)?.code || '',
          orgId: defaultOrgId,
        });

        await refreshAll(finalBranchId, defaultOrgId);
      } catch (error) {
        console.error('Initialization Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []); // Only once on mount to avoid double-initialization loop with refreshAll

  const switchBranch = useCallback(async (branchId: string) => {
    setIsLoading(true);
    try {
      await branchService.setActive(branchId);
      setActiveBranchId(branchId);
      lastLoadedBranchId.current = branchId;
      authService.updateSession({ branchId });
      await refreshAll(branchId);
    } finally {
      setIsLoading(false);
    }
  }, [refreshAll]);

  const switchOrg = useCallback(async (orgId: string) => {
    setIsLoading(true);
    try {
      const { orgService } = await import('./org/orgService');
      orgService.setActiveOrgId(orgId);
      setActiveOrgId(orgId);
      await settingsService.set('orgId', orgId);
      const branches = await branchService.getAll(orgId);
      if (branches.length > 0) await switchBranch(branches[0].id);
      else await refreshAll();
    } finally {
      setIsLoading(false);
    }
  }, [switchBranch, refreshAll]);

  // Actions
  const setInventory = useCallback((data: any) => setRawInventory(data), []);
  const setSales = useCallback((data: any) => setSalesState(data), []);
  const setSuppliers = useCallback((data: any) => setSuppliersState(data), []);
  const setPurchases = useCallback((data: any) => setPurchasesState(data), []);
  const setReturns = useCallback((data: any) => setReturnsState(data), []);
  const setPurchaseReturns = useCallback((data: any) => setPurchaseReturnsState(data), []);
  const setCustomers = useCallback((data: any) => setCustomersState(data), []);
  const setEmployees = useCallback((data: any) => setEmployeesState(data), []);
  const setBatches = useCallback((data: any) => setBatchesState(data), []);

  const syncBatches = useCallback(async () => {
    const bat = await batchService.getAllBatches(activeBranchId);
    setBatchesState(bat);
  }, [activeBranchId]);

  const addProduct = useCallback(async (product: any) => {
    const newProduct = await inventoryService.create(product, activeBranchId);
    setRawInventory((prev) => [...prev, newProduct]);
    return newProduct;
  }, [activeBranchId]);

  const updateProduct = useCallback(async (id: string, updates: any) => {
    const updated = await inventoryService.update(id, updates);
    setRawInventory((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const updateStock = useCallback(async (id: string, quantity: number) => {
    await inventoryService.updateStock(id, quantity);
    setRawInventory((prev) => prev.map((p) => (p.id === id ? { ...p, stock: p.stock + quantity } : p)));
  }, []);

  const addSale = useCallback(async (sale: any) => {
    const newSale = await salesService.create(sale, activeBranchId);
    setSalesState((prev) => [...prev, newSale]);
    return newSale;
  }, [activeBranchId]);

  const completeSale = useCallback(async (saleData: any, context: ActionContext) => {
    const result = await transactionService.processCheckout(saleData, rawInventory, context);
    if (!result.success || !result.sale) throw new Error(result.error);
    await refreshAll();
    return result.sale;
  }, [activeBranchId, rawInventory, refreshAll]);

  const addSupplier = useCallback(async (supplier: any) => {
    const newSupplier = await supplierService.create(supplier, activeBranchId);
    setSuppliersState((prev) => [...prev, newSupplier]);
    return newSupplier;
  }, [activeBranchId]);

  const updateSupplier = useCallback(async (id: string, updates: any) => {
    const updated = await supplierService.update(id, updates);
    setSuppliersState((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const addPurchase = useCallback(async (purchase: any, context?: ActionContext) => {
    if (purchase.status === 'completed' && context) {
      const result = await transactionService.processDirectPurchaseTransaction(purchase, context);
      if (!result.success) throw new Error(result.error);
      await refreshAll();
      return result.data!;
    } else {
      const newPurchase = await purchaseService.create({ ...purchase, branchId: activeBranchId, orgId: activeOrgId });
      setPurchasesState((prev) => [newPurchase, ...prev]);
      return newPurchase;
    }
  }, [activeBranchId, activeOrgId, refreshAll]);

  const approvePurchase = useCallback(async (id: string, context: ActionContext) => {
    const result = await transactionService.processPurchaseTransaction(id, context);
    if (!result.success) throw new Error(result.error);
    await refreshAll();
  }, [refreshAll]);

  const markAsReceived = useCallback(async (id: string, receiverName: string) => {
    await purchaseService.markAsReceived(id, receiverName);
    await refreshAll();
  }, [refreshAll]);

  const rejectPurchase = useCallback(async (id: string) => {
    await purchaseService.reject(id, '');
    setPurchasesState((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } as any : p)));
  }, []);

  const processSalesReturn = useCallback(async (returnData: any, sale: Sale, context: ActionContext) => {
    const result = await transactionService.processReturn(returnData, rawInventory, sale, context);
    if (!result.success) throw new Error(result.error);
    await refreshAll();
  }, [rawInventory, refreshAll]);

  const createPurchaseReturn = useCallback(async (ret: any, context: ActionContext) => {
    const result = await transactionService.processPurchaseReturnTransaction(ret, context);
    if (!result.success || !result.data) throw new Error(result.error);
    await refreshAll();
    return result.data;
  }, [refreshAll]);

  const addReturn = useCallback(async (ret: any) => {
    const newReturn = await returnService.createSalesReturn(ret, activeBranchId);
    setReturnsState((prev) => [...prev, newReturn]);
    return newReturn;
  }, [activeBranchId]);

  const addCustomer = useCallback(async (customer: any) => {
    const newCustomer = await customerService.create(customer, activeBranchId);
    setCustomersState((prev) => [...prev, newCustomer]);
    return newCustomer;
  }, [activeBranchId]);

  const updateCustomer = useCallback(async (id: string, updates: any) => {
    const updated = await customerService.update(id, updates);
    setCustomersState((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await customerService.delete(id);
    setCustomersState((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addEmployee = useCallback(async (employee: any) => {
    const newEmployee = await employeeService.create(employee, activeBranchId, activeOrgId);
    setEmployeesState((prev) => [...prev, newEmployee]);
    return newEmployee;
  }, [activeBranchId, activeOrgId]);

  const updateEmployee = useCallback(async (id: string, updates: any) => {
    const updated = await employeeService.update(id, updates);
    setEmployeesState((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    await employeeService.delete(id);
    setEmployeesState((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const value = useMemo<DataContextType>(
    () => ({
      inventory, sales, suppliers, purchases, purchaseReturns, returns, customers, employees,
      currentEmployee, batches, branches, isLoading,
      setInventory, addProduct, updateProduct, updateStock, setSales, addSale, completeSale,
      setSuppliers, addSupplier, updateSupplier, setPurchases, addPurchase, approvePurchase,
      markAsReceived, rejectPurchase, setReturns, setPurchaseReturns, processSalesReturn, createPurchaseReturn,
      addReturn, setCustomers, addCustomer, updateCustomer, deleteCustomer,
      setEmployees, addEmployee, updateEmployee, deleteEmployee, setBatches, syncBatches,
      refreshAll, switchBranch, switchOrg, activeBranchId, activeOrgId,
    }),
    [
      inventory, sales, suppliers, purchases, purchaseReturns, returns, customers, employees,
      currentEmployee, batches, branches, isLoading, activeBranchId, activeOrgId,
      setInventory, addProduct, updateProduct, updateStock, setSales, addSale, completeSale,
      setSuppliers, addSupplier, updateSupplier, setPurchases, addPurchase, approvePurchase,
      markAsReceived, rejectPurchase, setReturns, setPurchaseReturns, processSalesReturn, createPurchaseReturn,
      addReturn, setCustomers, addCustomer, updateCustomer, deleteCustomer,
      setEmployees, addEmployee, updateEmployee, deleteEmployee, setBatches, syncBatches,
      refreshAll, switchBranch, switchOrg
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
