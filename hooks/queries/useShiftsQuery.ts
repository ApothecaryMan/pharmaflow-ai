import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { cashService } from '../../services/cash/cashService';
import type { CashTransaction, Shift } from '../../types';

export function useShifts(branchId: string) {
  return useQuery({
    queryKey: queryKeys.shifts.all(branchId),
    queryFn: () => cashService.getAllShifts(branchId) as Promise<Shift[]>,
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShiftTransactions(shiftId: string | undefined, branchId: string) {
  return useQuery({
    queryKey: queryKeys.cashTransactions.byShift(shiftId!, branchId),
    queryFn: () => cashService.getTransactions(shiftId!) as Promise<CashTransaction[]>,
    enabled: !!shiftId && !!branchId,
    staleTime: 60 * 1000,
  });
}
