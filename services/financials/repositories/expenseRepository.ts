import { supabase } from '../../../lib/supabase';
import type { Expense, ExpenseCategory, ExpenseSummary } from '../../../types';

const EXPENSE_LIST_COLUMNS =
  'id, org_id, branch_id, amount, category, description, payment_method, recorded_at, approved, employee_id';

const EXPENSE_FULL_COLUMNS = `${EXPENSE_LIST_COLUMNS}, shift_id, approved_by, created_at`;

export const expenseRepository = {
  mapFromDb(db: any): Expense {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      employeeId: db.employee_id,
      shiftId: db.shift_id || undefined,
      amount: Number(db.amount),
      category: db.category as ExpenseCategory,
      description: db.description,
      paymentMethod: db.payment_method,
      approved: db.approved,
      approvedBy: db.approved_by || undefined,
      recordedAt: db.recorded_at,
      createdAt: db.created_at,
    };
  },

  mapToDb(e: Partial<Expense>): Record<string, any> {
    const db: Record<string, any> = {};
    if (e.id !== undefined) db.id = e.id;
    if (e.orgId !== undefined) db.org_id = e.orgId;
    if (e.branchId !== undefined) db.branch_id = e.branchId;
    if (e.employeeId !== undefined) db.employee_id = e.employeeId;
    if (e.shiftId !== undefined) db.shift_id = e.shiftId;
    if (e.amount !== undefined) db.amount = e.amount;
    if (e.category !== undefined) db.category = e.category;
    if (e.description !== undefined) db.description = e.description;
    if (e.paymentMethod !== undefined) db.payment_method = e.paymentMethod;
    if (e.approved !== undefined) db.approved = e.approved;
    if (e.approvedBy !== undefined) db.approved_by = e.approvedBy;
    if (e.recordedAt !== undefined) db.recorded_at = e.recordedAt;
    if (e.createdAt !== undefined) db.created_at = e.createdAt;
    return db;
  },

  async getAll(
    branchId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      category?: string;
      paymentMethod?: string;
    }
  ): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select(EXPENSE_LIST_COLUMNS)
      .eq('branch_id', branchId)
      .order('recorded_at', { ascending: false });

    if (filters) {
      if (filters.dateFrom) {
        query = query.gte('recorded_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('recorded_at', filters.dateTo);
      }
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((d) => this.mapFromDb(d));
  },

  async getById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase.from('expenses').select(EXPENSE_FULL_COLUMNS).eq('id', id).maybeSingle();

    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async insert(
    expense: Omit<Expense, 'id' | 'createdAt' | 'recordedAt' | 'approved'>
  ): Promise<Expense> {
    const payload = {
      orgId: expense.orgId,
      branchId: expense.branchId,
      employeeId: expense.employeeId,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      paymentMethod: expense.paymentMethod,
    };

    const { data, error } = await supabase.rpc('record_expense', {
      p_payload: payload,
    });

    if (error) throw error;
    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to record expense via RPC');
    }

    const newExpense = data.expense
      ? this.mapFromDb(data.expense)
      : await this.getById(data.expenseId);
    if (!newExpense) {
      throw new Error('Expense recorded but could not be retrieved');
    }
    return newExpense;
  },

  async delete(id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('delete_expense', { p_expense_id: id });
    if (error) throw error;
    if (data && !data.success) throw new Error(data.error || 'Failed to delete expense');
    return true;
  },

  async getSummary(branchId: string, dateFrom?: string, dateTo?: string): Promise<ExpenseSummary> {
    let query = supabase.from('expenses').select(EXPENSE_LIST_COLUMNS).eq('branch_id', branchId);

    if (dateFrom) query = query.gte('recorded_at', dateFrom);
    if (dateTo) query = query.lte('recorded_at', dateTo);

    const { data, error } = await query;
    if (error) throw error;

    const expenses = data || [];
    const summary: ExpenseSummary = {
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
      count: expenses.length,
      cashTotal: 0,
      nonCashTotal: 0,
    };

    for (const d of expenses) {
      const amt = Number(d.amount);
      summary.total += amt;

      const cat = d.category as ExpenseCategory;
      if (summary.byCategory[cat] !== undefined) {
        summary.byCategory[cat] += amt;
      } else {
        summary.byCategory[cat] = amt;
      }

      if (d.payment_method === 'cash') {
        summary.cashTotal += amt;
      } else {
        summary.nonCashTotal += amt;
      }
    }

    return summary;
  },
};
