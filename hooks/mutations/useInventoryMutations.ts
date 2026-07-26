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
        const idx = old.findIndex((d) => d.id === data.id);
        if (idx > -1) {
          const copy = [...old];
          copy[idx] = data;
          return copy;
        }
        return [...old, data];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
      queryClient.removeQueries({ queryKey: queryKeys.inventory.detail(id), exact: true });
    },
    onError: (err) => {
      console.error('Failed to delete product:', err);
    },
  });
}
