/**
 * Cash Service - Cash register and shift operations
 * Business logic layer that orchestrates data access via CashRepository.
 */

import type { CashTransaction, Shift } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { money } from '../../utils/money';
import { settingsService } from '../settings/settingsService';
import { cashRepository } from './repositories/cashRepository';

/**
 * Cash Service Interface
 */
export interface CashServiceInterface {
  getCurrentShift(branchId?: string): Promise<Shift | null>;
  getAllShifts(branchId?: string): Promise<Shift[]>;
  openShift(openingBalance: number, openedBy: string, branchId?: string): Promise<Shift>;
  closeShift(
    shiftId: string,
    closingBalance: number,
    closedBy: string,
    notes?: string
  ): Promise<Shift>;
  addTransaction(
    shiftId: string,
    transaction: Omit<CashTransaction, 'id'>
  ): Promise<CashTransaction>;
  getTransactions(shiftId?: string): Promise<CashTransaction[]>;
  mapFromDb(db: any): Shift;
  mapFromDbTransaction(db: any): CashTransaction;
}

export const cashService: CashServiceInterface = {
  getCurrentShift: async (branchId?: string): Promise<Shift | null> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    try {
      return await cashRepository.getCurrentShift(effectiveBranchId);
    } catch (error) {
      console.error('[CashService] getCurrentShift failed:', error);
      return null;
    }
  },

  getAllShifts: async (branchId?: string): Promise<Shift[]> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return cashRepository.getAllShifts(effectiveBranchId);
  },

  openShift: async (
    openingBalance: number,
    openedBy: string,
    branchId?: string
  ): Promise<Shift> => {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    const current = await cashService.getCurrentShift(effectiveBranchId);
    if (current) throw new Error('A shift is already open for this branch');

    const newShift: Shift = {
      id: idGenerator.uuid(), // Generate ID client-side
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
      orgId: settings.orgId,
      transactions: [],
    } as Shift;

    await cashRepository.insertShift(newShift);
    return newShift;
  },

  closeShift: async (
    shiftId: string,
    closingBalance: number,
    closedBy: string,
    notes?: string
  ): Promise<Shift> => {
    const shift = await cashRepository.getShiftById(shiftId);
    if (!shift) throw new Error('Shift not found');

    const totalIn = money.add(shift.openingBalance, money.add(shift.cashIn, shift.cashSales));
    const totalOut = money.add(shift.cashOut, shift.returns);
    const expectedBalance = money.subtract(totalIn, totalOut);

    const updates: Partial<Shift> = {
      status: 'closed',
      closeTime: new Date().toISOString(),
      closedBy,
      closingBalance,
      expectedBalance,
      notes,
    };

    await cashRepository.updateShift(shiftId, updates);
    return { ...shift, ...updates } as Shift;
  },

  addTransaction: async (
    shiftId: string,
    transaction: Omit<CashTransaction, 'id'>
  ): Promise<CashTransaction> => {
    const newTx: CashTransaction = {
      ...transaction,
      id: idGenerator.uuid(),
      shiftId,
    } as CashTransaction;

    await cashRepository.insertTransaction(newTx);

    // Update shift totals atomically
    const incrementArgs: {
      cashIn: number;
      cashOut: number;
      cashSales: number;
      cardSales: number;
      returns: number;
      cashPurchases: number;
      cashPurchaseReturns: number;
    } = {
      cashIn: 0,
      cashOut: 0,
      cashSales: 0,
      cardSales: 0,
      returns: 0,
      cashPurchases: 0,
      cashPurchaseReturns: 0,
    };
    switch (transaction.type) {
      case 'in':
        incrementArgs.cashIn = Math.abs(transaction.amount);
        break;
      case 'out':
        incrementArgs.cashOut = Math.abs(transaction.amount);
        break;
      case 'sale':
        incrementArgs.cashSales = Math.abs(transaction.amount);
        break;
      case 'card_sale':
        incrementArgs.cardSales = Math.abs(transaction.amount);
        break;
      case 'return':
        incrementArgs.returns = Math.abs(transaction.amount);
        break;
      case 'purchase':
        incrementArgs.cashPurchases = Math.abs(transaction.amount);
        break;
      case 'purchase_return':
        incrementArgs.cashPurchaseReturns = Math.abs(transaction.amount);
        break;
      case 'adjustment':
        // Adjustments are special: they can be negative to reduce a total
        if (transaction.amount < 0) {
          incrementArgs.cashSales = transaction.amount;
        } else {
          incrementArgs.cashIn = transaction.amount;
        }
        break;
    }

    await cashRepository.incrementShiftTotals(shiftId, incrementArgs);

    return newTx;
  },

  getTransactions: async (shiftId?: string): Promise<CashTransaction[]> => {
    if (shiftId) {
      return cashRepository.getTransactions(shiftId);
    }
    const settings = await settingsService.getAll();
    const effectiveBranchId = settings.activeBranchId || settings.branchCode;
    return cashRepository.getAllTransactions(effectiveBranchId);
  },

  mapFromDb: (db: any) => cashRepository.mapShiftFromDb(db),
  mapFromDbTransaction: (db: any) => cashRepository.mapTransactionFromDb(db),
};
