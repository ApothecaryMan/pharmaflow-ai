import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { inventorySearchEngine } from '../../services/search/drugSearchService';
import { queryClient } from '../../lib/queryClient';
import { queryKeys } from '../../lib/queryKeys';

interface RealtimeSyncProps {
  activeBranchId: string;
}

export const useRealtimeSync = ({ activeBranchId }: RealtimeSyncProps) => {
  useEffect(() => {
    if (!activeBranchId) return;

    const salesChannel = supabase
      .channel(`sales-realtime-${activeBranchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sales',
        filter: `branch_id=eq.${activeBranchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.sales });
      })
      .subscribe();

    const returnsChannel = supabase
      .channel(`returns-realtime-${activeBranchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'returns',
        filter: `branch_id=eq.${activeBranchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.returns });
      })
      .subscribe();

    const drugsChannel = supabase
      .channel(`drugs-realtime-${activeBranchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drugs',
        filter: `branch_id=eq.${activeBranchId}`,
      }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          inventorySearchEngine.queueUpdate(payload.new as any);
        } else if (payload.eventType === 'DELETE') {
          inventorySearchEngine.removeItem(payload.old.id);
        }
      })
      .subscribe();

    const batchesChannel = supabase
      .channel(`batches-realtime-${activeBranchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stock_batches',
        filter: `branch_id=eq.${activeBranchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches });
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });
      })
      .subscribe();

    const purchasesChannel = supabase
      .channel(`purchases-realtime-${activeBranchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchases',
        filter: `branch_id=eq.${activeBranchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases });
      })
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
