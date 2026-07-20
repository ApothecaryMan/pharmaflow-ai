import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import type { ActionContext, Sale } from '../../types';
import type { PagedResult } from '../../services/sales/types';

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
      const isFullReturn = variables.returnData.returnType === 'full';
      const refundAmount = data.totalRefund ?? variables.returnData.totalRefund;

      const saleUpdates: Partial<Sale> = {
        hasReturns: true,
        netTotal: Math.max(0, (variables.sale.netTotal ?? variables.sale.total) - refundAmount),
      };
      if (isFullReturn) saleUpdates.status = 'returned' as Sale['status'];

      queryClient.setQueriesData({ queryKey: ['sales'] }, (oldData: unknown) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.map((s: Sale) => (s.id === saleId ? { ...s, ...saleUpdates } : s));
        }
        if (typeof oldData === 'object' && oldData !== null) {
          const paged = oldData as PagedResult<Sale>;
          if (paged.rows) {
            return { ...paged, rows: paged.rows.map((s) => (s.id === saleId ? { ...s, ...saleUpdates } : s)) };
          }
          const single = oldData as Sale;
          if (single.id === saleId) return { ...single, ...saleUpdates };
        }
        return oldData;
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(branchId) });
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
