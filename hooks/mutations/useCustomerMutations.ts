import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../../services/customers';
import { useAuthStore } from '../../stores/authStore';

export function useAddCustomer() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (customer: any) => customerService.create(customer, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', branchId] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      customerService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', branchId] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', branchId] });
    },
  });
}
