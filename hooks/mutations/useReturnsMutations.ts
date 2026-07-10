import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import type { ActionContext, Sale } from '../../types';
import { queryKeys } from '../../lib/queryKeys';

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
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.sales });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.returns });
    },
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({
      ret,
      context,
    }: {
      ret: any;
      context: ActionContext;
    }) => transactionService.processPurchaseReturnTransaction(ret, context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.returns });
    },
  });
}
