import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

/**
 * Global presence tracking hook.
 * Joins the 'online-sessions' realtime channel when authenticated,
 * tracking the current browser's session ID to show them as "Online".
 * Emits 'presence_sync' window events for other components to read.
 */
export function usePresenceTracking(isAuthenticated: boolean, userId?: string | null) {
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const sessionId = storage.get<string | null>(StorageKeys.ACTIVE_SESSION_ID, null);
    if (!sessionId) return;

    const presenceChannel = supabase.channel(`presence:user_${userId}`);

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      window.dispatchEvent(new CustomEvent('presence_sync', { detail: state }));
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          session_id: sessionId,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [isAuthenticated, userId]);
}
