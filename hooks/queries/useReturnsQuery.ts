import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { returnService } from '../../services/returns';
import type { PurchaseReturn, Return } from '../../types';

export function useSalesReturns(branchId: string, limit = 100) {
  return useQuery({
    queryKey: queryKeys.returns.sales(branchId, limit),
    queryFn: () => returnService.getRecentSalesReturns(branchId, limit) as Promise<Return[]>,
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePurchaseReturns(branchId: string, limit = 100) {
  return useQuery({
    queryKey: queryKeys.returns.purchases(branchId, limit),
    queryFn: () =>
      returnService.getRecentPurchaseReturns(branchId, limit) as Promise<PurchaseReturn[]>,
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}
