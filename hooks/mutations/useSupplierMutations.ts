import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { supplierService } from '../../services/suppliers/supplierService';
import { useAuthStore } from '../../stores/authStore';

export function useAddSupplier() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (supplier: any) => supplierService.create(supplier, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all(branchId) });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (supplier: any) => supplierService.update(supplier.id, supplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all(branchId) });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (id: string) => supplierService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all(branchId) });
    },
  });
}
