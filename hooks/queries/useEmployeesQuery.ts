import { useQuery } from '@tanstack/react-query';
import { employeeService } from '../../services/hr';
import type { Employee } from '../../types';
import { queryKeys } from '../../lib/queryKeys';

export function useEmployees(branchId: string) {
  return useQuery({
    queryKey: queryKeys.employees.all(branchId),
    queryFn: () => employeeService.getAll(branchId) as Promise<Employee[]>,
    enabled: !!branchId,
    staleTime: 30 * 60 * 1000,
  });
}
