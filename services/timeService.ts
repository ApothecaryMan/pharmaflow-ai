/**
 * TimeService - Provides verified time to prevent date tampering
 * 
 * Strategy:
 * 1. Sync with external time API when online
 * 2. Calculate offset between server time and system time
 * 3. Store offset in localStorage for offline use
 * 4. Provide verified date by applying offset to system time
 */

interface TimeResponse {
  datetime: string;
  unixtime: number;
}

const TIME_PROVIDERS = [
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
  'https://worldtimeapi.org/api/timezone/Etc/UTC',
];
const STORAGE_KEY = 'pharmaflow_time_offset';
const LAST_SYNC_KEY = 'pharmaflow_last_sync';

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
      const storedOffset = localStorage.getItem(STORAGE_KEY);
      const storedSync = localStorage.getItem(LAST_SYNC_KEY);
      
      if (storedOffset !== null) {
        this.offset = parseInt(storedOffset, 10);
      }
      
      if (storedSync !== null) {
        this.lastSyncTime = parseInt(storedSync, 10);
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
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(provider, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const endTime = Date.now();
        const latency = (endTime - systemTime) / 2;
        
        // Handle different API formats
        let serverTime = 0;
        if (data.unixtime) {
             serverTime = (data.unixtime * 1000) + latency; // WorldTimeAPI
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

        localStorage.setItem(STORAGE_KEY, this.offset.toString());
        localStorage.setItem(LAST_SYNC_KEY, this.lastSyncTime.toString());

        console.log(`Time synced via ${provider}. Offset: ${this.offset}ms`);
        return true;

      } catch (error) {
        console.warn(`Time sync failed for ${provider}:`, error);
        // Continue to next provider
      }
    }
    
    this.isSyncing = false;
    return false;
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
  for (let i = 0; i < retries; i++) {
    const success = await timeService.syncTime();
    if (success) {
      break;
    }
    // Wait before retry (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }
};

// Start sync attempt
attemptSync();

export default timeService;
