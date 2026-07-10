import { useQuery } from '@tanstack/react-query';
import { customerService } from '../../services/customers';
import type { Customer } from '../../types';
import { queryKeys } from '../../lib/queryKeys';

export function useCustomers(branchId: string) {
  return useQuery({
    queryKey: queryKeys.customers.all(branchId),
    queryFn: () => customerService.getAll(branchId) as Promise<Customer[]>,
    enabled: !!branchId,
    staleTime: 10 * 60 * 1000,
  });
}
