import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { queryKeys } from '../../lib/queryKeys';
import { expenseService } from '../../services/financials/expenseService';
import { useAuthStore } from '../../stores/authStore';
import { useExpensesList, useExpensesSummary } from '../queries/useExpensesQuery';

import type { CashTransaction, Expense, ExpenseCategory, ExpensePaymentMethod, Shift } from '../../types';

export type ExpenseFilterType = 'today' | 'week' | 'month' | 'custom';

export const useExpenses = () => {
  const queryClient = useQueryClient();
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const currentEmployee = useAuthStore((s) => s.currentEmployee);

  const [filterType, setFilterType] = useState<ExpenseFilterType>('today');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Compute date range based on filterType
  const dateRange = useMemo(() => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    switch (filterType) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'month':
        from.setDate(now.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateFrom) {
          from = new Date(customDateFrom);
          from.setHours(0, 0, 0, 0);
        } else {
          from.setDate(now.getDate() - 30);
          from.setHours(0, 0, 0, 0);
        }
        if (customDateTo) {
          to = new Date(customDateTo);
          to.setHours(23, 59, 59, 999);
        } else {
          to.setHours(23, 59, 59, 999);
        }
        break;
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }, [filterType, customDateFrom, customDateTo]);

  const filters = useMemo(
    () => ({
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      category: categoryFilter,
      paymentMethod: paymentMethodFilter,
    }),
    [dateRange, categoryFilter, paymentMethodFilter]
  );

  // React Query backed data
  const { data: expenses = [], isLoading: isListLoading } = useExpensesList(
    activeBranchId || '',
    filters
  );
  const { data: summary, isLoading: isSummaryLoading } = useExpensesSummary(activeBranchId || '', {
    from: dateRange.from,
    to: dateRange.to,
  });

  // Invalidate both list and summary queries
  const invalidateExpenses = useCallback(async () => {
    if (!activeBranchId) return;
    await queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'expenses' && query.queryKey.includes(activeBranchId),
    });
  }, [activeBranchId, queryClient]);

  // Record an expense
  const recordExpense = useCallback(
    async (payload: {
      amount: number;
      category: ExpenseCategory;
      description: string;
      paymentMethod: ExpensePaymentMethod;
      shiftId?: string;
    }) => {
      if (!activeBranchId || !activeOrgId || !currentEmployee) {
        throw new Error('User context not fully loaded. Try again.');
      }

      const newExpense = await expenseService.recordExpense({
        orgId: activeOrgId,
        branchId: activeBranchId,
        employeeId: currentEmployee.id,
        amount: payload.amount,
        category: payload.category,
        description: payload.description,
        paymentMethod: payload.paymentMethod,
        shiftId: payload.shiftId,
      });

      await invalidateExpenses();

      queryClient.setQueryData(queryKeys.shifts.all(activeBranchId), (old: Shift[]) => {
        if (!old) return old;
        return old.map((s) =>
          s.id === payload.shiftId
            ? { ...s, cashOut: s.cashOut + payload.amount }
            : s,
        );
      });
      if (payload.shiftId) {
        queryClient.setQueryData(
          queryKeys.cashTransactions.byShift(payload.shiftId, activeBranchId),
          (old: CashTransaction[]) => {
            if (!old) return old;
            return [
              ...old,
              {
                id: newExpense.id,
                branchId: activeBranchId,
                shiftId: payload.shiftId,
                time: new Date().toISOString(),
                type: 'expense' as const,
                amount: payload.amount,
                reason: payload.description,
                userId: currentEmployee.id,
              },
            ];
          }
        );
      }

      return newExpense;
    },
    [activeBranchId, activeOrgId, currentEmployee, invalidateExpenses, queryClient]
  );

  // Delete an expense (only if allowed)
  const deleteExpense = useCallback(
    async (id: string) => {
      await expenseService.deleteExpense(id);
      await invalidateExpenses();
    },
    [invalidateExpenses]
  );

  const isLoading = isListLoading || isSummaryLoading;

  return {
    expenses,
    summary: summary || {
      total: 0,
      byCategory: {
        utilities: 0,
        rent: 0,
        maintenance: 0,
        supplies: 0,
        petty_cash: 0,
        transportation: 0,
        salaries: 0,
        misc: 0,
      },
      count: 0,
      cashTotal: 0,
      nonCashTotal: 0,
    },
    isLoading,
    error: null,
    filterType,
    setFilterType,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    categoryFilter,
    setCategoryFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    recordExpense,
    deleteExpense,
    refreshExpenses: invalidateExpenses,
  };
};
