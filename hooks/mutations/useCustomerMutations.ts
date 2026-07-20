import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { customerService } from '../../services/customers';
import { useAuthStore } from '../../stores/authStore';

export function useAddCustomer() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (customer: any) => customerService.create(customer, branchId),
    onSuccess: (data) => {
      queryClient.setQueryData<any[]>(queryKeys.customers.all(branchId), (old) => {
        if (!old) return old;
        return [data, ...old];
      });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      customerService.update(id, updates),
    onSuccess: (data, { id, updates }) => {
      queryClient.setQueryData<any[]>(queryKeys.customers.all(branchId), (old) => {
        if (!old) return old;
        return old.map(c => c.id === id ? { ...c, ...data } : c);
      });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData<any[]>(queryKeys.customers.all(branchId), (old) => {
        if (!old) return old;
        return old.filter(c => c.id !== id);
      });
    },
  });
}
