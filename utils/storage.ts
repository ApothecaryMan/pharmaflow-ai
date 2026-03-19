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
      // Optional: Handle quota exceeded
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
   * Clear specific prefix keys or all (be careful)
   * This is just a wrapper for localStorage.clear()
   */
  clear: (): void => {
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
  },
};
