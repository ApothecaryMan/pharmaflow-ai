import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { supplierService } from '../../services/suppliers/supplierService';
import { useAuthStore } from '../../stores/authStore';

export function useAddSupplier() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (supplier: any) => supplierService.create(supplier, branchId),
    onSuccess: (data) => {
      queryClient.setQueryData<any[]>(queryKeys.suppliers.all(branchId), (old) => {
        if (!old) return old;
        return [data, ...old];
      });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (supplier: any) => supplierService.update(supplier.id, supplier),
    onSuccess: (data, supplier) => {
      queryClient.setQueryData<any[]>(queryKeys.suppliers.all(branchId), (old) => {
        if (!old) return old;
        return old.map(s => s.id === supplier.id ? { ...s, ...data } : s);
      });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (id: string) => supplierService.delete(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData<any[]>(queryKeys.suppliers.all(branchId), (old) => {
        if (!old) return old;
        return old.filter(s => s.id !== id);
      });
    },
  });
}
