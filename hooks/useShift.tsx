import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Shift, CashTransaction } from '../types';

const SHIFTS_KEY = 'pharma_shifts';

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
  addTransaction: (shiftId: string, transaction: CashTransaction, updates: Partial<Shift>) => void;
  refreshShifts: () => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Load from localStorage on mount ---
  useEffect(() => {
    const loadShifts = () => {
      const savedShifts = localStorage.getItem(SHIFTS_KEY);
      if (savedShifts) {
        const parsed: Shift[] = JSON.parse(savedShifts).map((s: any) => ({
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
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SHIFTS_KEY && e.newValue) {
        const parsed: Shift[] = JSON.parse(e.newValue);
        setShifts(parsed);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // --- Persist to localStorage on change ---
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
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
    (shiftId: string, transaction: CashTransaction, updates: Partial<Shift>) => {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId
            ? {
                ...s,
                ...updates,
                transactions: [transaction, ...s.transactions],
              }
            : s
        )
      );
    },
    []
  );

  const refreshShifts = useCallback(() => {
    const savedShifts = localStorage.getItem(SHIFTS_KEY);
    if (savedShifts) {
      const parsed: Shift[] = JSON.parse(savedShifts).map((s: any) => ({
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
