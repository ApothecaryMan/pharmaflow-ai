import { StorageKeys } from '../config/storageKeys';
import type { CashTransaction, Shift } from '../types';

/**
 * Transaction types for shift updates
 */
export type ShiftTransactionType = 'sale' | 'card_sale' | 'return';

/**
 * Parameters for adding a transaction to the current shift
 */
export interface AddShiftTransactionParams {
  type: ShiftTransactionType;
  amount: number;
  reason: string;
  userId: string;
  relatedSaleId: string;
  getVerifiedDate: () => Date;
}

/**
 * Adds a transaction to the currently open shift and updates shift totals.
 * Handles sales (cash/card) and returns.
 *
 * @returns true if transaction was added successfully, false if no open shift
 */
export function addTransactionToOpenShift(params: AddShiftTransactionParams): boolean {
  const { type, amount, reason, userId, relatedSaleId, getVerifiedDate } = params;

  try {
    const savedShifts = localStorage.getItem(StorageKeys.SHIFTS);
    if (!savedShifts) return false;

    const allShifts: Shift[] = JSON.parse(savedShifts);
    const openShiftIndex = allShifts.findIndex((s) => s.status === 'open');

    if (openShiftIndex === -1) return false;

    const openShift = allShifts[openShiftIndex];
    const now = getVerifiedDate();

    const newTransaction: CashTransaction = {
      id: now.getTime().toString(),
      shiftId: openShift.id,
      time: now.toISOString(),
      type,
      amount,
      reason,
      userId,
      relatedSaleId,
    };

    // Calculate updated totals based on transaction type
    const updatedShift: Shift = {
      ...openShift,
      cashSales: type === 'sale' ? openShift.cashSales + amount : openShift.cashSales,
      cardSales:
        type === 'card_sale' ? (openShift.cardSales || 0) + amount : openShift.cardSales || 0,
      returns: type === 'return' ? (openShift.returns || 0) + amount : openShift.returns || 0,
      transactions: [newTransaction, ...openShift.transactions],
    };

    allShifts[openShiftIndex] = updatedShift;
    localStorage.setItem(StorageKeys.SHIFTS, JSON.stringify(allShifts));

    return true;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error('[ShiftHelper] Failed to update shift:', e);
    }
    return false;
  }
}
