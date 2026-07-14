import { useEffect } from 'react';
import { queryClient } from '../../lib/queryClient';
import { queryKeys } from '../../lib/queryKeys';
import { supabase } from '../../lib/supabase';
import { inventorySearchEngine } from '../../services/search/drugSearchService';

interface RealtimeSyncProps {
  activeBranchId: string;
}

export const useRealtimeSync = ({ activeBranchId }: RealtimeSyncProps) => {
  useEffect(() => {
    if (!activeBranchId) return;

    const salesChannel = supabase
      .channel(`sales-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.sales });
        }
      )
      .subscribe();

    const returnsChannel = supabase
      .channel(`returns-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'returns',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.returns });
        }
      )
      .subscribe();

    const drugsChannel = supabase
      .channel(`drugs-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drugs',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: any) => {
          const inventoryKey = queryKeys.inventory.all(activeBranchId);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            queryClient.setQueryData(inventoryKey, (old: any[] | undefined) => {
              if (!old) return old;
              const idx = old.findIndex((d) => d.id === payload.new.id);
              if (idx > -1) {
                const copy = [...old];
                copy[idx] = { ...copy[idx], ...payload.new };
                return copy;
              }
              return [...old, payload.new];
            });
            inventorySearchEngine.queueUpdate(payload.new as any);
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(inventoryKey, (old: any[] | undefined) => {
              if (!old) return old;
              return old.filter((d) => d.id !== payload.old.id);
            });
            inventorySearchEngine.removeItem(payload.old.id);
          }
        }
      )
      .subscribe();

    const batchesChannel = supabase
      .channel(`batches-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_batches',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: any) => {
          const batchesKey = queryKeys.batches.all(activeBranchId);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            queryClient.setQueryData(batchesKey, (old: any[] | undefined) => {
              if (!old) return old;
              const idx = old.findIndex((b) => b.id === payload.new.id);
              if (idx > -1) {
                const copy = [...old];
                copy[idx] = { ...copy[idx], ...payload.new };
                return copy;
              }
              return [...old, payload.new];
            });
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(batchesKey, (old: any[] | undefined) => {
              if (!old) return old;
              return old.filter((b) => b.id !== payload.old.id);
            });
          }
          // Note: computed inventory will automatically update since batches query data changed
        }
      )
      .subscribe();

    const purchasesChannel = supabase
      .channel(`purchases-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(returnsChannel);
      supabase.removeChannel(drugsChannel);
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(purchasesChannel);
    };
  }, [activeBranchId]);
};
