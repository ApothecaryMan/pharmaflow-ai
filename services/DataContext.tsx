/**
 * Data Context - Unified state management using services
 *
 * This context provides a single source of truth for all app data,
 * syncing between React state and the service layer.
 */

import type React from 'react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { runShardingMigration } from './migration/shardingMigration';
import { purchaseService } from './purchases';
import { returnService } from './returns';
import { salesService } from './sales';
import { settingsService } from './settings/settingsService';
import { supplierService } from './suppliers';
import { syncQueueService } from './syncQueueService';
import { syncEngine, type SyncStatus } from './sync/syncEngine';
import { useComputedInventory } from '../hooks/useComputedInventory';
import { StorageKeys } from '../config/storageKeys';
import { storage } from '../utils/storage';
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
  syncStatus: SyncStatus;
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
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
  initialInventory?: Drug[];
  initialSuppliers?: Supplier[];
}

let hasSeededThisSession = false;

export const DataProvider: React.FC<DataProviderProps> = ({
  children,
  initialInventory = [],
  initialSuppliers = [],
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [rawInventory, setRawInventory] = useState<Drug[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [suppliers, setSuppliersState] = useState<Supplier[]>([]);
  const [purchases, setPurchasesState] = useState<Purchase[]>([]);
  const [purchaseReturns, setPurchaseReturnsState] = useState<PurchaseReturn[]>([]);
  const [returns, setReturnsState] = useState<Return[]>([]);
  const [customers, setCustomersState] = useState<Customer[]>([]);
  const [employees, setEmployeesState] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [batches, setBatchesState] = useState<StockBatch[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Track last loaded branch to prevent redundant refreshes
  const lastLoadedBranchId = useRef<string>('');

  // Compute inventory from raw data and batches
  const inventory = useComputedInventory(rawInventory, batches, activeBranchId);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Enforce minimum loading time of 1000ms for better UX
        const minLoadTime = new Promise((resolve) => setTimeout(resolve, 1000));

        // --- Run Migrations ---
        // Ensure monolithic data is split before services try to read shards
        try {
          runShardingMigration();
          // Phase 4: Data Migration to Multi-Branch
          const { branchMigration } = await import('./branchMigration');
          await branchMigration.runAll();
        } catch (err) {
          console.error('Migration Failed:', err);
        }

        // 1. Initialize Active Org and Branch from URL OR Storage
        const { orgService } = await import('./org/orgService');
        
        // Check URL for Org/Branch (Format: #/orgId/branchCode/viewId)
        const hash = window.location.hash.replace(/^#\/?/, '');
        const hashParts = hash ? hash.split('/') : [];
        const urlOrgId = hashParts[0];
        const urlBranchCode = hashParts[1];

        const defaultOrgId = urlOrgId || orgService.getActiveOrgId() || '';
        
        const allBranches = await branchService.getAll(defaultOrgId);
        
        // Resolve URL branch code to ID
        const matchedBranch = allBranches.find(b => b.code === urlBranchCode || b.id === urlBranchCode);
        const resolvedBranchFromUrl = matchedBranch?.id;
        if (allBranches.length === 0) {
          setIsLoading(false);
          return;
        }

        const activeBranch = await branchService.getActive();
        const session = await authService.getCurrentUser();
        
        // Dynamic Resolution: Priority: URL > session.branchId > saved active branch > first branch
        let finalBranchId = resolvedBranchFromUrl || session?.branchId || activeBranch?.id || (allBranches.length > 0 ? allBranches[0].id : '');

        // Self-Healing: If finalBranchId points to a non-existent branch (bug/legacy), snap to the first actual branch
        if (allBranches.length > 0 && !allBranches.some(b => b.id === finalBranchId)) {
          console.warn(`Invalid branch ID ${finalBranchId} in session. Snapping to first available branch: ${allBranches[0].id}`);
          finalBranchId = allBranches[0].id;
          // Sync back to storage if possible
          await branchService.setActive(finalBranchId);
          
          // PHASE 7 FIX: Sync session so audit events use the correct branchId
          const rawSession = localStorage.getItem('branch_pilot_session');
          if (rawSession) {
            try {
              const s = JSON.parse(rawSession);
              s.branchId = finalBranchId;
              localStorage.setItem('branch_pilot_session', JSON.stringify(s));
            } catch (e) {
              console.error('Failed to sync session during self-heal:', e);
            }
          }
        }

        setBranches(allBranches);
        setActiveBranchId(finalBranchId);
        setActiveOrgId(defaultOrgId);
        lastLoadedBranchId.current = finalBranchId;

        // Sync settingsService with the active branch so idGenerator (which reads storage directly) is in sync
        await settingsService.setMultiple({ 
          activeBranchId: finalBranchId,
          branchCode: activeBranch?.code || allBranches[0]?.code,
        });

        const [results, _] = await Promise.all([
          Promise.all([
            inventoryService.getAll(finalBranchId),
            salesService.getAll(finalBranchId),
            supplierService.getAll(finalBranchId),
            purchaseService.getAll(finalBranchId),
            returnService.getAllPurchaseReturns(finalBranchId),
            returnService.getAllSalesReturns(finalBranchId),
            customerService.getAll('all'),
            employeeService.getAll(finalBranchId),
            batchService.getAllBatches(finalBranchId),
          ]),
          minLoadTime,
        ]);

        const [inv, sal, sup, pur, pRet, ret, cust, emp, bat] = results;


        const currentSession = authService.getCurrentUserSync();
        const loggedInEmployee = emp.find(e => e.id === currentSession?.employeeId) || null;

        if (import.meta.env.DEV && session && inv.length === 0 && initialInventory.length > 0 && !hasSeededThisSession) {
          console.log('ℹ️ Automatic seeding skipped: Manual seeding required in current build.');
        }

        // Commit all states
        setRawInventory(inv);
        setSalesState(sal);
        setSuppliersState(
          sup.length > 0 ? sup : initialSuppliers.length > 0 ? initialSuppliers : []
        );
        setPurchasesState(pur);
        setPurchaseReturnsState(pRet);
        setReturnsState(ret);
        setCustomersState(cust);
        setEmployeesState(emp);
        setCurrentEmployee(loggedInEmployee);
        setBatchesState(bat);

        // --- Initialize Sync Engine ---
        if (finalBranchId) {
          syncEngine.start(finalBranchId, (status) => setSyncStatus(status));
        }

        // Final safety delay to ensure React finishes batching state updates before skeleton disappears
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    return () => {
      syncEngine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync to localStorage when state changes (only after initial load)
  // DEPRECATED for Inventory: We now use differential writes directly in actions 
  // to avoid full-array serialization overhead.
  /*
  useEffect(() => {
    if (!isLoading) inventoryService.save(inventory);
  }, [inventory, isLoading]);
  */
  // Bulk-save effects for localStorage-based services.
  // useEntityHandlers only updates React state (for RBAC + audit), so these
  // hooks are the actual persistence mechanism.
  // Note: Employees are excluded — they use IndexedDB differential writes
  // and are persisted directly in the handler/service layer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { 
    if (!isLoading && (sales.length === 0 || sales.every(s => s.branchId === activeBranchId))) {
      salesService.save(sales, activeBranchId); 
    }
  }, [sales, activeBranchId, isLoading]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { 
    if (!isLoading && (suppliers.length === 0 || suppliers.every(s => s.branchId === activeBranchId))) {
      supplierService.save(suppliers, activeBranchId); 
    }
  }, [suppliers, activeBranchId, isLoading]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { 
    if (!isLoading && (purchases.length === 0 || purchases.every(p => p.branchId === activeBranchId))) {
      purchaseService.save(purchases, activeBranchId); 
    }
  }, [purchases, activeBranchId, isLoading]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { 
    if (!isLoading && (purchaseReturns.length === 0 || purchaseReturns.every(r => r.branchId === activeBranchId))) {
      returnService.savePurchaseReturns(purchaseReturns, activeBranchId); 
    }
  }, [purchaseReturns, activeBranchId, isLoading]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { 
    if (!isLoading && (returns.length === 0 || returns.every(r => r.branchId === activeBranchId))) {
      returnService.saveSalesReturns(returns, activeBranchId); 
    }
  }, [returns, activeBranchId, isLoading]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { 
    if (!isLoading && (customers.length === 0 || customers.every(c => c.branchId === activeBranchId))) {
      customerService.save(customers, activeBranchId); 
    }
  }, [customers, activeBranchId, isLoading]);
  useEffect(() => {
    if (!isLoading) {
      const allBatches = storage.get<StockBatch[]>(StorageKeys.STOCK_BATCHES, []);
      // Keep items from OTHER branches
      const otherBranchBatches = allBatches.filter(
        (b) => b.branchId && b.branchId !== activeBranchId
      );
      // Combine and deduplicate by ID
      const merged = [...otherBranchBatches, ...batches];
      const unique = Array.from(new Map(merged.map((b) => [b.id, b])).values());
      
      storage.set(StorageKeys.STOCK_BATCHES, unique);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, activeBranchId]);

  // Actions
  const setInventory = useCallback(
    (data: Drug[] | ((prev: Drug[]) => Drug[])) => setRawInventory(data),
    []
  );
  const setSales = useCallback(
    (data: Sale[] | ((prev: Sale[]) => Sale[])) => setSalesState(data),
    []
  );
  const setSuppliers = useCallback(
    (data: Supplier[] | ((prev: Supplier[]) => Supplier[])) => setSuppliersState(data),
    []
  );
  const setPurchases = useCallback(
    (data: Purchase[] | ((prev: Purchase[]) => Purchase[])) => setPurchasesState(data),
    []
  );
  const setReturns = useCallback(
    (data: Return[] | ((prev: Return[]) => Return[])) => setReturnsState(data),
    []
  );
  const setPurchaseReturns = useCallback(
    (data: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])) =>
      setPurchaseReturnsState(data),
    []
  );
  const setCustomers = useCallback(
    (data: Customer[] | ((prev: Customer[]) => Customer[])) => setCustomersState(data),
    []
  );
  const setEmployees = useCallback(
    (data: Employee[] | ((prev: Employee[]) => Employee[])) => setEmployeesState(data),
    []
  );
  const setBatches = useCallback(
    (data: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => setBatchesState(data),
    []
  );

  const syncBatches = useCallback(async () => {
    const bat = await batchService.getAllBatches(activeBranchId);
    setBatchesState(bat);
  }, [activeBranchId]);

  const addProduct = useCallback(async (product: Omit<Drug, 'id'>) => {
    const newProduct = await inventoryService.create({ ...product, branchId: activeBranchId });
    setRawInventory((prev) => [...prev, newProduct]);
    return newProduct;
  }, [activeBranchId]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Drug>) => {
    const updated = await inventoryService.update(id, updates);
    setRawInventory((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const updateStock = useCallback(async (id: string, quantity: number) => {
    await inventoryService.updateStock(id, quantity);
    setRawInventory((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: p.stock + quantity } : p))
    );
  }, []);

  const addSale = useCallback(async (sale: Omit<Sale, 'id'>) => {
    const newSale = await salesService.create({ ...sale, branchId: activeBranchId });
    setSalesState((prev) => [...prev, newSale]);
    return newSale;
  }, [activeBranchId]);

  const completeSale = useCallback(async (saleData: any, context: ActionContext) => {
    const result = await transactionService.processCheckout(saleData, rawInventory, context);
    if (!result.success || !result.sale) throw new Error(result.error);
    
    // Refresh all related states
    const [updatedSales, updatedInventory, updatedBatches] = await Promise.all([
      salesService.getAll(activeBranchId),
      inventoryService.getAll(activeBranchId),
      batchService.getAllBatches(activeBranchId),
    ]);
    
    setSalesState(updatedSales);
    setRawInventory(updatedInventory);
    setBatchesState(updatedBatches);
    
    return result.sale;
  }, [activeBranchId, rawInventory]);

  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier = await supplierService.create({ ...supplier, branchId: activeBranchId });
    setSuppliersState((prev) => [...prev, newSupplier]);
    return newSupplier;
  }, [activeBranchId]);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    const updated = await supplierService.update(id, updates);
    setSuppliersState((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const addPurchase = useCallback(async (purchase: Omit<Purchase, 'id'>, context?: ActionContext) => {
    if (purchase.status === 'completed' && context) {
      const result = await transactionService.processDirectPurchaseTransaction(purchase, context);
      if (!result.success) throw new Error(result.error);
      
      // Refresh all related states
      const [updatedPurchases, updatedInventory, updatedBatches] = await Promise.all([
        purchaseService.getAll(activeBranchId),
        inventoryService.getAll(activeBranchId),
        batchService.getAllBatches(activeBranchId),
      ]);
      setPurchasesState(updatedPurchases);
      setRawInventory(updatedInventory);
      setBatchesState(updatedBatches);
      
      return result.data!;
    } else {
      const newPurchase = await purchaseService.create({ 
        ...purchase, 
        branchId: activeBranchId,
        orgId: activeOrgId
      });
      setPurchasesState((prev) => [newPurchase, ...prev]);
      return newPurchase;
    }
  }, [activeBranchId, activeOrgId]);

  const approvePurchase = useCallback(async (id: string, context: ActionContext) => {
    const result = await transactionService.processPurchaseTransaction(id, context);
    if (!result.success) throw new Error(result.error);

    // Refresh state from services to ensure SSOT
    const [updatedPurchases, updatedInventory, updatedBatches] = await Promise.all([
      purchaseService.getAll(activeBranchId),
      inventoryService.getAll(activeBranchId),
      batchService.getAllBatches(activeBranchId),
    ]);

    setPurchasesState(updatedPurchases);
    setRawInventory(updatedInventory);
    setBatchesState(updatedBatches);
  }, [activeBranchId]);

  const rejectPurchase = useCallback(async (id: string) => {
    await purchaseService.reject(id, '');
    setPurchasesState((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rejected' as const } : p))
    );
  }, []);

  const processSalesReturn = useCallback(async (returnData: any, sale: Sale, context: ActionContext) => {
    const result = await transactionService.processReturn(returnData, rawInventory, sale, context);
    if (!result.success) throw new Error(result.error);

    // Refresh all related states
    const [updatedReturns, updatedInventory, updatedBatches, updatedSales] = await Promise.all([
      returnService.getAllSalesReturns(activeBranchId),
      inventoryService.getAll(activeBranchId),
      batchService.getAllBatches(activeBranchId),
      salesService.getAll(activeBranchId),
    ]);

    setReturnsState(updatedReturns);
    setRawInventory(updatedInventory);
    setBatchesState(updatedBatches);
    setSalesState(updatedSales);
  }, [activeBranchId, rawInventory]);

  const createPurchaseReturn = useCallback(async (ret: Omit<PurchaseReturn, 'id'>, context: ActionContext) => {
    const result = await transactionService.processPurchaseReturnTransaction(ret, context);
    if (!result.success || !result.data) throw new Error(result.error);

    // Refresh all related states
    const [updatedPurchaseReturns, updatedInventory, updatedBatches] = await Promise.all([
      returnService.getAllPurchaseReturns(activeBranchId),
      inventoryService.getAll(activeBranchId),
      batchService.getAllBatches(activeBranchId),
    ]);

    setPurchaseReturnsState(updatedPurchaseReturns);
    setRawInventory(updatedInventory);
    setBatchesState(updatedBatches);

    return result.data;
  }, [activeBranchId]);

  const addReturn = useCallback(async (ret: Omit<Return, 'id'>) => {
    const newReturn = await returnService.createSalesReturn({ ...ret, branchId: activeBranchId });
    setReturnsState((prev) => [...prev, newReturn]);
    return newReturn;
  }, [activeBranchId]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>) => {
    const newCustomer = await customerService.create({ ...customer, branchId: activeBranchId });
    setCustomersState((prev) => [...prev, newCustomer]);
    return newCustomer;
  }, [activeBranchId]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const updated = await customerService.update(id, updates);
    setCustomersState((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await customerService.delete(id);
    setCustomersState((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addEmployee = useCallback(async (employee: Employee) => {
    const newEmployee = await employeeService.create(
      { ...employee, branchId: activeBranchId, orgId: activeOrgId },
      activeBranchId,
      activeOrgId
    );
    setEmployeesState((prev) => [...prev, newEmployee]);
    return newEmployee;
  }, [activeBranchId, activeOrgId]);

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    const updated = await employeeService.update(id, updates);
    setEmployeesState((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    await employeeService.delete(id);
    setEmployeesState((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const refreshAll = useCallback(async (branchId?: string) => {
    setIsLoading(true);
    try {
      const targetBranchId = branchId || activeBranchId;
      const [inv, sal, sup, pur, pRet, ret, cust, emp] = await Promise.all([
        inventoryService.getAll(targetBranchId),
        salesService.getAll(targetBranchId),
        supplierService.getAll(targetBranchId),
        purchaseService.getAll(targetBranchId),
        returnService.getAllPurchaseReturns(targetBranchId),
        returnService.getAllSalesReturns(targetBranchId),
        customerService.getAll('all'),
        employeeService.getAll(targetBranchId),
      ]);
      setRawInventory(inv);
      setSalesState(sal);
      setSuppliersState(sup);
      setPurchasesState(pur);
      setPurchaseReturnsState(pRet);
      setReturnsState(ret);
      setCustomersState(cust);

      setBranches(allBranches);
      setEmployeesState(emp);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeBranchId, activeOrgId]);

  // Switch to a different branch and reload all data
  const switchBranch = useCallback(
    async (branchId: string) => {
      try {
        setIsLoading(true); // LOCK persistence immediately
        
        const previousBranchId = activeBranchId;
        
        // Persist new branch selection
        await branchService.setActive(branchId);
        
        // Update local state
        setActiveBranchId(branchId);
        lastLoadedBranchId.current = branchId;

        // Update settings (for backward compatibility if anything else uses it)
        await settingsService.setMultiple({ branchCode: branchId });

        // Log Audit Event
        if (previousBranchId && previousBranchId !== branchId) {
          const user = authService.getCurrentUserSync();
          if (user) {
          const prevBranch = await branchService.getById(previousBranchId);
          const newBranch = await branchService.getById(branchId);
            authService.logAuditEvent({
              username: user.username,
              role: user.role,
              branchId: branchId,
              action: 'switch_branch',
              details: `Switched from ${prevBranch?.name || previousBranchId} to ${newBranch?.name || branchId}`,
              employeeId: user.employeeId,
            });
            
             // Also update the session so it reflects the new branch
             authService.updateSession({ branchId });
          }
        }

        // Reload all data (services will now filter by new branchId)
        await refreshAll(branchId);

        // Manually update sync engine because useEffect might skip it during loading
        syncEngine.updateBranch(branchId);
      } catch (error) {
        console.error('Error switching branch:', error);
        throw error;
      }
    },
    [refreshAll, activeBranchId]
  );

  // Switch to a different org
  const switchOrg = useCallback(
    async (orgId: string) => {
      try {
        setIsLoading(true);
        const { orgService } = await import('./org/orgService');
        orgService.setActiveOrgId(orgId);
        setActiveOrgId(orgId);
        
        // Pick first branch of new org
        const branches = await branchService.getAll(orgId);
        if (branches.length > 0) {
          await switchBranch(branches[0].id);
        } else {
          // No branches, just refresh the empty state
          await refreshAll();
        }
      } catch (error) {
        console.error('Error switching org:', error);
      }
    },
    [switchBranch, refreshAll]
  );



  // Trigger data reload when branch changes (not on initial load - that's handled in loadData)
  useEffect(() => {
    // Only trigger if branch changed AND it's not the one we just loaded manually
    if (activeBranchId && !isLoading && activeBranchId !== lastLoadedBranchId.current) {
      lastLoadedBranchId.current = activeBranchId;
      refreshAll();
      syncEngine.updateBranch(activeBranchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, isLoading]);


  const value = useMemo<DataContextType>(
    () => ({
      // State
      inventory,
      sales,
      suppliers,
      purchases,
      purchaseReturns,
      returns,
      customers,
      employees,
      currentEmployee,
      batches,
      branches,
      isLoading,
      syncStatus,
      // Actions
      setInventory,
      addProduct,
      updateProduct,
      updateStock,
      setSales,
      addSale,
      setSuppliers,
      addSupplier,
      updateSupplier,
      setPurchases,
      addPurchase,
      approvePurchase,
      rejectPurchase,
      setReturns,
      setPurchaseReturns,
      addReturn,
      setCustomers,
      addCustomer,
      updateCustomer,
      deleteCustomer,

      setEmployees,
      addEmployee,
      updateEmployee,
      deleteEmployee,

      setBatches,
      syncBatches,

      refreshAll,
      switchBranch,
      switchOrg,
      activeBranchId,
      activeOrgId,
    }),
    [
      inventory,
      sales,
      suppliers,
      purchases,
      purchaseReturns,
      returns,
      customers,
      employees,
      currentEmployee,
      branches,
      isLoading,
      activeBranchId,
      setInventory,
      addProduct,
      updateProduct,
      updateStock,
      setSales,
      addSale,
      setSuppliers,
      addSupplier,
      updateSupplier,
      setPurchases,
      addPurchase,
      approvePurchase,
      rejectPurchase,
      setReturns,
      setPurchaseReturns,
      addReturn,
      setCustomers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      setEmployees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      setBatches,
      syncBatches,
      switchBranch,
      switchOrg,
      syncStatus,
      activeOrgId,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;
