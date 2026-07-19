import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import type { ActionContext, Sale } from '../../types';

export function useProcessSalesReturn() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({
      returnData,
      sale,
      context,
    }: {
      returnData: any;
      sale: Sale;
      context: ActionContext;
    }) => transactionService.processReturn(returnData, [], sale, context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.recent(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.today(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.sales(branchId) });
    },
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({ ret, context }: { ret: any; context: ActionContext }) =>
      transactionService.processPurchaseReturnTransaction(ret, context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.purchases(branchId) });
    },
  });
}
