import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Shift, CashTransaction } from '../types';

import { storage } from '../utils/storage';
import { StorageKeys } from '../config/storageKeys';

/**
 * ShiftContext
 * 
 * Provides global shift state management across the app.
 * All components consuming this context will see the same state and updates in real-time.
 */

interface ShiftContextType {
  shifts: Shift[];
  currentShift: Shift | null;
  isLoading: boolean;
  startShift: (newShift: Shift) => void;
  endShift: (closedShift: Shift) => void;
  addTransaction: (shiftId: string, transaction: CashTransaction, updates?: Partial<Shift>) => void;
  refreshShifts: () => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Load from storage on mount ---
  useEffect(() => {
    const loadShifts = () => {
      const savedShifts = storage.get<Shift[]>(StorageKeys.SHIFTS, []);
      if (savedShifts.length > 0) {
        const parsed: Shift[] = savedShifts.map((s: any) => ({
          ...s,
          cardSales: s.cardSales ?? 0,
          returns: s.returns ?? 0,
        }));
        setShifts(parsed);
      }
      setIsLoading(false);
    };
    loadShifts();
  }, []);

  // --- Cross-tab sync via storage event ---
  useEffect(() => {
    // Note: 'storage' event listener in usePersistedState handles this generally,
    // but here we have specific parsing logic.
    // The storage utility dispatches 'local-storage' event for same-tab updates,
    // and we can listen to window 'storage' for other tabs.
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === StorageKeys.SHIFTS && e.newValue) {
        // Deep equality check to prevent loops
        const currentJSON = JSON.stringify(shifts);
        if (e.newValue === currentJSON) return;

        try {
          const parsed: Shift[] = JSON.parse(e.newValue);
          setShifts(parsed);
        } catch (err) {
          console.error("Failed to parse shift update", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [shifts]);

  // --- Persist to storage on change ---
  useEffect(() => {
    if (!isLoading) {
      storage.set(StorageKeys.SHIFTS, shifts);
    }
  }, [shifts, isLoading]);

  // --- Derived: Current Open Shift ---
  const currentShift = useMemo(() => {
    return shifts.find((s) => s.status === 'open') || null;
  }, [shifts]);

  // --- Actions ---

  const startShift = useCallback((newShift: Shift) => {
    setShifts((prev) => [newShift, ...prev]);
  }, []);

  const endShift = useCallback((closedShift: Shift) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === closedShift.id ? closedShift : s))
    );
  }, []);

  const addTransaction = useCallback(
    (shiftId: string, transaction: CashTransaction, updates: Partial<Shift> = {}) => {
      setShifts((prev) =>
        prev.map((s) => {
          if (s.id !== shiftId) return s;

          // Calculate new totals based on transaction type
          let newCashSales = s.cashSales;
          let newCardSales = s.cardSales || 0;
          let newReturns = s.returns || 0;

          if (transaction.type === 'sale') {
            newCashSales += transaction.amount;
          } else if (transaction.type === 'card_sale') {
            newCardSales += transaction.amount;
          } else if (transaction.type === 'return') {
            newReturns += transaction.amount;
          }

          return {
            ...s,
            ...updates,
            cashSales: newCashSales,
            cardSales: newCardSales,
            returns: newReturns,
            transactions: [transaction, ...s.transactions],
          };
        })
      );
    },
    []
  );

  const refreshShifts = useCallback(() => {
    const savedShifts = storage.get<Shift[]>(StorageKeys.SHIFTS, []);
    if (savedShifts.length > 0) {
      const parsed: Shift[] = savedShifts.map((s: any) => ({
        ...s,
        cardSales: s.cardSales ?? 0,
        returns: s.returns ?? 0,
      }));
      setShifts(parsed);
    }
  }, []);

  const value: ShiftContextType = {
    shifts,
    currentShift,
    isLoading,
    startShift,
    endShift,
    addTransaction,
    refreshShifts,
  };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
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
