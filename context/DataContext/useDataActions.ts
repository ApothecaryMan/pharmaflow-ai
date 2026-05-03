import React, { useCallback } from 'react';
import { inventoryService } from '../../services/inventory';
import { salesService } from '../../services/sales';
import { supplierService } from '../../services/suppliers';
import { purchaseService } from '../../services/purchases';
import { returnService } from '../../services/returns';
import { customerService } from '../../services/customers';
import { employeeService } from '../../services/hr';
import { batchService } from '../../services/inventory';
import { branchService } from '../../services/org/branchService';
import { authService } from '../../services/auth/authService';
import { settingsService } from '../../services/settings/settingsService';
import { transactionService } from '../../services/transactions/transactionService';
import { permissionsService } from '../../services/auth/permissionsService';
import type { ActionContext, Drug, Sale, Supplier, Purchase, PurchaseReturn, Return, Customer, Employee, StockBatch } from '../../types';

interface DataActionsProps {
  activeBranchId: string;
  activeOrgId: string;
  rawInventory: Drug[];
  currentEmployee: Employee | null;
  setIsLoading: (loading: boolean) => void;
  setActiveBranchId: (id: string) => void;
  setActiveOrgId: (id: string) => void;
  setRawInventory: (data: any) => void;
  setSalesState: (data: any) => void;
  setSuppliersState: (data: any) => void;
  setPurchasesState: (data: any) => void;
  setPurchaseReturnsState: (data: any) => void;
  setReturnsState: (data: any) => void;
  setCustomersState: (data: any) => void;
  setEmployeesState: (data: any) => void;
  setCurrentEmployee: (emp: Employee | null) => void;
  setBatchesState: (data: any) => void;
  setBranches: (data: any) => void;
  lastLoadedBranchId: React.MutableRefObject<string>;
}

