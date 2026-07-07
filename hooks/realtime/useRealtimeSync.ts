import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { inventorySearchEngine } from '../../services/search/drugSearchService';
import { queryClient } from '../../context/QueryProvider';

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
        queryClient.invalidateQueries({ queryKey: ['sales', activeBranchId] });
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
        queryClient.invalidateQueries({ queryKey: ['returns', activeBranchId] });
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
        queryClient.invalidateQueries({ queryKey: ['inventory', activeBranchId] });
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
        queryClient.invalidateQueries({ queryKey: ['batches', activeBranchId] });
        queryClient.invalidateQueries({ queryKey: ['inventory', activeBranchId] });
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
        queryClient.invalidateQueries({ queryKey: ['purchases', activeBranchId] });
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
