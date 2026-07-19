import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { purchaseService } from '../../services/purchases';
import type { Purchase } from '../../types';

export function usePurchases(branchId: string, limit = 100, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.purchases.all(branchId, limit),
    queryFn: () => purchaseService.getRecent(branchId, limit) as Promise<Purchase[]>,
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePurchase(purchaseId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.purchases.detail(purchaseId),
    queryFn: () => purchaseService.getById(purchaseId) as Promise<Purchase | null>,
    enabled: !!purchaseId && (options?.enabled ?? true),
  });
}
