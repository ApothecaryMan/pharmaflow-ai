import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { expenseService } from '../../services/financials/expenseService';
import { expenseRepository } from '../../services/financials/repositories/expenseRepository';
import { useAuthStore } from '../../stores/authStore';

import type { Expense, ExpenseCategory, ExpensePaymentMethod, ExpenseSummary } from '../../types';

export type ExpenseFilterType = 'today' | 'week' | 'month' | 'custom';

export const useExpenses = () => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const currentEmployee = useAuthStore((s) => s.currentEmployee);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
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
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch expenses and summary
  const fetchExpensesData = useCallback(async () => {
    if (!activeBranchId) return;
    setIsLoading(true);
    setError(null);
    try {
      const filters = {
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        category: categoryFilter,
        paymentMethod: paymentMethodFilter,
      };

      const [list, sum] = await Promise.all([
        expenseService.getExpenses(filters, activeBranchId),
        expenseService.getExpenseSummary(
          { from: dateRange.from, to: dateRange.to },
          activeBranchId
        ),
      ]);

      setExpenses(list);
      setSummary(sum);
    } catch (err: any) {
      console.error('[useExpenses] Fetch failed:', err);
      setError(err?.message || 'Failed to load expenses data');
    } finally {
      setIsLoading(false);
    }
  }, [activeBranchId, dateRange, categoryFilter, paymentMethodFilter]);

  // Record an expense
  const recordExpense = useCallback(
    async (payload: {
      amount: number;
      category: ExpenseCategory;
      description: string;
      paymentMethod: ExpensePaymentMethod;
    }) => {
      if (!activeBranchId || !activeOrgId || !currentEmployee) {
        throw new Error('User context not fully loaded. Try again.');
      }

      try {
        const newExpense = await expenseService.recordExpense({
          orgId: activeOrgId,
          branchId: activeBranchId,
          employeeId: currentEmployee.id,
          amount: payload.amount,
          category: payload.category,
          description: payload.description,
          paymentMethod: payload.paymentMethod,
        });

        // Optimistically update local lists (will be re-synced via realtime)
        setExpenses((prev) => [newExpense, ...prev]);

        // Force refresh summary calculations
        const sum = await expenseService.getExpenseSummary(
          { from: dateRange.from, to: dateRange.to },
          activeBranchId
        );
        setSummary(sum);

        return newExpense;
      } catch (err: any) {
        console.error('[useExpenses] recordExpense failed:', err);
        throw err;
      }
    },
    [activeBranchId, activeOrgId, currentEmployee, dateRange]
  );

  // Delete an expense (only if allowed)
  const deleteExpense = useCallback(
    async (id: string) => {
      try {
        await expenseService.deleteExpense(id);
        setExpenses((prev) => prev.filter((e) => e.id !== id));

        // Refresh summary
        if (activeBranchId) {
          const sum = await expenseService.getExpenseSummary(
            { from: dateRange.from, to: dateRange.to },
            activeBranchId
          );
          setSummary(sum);
        }
      } catch (err: any) {
        console.error('[useExpenses] deleteExpense failed:', err);
        throw err;
      }
    },
    [activeBranchId, dateRange]
  );

  // Load and listen for changes
  useEffect(() => {
    if (!activeBranchId) return;

    fetchExpensesData();

    // Subscribe to realtime updates on expenses table
    const channel = supabase
      .channel(`expenses-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const row = expenseRepository.mapFromDb(payload.new);
            // Standard fallback mapping if not directly exposed on service level
            const newExp = row || {
              id: payload.new.id,
              orgId: payload.new.org_id,
              branchId: payload.new.branch_id,
              employeeId: payload.new.employee_id,
              shiftId: payload.new.shift_id || undefined,
              amount: Number(payload.new.amount),
              category: payload.new.category as ExpenseCategory,
              description: payload.new.description,
              paymentMethod: payload.new.payment_method,
              approved: payload.new.approved,
              approvedBy: payload.new.approved_by || undefined,
              recordedAt: payload.new.recorded_at,
              createdAt: payload.new.created_at,
            };

            setExpenses((prev) => {
              if (prev.some((e) => e.id === newExp.id)) return prev;
              const updated = [newExp, ...prev];
              return updated.sort(
                (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
              );
            });

            // Refresh summary
            expenseService
              .getExpenseSummary({ from: dateRange.from, to: dateRange.to }, activeBranchId)
              .then(setSummary);
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = {
              id: payload.new.id,
              orgId: payload.new.org_id,
              branchId: payload.new.branch_id,
              employeeId: payload.new.employee_id,
              shiftId: payload.new.shift_id || undefined,
              amount: Number(payload.new.amount),
              category: payload.new.category as ExpenseCategory,
              description: payload.new.description,
              paymentMethod: payload.new.payment_method,
              approved: payload.new.approved,
              approvedBy: payload.new.approved_by || undefined,
              recordedAt: payload.new.recorded_at,
              createdAt: payload.new.created_at,
            };

            setExpenses((prev) => prev.map((e) => (e.id === updatedRow.id ? updatedRow : e)));

            // Refresh summary
            expenseService
              .getExpenseSummary({ from: dateRange.from, to: dateRange.to }, activeBranchId)
              .then(setSummary);
          } else if (payload.eventType === 'DELETE') {
            setExpenses((prev) => prev.filter((e) => e.id !== payload.old.id));

            // Refresh summary
            expenseService
              .getExpenseSummary({ from: dateRange.from, to: dateRange.to }, activeBranchId)
              .then(setSummary);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Sync database again
          fetchExpensesData();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBranchId, fetchExpensesData, dateRange.from, dateRange.to]);

  return {
    expenses,
    summary,
    isLoading,
    error,
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
    refreshExpenses: fetchExpensesData,
  };
};
