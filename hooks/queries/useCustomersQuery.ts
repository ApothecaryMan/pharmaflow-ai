import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../lib/queryKeys';
import { customerService } from '../../services/customers';
import type { Customer } from '../../types';


export function useRawCustomers(branchId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.customers.all(branchId),
    queryFn: () => customerService.getAll(branchId) as Promise<Customer[]>,
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCustomers(branchId: string, options?: { enabled?: boolean }) {
  return useRawCustomers(branchId, { enabled: options?.enabled });
}
