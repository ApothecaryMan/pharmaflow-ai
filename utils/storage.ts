import type { StorageKeys } from '../config/storageKeys';

/**
 * Type-safe interface for storage operations
 */
export const storage = {
  /**
   * Get a value from storage
   * @param key The storage key
   * @param defaultValue Default value if key doesn't exist or is invalid
   */
  get: <T>(key: StorageKeys | string, defaultValue: T): T => {
    if (typeof localStorage === 'undefined') return defaultValue;

    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;

    try {
      return JSON.parse(item) as T;
    } catch (error) {
      // Robustness check: if it's not valid JSON, return it as a raw string if possible
      return item as unknown as T;
    }
  },

  /**
   * Set a value in storage
   * @param key The storage key
   * @param value The value to store
   */
  set: <T>(key: StorageKeys | string, value: T): void => {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(value));

      // Dispatch a custom event to notify other components/tabs if needed
      // (The standard 'storage' event only fires in other tabs, not the current one)
      // if (typeof window !== 'undefined') window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.error(`Error writing storage key "${key}":`, error);
      const isQuotaError = error instanceof Error && 
        (error.name === 'QuotaExceededError' || error.message.toLowerCase().includes('quota'));
      if (isQuotaError) {
        console.error('CRITICAL: LocalStorage Quota Exceeded. Data loss may occur.');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('storage-quota-exceeded'));
        }
      }
    }
  },

  /**
   * Remove a value from storage
   * @param key The storage key
   */
  remove: (key: StorageKeys | string): void => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },

  /**
   * Atomically read, increment, and write a numeric counter.
   * Minimizes the race window between read and write (single synchronous call).
   * @param key The storage key
   * @param defaultValue Starting value if key doesn't exist (default: 0)
   * @returns The NEW value after incrementing
   */
  increment: (key: string, defaultValue: number = 0): number => {
    if (typeof localStorage === 'undefined') return defaultValue + 1;
    try {
      const raw = localStorage.getItem(key);
      const current = raw !== null ? (JSON.parse(raw) as number) : defaultValue;
      const next = current + 1;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    } catch (error) {
      console.error(`Error incrementing storage key "${key}":`, error);
      return defaultValue + 1;
    }
  },

  /**
   * Clear specific prefix keys or all (be careful)
   * This is just a wrapper for localStorage.clear()
   */
  clear: (): void => {
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
  },
};
