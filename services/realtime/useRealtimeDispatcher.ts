import { useEffect, useMemo, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { queryClient } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';
import { createRegistry } from './registry';

interface DispatcherProps {
  activeBranchId: string;
  activeOrgId: string;
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Central realtime dispatcher.
 *
 * Opens a **single Supabase channel per org** and subscribes to every
 * table declared in the registry.  When a change arrives it runs the
 * table's registered patchers, which surgically update React Query caches.
 *
 * Supersedes the legacy `useRealtimeSync` hook.  Also handles
 * online recovery by re-fetching all domain caches.
 */
export function useRealtimeDispatcher({ activeBranchId, activeOrgId }: DispatcherProps) {
  // Keep a ref to the latest branch/org so the effect closure is fresh
  const branchRef = useRef(activeBranchId);
  const orgRef = useRef(activeOrgId);
  branchRef.current = activeBranchId;
  orgRef.current = activeOrgId;

  // Stable channel identity based on org and branch
  const channelKey = useMemo(() => `tenant-${activeOrgId}-branch-${activeBranchId}`, [activeOrgId, activeBranchId]);

  useEffect(() => {
    if (!activeOrgId || !activeBranchId) return;

    const entries = createRegistry(activeBranchId, activeOrgId);
    if (entries.length === 0) return;

    // — Online recovery: re-fetch all domain caches when the browser comes back online — ///
    const handleOnline = () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          ['shifts', 'cashTransactions', 'expenses', 'audit', 'sales', 'purchases', 'returns', 'inventory', 'batches', 'customers', 'suppliers', 'dashboard'].includes(
            query.queryKey[0] as string,
          ),
      });
    };
    window.addEventListener('online', handleOnline);

    const channel = supabase.channel(channelKey);

    for (const entry of entries) {
      const filterExpr = entry.filter ? entry.filter() : undefined;
      const config: any = {
        event: '*',
        schema: 'public',
        table: entry.table,
      };
      if (filterExpr) {
        config.filter = filterExpr;
      }

      channel.on(
        'postgres_changes' as any,
        config,
        (payload: RealtimePostgresChangesPayload<any>) => {
          const branchId = branchRef.current;
          for (const handler of entry.handlers) {
            try {
              handler(payload, branchId);
            } catch (err) {
              console.error(`[RealtimeDispatcher] handler error for ${entry.table}:`, err);
            }
          }
        },
      );
    }

    let retryCount = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        retryCount = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const backoff = Math.min(
          RECONNECT_BASE_MS * 2 ** retryCount,
          RECONNECT_MAX_MS,
        );
        retryCount += 1;
        reconnectTimer = setTimeout(() => {
          supabase.removeChannel(channel);
          channel.subscribe();
        }, backoff);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      supabase.removeChannel(channel);
    };
    // channelKey is stable per branch — reconnects safely on branch switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey]);
}
