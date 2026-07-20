import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { purchaseService } from '../../services/purchases';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/authStore';
import { idGenerator } from '../../utils/idGenerator';
import type { ActionContext, Drug, StockBatch, Purchase } from '../../types';

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
        queryClient.setQueryData<Drug[]>(queryKeys.inventory.all(activeBranchId), (old) => {
          if (!old) return old;
          const newInv = [...old];
          (data?.items || []).forEach((item) => {
            const idx = newInv.findIndex((d) => d.id === item.drugId);
            if (idx !== -1) {
              const qty = item.isUnit ? item.quantity : item.quantity * (item.unitsPerPack || 1);
              newInv[idx] = { ...newInv[idx], stock: newInv[idx].stock + qty };
            }
          });
          return newInv;
        });
        queryClient.setQueryData<StockBatch[]>(queryKeys.batches.all(activeBranchId), (old) => {
          if (!old) return old;
          const newBatches = [...old];
          (data?.items || []).forEach((item) => {
            newBatches.push({
              id: idGenerator.uuid(),
              branchId: activeBranchId,
              drugId: item.drugId,
              quantity: item.isUnit ? item.quantity : item.quantity * (item.unitsPerPack || 1),
              expiryDate: item.expiryDate,
              costPrice: item.costPrice,
              purchaseId: data.id,
              dateReceived: new Date().toISOString(),
              version: 1,
            });
          });
          return newBatches;
        });
      }
      queryClient.setQueryData<Purchase[]>(queryKeys.purchases.all(activeBranchId), (old) => {
        if (!old) return old;
        return [data, ...old];
      });
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
        queryClient.setQueryData<Drug[]>(queryKeys.inventory.all(branchId), (old) => {
          if (!old) return old;
          const newInv = [...old];
          items.forEach((item) => {
            const idx = newInv.findIndex((d) => d.id === item.drugId);
            if (idx !== -1) {
              const qty = item.isUnit ? item.quantity : item.quantity * (item.unitsPerPack || 1);
              newInv[idx] = { ...newInv[idx], stock: newInv[idx].stock + qty };
            }
          });
          return newInv;
        });
        queryClient.setQueryData<StockBatch[]>(queryKeys.batches.all(branchId), (old) => {
          if (!old) return old;
          const newBatches = [...old];
          items.forEach((item) => {
            newBatches.push({
              id: idGenerator.uuid(),
              branchId,
              drugId: item.drugId,
              quantity: item.isUnit ? item.quantity : item.quantity * (item.unitsPerPack || 1),
              expiryDate: item.expiryDate,
              costPrice: item.costPrice,
              purchaseId,
              dateReceived: new Date().toISOString(),
              version: 1,
            });
          });
          return newBatches;
        });
      }

      queryClient.setQueryData<Purchase>(queryKeys.purchases.detail(purchaseId), (old) => {
        if (!old) return old;
        return { ...data, items: old.items };
      });
      queryClient.setQueryData<Purchase[]>(queryKeys.purchases.all(branchId), (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === purchaseId ? { ...p, ...data } : p));
      });
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

      queryClient.setQueryData<Drug[]>(queryKeys.inventory.all(branchId), (old) => {
        if (!old) return old;
        const newInv = [...old];
        (data?.items || []).forEach((item) => {
          const idx = newInv.findIndex((d) => d.id === item.drugId);
          if (idx !== -1) {
            const qty = item.isUnit ? item.quantity : item.quantity * (item.unitsPerPack || 1);
            newInv[idx] = { ...newInv[idx], stock: newInv[idx].stock + qty };
          }
        });
        return newInv;
      });
      queryClient.setQueryData<StockBatch[]>(queryKeys.batches.all(branchId), (old) => {
        if (!old) return old;
        const newBatches = [...old];
        (data?.items || []).forEach((item) => {
          newBatches.push({
            id: crypto.randomUUID(),
            branchId,
            drugId: item.drugId,
            quantity: item.isUnit ? item.quantity : item.quantity * (item.unitsPerPack || 1),
            expiryDate: item.expiryDate,
            costPrice: item.costPrice,
            purchaseId,
            dateReceived: new Date().toISOString(),
            version: 1,
          });
        });
        return newBatches;
      });
      queryClient.setQueryData<Purchase>(queryKeys.purchases.detail(purchaseId), (old) => {
        if (!old) return old;
        return { ...old, ...data };
      });
      queryClient.setQueryData<Purchase[]>(queryKeys.purchases.all(branchId), (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === purchaseId ? { ...p, ...data } : p));
      });
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
      queryClient.setQueryData<Purchase[]>(queryKeys.purchases.all(branchId), (old) => {
        if (!old) return old;
        return old.map((p) => (p.id === id ? { ...p, ...data } : p));
      });
    },
  });
}
