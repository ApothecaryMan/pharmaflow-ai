import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { employeeService } from '../../services/hr';
import { useAuthStore } from '../../stores/authStore';

export function useAddEmployee() {
  const queryClient = useQueryClient();
  const { activeBranchId, activeOrgId } = useAuthStore();

  return useMutation({
    mutationFn: (employee: any) => employeeService.create(employee, activeBranchId, activeOrgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.employees });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      employeeService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.employees });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);

  return useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.employees });
    },
  });
}
