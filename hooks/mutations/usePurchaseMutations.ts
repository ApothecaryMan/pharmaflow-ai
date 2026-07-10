import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseService } from '../../services/purchases';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import type { ActionContext } from '../../types';
import { queryKeys } from '../../lib/queryKeys';

export function useAddPurchase() {
  const queryClient = useQueryClient();
  const { activeBranchId, activeOrgId } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      purchase,
      context,
    }: {
      purchase: any;
      context?: ActionContext;
    }) => {
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
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
      if (vars.purchase.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
      }
    },
  });
}

export function useApprovePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, context }: { id: string; context: ActionContext }) => {
      const result = await transactionService.processPurchaseTransaction(id, context);
      if (!result.success) throw new Error(result.error || 'Approval failed');
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
    },
  });
}

export function useMarkPurchaseReceived() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
    },
  });
}

export function useRejectPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseService.reject(id, 'Rejected by manager'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
    },
  });
}
