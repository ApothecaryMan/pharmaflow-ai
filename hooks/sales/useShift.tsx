import type React from 'react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { cashService } from '../../services/cash/cashService';
import { useAuthStore } from '../../stores/authStore';
import type { CashTransaction, Shift } from '../../types';
import { useShifts, useShiftTransactions } from '../queries/useShiftsQuery';

/**
 * ShiftContext
 *
 * Provides global shift state management across the app.
 * All components consuming this context will see the same state and updates in real-time.
 * Backed by React Query + central realtime dispatcher.
 */

interface ShiftContextType {
  shifts: Shift[];
  currentShift: Shift | null;
  isLoading: boolean;
  startShift: (newShift: Shift) => Promise<void>;
  endShift: (closedShift: Shift) => Promise<void>;
  addTransaction: (
    shiftId: string,
    transaction: CashTransaction,
    updates?: Partial<Shift>
  ) => Promise<void>;
  refreshShifts: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const activeBranchId = useAuthStore((s) => s.activeBranchId);

  // --- React Query backed data ---
  const { data: allShifts = [], isLoading } = useShifts(activeBranchId || '');

  // Open shift for this branch
  const openShift = useMemo(() => {
    if (!activeBranchId) return null;
    return allShifts.find((s) => s.status === 'open' && s.branchId === activeBranchId) || null;
  }, [allShifts, activeBranchId]);

  // Transactions for the open shift
  const { data: openShiftTransactions = [] } = useShiftTransactions(
    openShift?.id,
    activeBranchId || ''
  );

  // Merge transactions into open shift for currentShift
  const currentShift = useMemo(() => {
    if (!openShift) return null;
    return { ...openShift, transactions: openShiftTransactions };
  }, [openShift, openShiftTransactions]);

  // --- Branch-scoped shifts ---
  const branchShifts = useMemo(() => {
    if (!activeBranchId) return [];
    return allShifts.filter((s) => s.branchId === activeBranchId);
  }, [allShifts, activeBranchId]);

  // --- Load from database (backward-compatible) ---
  const refreshShifts = useCallback(async () => {
    if (!activeBranchId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all(activeBranchId) });
  }, [activeBranchId, queryClient]);

  // --- Actions ---

  const startShift = useCallback(
    async (newShift: Shift) => {
      try {
        const createdShift = await cashService.openShift(
          newShift.openingBalance,
          newShift.openedBy,
          activeBranchId
        );

        // The open_shift RPC already inserts the opening_balance transaction server-side,
        // so no need to add it here.

        await refreshShifts();
      } catch (err) {
        console.error('[ShiftProvider] startShift failed:', err);
        throw err;
      }
    },
    [activeBranchId, refreshShifts]
  );

  const endShift = useCallback(
    async (closedShift: Shift) => {
      try {
        await cashService.closeShift(
          closedShift.id,
          closedShift.closingBalance || 0,
          closedShift.closedBy || '',
          closedShift.notes
        );
        await refreshShifts();
      } catch (err) {
        console.error('[ShiftProvider] endShift failed:', err);
        throw err;
      }
    },
    [refreshShifts]
  );

  const addTransaction = useCallback(
    async (shiftId: string, transaction: CashTransaction, _updates: Partial<Shift> = {}) => {
      try {
        await cashService.addTransaction(shiftId, {
          branchId: activeBranchId,
          shiftId: shiftId,
          time: transaction.time,
          type: transaction.type,
          amount: transaction.amount,
          reason: transaction.reason,
          userId: transaction.userId,
          relatedSaleId: transaction.relatedSaleId,
        });
        await refreshShifts();
        if (activeBranchId) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.cashTransactions.byShift(shiftId, activeBranchId),
          });
        }
      } catch (err) {
        console.error('[ShiftProvider] addTransaction failed:', err);
        throw err;
      }
    },
    [activeBranchId, refreshShifts]
  );

  // Memoize context value to prevent unnecessary consumer re-renders (memory-leak-audit #7)
  const value = useMemo<ShiftContextType>(
    () => ({
      shifts: branchShifts,
      currentShift,
      isLoading,
      startShift,
      endShift,
      addTransaction,
      refreshShifts,
    }),
    [branchShifts, currentShift, isLoading, startShift, endShift, addTransaction, refreshShifts]
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
};

/**
 * useShift Hook
 *
 * Use this hook to access shift state from anywhere in the app.
 * Requires ShiftProvider to be an ancestor in the component tree.
 */
export const useShift = (): ShiftContextType => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
};

export default ShiftContext;
