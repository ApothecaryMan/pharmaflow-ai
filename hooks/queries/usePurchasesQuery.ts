import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '../../services/purchases';
import type { Purchase } from '../../types';

export function usePurchases(branchId: string, limit = 100) {
  return useQuery({
    queryKey: ['purchases', branchId, limit],
    queryFn: () => purchaseService.getRecent(branchId, limit) as Promise<Purchase[]>,
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePurchase(purchaseId: string) {
  return useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => purchaseService.getById(purchaseId) as Promise<Purchase | null>,
    enabled: !!purchaseId,
  });
}
