import type React from 'react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StorageKeys } from '../config/storageKeys';
import type { CashTransaction, Shift } from '../types';
import { getPreviousShardKeys, getShardKey } from '../utils/sharding';
import { storage } from '../utils/storage';
import { useData } from '../services/DataContext';

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
  const { activeBranchId } = useData();

  // --- Derived: Current Open Shift ---
  const currentShift = useMemo(() => {
    return shifts.find((s) => s.status === 'open' && s.branchId === activeBranchId) || null;
  }, [shifts, activeBranchId]);

  // --- Load from storage on mount ---
  useEffect(() => {
    const loadShifts = () => {
      // Load Current + Previous Month
      const currentKey = getShardKey(StorageKeys.SHIFTS, new Date());
      const prevKeys = getPreviousShardKeys(StorageKeys.SHIFTS, 1);
      const keys = [currentKey, ...prevKeys];

      const loadedShifts = keys.flatMap((key) => storage.get<Shift[]>(key, []));

      // Sort by openTime descending
      loadedShifts.sort((a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime());

      if (loadedShifts.length > 0) {
        const parsed: Shift[] = loadedShifts.map((s: any) => ({
          ...s,
          branchId: s.branchId || activeBranchId, // Runtime fallback for legacy data
          cardSales: s.cardSales ?? 0,
          returns: s.returns ?? 0,
        }));
        setShifts(parsed);
      }
      setIsLoading(false);
    };
    loadShifts();
  }, [activeBranchId]);

  // --- Cross-tab sync via storage event ---
  useEffect(() => {
    // Note: 'storage' event listener in usePersistedState handles this generally,
    // but here we have specific parsing logic.
    // The storage utility dispatches 'local-storage' event for same-tab updates,
    // and we can listen to window 'storage' for other tabs.

    const handleStorageChange = (e: StorageEvent) => {
      // Listen to ANY active shift shard
      const currentKey = getShardKey(StorageKeys.SHIFTS, new Date());
      const prevKey = getPreviousShardKeys(StorageKeys.SHIFTS, 1)[0];

      if ((e.key === currentKey || e.key === prevKey) && e.newValue) {
        // Simply reload all if any active shard changes
        // (Simpler than merging partial updates)
        refreshShifts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [shifts]);

  // --- Persist to storage on change ---
  // --- Persist to storage on change ---
  useEffect(() => {
    if (!isLoading) {
      // Sharded Save: Group by Month
      const shards: Record<string, Shift[]> = {};

      shifts.forEach((shift) => {
        // Default to current date if openTime missing (shouldn't happen)
        const date = shift.openTime || new Date().toISOString();
        const key = getShardKey(StorageKeys.SHIFTS, date);
        if (!shards[key]) shards[key] = [];
        shards[key].push(shift);
      });

      Object.entries(shards).forEach(([key, items]) => {
        storage.set(key, items);
      });
    }
  }, [shifts, isLoading]);

  // --- Actions ---

  const startShift = useCallback((newShift: Shift) => {
    setShifts((prev) => [newShift, ...prev]);
  }, []);

  const endShift = useCallback((closedShift: Shift) => {
    setShifts((prev) => prev.map((s) => (s.id === closedShift.id ? closedShift : s)));
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
    // Load Current + Previous Month
    const currentKey = getShardKey(StorageKeys.SHIFTS, new Date());
    const prevKeys = getPreviousShardKeys(StorageKeys.SHIFTS, 1);
    const keys = [currentKey, ...prevKeys];

    const loadedShifts = keys.flatMap((key) => storage.get<Shift[]>(key, []));

    // Sort by openTime descending
    loadedShifts.sort((a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime());

    if (loadedShifts.length > 0) {
      const parsed: Shift[] = loadedShifts.map((s: any) => ({
        ...s,
        branchId: s.branchId || activeBranchId,
        cardSales: s.cardSales ?? 0,
        returns: s.returns ?? 0,
      }));
      setShifts(parsed);
    }
  }, []);

  const branchShifts = useMemo(() => {
    return shifts.filter((s) => s.branchId === activeBranchId);
  }, [shifts, activeBranchId]);

  const value: ShiftContextType = {
    shifts: branchShifts,
    currentShift,
    isLoading,
    startShift,
    endShift,
    addTransaction,
    refreshShifts,
  };

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
