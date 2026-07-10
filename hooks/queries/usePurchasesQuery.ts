import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '../../services/purchases';
import type { Purchase } from '../../types';
import { queryKeys } from '../../lib/queryKeys';

export function usePurchases(branchId: string, limit = 100) {
  return useQuery({
    queryKey: queryKeys.purchases.all(branchId, limit),
    queryFn: () => purchaseService.getRecent(branchId, limit) as Promise<Purchase[]>,
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePurchase(purchaseId: string) {
  return useQuery({
    queryKey: queryKeys.purchases.detail(purchaseId),
    queryFn: () => purchaseService.getById(purchaseId) as Promise<Purchase | null>,
    enabled: !!purchaseId,
  });
}
