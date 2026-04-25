/**
 * Cash Service - Cash register and shift operations
 * Unified with Supabase - Online-only implementation.
 */

import { type CashTransaction, type Shift, CashTransactionType } from '../../types';
import { supabase } from '../../lib/supabase';
import { BaseDomainService } from '../core/BaseDomainService';
import { settingsService } from '../settings/settingsService';

// --- Internal Shifts Service ---
class ShiftsServiceImpl extends BaseDomainService<Shift> {
  protected tableName = 'shifts';

  protected mapDbToDomain(db: any): Shift {
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
      transactions: [], // Not loaded by default, use getTransactions
    };
  }

  protected mapDomainToDb(s: Partial<Shift>): any {
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
  }
}

// --- Internal Transactions Service ---
class CashTransactionsServiceImpl extends BaseDomainService<CashTransaction> {
  protected tableName = 'cash_transactions';

  protected mapDbToDomain(db: any): CashTransaction {
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
  }

  protected mapDomainToDb(t: Partial<CashTransaction>): any {
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
  }
}

const shiftsInternal = new ShiftsServiceImpl();
const transactionsInternal = new CashTransactionsServiceImpl();

/**
 * Cash Service Interface
 */
export interface CashServiceInterface {
  getCurrentShift(branchId?: string): Promise<Shift | null>;
  getAllShifts(branchId?: string): Promise<Shift[]>;
  openShift(openingBalance: number, openedBy: string, branchId?: string): Promise<Shift>;
  closeShift(shiftId: string, closingBalance: number, closedBy: string, notes?: string): Promise<Shift>;
  addTransaction(shiftId: string, transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction>;
  getTransactions(shiftId?: string): Promise<CashTransaction[]>;
}

export const cashService: CashServiceInterface = {
  getCurrentShift: async (branchId?: string): Promise<Shift | null> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('branch_id', effectiveBranchId)
      .eq('status', 'open')
      .maybeSingle();
      
    if (error) {
      console.error('[CashService] getCurrentShift failed:', error);
      return null;
    }
    
    return data ? (shiftsInternal as any).mapDbToDomain(data) : null;
  },

  getAllShifts: async (branchId?: string): Promise<Shift[]> => {
    return shiftsInternal.getAll(branchId);
  },

  openShift: async (openingBalance: number, openedBy: string, branchId?: string): Promise<Shift> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    const current = await cashService.getCurrentShift(effectiveBranchId);
    if (current) throw new Error('A shift is already open for this branch');

    return shiftsInternal.create({
      status: 'open',
      openTime: new Date().toISOString(),
      openedBy,
      openingBalance,
      cashIn: 0,
      cashOut: 0,
      cashSales: 0,
      cardSales: 0,
      returns: 0,
      branchId: effectiveBranchId,
      transactions: [],
    }, effectiveBranchId);
  },

  closeShift: async (shiftId: string, closingBalance: number, closedBy: string, notes?: string): Promise<Shift | any> => {
    const shift = await shiftsInternal.getById(shiftId);
    if (!shift) throw new Error('Shift not found');
    
    const expectedBalance = shift.openingBalance + shift.cashIn + shift.cashSales - shift.cashOut - shift.returns;
    
    return shiftsInternal.update(shiftId, {
      status: 'closed',
      closeTime: new Date().toISOString(),
      closedBy,
      closingBalance,
      expectedBalance,
      notes,
    });
  },

  addTransaction: async (shiftId: string, transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction> => {
    const newTx = await transactionsInternal.create({
      ...transaction,
      shiftId,
    } as CashTransaction);

    // Update shift totals atomically — safe for concurrent access from multiple devices
    const incrementArgs: Record<string, number> = {
      p_shift_id: shiftId as any,
      p_cash_in: 0, p_cash_out: 0, p_cash_sales: 0, p_card_sales: 0, p_returns: 0,
    };
    switch (transaction.type) {
      case 'in':        incrementArgs.p_cash_in = transaction.amount; break;
      case 'out':       incrementArgs.p_cash_out = transaction.amount; break;
      case 'sale':      incrementArgs.p_cash_sales = transaction.amount; break;
      case 'card_sale': incrementArgs.p_card_sales = transaction.amount; break;
      case 'return':    incrementArgs.p_returns = transaction.amount; break;
    }
    await supabase.rpc('atomic_increment_shift', incrementArgs);

    return newTx;
  },

  getTransactions: async (shiftId?: string): Promise<CashTransaction[]> => {
    if (shiftId) {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('shift_id', shiftId);
      if (error) throw error;
      return (data || []).map(item => (transactionsInternal as any).mapDbToDomain(item));
    }
    return transactionsInternal.getAll();
  }
};
