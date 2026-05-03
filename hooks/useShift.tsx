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
import type { CashTransaction, Shift } from '../types';
import { useData } from '../context/DataContext';
import { cashService } from '../services/cash/cashService';
import { supabase } from '../lib/supabase';

/**
 * ShiftContext
 *
 * Provides global shift state management across the app.
 * All components consuming this context will see the same state and updates in real-time.
 * Synchronized with Supabase via cashService.
 */

interface ShiftContextType {
  shifts: Shift[];
  currentShift: Shift | null;
  isLoading: boolean;
  startShift: (newShift: Shift) => Promise<void>;
  endShift: (closedShift: Shift) => Promise<void>;
  addTransaction: (shiftId: string, transaction: CashTransaction, updates?: Partial<Shift>) => Promise<void>;
  refreshShifts: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { activeBranchId, employees } = useData();

  // --- Derived: Current Open Shift ---
  const currentShift = useMemo(() => {
    return shifts.find((s) => s.status === 'open' && s.branchId === activeBranchId) || null;
  }, [shifts, activeBranchId]);

  // --- Load from database on mount ---
  const refreshShifts = useCallback(async () => {
    if (!activeBranchId) return;
    
    setIsLoading(true);
    try {
      const loadedShifts = await cashService.getAllShifts(activeBranchId);
      
      // Sort by openTime descending
      loadedShifts.sort((a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime());

      // Fetch transactions for the open shift if it exists
      const openShift = loadedShifts.find(s => s.status === 'open');
      if (openShift) {
        const txs = await cashService.getTransactions(openShift.id);
        openShift.transactions = txs;
      }

      setShifts(loadedShifts);
    } catch (err) {
      console.error('[ShiftProvider] Failed to load shifts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;

    refreshShifts();

    // Listen for realtime updates from Supabase
    const channel = supabase.channel(`shifts-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'shifts',
          filter: `branch_id=eq.${activeBranchId}` 
        },
        (payload: any) => {
          if (import.meta.env.DEV) console.log('[Shift Realtime] Shift Event:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newShift = cashService.mapFromDb(payload.new);
            setShifts(prev => {
              const existing = prev.find(s => s.id === newShift.id);
              // Preserve transactions if they exist in the current state
              if (existing) {
                newShift.transactions = existing.transactions || [];
              }
              return [newShift, ...prev.filter(s => s.id !== newShift.id)];
            });
          } else if (payload.eventType === 'DELETE') {
            setShifts(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'cash_transactions',
          filter: `branch_id=eq.${activeBranchId}`
        },
        (payload: any) => {
          if (import.meta.env.DEV) console.log('[Shift Realtime] Transaction Event:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTx = cashService.mapFromDbTransaction(payload.new);
            
            // Update the shifts list to include this transaction
            setShifts(prev => prev.map(s => {
              if (s.id === newTx.shiftId) {
                const existingTxs = s.transactions || [];
                // Replace or add the transaction
                const filtered = existingTxs.filter(t => t.id !== newTx.id);
                return { ...s, transactions: [newTx, ...filtered] };
              }
              return s;
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setShifts(prev => prev.map(s => ({
              ...s,
              transactions: (s.transactions || []).filter(t => t.id !== deletedId)
            })));
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log(`[Shift Realtime] Subscription Status (${activeBranchId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBranchId, refreshShifts]);

  // --- Actions ---

  const startShift = useCallback(async (newShift: Shift) => {
    try {
      const createdShift = await cashService.openShift(
        newShift.openingBalance,
        newShift.openedBy,
        activeBranchId
      );
      
      // If there was an opening transaction, it's handled by openShift service usually,
      // but let's check if we need to add it explicitly.
      // Looking at cashService.openShift, it creates the shift but doesn't add the 'opening' transaction record.
      // Let's add it if provided in the newShift.
      if (newShift.transactions && newShift.transactions.length > 0) {
        const openingTx = newShift.transactions.find(t => t.type === 'opening');
        if (openingTx) {
          await cashService.addTransaction(createdShift.id, {
            branchId: activeBranchId,
            shiftId: createdShift.id,
            time: openingTx.time,
            type: 'opening',
            amount: openingTx.amount,
            reason: openingTx.reason,
            userId: openingTx.userId,
          });
        }
      }

      await refreshShifts();
    } catch (err) {
      console.error('[ShiftProvider] startShift failed:', err);
      throw err;
    }
  }, [activeBranchId, refreshShifts]);

  const endShift = useCallback(async (closedShift: Shift) => {
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
  }, [refreshShifts]);

  const addTransaction = useCallback(
    async (shiftId: string, transaction: CashTransaction, updates: Partial<Shift> = {}) => {
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
      } catch (err) {
        console.error('[ShiftProvider] addTransaction failed:', err);
        throw err;
      }
    },
    [activeBranchId, refreshShifts]
  );

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
