import { useEffect, useMemo, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
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
 * This runs **alongside** the legacy `useRealtimeSync` hook until
 * Phase 5 removes the old system.
 */
export function useRealtimeDispatcher({ activeBranchId, activeOrgId }: DispatcherProps) {
  // Keep a ref to the latest branch/org so the effect closure is fresh
  const branchRef = useRef(activeBranchId);
  const orgRef = useRef(activeOrgId);
  branchRef.current = activeBranchId;
  orgRef.current = activeOrgId;

  // Stable channel identity based on org — survives branch switches
  const channelKey = useMemo(() => `tenant-${activeOrgId}`, [activeOrgId]);

  useEffect(() => {
    if (!activeOrgId || !activeBranchId) return;

    const entries = createRegistry(activeBranchId, activeOrgId);
    if (entries.length === 0) return;

    const channel = supabase.channel(channelKey);

    for (const entry of entries) {
      const filterExpr = entry.filter(activeOrgId);
      channel.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: entry.table,
          filter: filterExpr,
        },
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
      if (reconnectTimer) clearTimeout(reconnectTimer);
      supabase.removeChannel(channel);
    };
    // channelKey is stable per org — we don't want to reconnect on every branch switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey]);
}
