import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { inventoryService } from '../../services/inventory';
import { useAuthStore } from '../../stores/authStore';

export function useAddProduct() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (product: any) => inventoryService.create(product, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      inventoryService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (id: string) => inventoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
    },
    onError: (err) => {
      console.error('Failed to delete product:', err);
    },
  });
}
