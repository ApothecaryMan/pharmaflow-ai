import { CURRENT_APP_VERSION, StorageKeys } from '../config/storageKeys';

/**
 * Type-safe interface for storage operations
 */
const SESSION_KEY = 'branch_pilot_session';

// Keys that should be shared across all users on the same device (UI preferences)
const GLOBAL_KEYS: string[] = [
  StorageKeys.STORAGE_VERSION,
  StorageKeys.DARK_MODE,
  StorageKeys.LANGUAGE,
  StorageKeys.THEME,
  StorageKeys.TIME_OFFSET,
  StorageKeys.LAST_SYNC,
  StorageKeys.NAV_STYLE,
  StorageKeys.HEADER_STATS_VISIBLE
];


export const storage = {
  /**
   * Internal helper to get current session user ID
   */
  getUserId: (): string | null => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session).userId : null;
    } catch {
      return null;
    }
  },

  /**
   * Internal helper to scope keys by user ID to prevent data leakage
   */
  getScopedKey: (key: string): string => {
    if (typeof localStorage === 'undefined' || key === SESSION_KEY || GLOBAL_KEYS.includes(key)) return key;
    
    const userId = storage.getUserId();
    return userId ? `${key}_${userId}` : key;
  },

  /**
   * Validates the storage version and clears if necessary to prevent crashes on update.
   */
  validateVersion: (): void => {
    if (typeof localStorage === 'undefined') return;
    
    const storedVersion = localStorage.getItem(StorageKeys.STORAGE_VERSION);
    if (storedVersion !== CURRENT_APP_VERSION) {
      console.warn(`[Storage] Version mismatch! Current: ${CURRENT_APP_VERSION}, Stored: ${storedVersion}. Clearing storage for stability.`);
      
      // Preserve critical auth session if possible, but for breaking changes, clear all
      const session = localStorage.getItem(SESSION_KEY);
      
      localStorage.clear();
      
      // Restore session to prevent logout if it was a minor update, 
      // but if the user requested "مسح التخزين تلقائياً", we follow.
      // However, usually we keep session to avoid frustration unless specifically told.
      // Given the prompt says "مسح التخزين تلقائياً", I will clear ALL.
      
      localStorage.setItem(StorageKeys.STORAGE_VERSION, CURRENT_APP_VERSION);
    }
  },

  /**
   * Get a value from storage
   */
  get: <T>(key: StorageKeys | string, defaultValue: T): T => {
    if (typeof localStorage === 'undefined') return defaultValue;

    const scopedKey = storage.getScopedKey(key);
    const item = localStorage.getItem(scopedKey);
    if (item === null) return defaultValue;

    try {
      const parsed = JSON.parse(item);
      // Extra safety: if it parsed to a string "[object Object]", it's garbage
      if (typeof parsed === 'string' && parsed === '[object Object]') {
        return defaultValue;
      }
      return parsed as T;
    } catch (error) {
      // If it's a raw string that was not JSON stringified, return as is if T is string
      if (typeof item === 'string' && typeof defaultValue === 'string') {
        return item as unknown as T;
      }
      return defaultValue;
    }
  },

  /**
   * Set a value in storage
   */
  set: <T>(key: StorageKeys | string, value: T): void => {
    if (typeof localStorage === 'undefined') return;

    try {
      const scopedKey = storage.getScopedKey(key);
      localStorage.setItem(scopedKey, JSON.stringify(value));
      
      // Auto-stamp version if missing
      if (!localStorage.getItem(StorageKeys.STORAGE_VERSION)) {
        localStorage.setItem(StorageKeys.STORAGE_VERSION, CURRENT_APP_VERSION);
      }
    } catch (error) {
      console.error(`Error writing storage key "${key}":`, error);
    }
  },

  /**
   * Remove a value from storage
   */
  remove: (key: StorageKeys | string): void => {
    if (typeof localStorage === 'undefined') return;
    const scopedKey = storage.getScopedKey(key);
    localStorage.removeItem(scopedKey);
  },

  /**
   * Atomically read, increment, and write a numeric counter.
   * Scoped to the current user.
   */
  increment: (key: string, defaultValue: number = 0): number => {
    if (typeof localStorage === 'undefined') return defaultValue + 1;
    try {
      const scopedKey = storage.getScopedKey(key);
      const raw = localStorage.getItem(scopedKey);
      const current = raw !== null ? (JSON.parse(raw) as number) : defaultValue;
      const next = current + 1;
      localStorage.setItem(scopedKey, JSON.stringify(next));
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

