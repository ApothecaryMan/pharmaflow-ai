/**
 * Cash Service - Cash register and shift operations
 * Business logic layer that orchestrates data access via CashRepository.
 */

import { supabase } from '../../lib/supabase';
import type { CashTransaction, Shift } from '../../types';
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

    const payload = {
      branchId: effectiveBranchId,
      openedBy,
      openingBalance,
      openTime: new Date().toISOString(),
    };

    const { data, error } = await supabase.rpc('open_shift', { p_payload: payload });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Failed to open shift');

    const newShift = await cashRepository.getShiftById(data.shiftId);
    if (!newShift) throw new Error('Shift created but could not be fetched');
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

    const payload = {
      id: shiftId,
      closedBy,
      closingBalance,
      notes,
      closeTime: new Date().toISOString(),
    };

    const { data, error } = await supabase.rpc('close_shift', { p_payload: payload });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Failed to close shift');

    const closedShift = await cashRepository.getShiftById(shiftId);
    if (!closedShift) throw new Error('Shift closed but could not be fetched');
    return closedShift;
  },

  addTransaction: async (
    shiftId: string,
    transaction: Omit<CashTransaction, 'id'>
  ): Promise<CashTransaction> => {
    const payload = {
      shiftId,
      branchId: transaction.branchId,
      type: transaction.type,
      amount: transaction.amount,
      reason: transaction.reason,
      userId: transaction.userId,
      time: transaction.time || new Date().toISOString(),
    };

    const { data, error } = await supabase.rpc('process_cash_transaction', { p_payload: payload });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Failed to process transaction');

    return {
      ...transaction,
      id: data.transactionId,
      shiftId,
    } as CashTransaction;
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
