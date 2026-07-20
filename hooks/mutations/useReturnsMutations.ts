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
      const returnItems = variables.returnData.items;

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

      queryClient.setQueryData<Sale | undefined>(queryKeys.sales.detail(saleId), (old) => {
        if (!old) return old;
        return { ...old, ...saleUpdates };
      });

      if (variables.context.shiftId) {
        queryClient.setQueryData<any[]>(queryKeys.shifts.all(branchId), (old) => {
          if (!old) return old;
          return old.map((s) => {
            if (s.id !== variables.context.shiftId) return s;
            const updatedShift = { ...s };
            if (variables.sale.paymentMethod === 'cash') {
              updatedShift.returns = (s.returns || 0) + refundAmount;
            } else {
              updatedShift.cardReturns = (s.cardReturns || 0) + refundAmount;
            }
            return updatedShift;
          });
        });

        queryClient.setQueryData<any[]>(queryKeys.cashTransactions.byShift(variables.context.shiftId, branchId), (old) => {
          if (!old) return old;
          return [...old, {
            id: `optimistic-${Date.now()}`,
            branchId,
            shiftId: variables.context.shiftId,
            time: new Date().toISOString(),
            type: variables.sale.paymentMethod === 'cash' ? 'return' as const : 'card_return' as const,
            amount: -refundAmount,
            userId: variables.context.performerId,
            relatedSaleId: saleId,
            reason: variables.sale?.serialId ? `Return for Sale ${variables.sale.serialId}` : 'Return',
          }];
        });
      }

      queryClient.setQueryData<any[]>(queryKeys.inventory.all(branchId), (old) => {
        if (!old) return old;
        const newInv = [...old];
        returnItems.forEach((item) => {
          const index = newInv.findIndex((d) => d.id === item.drugId);
          if (index !== -1) {
            const drug = newInv[index];
            const qtyInUnits = item.isUnit ? item.quantityReturned : item.quantityReturned * (item.unitsPerPack || 1);
            newInv[index] = { ...drug, stock: drug.stock + qtyInUnits };
          }
        });
        return newInv;
      });

      queryClient.setQueryData<any[]>(queryKeys.batches.all(branchId), (old) => {
        if (!old) return old;
        const newBatches = [...old];
        returnItems.forEach((item) => {
          if (item.batchAllocations) {
            item.batchAllocations.forEach((alloc) => {
              const bIndex = newBatches.findIndex((b) => b.id === alloc.batchId);
              if (bIndex !== -1) {
                newBatches[bIndex] = { ...newBatches[bIndex], quantity: newBatches[bIndex].quantity + alloc.quantity };
              }
            });
          }
        });
        return newBatches;
      });

      queryClient.setQueryData<any>(queryKeys.returns.sales(branchId), (old) => {
        if (!old) return old;
        const newReturn = {
          id: data.returnId,
          branchId,
          saleId,
          date: new Date().toISOString(),
          returnType: variables.returnData.returnType,
          items: returnItems,
          totalRefund: refundAmount,
          reason: variables.returnData.reason,
          notes: variables.returnData.notes,
          processedBy: variables.context.performerId,
        };
        if (Array.isArray(old)) {
          return [newReturn, ...old];
        }
        if (old.rows) {
          return { ...old, rows: [newReturn, ...old.rows] };
        }
        return old;
      });

      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', branchId] });
    },
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({ ret, context }: { ret: any; context: ActionContext }) =>
      transactionService.processPurchaseReturnTransaction(ret, context),
    onSuccess: (_data, variables) => {
      const returnItems = variables.ret.items;
      const returnData = _data.data;

      queryClient.setQueryData<any[]>(queryKeys.inventory.all(branchId), (old) => {
        if (!old) return old;
        const newInv = [...old];
        returnItems.forEach((item) => {
          const index = newInv.findIndex((d) => d.id === item.drugId);
          if (index !== -1) {
            const drug = newInv[index];
            const qtyInUnits = item.isUnit ? item.quantityReturned : item.quantityReturned * (item.unitsPerPack || 1);
            newInv[index] = { ...drug, stock: drug.stock + qtyInUnits };
          }
        });
        return newInv;
      });

      queryClient.setQueryData<any[]>(queryKeys.batches.all(branchId), (old) => {
        if (!old) return old;
        let newBatches = [...old];
        returnItems.forEach((item) => {
          const drugId = item.drugId;
          const qtyInUnits = item.isUnit ? item.quantityReturned : item.quantityReturned * (item.unitsPerPack || 1);
          if (qtyInUnits <= 0) return;

          const batchEntries = newBatches
            .map((b, i) => ({ batch: b, index: i }))
            .filter(({ batch }) => batch.drugId === drugId)
            .sort((a, b) => new Date(b.batch.expiryDate).getTime() - new Date(a.batch.expiryDate).getTime());

          if (batchEntries.length > 0) {
            const { index } = batchEntries[0];
            newBatches[index] = { ...newBatches[index], quantity: newBatches[index].quantity + qtyInUnits };
          }
        });
        return newBatches;
      });

      queryClient.setQueryData<any>(queryKeys.returns.purchases(branchId), (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return [returnData, ...old];
        }
        if (old.rows) {
          return { ...old, rows: [returnData, ...old.rows] };
        }
        return old;
      });

      if (variables.context.shiftId) {
        queryClient.setQueryData<any[]>(queryKeys.shifts.all(branchId), (old) => {
          if (!old) return old;
          return old.map((s) => {
            if (s.id !== variables.context.shiftId) return s;
            return {
              ...s,
              returns: (s.returns || 0) + returnData.totalRefund,
            };
          });
        });

        queryClient.setQueryData<any[]>(queryKeys.cashTransactions.byShift(variables.context.shiftId, branchId), (old) => {
          if (!old) return old;
          return [...old, {
            id: `optimistic-${Date.now()}`,
            branchId,
            shiftId: variables.context.shiftId,
            time: new Date().toISOString(),
            type: 'purchase_return' as const,
            amount: -returnData.totalRefund,
            userId: variables.context.performerId,
            reason: `Purchase Return: ${variables.ret.purchaseId || 'Unknown'}`,
          }];
        });
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', branchId] });
    },
  });
}
