/**
 * Cash Types - Cash register and shift management
 */

export interface CashShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  cashIn: number;
  cashOut: number;
  expectedBalance?: number;
  difference?: number;
  notes?: string;
  status: 'open' | 'closed';
}

export interface CashTransaction {
  id: string;
  shiftId: string;
  type: 'in' | 'out';
  amount: number;
  reason: string;
  timestamp: string;
}

export interface CashService {
  // Shifts
  getCurrentShift(): Promise<CashShift | null>;
  getAllShifts(): Promise<CashShift[]>;
  openShift(openingBalance: number): Promise<CashShift>;
  closeShift(closingBalance: number, notes?: string): Promise<CashShift>;
  
  // Transactions
  addCash(amount: number, reason: string): Promise<CashTransaction>;
  removeCash(amount: number, reason: string): Promise<CashTransaction>;
  getTransactions(shiftId?: string): Promise<CashTransaction[]>;
  
  // Save
  saveShifts(shifts: CashShift[]): Promise<void>;
  saveTransactions(transactions: CashTransaction[]): Promise<void>;
}
