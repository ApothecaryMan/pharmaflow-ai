import { useEffect, useRef } from 'react';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { sessionRepository } from '../../services/auth/repositories/sessionRepository';

/**
 * Session heartbeat interval in milliseconds (2 minutes).
 * Each device pings its own session to update `last_seen_at`.
 */
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Global session heartbeat hook.
 * Periodically pings the current session to keep `last_seen_at` fresh,
 * enabling accurate online/offline detection across all session views.
 *
 * Must run at the App level — NOT inside individual pages.
 */
export function useSessionHeartbeat(isAuthenticated: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const ping = () => {
      const sid = storage.get<string | null>(StorageKeys.ACTIVE_SESSION_ID, null);
      if (sid) sessionRepository.pingSession(sid).catch(() => {});
    };

    // Ping immediately, then every 2 minutes
    ping();
    intervalRef.current = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated]);
}

/**
 * Threshold in milliseconds — sessions with `last_seen_at` within this
 * window are considered online. Slightly more than heartbeat interval
 * to account for network latency.
 */
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Helper: check if a session is considered online based on its last_seen_at timestamp.
 */
export function isSessionOnline(lastSeenAt: string): boolean {
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}
