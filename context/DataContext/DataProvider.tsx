import React, { createContext, useContext, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import type { Drug, Supplier, DataContextType } from './types';
import { useDataState } from './useDataState';
import { useDataActions } from './useDataActions';
import { useRealtimeSync } from './useRealtimeSync';
import { branchService } from '../../services/org/branchService';
import { authService } from '../../services/auth/authService';
import { settingsService } from '../../services/settings/settingsService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
// Separate contexts for performance optimization
const CoreDataContext = createContext<any>(null);
const InventoryDataContext = createContext<any>(null);
const TransactionDataContext = createContext<any>(null);

// Hub context for backward compatibility
const DataContext = createContext<DataContextType | null>(null);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

// Specialized hooks for performance-sensitive components
export const useCoreData = () => useContext(CoreDataContext);
export const useInventoryData = () => useContext(InventoryDataContext);
export const useTransactionData = () => useContext(TransactionDataContext);

interface DataProviderProps {
  children: ReactNode;
  initialInventory?: Drug[];
  initialSuppliers?: Supplier[];
}

export const DataProvider: React.FC<DataProviderProps> = ({ children, initialInventory, initialSuppliers }) => {
  const state = useDataState(initialInventory, initialSuppliers);
  const hasInitialized = React.useRef(false);
  
  const {
    activeBranchId, activeOrgId, rawInventory, currentEmployee, setIsLoading,
    activeOrg, setActiveOrg, inventory, activeBranch, isLoading,
    setActiveBranchId, setActiveOrgId, setRawInventory, setSalesState,
    setSuppliersState, setPurchasesState, setPurchaseReturnsState,
    setReturnsState, setCustomersState, setEmployeesState, setCurrentEmployee,
    setBatchesState, setBranches, lastLoadedBranchId, batches, suppliers, branches,
    sales, purchases, returns, purchaseReturns, customers, employees
  } = state;

  const actions = useDataActions({
    activeBranchId, activeOrgId, rawInventory, currentEmployee, setIsLoading,
    setActiveBranchId, setActiveOrgId, setActiveOrg, setRawInventory, setSalesState,
    setSuppliersState, setPurchasesState, setPurchaseReturnsState,
    setReturnsState, setCustomersState, setEmployeesState, setCurrentEmployee,
    setBatchesState, setBranches, lastLoadedBranchId
  });

  const { refreshAll } = actions;

  // Real-time synchronization
  useRealtimeSync({
    activeBranchId,
    setSales: setSalesState,
    setReturns: setReturnsState,
    setInventory: setRawInventory,
    setBatches: setBatchesState,
    setPurchases: setPurchasesState,
  });

  // Initialization logic wrapped in useCallback to allow re-runs (e.g., after login)
  const initData = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    setIsLoading(true);
    try {
      const { orgService } = await import('../../services/org/orgService');
      const defaultOrgId = orgService.getActiveOrgId() || '';
      
      // Fetch full Org details to get the name
      let activeOrg = null;
      if (defaultOrgId) {
        activeOrg = await orgService.getById(defaultOrgId);
      }

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
      setActiveOrg(activeOrg);
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
  }, [setIsLoading, setBranches, setActiveBranchId, setActiveOrgId, setActiveOrg, refreshAll, lastLoadedBranchId]);

  // Initial load
  useEffect(() => {
    initData();
  }, [initData]);

  // Callable re-initialization (for post-login)
  const reinitialize = useCallback(async () => {
    hasInitialized.current = false;
    await initData();
  }, [initData]);

  // Reset state on logout
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        hasInitialized.current = false;
        // Reset all state to defaults
        setRawInventory([]);
        setSalesState([]);
        setSuppliersState([]);
        setPurchasesState([]);
        setPurchaseReturnsState([]);
        setReturnsState([]);
        setCustomersState([]);
        setEmployeesState([]);
        setBatchesState([]);
        setBranches([]);
        setActiveBranchId('');
        setActiveOrgId('');
        setActiveOrg(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [
    setRawInventory, setSalesState, setSuppliersState, setPurchasesState,
    setPurchaseReturnsState, setReturnsState, setCustomersState, setEmployeesState,
    setBatchesState, setBranches, setActiveBranchId, setActiveOrgId, setActiveOrg
  ]);

  // Core Value: Changes rarely (Branch, Org, Loading)
  const coreValue = useMemo(() => ({
    isLoading,
    activeBranchId,
    activeOrgId,
    activeBranch,
    activeOrg,
    branches,
    currentEmployee,
    switchBranch: actions.switchBranch,
    switchOrg: actions.switchOrg,
    refreshAll: actions.refreshAll,
    reinitialize,
    setActiveOrg,
    updateBranch: actions.updateBranch,
  }), [
    isLoading, activeBranchId, activeOrgId, activeBranch, activeOrg, 
    branches, currentEmployee, actions.switchBranch, actions.switchOrg, 
    actions.refreshAll, reinitialize, actions.updateBranch
  ]);

  // Inventory Value: Changes when stock or products change
  const inventoryValue = useMemo(() => ({
    inventory,
    rawInventory,
    batches,
    suppliers,
    setInventory: setRawInventory,
    addProduct: actions.addProduct,
    updateProduct: actions.updateProduct,
    updateStock: actions.updateStock,
    setSuppliers: setSuppliersState,
    addSupplier: actions.addSupplier,
    updateSupplier: actions.updateSupplier,
    setBatches: setBatchesState,
    syncBatches: actions.syncBatches,
  }), [
    inventory, rawInventory, batches, suppliers, setRawInventory, 
    actions.addProduct, actions.updateProduct, actions.updateStock, 
    setSuppliersState, actions.addSupplier, actions.updateSupplier, 
    setBatchesState, actions.syncBatches
  ]);

  // Transaction Value: Changes when sales or purchases occur
  const transactionValue = useMemo(() => ({
    sales,
    purchases,
    returns,
    purchaseReturns,
    customers,
    employees,
    setSales: setSalesState,
    addSale: actions.addSale,
    completeSale: actions.completeSale,
    setPurchases: setPurchasesState,
    addPurchase: actions.addPurchase,
    approvePurchase: actions.approvePurchase,
    markAsReceived: actions.markAsReceived,
    rejectPurchase: actions.rejectPurchase,
    setReturns: setReturnsState,
    setPurchaseReturns: setPurchaseReturnsState,
    processSalesReturn: actions.processSalesReturn,
    createPurchaseReturn: actions.createPurchaseReturn,
    addReturn: actions.addReturn,
    setCustomers: setCustomersState,
    addCustomer: actions.addCustomer,
    updateCustomer: actions.updateCustomer,
    deleteCustomer: actions.deleteCustomer,
    setEmployees: setEmployeesState,
    addEmployee: actions.addEmployee,
    updateEmployee: actions.updateEmployee,
    deleteEmployee: actions.deleteEmployee,
  }), [
    sales, purchases, returns, purchaseReturns, customers, employees,
    setSalesState, actions.addSale, actions.completeSale, setPurchasesState,
    actions.addPurchase, actions.approvePurchase, actions.markAsReceived,
    actions.rejectPurchase, setReturnsState, setPurchaseReturnsState,
    actions.processSalesReturn, actions.createPurchaseReturn, actions.addReturn,
    setCustomersState, actions.addCustomer, actions.updateCustomer, actions.deleteCustomer,
    setEmployeesState, actions.addEmployee, actions.updateEmployee, actions.deleteEmployee
  ]);

  // Unified Hub Value (Backward compatibility)
  const hubValue = useMemo<DataContextType>(() => ({
    ...coreValue,
    ...inventoryValue,
    ...transactionValue
  } as any), [coreValue, inventoryValue, transactionValue]);

  return (
    <CoreDataContext.Provider value={coreValue}>
      <InventoryDataContext.Provider value={inventoryValue}>
        <TransactionDataContext.Provider value={transactionValue}>
          <DataContext.Provider value={hubValue}>
            {children}
          </DataContext.Provider>
        </TransactionDataContext.Provider>
      </InventoryDataContext.Provider>
    </CoreDataContext.Provider>
  );
};
