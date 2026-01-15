/**
 * Cash Service - Cash register and shift operations
 * 
 * Unified with useShift hook - uses same storage key and types.
 * Ready for future backend API integration.
 */

import { Shift, CashTransaction, CashTransactionType } from '../../types';

const SHIFTS_KEY = 'pharma_shifts';

/**
 * Cash Service Interface
 */
export interface CashServiceInterface {
  // Shifts
  getCurrentShift(): Promise<Shift | null>;
  getAllShifts(): Promise<Shift[]>;
  openShift(openingBalance: number, openedBy: string): Promise<Shift>;
  closeShift(closingBalance: number, closedBy: string, notes?: string): Promise<Shift>;
  
  // Transactions
  addTransaction(shiftId: string, transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction>;
  getTransactions(shiftId?: string): Promise<CashTransaction[]>;
  
  // Save
  saveShifts(shifts: Shift[]): Promise<void>;
}

export const createCashService = (): CashServiceInterface => ({
  getCurrentShift: async (): Promise<Shift | null> => {
    const all = await cashService.getAllShifts();
    return all.find(s => s.status === 'open') || null;
  },

  getAllShifts: async (): Promise<Shift[]> => {
    const data = localStorage.getItem(SHIFTS_KEY);
    if (!data) return [];
    
    // Parse and ensure all fields have defaults
    const shifts: Shift[] = JSON.parse(data).map((s: any) => ({
      ...s,
      cashSales: s.cashSales ?? 0,
      cardSales: s.cardSales ?? 0,
      returns: s.returns ?? 0,
      transactions: s.transactions ?? [],
    }));
    return shifts;
  },

  openShift: async (openingBalance: number, openedBy: string): Promise<Shift> => {
    const current = await cashService.getCurrentShift();
    if (current) throw new Error('A shift is already open');
    
    const all = await cashService.getAllShifts();
    const newShift: Shift = {
      id: Date.now().toString(),
      status: 'open',
      openTime: new Date().toISOString(),
      openedBy,
      openingBalance,
      cashIn: 0,
      cashOut: 0,
      cashSales: 0,
      cardSales: 0,
      returns: 0,
      transactions: [],
    };
    
    // Add to beginning (newest first)
    all.unshift(newShift);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(all));
    return newShift;
  },

  closeShift: async (closingBalance: number, closedBy: string, notes?: string): Promise<Shift> => {
    const all = await cashService.getAllShifts();
    const index = all.findIndex(s => s.status === 'open');
    if (index === -1) throw new Error('No open shift found');
    
    const shift = all[index];
    const expectedBalance = shift.openingBalance + shift.cashIn + shift.cashSales - shift.cashOut - shift.returns;
    
    all[index] = {
      ...shift,
      status: 'closed',
      closeTime: new Date().toISOString(),
      closedBy,
      closingBalance,
      expectedBalance,
      notes,
    };
    
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(all));
    return all[index];
  },

  addTransaction: async (shiftId: string, transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction> => {
    const all = await cashService.getAllShifts();
    const shiftIndex = all.findIndex(s => s.id === shiftId);
    if (shiftIndex === -1) throw new Error('Shift not found');
    
    const newTx: CashTransaction = {
      id: Date.now().toString(),
      ...transaction,
    };
    
    // Add transaction to shift
    all[shiftIndex].transactions = [newTx, ...all[shiftIndex].transactions];
    
    // Update shift totals based on transaction type
    switch (transaction.type) {
      case 'in':
        all[shiftIndex].cashIn += transaction.amount;
        break;
      case 'out':
        all[shiftIndex].cashOut += transaction.amount;
        break;
      case 'sale':
        all[shiftIndex].cashSales += transaction.amount;
        break;
      case 'card_sale':
        all[shiftIndex].cardSales += transaction.amount;
        break;
      case 'return':
        all[shiftIndex].returns += transaction.amount;
        break;
    }
    
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(all));
    return newTx;
  },

  getTransactions: async (shiftId?: string): Promise<CashTransaction[]> => {
    const all = await cashService.getAllShifts();
    
    if (shiftId) {
      const shift = all.find(s => s.id === shiftId);
      return shift?.transactions ?? [];
    }
    
    // Return all transactions from all shifts
    return all.flatMap(s => s.transactions);
  },

  saveShifts: async (shifts: Shift[]): Promise<void> => {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  },
});

export const cashService = createCashService();
