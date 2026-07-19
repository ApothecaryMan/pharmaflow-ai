import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { employeeService } from '../../services/hr';
import { orgService } from '../../services/org/orgService';
import type { Employee } from '../../types';

export function useEmployees(branchId: string) {
  return useQuery({
    queryKey: queryKeys.employees.all(branchId),
    queryFn: () => employeeService.getAll(branchId) as Promise<Employee[]>,
    enabled: !!branchId,
    staleTime: 30 * 60 * 1000,
  });
}

export function useAllEmployees(orgId?: string) {
  const effectiveOrgId = orgId ?? orgService.getActiveOrgId();
  return useQuery({
    queryKey: queryKeys.employees.allByOrg(effectiveOrgId ?? '__none__'),
    queryFn: () => employeeService.getAll('ALL', effectiveOrgId ?? undefined) as Promise<Employee[]>,
    enabled: !!effectiveOrgId,
    staleTime: 30 * 60 * 1000,
  });
}