export const useDataActions = ({
  activeBranchId,
  activeOrgId,
  rawInventory,
  currentEmployee,
  setIsLoading,
  setActiveBranchId,
  setActiveOrgId,
  setRawInventory,
  setSalesState,
  setSuppliersState,
  setPurchasesState,
  setPurchaseReturnsState,
  setReturnsState,
  setCustomersState,
  setEmployeesState,
  setCurrentEmployee,
  setBatchesState,
  setBranches,
  lastLoadedBranchId
}: DataActionsProps) => {

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
  }, [activeBranchId, activeOrgId, setRawInventory, setSalesState, setSuppliersState, setPurchasesState, setPurchaseReturnsState, setReturnsState, setCustomersState, setEmployeesState, setCurrentEmployee, setBatchesState, setBranches]);

  const switchBranch = useCallback(async (branchId: string, skipClearEmployee?: boolean) => {
    setIsLoading(true);
    try {
      const isManagerOrAdmin = permissionsService.isManager() || permissionsService.isOrgAdmin();
      const belongsToBranch = currentEmployee?.branchId === branchId;
      
      const shouldSkipClear = skipClearEmployee === true || isManagerOrAdmin || belongsToBranch;

      if (!shouldSkipClear) {
        setCurrentEmployee(null);
        authService.clearEmployeeSession();
      } else if (currentEmployee?.id) {
        const session = authService.getCurrentUserSync();
        if (session?.userId) {
          const key = `pharma_last_branch_${session.userId}_${currentEmployee.id}`;
          localStorage.setItem(key, branchId);
        }
      }

      await branchService.setActive(branchId);
      setActiveBranchId(branchId);
      lastLoadedBranchId.current = branchId;
      authService.updateSession({ branchId });
      await refreshAll(branchId);
    } finally {
      setIsLoading(false);
    }
  }, [refreshAll, currentEmployee, setIsLoading, setActiveBranchId, setCurrentEmployee, lastLoadedBranchId]);

  const switchOrg = useCallback(async (orgId: string) => {
    setIsLoading(true);
    try {
      const { orgService } = await import('../../services/org/orgService');
      
      setCurrentEmployee(null);
      authService.clearEmployeeSession();

      orgService.setActiveOrgId(orgId);
      setActiveOrgId(orgId);
      await settingsService.set('orgId', orgId);
      const branches = await branchService.getAll(orgId);
      if (branches.length > 0) await switchBranch(branches[0].id);
      else await refreshAll();
    } finally {
      setIsLoading(false);
    }
  }, [switchBranch, refreshAll, setIsLoading, setActiveOrgId, setCurrentEmployee]);

  const syncBatches = useCallback(async () => {
    const bat = await batchService.getAllBatches(activeBranchId);
    setBatchesState(bat);
  }, [activeBranchId, setBatchesState]);

  const addProduct = useCallback(async (product: any) => {
    const newProduct = await inventoryService.create(product, activeBranchId);
    setRawInventory((prev: any) => [...prev, newProduct]);
    return newProduct;
  }, [activeBranchId, setRawInventory]);

  const updateProduct = useCallback(async (id: string, updates: any) => {
    if (!permissionsService.can('reports.view_financial')) {
      delete updates.costPrice;
      delete updates.unitCostPrice;
    }
    const updated = await inventoryService.update(id, updates);
    setRawInventory((prev: any) => prev.map((p: any) => (p.id === id ? updated : p)));
    return updated;
  }, [setRawInventory]);

  const updateStock = useCallback(async (id: string, quantity: number) => {
    await inventoryService.updateStock(id, quantity);
    setRawInventory((prev: any) => prev.map((p: any) => (p.id === id ? { ...p, stock: p.stock + quantity } : p)));
  }, [setRawInventory]);

  const addSale = useCallback(async (sale: any) => {
    const newSale = await salesService.create(sale, activeBranchId);
    setSalesState((prev: any) => [...prev, newSale]);
    return newSale;
  }, [activeBranchId, setSalesState]);

  const completeSale = useCallback(async (saleData: any, context: ActionContext) => {
    const result = await transactionService.processCheckout(saleData, rawInventory, context);
    if (!result.success || !result.sale) throw new Error(result.error);
    return result.sale;
  }, [rawInventory]);

  const addSupplier = useCallback(async (supplier: any) => {
    const newSupplier = await supplierService.create(supplier, activeBranchId);
    setSuppliersState((prev: any) => [...prev, newSupplier]);
    return newSupplier;
  }, [activeBranchId, setSuppliersState]);

  const updateSupplier = useCallback(async (id: string, updates: any) => {
    const updated = await supplierService.update(id, updates);
    setSuppliersState((prev: any) => prev.map((s: any) => (s.id === id ? updated : s)));
    return updated;
  }, [setSuppliersState]);

  const addPurchase = useCallback(async (purchase: any, context?: ActionContext) => {
    if (purchase.status === 'completed' && context) {
      const result = await transactionService.processDirectPurchaseTransaction(purchase, context);
      if (!result.success) throw new Error(result.error);
      await refreshAll();
      return result.data!;
    } else {
      const newPurchase = await purchaseService.create({ ...purchase, branchId: activeBranchId, orgId: activeOrgId });
      setPurchasesState((prev: any) => [newPurchase, ...prev]);
      return newPurchase;
    }
  }, [activeBranchId, activeOrgId, refreshAll, setPurchasesState]);

  const approvePurchase = useCallback(async (id: string, context: ActionContext) => {
    const result = await transactionService.processPurchaseTransaction(id, context);
    if (!result.success) throw new Error(result.error);
  }, []);

  const markAsReceived = useCallback(async (id: string, receiverId: string, receiverName: string) => {
    await purchaseService.markAsReceived(id, receiverId, receiverName);
  }, []);

  const rejectPurchase = useCallback(async (id: string) => {
    await purchaseService.reject(id, '');
    setPurchasesState((prev: any) => prev.map((p: any) => (p.id === id ? { ...p, status: 'rejected' } as any : p)));
  }, [setPurchasesState]);

  const processSalesReturn = useCallback(async (returnData: any, sale: Sale, context: ActionContext) => {
    const result = await transactionService.processReturn(returnData, rawInventory, sale, context);
    if (!result.success) throw new Error(result.error);
  }, [rawInventory]);

  const createPurchaseReturn = useCallback(async (ret: any, context: ActionContext) => {
    const result = await transactionService.processPurchaseReturnTransaction(ret, context);
    if (!result.success || !result.data) throw new Error(result.error);
    return result.data;
  }, []);

  const addReturn = useCallback(async (ret: any) => {
    const newReturn = await returnService.createSalesReturn(ret, activeBranchId);
    setReturnsState((prev: any) => [...prev, newReturn]);
    return newReturn;
  }, [activeBranchId, setReturnsState]);

  const addCustomer = useCallback(async (customer: any) => {
    const newCustomer = await customerService.create(customer, activeBranchId);
    setCustomersState((prev: any) => [...prev, newCustomer]);
    return newCustomer;
  }, [activeBranchId, setCustomersState]);

  const updateCustomer = useCallback(async (id: string, updates: any) => {
    const updated = await customerService.update(id, updates);
    setCustomersState((prev: any) => prev.map((c: any) => (c.id === id ? updated : c)));
    return updated;
  }, [setCustomersState]);

  const deleteCustomer = useCallback(async (id: string) => {
    await customerService.delete(id);
    setCustomersState((prev: any) => prev.filter((c: any) => c.id !== id));
  }, [setCustomersState]);

  const addEmployee = useCallback(async (employee: any) => {
    const newEmployee = await employeeService.create(employee, activeBranchId, activeOrgId);
    setEmployeesState((prev: any) => [...prev, newEmployee]);
    return newEmployee;
  }, [activeBranchId, activeOrgId, setEmployeesState]);

  const updateEmployee = useCallback(async (id: string, updates: any) => {
    const updated = await employeeService.update(id, updates);
    setEmployeesState((prev: any) => prev.map((e: any) => (e.id === id ? updated : e)));
    return updated;
  }, [setEmployeesState]);

  const deleteEmployee = useCallback(async (id: string) => {
    await employeeService.delete(id);
    setEmployeesState((prev: any) => prev.filter((e: any) => e.id !== id));
  }, [setEmployeesState]);

  return {
    refreshAll,
    switchBranch,
    switchOrg,
    syncBatches,
    addProduct,
    updateProduct,
    updateStock,
    addSale,
    completeSale,
    addSupplier,
    updateSupplier,
    addPurchase,
    approvePurchase,
    markAsReceived,
    rejectPurchase,
    processSalesReturn,
    createPurchaseReturn,
    addReturn,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  };
};
