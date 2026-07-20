import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { expenseService } from '../../services/financials/expenseService';
import type { Expense, ExpenseSummary } from '../../types';

export function useExpensesList(
  branchId: string,
  filters: { dateFrom: string; dateTo: string; category: string; paymentMethod: string }
) {
  return useQuery({
    queryKey: queryKeys.expenses.list(branchId, filters),
    queryFn: () => expenseService.getExpenses(filters, branchId) as Promise<Expense[]>,
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
}

export function useExpensesSummary(
  branchId: string,
  dateRange: { from: string; to: string }
) {
  return useQuery({
    queryKey: queryKeys.expenses.summary(branchId, dateRange),
    queryFn: () => expenseService.getExpenseSummary(dateRange, branchId) as Promise<ExpenseSummary>,
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
}
