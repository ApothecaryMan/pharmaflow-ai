import { supabase } from '@/lib/supabase';

export interface NetworkResult {
  online: boolean;
  latency?: number;
}

/**
 * Pings the Supabase health endpoint to check real internet connectivity.
 * Falls back to caching mechanism if needed, but primarily prevents false positives
 * compared to just using navigator.onLine.
 */
export const checkRealConnectivity = async (): Promise<NetworkResult> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    // Fast path: if OS thinks we are offline, we definitely are.
    return { online: false, latency: undefined };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    // We can ping the health check endpoint or just do a simple lightweight query
    // Supabase has /rest/v1/ as its root endpoint which responds correctly to HEAD/GET
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    // We use a simple select on a table that usually has at least one row or returns empty
    // This is the most reliable way to check both network AND Supabase availability.
    const startTime = performance.now();
    const { error } = await supabase.from('organizations').select('id', { count: 'estimated', head: true }).limit(1);
    const latency = Math.round(performance.now() - startTime);

    // Any response from Supabase (including permission errors) means we are online.
    // 401/403/404 on a table still means the server is reachable.
    const isOffline = error && (error.code === 'PGRST301' || error.message?.includes('FetchError') || error.message?.includes('Network Error'));
    
    return { online: !isOffline, latency: !isOffline ? latency : undefined };
  } catch (error) {
    return { online: false, latency: undefined };
  }
};

/**
 * Convenience wrapper returning a Promise<boolean>.
 */
export const isOnline = async (): Promise<boolean> => {
  const result = await checkRealConnectivity();
  return result.online;
};
