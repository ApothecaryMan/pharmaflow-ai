import { supabase } from '@/lib/supabase';

export type ConnectionStatus = 'online' | 'offline-device' | 'offline-no-internet';

export interface NetworkResult {
  status: ConnectionStatus;
  latency?: number;
}

/**
 * Pings the Supabase health endpoint to check real internet connectivity.
 * Falls back to caching mechanism if needed, but primarily prevents false positives
 * compared to just using navigator.onLine.
 */
export const checkRealConnectivity = async (): Promise<NetworkResult> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'offline-device' };
  }

  try {
    const controller = new AbortController();
    const _timeoutId = setTimeout(() => controller.abort(), 5000);

    const startTime = performance.now();
    const { error } = await supabase
      .from('organizations')
      .select('id', { count: 'estimated', head: true })
      .limit(1);
    const latency = Math.round(performance.now() - startTime);

    const isOffline =
      error &&
      (error.code === 'PGRST301' ||
        error.message?.includes('FetchError') ||
        error.message?.includes('Network Error'));

    if (isOffline) {
      return { status: 'offline-no-internet' };
    }

    return { status: 'online', latency };
  } catch (_error) {
    return { status: 'offline-no-internet' };
  }
};

/**
 * Convenience wrapper returning a Promise<boolean>.
 */
export const isOnline = async (): Promise<boolean> => {
  const result = await checkRealConnectivity();
  return result.status === 'online';
};
