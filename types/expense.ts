/**
 * @fileoverview Expense and Petty Cash Type Definitions
 */

export type ExpenseCategory =
  | 'utilities'
  | 'rent'
  | 'maintenance'
  | 'supplies'
  | 'petty_cash'
  | 'transportation'
  | 'salaries'
  | 'misc';

export type ExpensePaymentMethod = 'cash' | 'bank_transfer' | 'card';

export interface Expense {
  id: string;
  orgId: string;
  branchId: string;
  employeeId: string;
  shiftId?: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  paymentMethod: ExpensePaymentMethod;
  approved: boolean;
  approvedBy?: string;
  recordedAt: string;
  createdAt: string;
}

export interface ExpenseSummary {
  total: number;
  byCategory: Record<ExpenseCategory, number>;
  count: number;
  cashTotal: number;
  nonCashTotal: number;
}
