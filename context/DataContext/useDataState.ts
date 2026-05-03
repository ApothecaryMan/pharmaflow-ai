import { useState, useRef } from 'react';
import type { Drug, Sale, Supplier, Purchase, PurchaseReturn, Return, Customer, Employee, StockBatch } from '../../types';
import { useComputedInventory } from '../../hooks/inventory/useComputedInventory';

export const useDataState = (initialInventory?: Drug[], initialSuppliers?: Supplier[]) => {
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
  
  // Proper fix for the "Disappearing Data" race condition:
  // In DEV mode, we bypass the branch filter while loading so the sample data stays visible.
  // In Production, rawInventory starts empty anyway, so this has no impact on data leakage.
  const effectiveFilterBranchId = (isLoading && import.meta.env.DEV) ? '' : activeBranchId;
  const inventory = useComputedInventory(rawInventory, batches, effectiveFilterBranchId);

  return {
    isLoading, setIsLoading,
    activeOrgId, setActiveOrgId,
    activeBranchId, setActiveBranchId,
    rawInventory, setRawInventory,
    sales, setSalesState,
    suppliers, setSuppliersState,
    purchases, setPurchasesState,
    purchaseReturns, setPurchaseReturnsState,
    returns, setReturnsState,
    customers, setCustomersState,
    employees, setEmployeesState,
    currentEmployee, setCurrentEmployee,
    batches, setBatchesState,
    branches, setBranches,
    inventory,
    lastLoadedBranchId
  };
};
