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
export interface DataState {
  inventory: Drug[];
  sales: Sale[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  returns: Return[];
  customers: Customer[];
  employees: Employee[];
  batches: StockBatch[];
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

  // Suppliers
  setSuppliers: (suppliers: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier>;

  // Purchases
  setPurchases: (purchases: Purchase[] | ((prev: Purchase[]) => Purchase[])) => void;
  addPurchase: (purchase: Omit<Purchase, 'id'>) => Promise<Purchase>;
  approvePurchase: (id: string, approver: string) => Promise<void>;
  rejectPurchase: (id: string) => Promise<void>;

  // Returns
  setReturns: (returns: Return[] | ((prev: Return[]) => Return[])) => void;
  setPurchaseReturns: (
    returns: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])
  ) => void;
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
  const [batches, setBatchesState] = useState<StockBatch[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

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

        // 1. Initialize Active Org and Branch
        const { orgService } = await import('./org/orgService');
        const defaultOrgId = orgService.getActiveOrgId() || 'org_1';
        setActiveOrgId(defaultOrgId);

        const allBranches = branchService.getAll(defaultOrgId);
        if (allBranches.length === 0) {
          setIsLoading(false);
          return;
        }

        const activeBranch = branchService.getActive();
        const session = await authService.getCurrentUser();
        
        // Dynamic Resolution: Priority: session.branchId > saved active branch > first branch
        let finalBranchId = session?.branchId || activeBranch?.id || (allBranches.length > 0 ? allBranches[0].id : 'B1');

        // Self-Healing: If finalBranchId points to a non-existent branch (bug/legacy), snap to the first actual branch
        if (allBranches.length > 0 && !allBranches.some(b => b.id === finalBranchId)) {
          console.warn(`Invalid branch ID ${finalBranchId} in session. Snapping to first available branch: ${allBranches[0].id}`);
          finalBranchId = allBranches[0].id;
          // Sync back to storage if possible
          branchService.setActive(finalBranchId);
          
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

        setActiveBranchId(finalBranchId);

        // Sync settingsService with the active branch so idGenerator (which reads storage directly) is in sync
        await settingsService.setMultiple({ 
          activeBranchId: finalBranchId,
          branchCode: activeBranch?.code || allBranches[0]?.code || 'B1',
        });

        const [results, _] = await Promise.all([
          Promise.all([
            inventoryService.getAll(finalBranchId),
            salesService.getAll(finalBranchId),
            supplierService.getAll(finalBranchId),
            purchaseService.getAll(finalBranchId),
            returnService.getAllPurchaseReturns(finalBranchId),
            returnService.getAllSalesReturns(finalBranchId),
            customerService.getAll(finalBranchId),
            employeeService.getAll(finalBranchId),
            batchService.getAllBatches(finalBranchId),
          ]),
          minLoadTime,
        ]);

        const [inv, sal, sup, pur, pRet, ret, cust, emp, bat] = results;


        if (import.meta.env.DEV && inv.length === 0 && initialInventory.length > 0) {
          console.log('🌱 Seeding initial inventory for development...');
          // Ensure every seeded item has the correct branchId
          const seededInventory = initialInventory.map(item => ({
            ...item,
            branchId: finalBranchId
          }));
          await inventoryService.save(seededInventory, finalBranchId);
          const updatedBatches = await batchService.migrateInventoryToBatches(seededInventory);
          // Update local 'bat' reference to reflect migrated stock
          const branchSpecific = updatedBatches.filter(b => b.branchId === finalBranchId);
          bat.length = 0;
          bat.push(...branchSpecific);
          
          inv.push(...seededInventory);
        }

        setRawInventory(inv);
        setSalesState(sal);
        setSuppliersState(
          sup.length > 0 ? sup : initialSuppliers.length > 0 ? initialSuppliers : []
        );
        setPurchasesState(pur);
        setPurchaseReturnsState(pRet);
        setReturnsState(ret);
        setCustomersState(cust);
        // Seed SUPER User logic (Secondary guard — primary seed is in authService.ensureSuperAdmin)
        const superUser = import.meta.env.VITE_SUPER_USER;
        const superPass = import.meta.env.VITE_SUPER_PASS;

        if (superUser && superPass) {
          // Check ALL employees (not branch-filtered) to avoid false re-seeding on branch switch
          const { employeeCacheService } = await import('../services/hr/employeeCacheService');
          const allGlobalEmployees = await employeeCacheService.loadAll();
          const superUserExists = allGlobalEmployees.some((e) => e.username === superUser);
          if (!superUserExists) {
            const { hashPassword } = await import('../services/auth/hashUtils');
            const passwordHash = await hashPassword(superPass);
            const superUserObj: Employee = {
              id: 'SUPER-ADMIN',
              employeeCode: 'EMP-000',
              name: 'SUPER',
              username: superUser,
              password: passwordHash,
              role: 'admin' as any,
              position: 'Super Admin',
              department: 'it',
              phone: '00000000000',
              startDate: new Date().toISOString().split('T')[0],
              status: 'active',
              branchId: finalBranchId,
            };
            await employeeService.create(superUserObj);
            emp.push(superUserObj);
            console.log('✨ Super Admin seeded successfully from ENV (DataContext guard)');
          } else {
            // Ensure the Super Admin is in the local state even if not in this branch's filtered list
            const superAdminInList = emp.some((e) => e.username === superUser);
            if (!superAdminInList) {
              const superAdmin = allGlobalEmployees.find((e) => e.username === superUser);
              if (superAdmin) emp.push(superAdmin);
            }
          }
        }

        // Strip sensitive auth fields before putting into React State
        setEmployeesState(emp.map(({ password, biometricCredentialId, biometricPublicKey, ...safe }) => safe as Employee));
        
        setBatchesState(bat);

        // --- Initialize Sync Engine ---
        if (finalBranchId) {
          syncEngine.start(finalBranchId, (status) => setSyncStatus(status));
        }
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
    const bat = batchService.getAllBatches(activeBranchId);
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

  const addPurchase = useCallback(async (purchase: Omit<Purchase, 'id'>) => {
    const newPurchase = await purchaseService.create({ ...purchase, branchId: activeBranchId });
    setPurchasesState((prev) => [...prev, newPurchase]);
    return newPurchase;
  }, [activeBranchId]);

  const approvePurchase = useCallback(async (id: string, approver: string) => {
    await purchaseService.approve(id, approver);
    setPurchasesState((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: 'completed' as const, approvedBy: approver } : p
      )
    );
  }, []);

  const rejectPurchase = useCallback(async (id: string) => {
    await purchaseService.reject(id, '');
    setPurchasesState((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rejected' as const } : p))
    );
  }, []);

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
    const newEmployee = await employeeService.create({ ...employee, branchId: activeBranchId });
    setEmployeesState((prev) => [...prev, newEmployee]);
    return newEmployee;
  }, [activeBranchId]);

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
        customerService.getAll(targetBranchId),
        employeeService.getAll(targetBranchId),
      ]);
      setRawInventory(inv);
      setSalesState(sal);
      setSuppliersState(sup);
      setPurchasesState(pur);
      setPurchaseReturnsState(pRet);
      setReturnsState(ret);
      setCustomersState(cust);

      // Ensure Super Admin is always in the employees list regardless of branch
      const superUser = import.meta.env.VITE_SUPER_USER;
      if (superUser && !emp.some((e) => e.username === superUser)) {
        try {
          const { employeeCacheService } = await import('../services/hr/employeeCacheService');
          const allGlobal = await employeeCacheService.loadAll();
          const superAdmin = allGlobal.find((e) => e.username === superUser);
          if (superAdmin) emp.push(superAdmin);
        } catch { /* ignore */ }
      }

      setEmployeesState(emp);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeBranchId]);

  // Switch to a different branch and reload all data
  const switchBranch = useCallback(
    async (branchId: string) => {
      try {
        setIsLoading(true); // LOCK persistence immediately
        
        const previousBranchId = activeBranchId;
        
        // Persist new branch selection
        branchService.setActive(branchId);
        
        // Update local state
        setActiveBranchId(branchId);

        // Update settings (for backward compatibility if anything else uses it)
        await settingsService.setMultiple({ branchCode: branchId });

        // Log Audit Event
        if (previousBranchId && previousBranchId !== branchId) {
          const user = authService.getCurrentUserSync();
          if (user) {
            const prevBranch = branchService.getById(previousBranchId);
            const newBranch = branchService.getById(branchId);
            authService.logAuditEvent({
              username: user.username,
              role: user.role,
              branchId: branchId,
              action: 'switch_branch',
              details: `Switched from ${prevBranch?.name || previousBranchId} to ${newBranch?.name || branchId}`,
              employeeId: user.employeeId,
            });
            
            // Also update the session so it reflects the new branch
            const updatedSession = { ...user, branchId };
            localStorage.setItem('branch_pilot_session', JSON.stringify(updatedSession));
          }
        }

        // Reload all data (services will now filter by new branchId)
        // refreshAll uses targetBranchId internally if passed
        await refreshAll(branchId);
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
        const branches = branchService.getAll(orgId);
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
    if (activeBranchId && !isLoading) {
      refreshAll();
      syncEngine.updateBranch(activeBranchId);
    }
    // isLoading intentionally excluded: we only want to fire on branch switch, not when loading finishes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);


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
      batches,
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
