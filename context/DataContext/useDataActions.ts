import type React from 'react';
import { useCallback, useRef } from 'react';
import { StorageKeys } from '../../config/storageKeys';
import { authService } from '../../services/auth/authService';
import { permissionsService } from '../../services/auth/permissionsService';
import { customerService } from '../../services/customers';
import { employeeService } from '../../services/hr';
import { batchService, inventoryService } from '../../services/inventory';
import { branchService } from '../../services/org/branchService';
import { purchaseService } from '../../services/purchases';
import { returnService } from '../../services/returns';
import { salesService } from '../../services/sales';
import { inventorySearchEngine } from '../../services/search/drugSearchService';
import { settingsService } from '../../services/settings/settingsService';
import { supplierService } from '../../services/suppliers';
import { transactionService } from '../../services/transactions/transactionService';
import type {
  ActionContext,
  Branch,
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
import { storage } from '../../utils/storage';

interface DataActionsProps {
  activeBranchId: string;
  activeOrgId: string;
  rawInventory: Drug[];
  currentEmployee: Employee | null;
  setIsLoading: (loading: boolean) => void;
  setActiveBranchId: (id: string) => void;
  setActiveOrgId: (id: string) => void;
  setActiveOrg: (org: any) => void;
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
  setActiveOrg,
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
  lastLoadedBranchId,
}: DataActionsProps) => {
  // Ref to avoid recreating completeSale/processSalesReturn on every inventory change (memory-leak-audit #15)
  const rawInventoryRef = useRef(rawInventory);
  rawInventoryRef.current = rawInventory;

  const refreshAll = useCallback(
    async (targetBranchId?: string, targetOrgId?: string) => {
      const branchId = targetBranchId !== undefined ? targetBranchId : activeBranchId;
      const orgId = targetOrgId !== undefined ? targetOrgId : activeOrgId;
      if (!orgId) return;

      try {
        const { orgService } = await import('../../services/org/orgService');

        if (!branchId) {
          // No active branch! Load only org data and all org employees so the switcher works
          const [emp, allBranches, activeOrgData] = await Promise.all([
            employeeService.getAll('all', orgId),
            branchService.getAll(orgId),
            orgService.getById(orgId),
          ]);

          const currentSession = authService.getCurrentUserSync();
          const loggedInEmployee = emp.find((e) => e.id === currentSession?.employeeId) || null;

          setRawInventory([]);
          setSalesState([]);
          setSuppliersState([]);
          setPurchasesState([]);
          setPurchaseReturnsState([]);
          setReturnsState([]);
          setCustomersState([]);
          setEmployeesState(emp);
          setCurrentEmployee(loggedInEmployee);
          setBatchesState([]);
          setBranches(allBranches);
          setActiveOrg(activeOrgData);
          return;
        }

        // ── Stage 1: Core data (immediate) ──
        // Load employees, branches, and org first so the UI shell renders immediately.
        const [emp, allBranches, activeOrgData] = await Promise.all([
          employeeService.getAll(branchId),
          branchService.getAll(orgId),
          orgService.getById(orgId),
        ]);

        const currentSession = authService.getCurrentUserSync();
        const loggedInEmployee = emp.find((e) => e.id === currentSession?.employeeId) || null;

        setEmployeesState(emp);
        setCurrentEmployee(loggedInEmployee);
        setBranches(allBranches);
        setActiveOrg(activeOrgData);

        // Release loading state after core data so the UI shell renders immediately
        setIsLoading(false);

        // ── Stage 2: Domain data (background) ──
        // Load inventory, sales, purchases, etc. without blocking the UI.
        const [inv, sal, sup, pur, pRet, ret, cust, bat] = await Promise.all([
          inventoryService.getAll(branchId),
          salesService.getRecent(branchId, 100),
          supplierService.getAll(branchId),
          purchaseService.getRecent(branchId, 100),
          returnService.getRecentPurchaseReturns(branchId, 100),
          returnService.getRecentSalesReturns(branchId, 100),
          customerService.getAll(branchId),
          batchService.getAllBatches(branchId),
        ]);

        setRawInventory(inv);
        inventorySearchEngine.indexData(inv as any);
        setSalesState(sal);
        setSuppliersState(sup);
        setPurchasesState(pur);
        setPurchaseReturnsState(pRet);
        setReturnsState(ret);
        setCustomersState(cust);
        setBatchesState(bat);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    },
    [
      activeBranchId,
      activeOrgId,
      setIsLoading,
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
      setActiveOrg,
    ]
  );

  const switchBranch = useCallback(
    async (branchId: string, skipClearEmployee?: boolean) => {
      setIsLoading(true);
      try {
        const sessionBeforeClear = authService.getCurrentUserSync();
        const isManagerOrAdmin = permissionsService.isManager() || permissionsService.isOrgAdmin();
        const belongsToBranch = currentEmployee?.branchId === branchId;

        const shouldSkipClear = skipClearEmployee === true || isManagerOrAdmin || belongsToBranch;

        if (!shouldSkipClear) {
          setCurrentEmployee(null);
          authService.clearEmployeeSession();
        } else if (currentEmployee?.id) {
          if (sessionBeforeClear?.userId) {
            const key = `pharma_last_branch_${sessionBeforeClear.userId}_${currentEmployee.id}`;
            storage.set(key, branchId);
          }
        }

        await branchService.setActive(branchId);

        const allBranches = await branchService.getAll();
        const newBranch = allBranches.find((b) => b.id === branchId);
        const branchCode = newBranch?.code || '';

        await settingsService.setMultiple({
          activeBranchId: branchId,
          branchCode,
        });

        // Log Branch Switch (Using the session captured before clearing)
        if (sessionBeforeClear) {
          const oldBranch = allBranches.find((b) => b.id === activeBranchId);

          authService.logAuditEvent({
            username: sessionBeforeClear.username,
            role: sessionBeforeClear.role,
            branchId: branchId,
            action: 'switch_branch',
            employeeId: sessionBeforeClear.employeeId,
            employeeCode: sessionBeforeClear.employeeCode,
            details: `Switched from ${oldBranch?.name || activeBranchId} to ${newBranch?.name || branchId}`,
          });
        }

        branchService.setActive(branchId);
        
        // Sync session in backend
        import('../../services/auth/repositories/sessionRepository').then(({ sessionRepository }) => {
          import('../../services/org/orgService').then(({ orgService }) => {
            const activeSessionId = storage.get(StorageKeys.ACTIVE_SESSION_ID, null);
            const currentOrgId = orgService.getActiveOrgId();
            if (activeSessionId && currentOrgId) {
              sessionRepository.updateSessionWorkspace(activeSessionId, currentOrgId, branchId).catch(console.error);
            }
          });
        });

        setActiveBranchId(branchId);
        lastLoadedBranchId.current = branchId;
        authService.updateSession({ branchId });
        await refreshAll(branchId);
      } finally {
        setIsLoading(false);
      }
    },
    [
      refreshAll,
      currentEmployee,
      setIsLoading,
      setActiveBranchId,
      setCurrentEmployee,
      lastLoadedBranchId,
      activeBranchId,
    ]
  );

  const switchOrg = useCallback(
    async (orgId: string) => {
      setIsLoading(true);
      try {
        const { orgService } = await import('../../services/org/orgService');

        setCurrentEmployee(null);
        authService.clearEmployeeSession();

        orgService.setActiveOrgId(orgId);
        
        // Sync session in backend
        import('../../services/auth/repositories/sessionRepository').then(({ sessionRepository }) => {
          const activeSessionId = storage.get(StorageKeys.ACTIVE_SESSION_ID, null);
          if (activeSessionId) {
            sessionRepository.updateSessionWorkspace(activeSessionId, orgId, null).catch(console.error);
          }
        });

        setActiveOrgId(orgId);
        const fullOrg = await orgService.getById(orgId);
        setActiveOrg(fullOrg);
        await settingsService.set('orgId', orgId);
        const branches = await branchService.getAll(orgId);
        if (branches.length > 0) await switchBranch(branches[0].id);
        else await refreshAll();
      } finally {
        setIsLoading(false);
      }
    },
    [switchBranch, refreshAll, setIsLoading, setActiveOrgId, setCurrentEmployee]
  );

  const syncBatches = useCallback(async () => {
    const bat = await batchService.getAllBatches(activeBranchId);
    setBatchesState(bat);
  }, [activeBranchId, setBatchesState]);

  const addProduct = useCallback(
    async (product: any) => {
      const newProduct = await inventoryService.create(product, activeBranchId);
      setRawInventory((prev: any) => [...prev, newProduct]);
      return newProduct;
    },
    [activeBranchId, setRawInventory]
  );

  const updateProduct = useCallback(
    async (id: string, updates: any) => {
      if (!permissionsService.can('reports.view_financial')) {
        delete updates.costPrice;
        delete updates.unitCostPrice;
      }
      const updated = await inventoryService.update(id, updates);
      setRawInventory((prev: any) => prev.map((p: any) => (p.id === id ? updated : p)));
      return updated;
    },
    [setRawInventory]
  );


  const addSale = useCallback(
    async (sale: any) => {
      const newSale = await salesService.create(sale, activeBranchId);
      setSalesState((prev: any) => [...prev, newSale]);
      return newSale;
    },
    [activeBranchId, setSalesState]
  );

  // Uses rawInventoryRef to avoid recreation on every inventory change (memory-leak-audit #15)
  const completeSale = useCallback(async (saleData: any, context: ActionContext) => {
    const result = await transactionService.processCheckout(
      saleData,
      rawInventoryRef.current,
      context
    );
    if (!result.success || !result.sale) throw new Error(result.error);
    await refreshAll();
    return result.sale;
  }, [refreshAll]);

  const addSupplier = useCallback(
    async (supplier: any) => {
      const newSupplier = await supplierService.create(supplier, activeBranchId);
      setSuppliersState((prev: any) => [...prev, newSupplier]);
      return newSupplier;
    },
    [activeBranchId, setSuppliersState]
  );

  const updateSupplier = useCallback(
    async (id: string, updates: any) => {
      const updated = await supplierService.update(id, updates);
      setSuppliersState((prev: any) => prev.map((s: any) => (s.id === id ? updated : s)));
      return updated;
    },
    [setSuppliersState]
  );

  const addPurchase = useCallback(
    async (purchase: any, context?: ActionContext) => {
      if (purchase.status === 'completed' && context) {
        const result = await transactionService.processDirectPurchaseTransaction(purchase, context);
        if (!result.success) throw new Error(result.error);
        await refreshAll();
        return result.data!;
      } else {
        const newPurchase = await purchaseService.create({
          ...purchase,
          branchId: activeBranchId,
          orgId: activeOrgId,
        });
        setPurchasesState((prev: any) => [newPurchase, ...prev]);
        return newPurchase;
      }
    },
    [activeBranchId, activeOrgId, refreshAll, setPurchasesState]
  );

  const approvePurchase = useCallback(async (id: string, context: ActionContext) => {
    const result = await transactionService.processPurchaseTransaction(id, context);
    if (!result.success) throw new Error(result.error);
    await refreshAll();
  }, [refreshAll]);

  const markAsReceived = useCallback(
    async (id: string, receiverId: string, receiverName: string, shiftId?: string) => {
      await purchaseService.markAsReceived(id, receiverId, receiverName, shiftId);
      await refreshAll();
    },
    [refreshAll]
  );

  const rejectPurchase = useCallback(
    async (id: string) => {
      await purchaseService.reject(id, '');
      setPurchasesState((prev: any) =>
        prev.map((p: any) => (p.id === id ? ({ ...p, status: 'rejected' } as any) : p))
      );
    },
    [setPurchasesState]
  );

  // Uses rawInventoryRef to avoid recreation on every inventory change (memory-leak-audit #15)
  const processSalesReturn = useCallback(
    async (returnData: any, sale: Sale, context: ActionContext) => {
      const result = await transactionService.processReturn(
        returnData,
        rawInventoryRef.current,
        sale,
        context
      );
      if (!result.success) throw new Error(result.error);
      await refreshAll();
    },
    [refreshAll]
  );

  const createPurchaseReturn = useCallback(async (ret: any, context: ActionContext) => {
    const result = await transactionService.processPurchaseReturnTransaction(ret, context);
    if (!result.success || !result.data) throw new Error(result.error);
    await refreshAll();
    return result.data;
  }, [refreshAll]);

  const addReturn = useCallback(
    async (ret: any) => {
      const newReturn = await returnService.createSalesReturn(ret, activeBranchId);
      setReturnsState((prev: any) => [...prev, newReturn]);
      return newReturn;
    },
    [activeBranchId, setReturnsState]
  );

  const addCustomer = useCallback(
    async (customer: any) => {
      const newCustomer = await customerService.create(customer, activeBranchId);
      setCustomersState((prev: any) => [...prev, newCustomer]);
      return newCustomer;
    },
    [activeBranchId, setCustomersState]
  );

  const updateCustomer = useCallback(
    async (id: string, updates: any) => {
      const updated = await customerService.update(id, updates);
      setCustomersState((prev: any) => prev.map((c: any) => (c.id === id ? updated : c)));
      return updated;
    },
    [setCustomersState]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      await customerService.delete(id);
      setCustomersState((prev: any) => prev.filter((c: any) => c.id !== id));
    },
    [setCustomersState]
  );

  const addEmployee = useCallback(
    async (employee: any) => {
      const newEmployee = await employeeService.create(employee, activeBranchId, activeOrgId);
      setEmployeesState((prev: any) => [...prev, newEmployee]);
      return newEmployee;
    },
    [activeBranchId, activeOrgId, setEmployeesState]
  );

  const updateEmployee = useCallback(
    async (id: string, updates: any) => {
      const updated = await employeeService.update(id, updates);
      setEmployeesState((prev: any) => prev.map((e: any) => (e.id === id ? updated : e)));
      return updated;
    },
    [setEmployeesState]
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      await employeeService.delete(id);
      setEmployeesState((prev: any) => prev.filter((e: any) => e.id !== id));
    },
    [setEmployeesState]
  );

  return {
    refreshAll,
    switchBranch,
    switchOrg,
    syncBatches,
    addProduct,
    updateProduct,
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
    updateBranch: async (id: string, updates: any) => {
      await branchService.update(id, updates);
      setBranches((prev: any) => prev.map((b: any) => (b.id === id ? { ...b, ...updates } : b)));
    },
  };
};
