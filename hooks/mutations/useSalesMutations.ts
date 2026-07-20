import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { salesService } from '../../services/sales';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import { idGenerator } from '../../utils/idGenerator';
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
      const sale = data.sale;

      if (saleId) {
        queryClient.setQueryData(queryKeys.sales.detail(saleId), sale);
        queryClient.setQueryData<any[]>(queryKeys.sales.recent(branchId), (old) => {
          if (!old) return old;
          return [sale, ...old];
        });
        queryClient.setQueryData<any[]>(queryKeys.sales.today(branchId), (old) => {
          if (!old) return old;
          return [sale, ...old];
        });
      }

      queryClient.setQueryData<any[]>(queryKeys.shifts.all(branchId), (old) => {
        if (!old) return old;
        return old.map((s) =>
          s.id === vars.context.shiftId
            ? {
                ...s,
                cashSales: s.cashSales + (vars.saleData.paymentMethod === 'cash' ? vars.saleData.total : 0),
                cardSales: s.cardSales + (vars.saleData.paymentMethod === 'visa' ? vars.saleData.total : 0),
                cashInvoiceCount: (s.cashInvoiceCount || 0) + (vars.saleData.paymentMethod === 'cash' ? 1 : 0),
                cardInvoiceCount: (s.cardInvoiceCount || 0) + (vars.saleData.paymentMethod === 'visa' ? 1 : 0),
              }
            : s,
        );
      });

      if (vars.context.shiftId) {
        queryClient.setQueryData<any[]>(
          queryKeys.cashTransactions.byShift(vars.context.shiftId, branchId),
          (old) => {
            if (!old) return old;
            return [
              ...old,
              {
                id: idGenerator.uuid(),
                branchId,
                shiftId: vars.context.shiftId,
                time: new Date().toISOString(),
                type: vars.saleData.paymentMethod === 'cash' ? 'sale' : 'card_sale',
                amount: vars.saleData.total,
                userId: vars.context.performerId,
                reason: `Sale ${data?.sale?.serialId || ''}`.trim(),
              },
            ];
          },
        );
      }

      queryClient.setQueryData<any[]>(queryKeys.inventory.all(branchId), (old) => {
        if (!old) return old;
        const newInv = [...old];
        vars.saleData.items.forEach((saleItem) => {
          const index = newInv.findIndex((d) => d.id === saleItem.id);
          if (index !== -1) {
            const drug = newInv[index];
            const qtyInUnits = saleItem.isUnit ? saleItem.quantity : saleItem.quantity * (drug.unitsPerPack || 1);
            newInv[index] = { ...drug, stock: Math.max(0, drug.stock - qtyInUnits) };
          }
        });
        return newInv;
      });

      queryClient.setQueryData<any[]>(queryKeys.batches.all(branchId), (old) => {
        if (!old) return old;
        let newBatches = [...old];
        vars.saleData.items.forEach((saleItem) => {
          const drugId = saleItem.id;
          const qtyInUnits = saleItem.isUnit ? saleItem.quantity : saleItem.quantity * (saleItem.unitsPerPack || 1);
          if (qtyInUnits <= 0) return;

          const batchEntries = newBatches
            .map((b, i) => ({ batch: b, index: i }))
            .filter(({ batch }) => batch.drugId === drugId)
            .sort((a, b) => new Date(a.batch.expiryDate).getTime() - new Date(b.batch.expiryDate).getTime());

          let remaining = qtyInUnits;
          for (const { index } of batchEntries) {
            if (remaining <= 0) break;
            const batch = newBatches[index];
            const deduct = Math.min(batch.quantity, remaining);
            newBatches[index] = { ...batch, quantity: batch.quantity - deduct };
            remaining -= deduct;
          }
        });
        return newBatches;
      });
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
      if (data?.id) {
        queryClient.setQueryData(queryKeys.sales.detail(data.id), data);
        queryClient.setQueryData<any[]>(queryKeys.sales.recent(branchId), (old) => {
          if (!old) return old;
          return [data, ...old];
        });
        queryClient.setQueryData<any[]>(queryKeys.sales.today(branchId), (old) => {
          if (!old) return old;
          return [data, ...old];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', branchId] });
    },
  });
}
