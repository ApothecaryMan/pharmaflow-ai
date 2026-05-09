import React, { createContext, useContext, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import type { Drug, Supplier, DataContextType } from './types';
import { useDataState } from './useDataState';
import { useDataActions } from './useDataActions';
import { useRealtimeSync } from './useRealtimeSync';
import { branchService } from '../../services/org/branchService';
import { authService } from '../../services/auth/authService';
import { settingsService } from '../../services/settings/settingsService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
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
  const state = useDataState(initialInventory, initialSuppliers);
  const hasInitialized = React.useRef(false);
  
  const {
    activeBranchId, activeOrgId, rawInventory, currentEmployee, setIsLoading,
    activeOrg, setActiveOrg,
    setActiveBranchId, setActiveOrgId, setRawInventory, setSalesState,
    setSuppliersState, setPurchasesState, setPurchaseReturnsState,
    setReturnsState, setCustomersState, setEmployeesState, setCurrentEmployee,
    setBatchesState, setBranches, lastLoadedBranchId
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



  const value = useMemo<DataContextType>(() => ({
    ...state,
    ...actions,
    reinitialize,
    // Explicitly map setters to match DataContextType interface
    setInventory: state.setRawInventory,
    setSales: state.setSalesState,
    setSuppliers: state.setSuppliersState,
    setPurchases: state.setPurchasesState,
    setPurchaseReturns: state.setPurchaseReturnsState,
    setReturns: state.setReturnsState,
    setCustomers: state.setCustomersState,
    setEmployees: state.setEmployeesState,
    setBatches: state.setBatchesState,
  }), [state, actions, reinitialize]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
