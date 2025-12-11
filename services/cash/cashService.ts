/**
 * Cash Service - Cash register and shift operations
 */

import { CashService, CashShift, CashTransaction } from './types';

const SHIFTS_KEY = 'pharma_cash_shifts';
const TRANSACTIONS_KEY = 'pharma_cash_transactions';

export const createCashService = (): CashService => ({
  getCurrentShift: async (): Promise<CashShift | null> => {
    const all = await cashService.getAllShifts();
    return all.find(s => s.status === 'open') || null;
  },

  getAllShifts: async (): Promise<CashShift[]> => {
    const data = localStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  openShift: async (openingBalance: number): Promise<CashShift> => {
    const current = await cashService.getCurrentShift();
    if (current) throw new Error('A shift is already open');
    
    const all = await cashService.getAllShifts();
    const newShift: CashShift = {
      id: Date.now().toString(),
      openedAt: new Date().toISOString(),
      openingBalance,
      cashIn: 0,
      cashOut: 0,
      status: 'open'
    };
    all.push(newShift);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(all));
    return newShift;
  },

  closeShift: async (closingBalance: number, notes?: string): Promise<CashShift> => {
    const all = await cashService.getAllShifts();
    const index = all.findIndex(s => s.status === 'open');
    if (index === -1) throw new Error('No open shift found');
    
    const shift = all[index];
    const expectedBalance = shift.openingBalance + shift.cashIn - shift.cashOut;
    
    all[index] = {
      ...shift,
      closedAt: new Date().toISOString(),
      closingBalance,
      expectedBalance,
      difference: closingBalance - expectedBalance,
      notes,
      status: 'closed'
    };
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(all));
    return all[index];
  },

  addCash: async (amount: number, reason: string): Promise<CashTransaction> => {
    const shift = await cashService.getCurrentShift();
    if (!shift) throw new Error('No open shift');
    
    // Update shift cashIn
    const allShifts = await cashService.getAllShifts();
    const shiftIndex = allShifts.findIndex(s => s.id === shift.id);
    allShifts[shiftIndex].cashIn += amount;
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(allShifts));
    
    // Create transaction
    const allTx = await cashService.getTransactions();
    const newTx: CashTransaction = {
      id: Date.now().toString(),
      shiftId: shift.id,
      type: 'in',
      amount,
      reason,
      timestamp: new Date().toISOString()
    };
    allTx.push(newTx);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(allTx));
    return newTx;
  },

  removeCash: async (amount: number, reason: string): Promise<CashTransaction> => {
    const shift = await cashService.getCurrentShift();
    if (!shift) throw new Error('No open shift');
    
    // Update shift cashOut
    const allShifts = await cashService.getAllShifts();
    const shiftIndex = allShifts.findIndex(s => s.id === shift.id);
    allShifts[shiftIndex].cashOut += amount;
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(allShifts));
    
    // Create transaction
    const allTx = await cashService.getTransactions();
    const newTx: CashTransaction = {
      id: Date.now().toString(),
      shiftId: shift.id,
      type: 'out',
      amount,
      reason,
      timestamp: new Date().toISOString()
    };
    allTx.push(newTx);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(allTx));
    return newTx;
  },

  getTransactions: async (shiftId?: string): Promise<CashTransaction[]> => {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    const all: CashTransaction[] = data ? JSON.parse(data) : [];
    if (shiftId) return all.filter(t => t.shiftId === shiftId);
    return all;
  },

  saveShifts: async (shifts: CashShift[]): Promise<void> => {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  },

  saveTransactions: async (transactions: CashTransaction[]): Promise<void> => {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  }
});

export const cashService = createCashService();
