import { supabase } from '../../../lib/supabase';
import type { CashTransaction, Shift } from '../../../types';

export const cashRepository = {
  // --- Shifts ---
  mapShiftFromDb(db: any): Shift {
    return {
      id: db.id,
      branchId: db.branch_id,
      orgId: db.org_id,
      branchName: db.branch_name,
      status: db.status,
      openTime: db.open_time,
      closeTime: db.close_time,
      openedBy: db.opened_by,
      closedBy: db.closed_by,
      openingBalance: Number(db.opening_balance),
      closingBalance: db.closing_balance ? Number(db.closing_balance) : undefined,
      expectedBalance: db.expected_balance ? Number(db.expected_balance) : undefined,
      cashIn: Number(db.cash_in || 0),
      cashOut: Number(db.cash_out || 0),
      cashSales: Number(db.cash_sales || 0),
      cardSales: Number(db.card_sales || 0),
      returns: Number(db.returns || 0),
      notes: db.notes,
      transactions: [],
    };
  },

  mapShiftToDb(s: Partial<Shift>): any {
    const db: any = {};
    if (s.id !== undefined) db.id = s.id;
    if (s.branchId !== undefined) db.branch_id = s.branchId;
    if (s.orgId !== undefined) db.org_id = s.orgId;
    if (s.branchName !== undefined) db.branch_name = s.branchName;
    if (s.status !== undefined) db.status = s.status;
    if (s.openTime !== undefined) db.open_time = s.openTime;
    if (s.closeTime !== undefined) db.close_time = s.closeTime;
    if (s.openedBy !== undefined) db.opened_by = s.openedBy;
    if (s.closedBy !== undefined) db.closed_by = s.closedBy;
    if (s.openingBalance !== undefined) db.opening_balance = s.openingBalance;
    if (s.closingBalance !== undefined) db.closing_balance = s.closingBalance;
    if (s.expectedBalance !== undefined) db.expected_balance = s.expectedBalance;
    if (s.cashIn !== undefined) db.cash_in = s.cashIn;
    if (s.cashOut !== undefined) db.cash_out = s.cashOut;
    if (s.cashSales !== undefined) db.cash_sales = s.cashSales;
    if (s.cardSales !== undefined) db.card_sales = s.cardSales;
    if (s.returns !== undefined) db.returns = s.returns;
    if (s.notes !== undefined) db.notes = s.notes;
    return db;
  },

  async getCurrentShift(branchId: string): Promise<Shift | null> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('branch_id', branchId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapShiftFromDb(data) : null;
  },

  async getAllShifts(branchId: string): Promise<Shift[]> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('branch_id', branchId)
      .order('open_time', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => this.mapShiftFromDb(d));
  },

  async getShiftById(id: string): Promise<Shift | null> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapShiftFromDb(data) : null;
  },

  async insertShift(shift: Shift): Promise<void> {
    const { error } = await supabase.from('shifts').insert(this.mapShiftToDb(shift));
    if (error) throw error;
  },

  async updateShift(id: string, updates: Partial<Shift>): Promise<void> {
    const { error } = await supabase.from('shifts').update(this.mapShiftToDb(updates)).eq('id', id);
    if (error) throw error;
  },

  // --- Transactions ---
  mapTransactionFromDb(db: any): CashTransaction {
    return {
      id: db.id,
      branchId: db.branch_id,
      orgId: db.org_id,
      shiftId: db.shift_id,
      time: db.time,
      type: db.type,
      amount: Number(db.amount),
      reason: db.reason,
      userId: db.user_id,
      relatedSaleId: db.related_sale_id,
    };
  },

  mapTransactionToDb(t: Partial<CashTransaction>): any {
    const db: any = {};
    if (t.id !== undefined) db.id = t.id;
    if (t.branchId !== undefined) db.branch_id = t.branchId;
    if (t.orgId !== undefined) db.org_id = t.orgId;
    if (t.shiftId !== undefined) db.shift_id = t.shiftId;
    if (t.time !== undefined) db.time = t.time;
    if (t.type !== undefined) db.type = t.type;
    if (t.amount !== undefined) db.amount = t.amount;
    if (t.reason !== undefined) db.reason = t.reason;
    if (t.userId !== undefined) db.user_id = t.userId;
    if (t.relatedSaleId !== undefined) db.related_sale_id = t.relatedSaleId;
    return db;
  },

  async getTransactions(shiftId: string): Promise<CashTransaction[]> {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('shift_id', shiftId)
      .order('time', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => this.mapTransactionFromDb(d));
  },

  async getAllTransactions(branchId: string): Promise<CashTransaction[]> {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('branch_id', branchId)
      .order('time', { ascending: false });

    if (error) throw error;
    return (data || []).map(d => this.mapTransactionFromDb(d));
  },

  async insertTransaction(transaction: CashTransaction): Promise<void> {
    const { error } = await supabase.from('cash_transactions').insert(this.mapTransactionToDb(transaction));
    if (error) throw error;
  },

  async deleteTransaction(transactionId: string): Promise<boolean> {
    const { error } = await supabase.from('cash_transactions').delete().eq('id', transactionId);
    if (error) throw error;
    return true;
  },

  async incrementShiftTotals(shiftId: string, amounts: { cashIn: number; cashOut: number; cashSales: number; cardSales: number; returns: number }): Promise<void> {
    const { error } = await supabase.rpc('atomic_increment_shift', {
      p_shift_id: shiftId,
      p_cash_in: amounts.cashIn,
      p_cash_out: amounts.cashOut,
      p_cash_sales: amounts.cashSales,
      p_card_sales: amounts.cardSales,
      p_returns: amounts.returns,
    });
    if (error) throw error;
  }
};
