import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { purchaseService } from '../../services/purchases';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import type { ActionContext, Purchase } from '../../types';

export function useAddPurchase() {
  const queryClient = useQueryClient();
  const { activeBranchId, activeOrgId } = useAuthStore();

  return useMutation({
    mutationFn: async ({ purchase, context }: { purchase: any; context?: ActionContext }) => {
      if (purchase.status === 'completed' && context) {
        const result = await transactionService.processDirectPurchaseTransaction(purchase, context);
        if (!result.success || !result.data) throw new Error(result.error || 'Purchase failed');
        return result.data;
      }
      return purchaseService.create({
        ...purchase,
        branchId: activeBranchId,
        orgId: activeOrgId,
      });
    },
    onSuccess: (data, vars) => {
      if (vars.purchase.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
    },
  });
}

export function useApprovePurchase() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: async ({ id, context }: { id: string; context: ActionContext }) => {
      const result = await transactionService.processPurchaseTransaction(id, context);
      if (!result.success) throw new Error(result.error || 'Approval failed');
      const fullPurchase = await purchaseService.getById(id);
      return { ...result.data, items: fullPurchase?.items || [] };
    },
    onSuccess: (data, vars) => {
      const purchaseId = data?.id || vars.id;
      const items = data?.items || [];

      if (items.length > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
      }

      queryClient.setQueryData<Purchase>(queryKeys.purchases.detail(purchaseId), (old) => {
        if (!old) return old;
        return { ...data, items: old.items };
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
    },
  });
}

export function useMarkPurchaseReceived() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({
      id,
      receiverId,
      receiverName,
      shiftId,
    }: {
      id: string;
      receiverId: string;
      receiverName: string;
      shiftId?: string;
    }) => purchaseService.markAsReceived(id, receiverId, receiverName, shiftId),
    onSuccess: (data, vars) => {
      const purchaseId = data?.id || vars.id;

      if (data?.items?.length > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
      }

      queryClient.setQueryData<Purchase>(queryKeys.purchases.detail(purchaseId), (old) => {
        if (!old) return old;
        return { ...old, ...data };
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
    },
  });
}

export function useRejectPurchase() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (id: string) => purchaseService.reject(id, 'Rejected by manager'),
    onSuccess: (data, id) => {
      queryClient.setQueryData<Purchase>(queryKeys.purchases.detail(id), (old) => {
        if (!old) return old;
        return { ...data, items: old.items };
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
    },
  });
}
