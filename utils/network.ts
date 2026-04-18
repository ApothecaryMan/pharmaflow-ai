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
    const supaUrl = import.meta.env.VITE_SUPABASE_URL;

    const startTime = performance.now();

    if (!supaUrl) {
      // Fallback if env check fails during ping - try a lightweight query
      const { error } = await supabase.from('organizations').select('id').limit(1).abortSignal(controller.signal);
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);
      return { online: !error, latency: !error ? latency : undefined };
    }

    const response = await fetch(`${supaUrl}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      }
    });

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);
    
    // Any response (even 401/403) means we are online because we reached Supabase
    const online = response.ok || (response.status >= 400 && response.status < 500);
    
    return { online, latency: online ? latency : undefined };
  } catch (error) {
    // Timeout or network failure implies offline
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
