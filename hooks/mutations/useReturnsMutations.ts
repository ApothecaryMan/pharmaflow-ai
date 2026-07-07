import { useMutation, useQueryClient } from '@tanstack/react-query';
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
      queryClient.invalidateQueries({ queryKey: ['inventory', branchId] });
      queryClient.invalidateQueries({ queryKey: ['sales', branchId] });
      queryClient.invalidateQueries({ queryKey: ['batches', branchId] });
      queryClient.invalidateQueries({ queryKey: ['returns', branchId] });
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
      queryClient.invalidateQueries({ queryKey: ['inventory', branchId] });
      queryClient.invalidateQueries({ queryKey: ['returns', branchId] });
    },
  });
}
