import { useQuery } from '@tanstack/react-query';
import { STALE_TIMES } from '../../lib/queryClient';
import { queryKeys } from '../../lib/queryKeys';
import { salesService } from '../../services/sales';
import type { Sale } from '../../types';

export function useRecentSales(branchId: string, limit = 100, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.sales.recent(branchId, limit),
    queryFn: () => salesService.getRecent(branchId, limit) as Promise<Sale[]>,
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTodaySales(branchId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.sales.today(branchId),
    queryFn: () => salesService.getToday(branchId) as Promise<Sale[]>,
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: STALE_TIMES.todaySales,
  });
}

export function useSale(saleId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.sales.detail(saleId),
    queryFn: () => salesService.getById(saleId) as Promise<Sale | null>,
    enabled: !!saleId && (options?.enabled ?? true),
  });
}

export function useSalesPage(
  branchId: string,
  page: number,
  pageSize: number,
  filters: any,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['sales', 'page', branchId, page, pageSize, filters],
    queryFn: () =>
      salesService.listPage({
        branchId,
        page,
        pageSize,
        filters,
        sort: { column: 'date', ascending: false },
      }),
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: 60 * 1000, // 1 minute
  });
}
