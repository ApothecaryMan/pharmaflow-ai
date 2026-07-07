import { useQuery } from '@tanstack/react-query';
import { returnService } from '../../services/returns';
import type { Return, PurchaseReturn } from '../../types';

export function useSalesReturns(branchId: string, limit = 100) {
  return useQuery({
    queryKey: ['returns', 'sales', branchId, limit],
    queryFn: () => returnService.getRecentSalesReturns(branchId, limit) as Promise<Return[]>,
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePurchaseReturns(branchId: string, limit = 100) {
  return useQuery({
    queryKey: ['returns', 'purchases', branchId, limit],
    queryFn: () => returnService.getRecentPurchaseReturns(branchId, limit) as Promise<PurchaseReturn[]>,
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}
