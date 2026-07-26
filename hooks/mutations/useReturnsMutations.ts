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
    onSuccess: (data, variables) => {
      const saleId = variables.sale.id;
      const refundAmount = data.totalRefund ?? variables.returnData.totalRefund;

      const saleUpdates: Partial<Sale> = {
        hasReturns: true,
        netTotal: Math.max(0, (variables.sale.netTotal ?? variables.sale.total) - refundAmount),
      };
      if (variables.returnData.returnType === 'full') saleUpdates.status = 'returned' as Sale['status'];

      queryClient.setQueryData<Sale | undefined>(queryKeys.sales.detail(saleId), (old) => {
        if (!old) return old;
        return { ...old, ...saleUpdates };
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.shifts });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.cashTransactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.sales });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.returns });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.shifts });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.cashTransactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.returns });
    },
  });
}
