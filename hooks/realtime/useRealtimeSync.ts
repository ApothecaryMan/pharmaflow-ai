import { useEffect, useMemo, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { queryClient } from '../../lib/queryClient';
import { queryKeys } from '../../lib/queryKeys';
import { supabase } from '../../lib/supabase';
import { inventorySearchEngine } from '../../services/search/drugSearchService';
import type { Drug, StockBatch } from '../../types';

interface RealtimeSyncProps {
  activeBranchId: string;
}

interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

// Simple debounce utility for invalidation storms with cancel support
function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitFor: number
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
  debounced.cancel = () => {
    if (timeout !== null) clearTimeout(timeout);
  };
  return debounced as DebouncedFunction<T>;
}

// DRY Helper for Cache Mutation
function upsertOrRemove<T extends { id: string }>(
  queryKey: readonly unknown[],
  payload: RealtimePostgresChangesPayload<T>
): boolean {
  let wasUpdated = false;
  queryClient.setQueryData(queryKey, (old: T[] | undefined) => {
    if (!old) return old;
    wasUpdated = true;

    if (payload.eventType === 'DELETE') {
      const oldId = (payload.old as { id: string }).id;
      return old.filter((item) => item.id !== oldId);
    }

    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const idx = old.findIndex((item) => item.id === payload.new.id);
      if (idx > -1) {
        const copy = [...old];
        copy[idx] = { ...copy[idx], ...payload.new };
        return copy;
      }
      return [...old, payload.new];
    }

    return old;
  });
  return wasUpdated;
}

// Helper to invalidate queries only for the specific branch
const invalidateBranchQueries = (prefix: string, branchId: string) => {
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === prefix && query.queryKey.includes(branchId),
  });
};

export const useRealtimeSync = ({ activeBranchId }: RealtimeSyncProps) => {
  const [retryCount, setRetryCount] = useState(0);

  // Debounced invalidators to prevent invalidate storms
  const debouncedInvalidateSales = useMemo(
    () => debounce(() => invalidateBranchQueries('sales', activeBranchId), 1500),
    [activeBranchId]
  );

  const debouncedInvalidateReturns = useMemo(
    () => debounce(() => invalidateBranchQueries('returns', activeBranchId), 1500),
    [activeBranchId]
  );

  const debouncedInvalidatePurchases = useMemo(
    () => debounce(() => invalidateBranchQueries('purchases', activeBranchId), 1500),
    [activeBranchId]
  );

  // Add online recovery to ensure sync after network drop
  useEffect(() => {
    if (!activeBranchId) return;

    const handleOnline = () => {
      // Force reconnect
      setRetryCount((prev) => prev + 1);
      // Ensure data consistency after coming back online
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(activeBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all(activeBranchId) });
      invalidateBranchQueries('sales', activeBranchId);
      invalidateBranchQueries('returns', activeBranchId);
      invalidateBranchQueries('purchases', activeBranchId);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;

    // Multiplexing all subscriptions onto a single channel per branch
    const channel = supabase.channel(`branch-realtime-${activeBranchId}-${retryCount}`);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drugs', filter: `branch_id=eq.${activeBranchId}` },
        (payload: RealtimePostgresChangesPayload<Drug>) => {
          const updated = upsertOrRemove<Drug>(queryKeys.inventory.all(activeBranchId), payload);

          if (updated) {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              inventorySearchEngine.queueUpdate(payload.new as Drug);
            } else if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as { id: string }).id;
              inventorySearchEngine.removeItem(oldId);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_batches',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: RealtimePostgresChangesPayload<StockBatch>) => {
          upsertOrRemove<StockBatch>(queryKeys.batches.all(activeBranchId), payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `branch_id=eq.${activeBranchId}` },
        () => {
          debouncedInvalidateSales();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'returns', filter: `branch_id=eq.${activeBranchId}` },
        () => {
          debouncedInvalidateReturns();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        () => {
          debouncedInvalidatePurchases();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[RealtimeSync] Channel error or timeout for branch ${activeBranchId}`);

          // Attempt reconnection after exponential backoff
          const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
          setTimeout(() => {
            supabase.removeChannel(channel);
            setRetryCount((prev) => prev + 1);
          }, backoffTime);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      debouncedInvalidateSales.cancel();
      debouncedInvalidateReturns.cancel();
      debouncedInvalidatePurchases.cancel();
    };
  }, [
    activeBranchId,
    retryCount,
    debouncedInvalidateSales,
    debouncedInvalidateReturns,
    debouncedInvalidatePurchases,
  ]);
};

