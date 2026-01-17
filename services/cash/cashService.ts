/**
 * Cash Service - Cash register and shift operations
 * 
 * Unified with useShift hook - uses same storage key and types.
 * Ready for future backend API integration.
 */

import { Shift, CashTransaction, CashTransactionType } from '../../types';
import { settingsService } from '../settings/settingsService';

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

import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { idGenerator } from '../../utils/idGenerator';

const getRawAll = (): Shift[] => {
  return storage.get<Shift[]>(StorageKeys.SHIFTS, []);
};

// ... (interface remains same)

export const createCashService = (): CashServiceInterface => ({
  getCurrentShift: async (): Promise<Shift | null> => {
    const all = await cashService.getAllShifts();
    return all.find(s => s.status === 'open') || null;
  },

  getAllShifts: async (): Promise<Shift[]> => {
    const rawShifts = getRawAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    
    // Filter and transform
    const shifts = rawShifts.filter(s => !s.branchId || s.branchId === branchCode);

    // Parse and ensure all fields have defaults
    return shifts.map((s: any) => ({
      ...s,
      cashSales: s.cashSales ?? 0,
      cardSales: s.cardSales ?? 0,
      returns: s.returns ?? 0,
      transactions: s.transactions ?? [],
    }));
  },

  openShift: async (openingBalance: number, openedBy: string): Promise<Shift> => {
    const current = await cashService.getCurrentShift();
    if (current) throw new Error('A shift is already open');
    
    const all = getRawAll();
    const settings = await settingsService.getAll();
    
    const newShift: Shift = {
      id: idGenerator.generate('shifts'),
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
      branchId: settings.branchCode
    };
    
    // Add to beginning (newest first)
    all.unshift(newShift);
    storage.set(StorageKeys.SHIFTS, all);
    return newShift;
  },

  closeShift: async (closingBalance: number, closedBy: string, notes?: string): Promise<Shift> => {
    const all = getRawAll();
    // Re-filter to find open shift for current branch
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    
    const index = all.findIndex(s => s.status === 'open' && (!s.branchId || s.branchId === branchCode));
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
    
    storage.set(StorageKeys.SHIFTS, all);
    return all[index];
  },

  addTransaction: async (shiftId: string, transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction> => {
    const all = getRawAll();
    const shiftIndex = all.findIndex(s => s.id === shiftId);
    if (shiftIndex === -1) throw new Error('Shift not found');
    
    const newTx: CashTransaction = {
      id: idGenerator.generate('transactions'),
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
    
    storage.set(StorageKeys.SHIFTS, all);
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
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    const otherBranchItems = all.filter(s => s.branchId && s.branchId !== branchCode);
    const merged = [...otherBranchItems, ...shifts];
    storage.set(StorageKeys.SHIFTS, merged);
  },
});

export const cashService = createCashService();
