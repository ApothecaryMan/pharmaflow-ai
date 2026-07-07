import { useQuery } from '@tanstack/react-query';
import { customerService } from '../../services/customers';
import type { Customer } from '../../types';

export function useCustomers(branchId: string) {
  return useQuery({
    queryKey: ['customers', branchId],
    queryFn: () => customerService.getAll(branchId) as Promise<Customer[]>,
    enabled: !!branchId,
    staleTime: 10 * 60 * 1000,
  });
}
