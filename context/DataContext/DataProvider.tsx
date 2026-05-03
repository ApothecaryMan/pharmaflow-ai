import React, { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import type { Drug, Supplier, DataContextType } from './types';
import { useDataState } from './useDataState';
import { useDataActions } from './useDataActions';
import { useRealtimeSync } from './useRealtimeSync';
import { branchService } from '../../services/org/branchService';
import { authService } from '../../services/auth/authService';
import { settingsService } from '../../services/settings/settingsService';

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
  
  const {
    activeBranchId, activeOrgId, rawInventory, currentEmployee, setIsLoading,
    setActiveBranchId, setActiveOrgId, setRawInventory, setSalesState,
    setSuppliersState, setPurchasesState, setPurchaseReturnsState,
    setReturnsState, setCustomersState, setEmployeesState, setCurrentEmployee,
    setBatchesState, setBranches, lastLoadedBranchId
  } = state;

  const actions = useDataActions({
    activeBranchId, activeOrgId, rawInventory, currentEmployee, setIsLoading,
    setActiveBranchId, setActiveOrgId, setRawInventory, setSalesState,
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

  // Initialization logic
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const { orgService } = await import('../../services/org/orgService');
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
  }, [setIsLoading, setBranches, setActiveBranchId, setActiveOrgId, refreshAll, lastLoadedBranchId]);

  const value = useMemo<DataContextType>(() => ({
    ...state,
    ...actions,
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
  }), [state, actions]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
