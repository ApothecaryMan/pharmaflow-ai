import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { employeeService } from '../../services/hr';
import { useAuthStore } from '../../stores/authStore';

export function useAddEmployee() {
  const queryClient = useQueryClient();
  const { activeBranchId, activeOrgId } = useAuthStore();

  return useMutation({
    mutationFn: (employee: any) => employeeService.create(employee, activeBranchId, activeOrgId),
    onSuccess: (data) => {
      queryClient.setQueryData<any[]>(queryKeys.employees.all(activeBranchId), (old) => {
        if (!old) return old;
        return [data, ...old];
      });
      queryClient.setQueryData<any[]>(queryKeys.employees.allByOrg(activeOrgId), (old) => {
        if (!old) return old;
        return [data, ...old];
      });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);
  const orgId = useAuthStore((s) => s.activeOrgId);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      employeeService.update(id, updates),
    onSuccess: (data, { id, updates }) => {
      queryClient.setQueryData<any[]>(queryKeys.employees.all(branchId), (old) => {
        if (!old) return old;
        return old.map(emp => emp.id === id ? { ...emp, ...data } : emp);
      });
      queryClient.setQueryData<any[]>(queryKeys.employees.allByOrg(orgId), (old) => {
        if (!old) return old;
        return old.map(emp => emp.id === id ? { ...emp, ...data } : emp);
      });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);
  const orgId = useAuthStore((s) => s.activeOrgId);

  return useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData<any[]>(queryKeys.employees.all(branchId), (old) => {
        if (!old) return old;
        return old.filter(emp => emp.id !== id);
      });
      queryClient.setQueryData<any[]>(queryKeys.employees.allByOrg(orgId), (old) => {
        if (!old) return old;
        return old.filter(emp => emp.id !== id);
      });
    },
  });
}
