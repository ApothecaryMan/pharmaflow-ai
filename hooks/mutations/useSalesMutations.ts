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
      // Optimistic patch for inventory cache using setQueryData pattern
      queryClient.setQueryData<any[]>(queryKeys.inventory.all(branchId), (old) => {
        if (!old) return old;
        const newInv = [...old];
        vars.saleData.items.forEach((saleItem) => {
          const index = newInv.findIndex((d) => d.id === saleItem.id);
          if (index !== -1) {
            const drug = newInv[index];
            const qtyToDeduct = saleItem.isUnit ? saleItem.quantity / (drug.unitsPerPack || 1) : saleItem.quantity;
            newInv[index] = { ...drug, stock: Math.max(0, drug.stock - qtyToDeduct) };
          }
        });
        return newInv;
      });

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
