import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useStatusBar } from '../components/layout/StatusBar';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../stores/authStore';
import type {
  ActionContext,
  Customer,
  Drug,
  Purchase,
  PurchaseReturn,
  Return,
  Sale,
  StockBatch,
} from '../types';
import {
  useAddPurchase,
  useApprovePurchase,
  useMarkPurchaseReceived,
} from './mutations/usePurchaseMutations';
import { useCreatePurchaseReturn, useProcessSalesReturn } from './mutations/useReturnsMutations';
import { useCompleteSale } from './mutations/useSalesMutations';
import type { SaleData } from './sales/useSalesHandlers';
import { useShift } from './sales/useShift';

export function useHandlerInfrastructure() {
  const queryClient = useQueryClient();
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);

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
    async (saleData: SaleData, context: ActionContext) => {
      const result = await completeSaleMut.mutateAsync({ saleData, context });
      if (!result.success) throw new Error(result.error || 'Checkout failed');
      return result.sale as Sale;
    },
    [completeSaleMut]
  );

  const processSalesReturnAction = useCallback(
    (returnData: Return, sale: Sale, context: ActionContext) =>
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

  const setPurchases = useCallback(
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

  const setPurchaseReturns = useCallback(
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

  const setReturns = useCallback(
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

  const setCustomers = useCallback(
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

  const setBatches = useCallback(
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

  return {
    setInventory,
    setSales,
    setPurchases,
    setPurchaseReturns,
    setReturns,
    setCustomers,
    setBatches,
    addPurchase: addPurchaseAction,
    approvePurchase: approvePurchaseAction,
    markAsReceived: markAsReceivedAction,
    completeSale,
    processSalesReturn: processSalesReturnAction,
    createPurchaseReturn: createPurchaseReturnAction,
    currentShift,
    addTransaction,
    getVerifiedDate,
    validateTransactionTime,
    updateLastTransactionTime,
    activeOrgId,
  };
}
