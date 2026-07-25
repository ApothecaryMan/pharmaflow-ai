import { useRef, useCallback, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

interface UseRealtimeChannelOptions {
  onReconnected?: () => void;
}

export function useRealtimeChannel(
  channelName: string | null,
  setupChannel: (channel: RealtimeChannel) => void,
  { onReconnected }: UseRealtimeChannelOptions = {},
) {
  const setupChannelRef = useRef(setupChannel);
  setupChannelRef.current = setupChannel;

  const onReconnectedRef = useRef(onReconnected);
  onReconnectedRef.current = onReconnected;

  const mountedRef = useRef(false);
  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasDisconnectedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const subscribeWithRetry = useCallback(() => {
    if (!channelName) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    setupChannelRef.current(channel);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (wasDisconnectedRef.current && mountedRef.current) {
          wasDisconnectedRef.current = false;
          onReconnectedRef.current?.();
        }
        retryCountRef.current = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        wasDisconnectedRef.current = true;
        const backoff = Math.min(
          RECONNECT_BASE_MS * 2 ** retryCountRef.current,
          RECONNECT_MAX_MS,
        );
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(subscribeWithRetry, backoff);
      }
    });
  }, [channelName]);

  useEffect(() => {
    mountedRef.current = true;

    if (!channelName) return;

    subscribeWithRetry();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [subscribeWithRetry, channelName]);

  return channelRef;
}
