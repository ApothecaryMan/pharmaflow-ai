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

    // We ping the Supabase URL root directly. This usually returns a 200 or 404
    // without triggering the auth-required headers of the REST API.
    const response = await fetch(supaUrl, {
      method: 'HEAD',
      mode: 'no-cors', // More silent
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);
    
    // In 'no-cors' mode, response.type is 'opaque', and status is 0,
    // but if the request finishes without catching an error, we ARE online.
    return { online: true, latency };
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
