import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { Customer, Drug, Employee, Purchase, PurchaseReturn, Return, Sale, StockBatch } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useInventory, useBatches } from './queries/useInventoryQuery';
import { useRecentSales } from './queries/useSalesQuery';
import { useCustomers } from './queries/useCustomersQuery';
import { useEmployees } from './queries/useEmployeesQuery';
import { usePurchases } from './queries/usePurchasesQuery';
import { usePurchaseReturns, useSalesReturns } from './queries/useReturnsQuery';
import { useCompleteSale } from './mutations/useSalesMutations';
import { useAddPurchase, useApprovePurchase, useMarkPurchaseReceived } from './mutations/usePurchaseMutations';
import { useProcessSalesReturn, useCreatePurchaseReturn } from './mutations/useReturnsMutations';
import { useEntityHandlers } from './useEntityHandlers';
import { useShift } from './sales/useShift';
import { useStatusBar } from '../components/layout/StatusBar';
import type { ActionContext } from '../types';

export function usePageHandlers() {
  const queryClient = useQueryClient();
  const currentEmployeeId = useAuthStore((s) => s.currentEmployee?.id ?? null);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const isLoading = useAuthStore((s) => s.isLoading);

  const { data: inventory = [] } = useInventory(activeBranchId);
  const { data: sales = [] } = useRecentSales(activeBranchId);
  const { data: employees = [] } = useEmployees(activeBranchId);
  const { data: customers = [] as Customer[] } = useCustomers(activeBranchId);
  const { data: purchases = [] } = usePurchases(activeBranchId);
  const { data: purchaseReturns = [] } = usePurchaseReturns(activeBranchId);
  const { data: returns = [] } = useSalesReturns(activeBranchId);
  const { data: batches = [] } = useBatches(activeBranchId);

  const completeSaleMut = useCompleteSale();
  const addPurchaseMut = useAddPurchase();
  const approvePurchaseMut = useApprovePurchase();
  const markAsReceivedMut = useMarkPurchaseReceived();
  const processSalesReturnMut = useProcessSalesReturn();
  const createPurchaseReturnMut = useCreatePurchaseReturn();

  const { currentShift, addTransaction } = useShift();
  const { getVerifiedDate, validateTransactionTime, updateLastTransactionTime } = useStatusBar();

  const addPurchaseAction = useCallback(
    (purchase: Omit<Purchase, 'id'>, context?: ActionContext) =>
      addPurchaseMut.mutateAsync({ purchase, context }),
    [addPurchaseMut]
  );

  const approvePurchaseAction = useCallback(
    (id: string, context: ActionContext) => approvePurchaseMut.mutateAsync({ id, context }),
    [approvePurchaseMut]
  );

  const markAsReceivedAction = useCallback(
    async (id: string, receiverId: string, receiverName: string, shiftId?: string) => {
      await markAsReceivedMut.mutateAsync({ id, receiverId, receiverName, shiftId });
    },
    [markAsReceivedMut]
  );

  const completeSale = useCallback(
    async (saleData: any, context: ActionContext) => {
      const result = await completeSaleMut.mutateAsync({ saleData, context });
      if (!result.success) throw new Error(result.error || 'Checkout failed');
      return result.sale as Sale;
    },
    [completeSaleMut]
  );

  const processSalesReturnAction = useCallback(
    (returnData: any, sale: Sale, context: ActionContext) =>
      processSalesReturnMut.mutateAsync({ returnData, sale, context }),
    [processSalesReturnMut]
  );

  const createPurchaseReturnAction = useCallback(
    async (ret: Omit<PurchaseReturn, 'id'>, context: ActionContext) => {
      const result = await createPurchaseReturnMut.mutateAsync({ ret, context });
      return result.data as PurchaseReturn;
    },
    [createPurchaseReturnMut]
  );

  const setInventory = useCallback(
    (updater: Drug[] | ((prev: Drug[]) => Drug[])) => {
      queryClient.setQueryData(
        queryKeys.inventory.all(activeBranchId),
        (old: Drug[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setSales = useCallback(
    (updater: Sale[] | ((prev: Sale[]) => Sale[])) => {
      queryClient.setQueryData(
        queryKeys.sales.recent(activeBranchId, 100),
        (old: Sale[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setPurchasesState = useCallback(
    (updater: Purchase[] | ((prev: Purchase[]) => Purchase[])) => {
      queryClient.setQueryData(
        queryKeys.purchases.all(activeBranchId, 100),
        (old: Purchase[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setPurchaseReturnsState = useCallback(
    (updater: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])) => {
      queryClient.setQueryData(
        queryKeys.returns.purchases(activeBranchId, 100),
        (old: PurchaseReturn[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setReturnsState = useCallback(
    (updater: Return[] | ((prev: Return[]) => Return[])) => {
      queryClient.setQueryData(
        queryKeys.returns.sales(activeBranchId, 100),
        (old: Return[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setCustomersState = useCallback(
    (updater: Customer[] | ((prev: Customer[]) => Customer[])) => {
      queryClient.setQueryData(
        queryKeys.customers.all(activeBranchId),
        (old: Customer[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const setBatchesState = useCallback(
    (updater: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => {
      queryClient.setQueryData(
        queryKeys.batches.all(activeBranchId),
        (old: StockBatch[] | undefined) => {
          const prev = old || [];
          return typeof updater === 'function' ? updater(prev) : updater;
        }
      );
    },
    [queryClient, activeBranchId]
  );

  const {
    handlePurchaseComplete,
    handleApprovePurchase,
    handleMarkAsReceived,
    handleRejectPurchase,
    handleCreatePurchaseReturn,
    handleCompleteSale,
    handleUpdateSale,
    handleProcessReturn,
  } = useEntityHandlers({
    inventory,
    setInventory,
    sales,
    setSales,
    purchases,
    setPurchases: setPurchasesState,
    returns,
    setReturns: setReturnsState,
    customers,
    setCustomers: setCustomersState,
    purchaseReturns,
    setPurchaseReturns: setPurchaseReturnsState,
    currentEmployeeId,
    activeBranchId,
    activeOrgId,
    employees,
    isLoading,
    batches,
    setBatches: setBatchesState,
    approvePurchase: approvePurchaseAction,
    addPurchase: addPurchaseAction,
    completeSale,
    processSalesReturn: processSalesReturnAction,
    createPurchaseReturn: createPurchaseReturnAction,
    markAsReceived: markAsReceivedAction,
    getVerifiedDate,
    validateTransactionTime,
    updateLastTransactionTime,
  });

  return {
    handleCompleteSale,
    handleUpdateSale,
    handleProcessReturn,
    handlePurchaseComplete,
    handleApprovePurchase,
    handleMarkAsReceived,
    handleRejectPurchase,
    handleCreatePurchaseReturn,
  };
}
