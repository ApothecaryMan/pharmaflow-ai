import { useQuery } from '@tanstack/react-query';
import { salesService } from '../../services/sales';
import type { Sale } from '../../types';

export function useRecentSales(branchId: string, limit = 100) {
  return useQuery({
    queryKey: ['sales', 'recent', branchId, limit],
    queryFn: () => salesService.getRecent(branchId, limit) as Promise<Sale[]>,
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTodaySales(branchId: string) {
  return useQuery({
    queryKey: ['sales', 'today', branchId],
    queryFn: () => salesService.getToday(branchId) as Promise<Sale[]>,
    enabled: !!branchId,
    staleTime: 30 * 1000,
  });
}

export function useSale(saleId: string) {
  return useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => salesService.getById(saleId) as Promise<Sale | null>,
    enabled: !!saleId,
  });
}
