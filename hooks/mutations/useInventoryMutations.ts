import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { inventoryService } from '../../services/inventory';
import { useAuthStore } from '../../stores/authStore';

export function useAddProduct() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (product: any) => inventoryService.create(product, branchId),
    onSuccess: (data) => {
      queryClient.setQueryData<any[]>(queryKeys.inventory.all(branchId), (old) => {
        if (!old) return old;
        return [...old, data];
      });
      queryClient.setQueryData<any[]>(queryKeys.batches.all(branchId), (old) => {
        if (!old) return old;
        return [...old, {
          drugId: data.id,
          quantity: data.stock,
          expiryDate: data.expiryDate,
          costPrice: data.costPrice,
          batchNumber: 'INITIAL',
          dateReceived: new Date().toISOString(),
          branchId,
          orgId: data.orgId,
          version: 1,
        }];
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      inventoryService.update(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData<any[]>(queryKeys.inventory.all(branchId), (old) => {
        if (!old) return old;
        return old.map((d) => (d.id === data.id ? data : d));
      });
      queryClient.setQueryData<any[]>(queryKeys.batches.all(branchId), (old) => {
        if (!old) return old;
        return old.map((b) =>
          b.drugId === data.id
            ? { ...b, quantity: data.stock, expiryDate: data.expiryDate, costPrice: data.costPrice }
            : b
        );
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (id: string) => inventoryService.delete(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<any[]>(queryKeys.inventory.all(branchId), (old) => {
        if (!old) return old;
        return old.filter((d) => d.id !== id);
      });
      queryClient.setQueryData<any[]>(queryKeys.batches.all(branchId), (old) => {
        if (!old) return old;
        return old.filter((b) => b.drugId !== id);
      });
      queryClient.removeQueries({ queryKey: queryKeys.inventory.detail(id), exact: true });
    },
    onError: (err) => {
      console.error('Failed to delete product:', err);
    },
  });
}
