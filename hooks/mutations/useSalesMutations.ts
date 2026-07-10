import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService } from '../../services/sales';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import type { ActionContext, CartItem } from '../../types';
import { queryKeys } from '../../lib/queryKeys';

export function useCompleteSale() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.sales });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
    },
  });
}

export function useAddSale() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (sale: any) => salesService.create(sale, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.sales });
    },
  });
}
