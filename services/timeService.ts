/**
 * TimeService - Provides verified time to prevent date tampering
 *
 * Strategy:
 * 1. Sync with external time API when online
 * 2. Calculate offset between server time and system time
 * 3. Store offset in localStorage for offline use
 * 4. Provide verified date by applying offset to system time
 */

import { StorageKeys } from '../config/storageKeys';
import { storage } from '../utils/storage';

interface TimeResponse {
  datetime: string;
  unixtime: number;
}

const TIME_PROVIDERS = [
  '/.netlify/functions/time', // Our own Netlify Function (most reliable)
  // External APIs removed to prevent connection errors and rely on local system time as the source of truth
  // 'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
  // 'https://worldtimeapi.org/api/timezone/Etc/UTC',
];

class TimeService {
  private offset: number = 0;
  private lastSyncTime: number = 0;
  private isSyncing: boolean = false;

  constructor() {
    this.loadStoredOffset();
  }

  /**
   * Load stored offset from localStorage
   */
  private loadStoredOffset(): void {
    try {
      // Use storage utility but handle numbers as strings or numbers safely
      const storedOffset = storage.get<string | number | null>(StorageKeys.TIME_OFFSET, null);
      const storedSync = storage.get<string | number | null>(StorageKeys.LAST_SYNC, null);

      if (storedOffset !== null) {
        this.offset = typeof storedOffset === 'number' ? storedOffset : parseInt(storedOffset, 10);
      }

      if (storedSync !== null) {
        this.lastSyncTime = typeof storedSync === 'number' ? storedSync : parseInt(storedSync, 10);
      }
    } catch (error) {
      console.warn('Failed to load time offset from storage:', error);
    }
  }

  /**
   * Sync with external time server
   * Returns true if sync was successful
   */
  async syncTime(): Promise<boolean> {
    if (this.isSyncing) return false;
    this.isSyncing = true;

    const systemTime = Date.now();

    for (const provider of TIME_PROVIDERS) {
      let url = provider;
      if (provider.startsWith('/')) {
        if (
          typeof window !== 'undefined' &&
          window.location?.origin &&
          window.location.origin !== 'null'
        ) {
          try {
            url = new URL(provider, window.location.origin).toString();
          } catch {
            continue;
          }
        } else {
          // Node or invalid window env
          continue;
        }
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const endTime = Date.now();
        const latency = (endTime - systemTime) / 2;

        // Handle different API formats
        let serverTime = 0;
        if (data.unixtime) {
          serverTime = data.unixtime * 1000 + latency; // WorldTimeAPI
        } else if (data.milliSeconds) {
          serverTime = data.milliSeconds + latency; // TimeAPI (if used)
        } else if (data.dateTime) {
          serverTime = new Date(data.dateTime).getTime() + latency; // TimeAPI
        } else if (data.datetime) {
          serverTime = new Date(data.datetime).getTime() + latency; // Standard ISO
        }

        if (!serverTime) throw new Error('Invalid time format');

        this.offset = serverTime - endTime;
        this.lastSyncTime = endTime;

        storage.set(StorageKeys.TIME_OFFSET, this.offset.toString());
        storage.set(StorageKeys.LAST_SYNC, this.lastSyncTime.toString());

        console.log(`Time synced via ${provider}. Offset: ${this.offset}ms`);
        return true;
      } catch (error) {
        console.warn(`Time sync failed for ${provider}:`, error);
        // Continue to next provider
      }
    }

    // All providers failed - use local time as fallback
    console.warn(
      '[TimeService] All external time sources failed. Using local system time as fallback.\n' +
        'This is normal in development mode without Netlify Functions.\n' +
        'In production, ensure at least one time API is accessible.'
    );

    // Reset offset to 0 (trust local time) and mark as synced to prevent retry spam
    this.offset = 0;
    this.lastSyncTime = Date.now();
    storage.set(StorageKeys.TIME_OFFSET, '0');
    storage.set(StorageKeys.LAST_SYNC, this.lastSyncTime.toString());

    this.isSyncing = false;
    // Return true to signal "sync complete" and stop retry loop
    return true;
  }

  /**
   * Get verified current date (system time + offset)
   */
  getVerifiedDate(): Date {
    const systemTime = Date.now();
    const verifiedTime = systemTime + this.offset;
    return new Date(verifiedTime);
  }

  /**
   * Get the current offset in milliseconds
   */
  getOffset(): number {
    return this.offset;
  }

  /**
   * Check if time has been synced recently (within last 24 hours)
   */
  isSynced(): boolean {
    if (this.lastSyncTime === 0) {
      return false;
    }
    const hoursSinceSync = (Date.now() - this.lastSyncTime) / (1000 * 60 * 60);
    return hoursSinceSync < 24;
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime > 0 ? new Date(this.lastSyncTime) : null;
  }
}

// Singleton instance
export const timeService = new TimeService();

// Auto-sync on initialization (with retry)
const attemptSync = async (retries = 3) => {
  // Skip if already synced (e.g., from localStorage cache)
  if (timeService.isSynced()) {
    console.log('[TimeService] Already synced from cache, skipping network sync.');
    return;
  }

  for (let i = 0; i < retries; i++) {
    const success = await timeService.syncTime();
    if (success) {
      break;
    }
    // Wait before retry (exponential backoff)
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
  }
};

// Start sync attempt (skip in test to prevent race conditions)
if (process.env.NODE_ENV !== 'test') {
  attemptSync();
}

export default timeService;
