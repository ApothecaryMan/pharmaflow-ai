import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { salesService } from '../../services/sales';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import type { ActionContext, CartItem } from '../../types';

export function useCompleteSale() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({
      saleData,
      context,
    }: {
      saleData: {
        items: CartItem[];
        customerName: string;
        customerCode?: string;
        paymentMethod: 'cash' | 'visa';
        saleType?: 'walk-in' | 'delivery';
        total: number;
        subtotal: number;
        globalDiscount: number;
      };
      context: ActionContext;
    }) => transactionService.processCheckout(saleData, [], context),
    onSuccess: (data, vars) => {
      const saleId = data.sale?.id;
      if (saleId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(saleId) });
      }
      // Checkout RPC updates shifts (cashSales/cardSales) and inserts a
      // cash_transactions row — invalidate both so the cash register is fresh.
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all(branchId) });
      if (vars.context.shiftId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cashTransactions.byShift(vars.context.shiftId, branchId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.recent(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.today(branchId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', branchId] });
    },
  });
}

export function useAddSale() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (sale: any) => salesService.create(sale, branchId),
    onSuccess: (data) => {
      const saleId = data?.id;
      if (saleId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(saleId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.recent(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.today(branchId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', branchId] });
    },
  });
}
