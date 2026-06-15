/**
 * Expense Service - Business logic layer for operational expenses & petty cash tracker.
 */

import type { Expense, ExpenseSummary } from '../../types';
import { settingsService } from '../settings/settingsService';
import { expenseRepository } from './repositories/expenseRepository';

export interface ExpenseServiceInterface {
  getExpenses(
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      category?: string;
      paymentMethod?: string;
    },
    branchId?: string
  ): Promise<Expense[]>;
  recordExpense(
    expense: Omit<Expense, 'id' | 'createdAt' | 'recordedAt' | 'approved'>
  ): Promise<Expense>;
  getExpenseSummary(
    dateRange?: { from?: string; to?: string },
    branchId?: string
  ): Promise<ExpenseSummary>;
  deleteExpense(id: string): Promise<boolean>;
}

export const expenseService: ExpenseServiceInterface = {
  getExpenses: async (filters?, branchId?): Promise<Expense[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    try {
      return await expenseRepository.getAll(effectiveBranchId, filters);
    } catch (error) {
      console.error('[ExpenseService] getExpenses failed:', error);
      return [];
    }
  },

  recordExpense: async (expense): Promise<Expense> => {
    if (!expense.amount || expense.amount <= 0) {
      throw new Error('Expense amount must be greater than 0');
    }
    if (!expense.description || expense.description.trim() === '') {
      throw new Error('Expense description is required');
    }
    if (!expense.category) {
      throw new Error('Expense category is required');
    }

    const settings = await settingsService.getAll();
    const payload = {
      ...expense,
      orgId: expense.orgId || settings.orgId,
      branchId: expense.branchId || settings.activeBranchId || settings.branchCode,
    };

    return await expenseRepository.insert(payload);
  },

  getExpenseSummary: async (dateRange?, branchId?): Promise<ExpenseSummary> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    try {
      return await expenseRepository.getSummary(effectiveBranchId, dateRange?.from, dateRange?.to);
    } catch (error) {
      console.error('[ExpenseService] getExpenseSummary failed:', error);
      return {
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
      };
    }
  },

  deleteExpense: async (id: string): Promise<boolean> => {
    try {
      const expense = await expenseRepository.getById(id);
      if (!expense) throw new Error('Expense not found');

      // Additional safety checks can be placed here if needed (e.g. check approval status)
      return await expenseRepository.delete(id);
    } catch (error) {
      console.error('[ExpenseService] deleteExpense failed:', error);
      throw error;
    }
  },
};
