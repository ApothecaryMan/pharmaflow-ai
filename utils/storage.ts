import { CURRENT_APP_VERSION, StorageKeys } from '../config/storageKeys';

/**
 * Type-safe interface for storage operations
 */
const SESSION_KEY = StorageKeys.SESSION;

// Keys that should be shared across all users on the same device (UI preferences)
// NOTE: SETTINGS is NOT global — it contains per-user org/branch data (orgId, activeBranchId)
const GLOBAL_KEYS = new Set<string>([
  StorageKeys.STORAGE_VERSION,
  StorageKeys.DARK_MODE,
  StorageKeys.LANGUAGE,
  StorageKeys.THEME,
  StorageKeys.TIME_OFFSET,
  StorageKeys.LAST_SYNC,
  StorageKeys.NAV_STYLE,
  StorageKeys.HEADER_STATS_VISIBLE,
  StorageKeys.PRINTER_SETTINGS,
  StorageKeys.SCREEN_CALIBRATION_RATIO,
  StorageKeys.SETTINGS,
  'pharma_intended_account_type'
]);

// Performance optimizations:
// 1. Cache the session user ID in memory to avoid JSON parsing on every read/write scoping check.
// 2. Cache total usage bytes to prevent disk/IPC overhead of querying localStorage.
// 3. Cache key-value pairs to prevent redundant JSON.parse/getItem calls on hot paths.
let cachedUserId: string | null = null;
let hasLoadedUserId = false;
let cachedUsageBytes: number | null = null;
let isVersionStamped = false;
const memoryCache = new Map<string, unknown>();

// Helper to write directly using a raw (already scoped) key
const setRawKey = (key: string, value: unknown): void => {
  if (typeof localStorage === 'undefined') return;
  const stringValue = JSON.stringify(value);
  localStorage.setItem(key, stringValue);
  memoryCache.set(key, value);
};

// Helper to remove directly using a raw (already scoped) key
const removeRawKey = (key: string): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key);
  memoryCache.delete(key);
};

export const storage = {
  /**
   * Internal helper to get current session user ID
   */
  getUserId: (): string | null => {
    if (typeof localStorage === 'undefined') return null;
    if (hasLoadedUserId) return cachedUserId;
    try {
      const session = localStorage.getItem(SESSION_KEY);
      cachedUserId = session ? JSON.parse(session).userId : null;
      hasLoadedUserId = true;
      return cachedUserId;
    } catch {
      return null;
    }
  },

  /**
   * Internal helper to scope keys by user ID to prevent data leakage
   */
  getScopedKey: (key: string): string => {
    if (typeof localStorage === 'undefined' || key === SESSION_KEY || GLOBAL_KEYS.has(key)) return key;
    
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
      if (storedVersion) {
        console.warn(`[Storage] Version transition from ${storedVersion} to ${CURRENT_APP_VERSION}.`);
        
        // We only clear known volatile caches. Everything else is preserved.
        const VOLATILE_PREFIXES = [
          StorageKeys.INVENTORY,
          StorageKeys.EMPLOYEES,
          StorageKeys.LAST_SYNC,
          'pharma_shifts'
        ];
        
        Object.keys(localStorage).forEach(k => {
          if (VOLATILE_PREFIXES.some(p => k.startsWith(p))) {
            removeRawKey(k);
          }
        });
      }
      
      localStorage.setItem(StorageKeys.STORAGE_VERSION, CURRENT_APP_VERSION);
      cachedUsageBytes = null;
    }
    isVersionStamped = true;
  },

  /**
   * Get total bytes used by localStorage keys and values (UTF-16, 2 bytes per character)
   */
  getUsageBytes: (): number => {
    if (typeof localStorage === 'undefined') return 0;
    if (cachedUsageBytes !== null) return cachedUsageBytes;
    
    try {
      cachedUsageBytes = Object.keys(localStorage).reduce((acc, key) => {
        const val = localStorage.getItem(key) || '';
        return acc + (key.length + val.length) * 2;
      }, 0);
    } catch (e) {
      console.error('[Storage] Error measuring storage usage:', e);
      cachedUsageBytes = 0;
    }
    return cachedUsageBytes;
  },

  /**
   * Get quota and usage details (5MB standard limit)
   */
  getQuotaInfo: (limitBytes: number = 5 * 1024 * 1024) => {
    const usage = storage.getUsageBytes();
    const percentage = limitBytes > 0 ? parseFloat(((usage / limitBytes) * 100).toFixed(1)) : 0;
    return {
      usage,
      limit: limitBytes,
      percentage,
      isCloseToLimit: percentage >= 80,
    };
  },

  /**
   * Get a value from storage
   */
  get: <T>(key: StorageKeys | string, defaultValue: T): T => {
    if (typeof localStorage === 'undefined') return defaultValue;

    const scopedKey = storage.getScopedKey(key);
    
    const isTTL = (obj: unknown): obj is { __pharma_ttl_value: unknown; expiresAt: number } => 
      typeof obj === 'object' && obj !== null && '__pharma_ttl_value' in obj && 'expiresAt' in obj && typeof (obj as Record<string, unknown>).expiresAt === 'number';
    
    // Check memory cache first to bypass IPC/disk read and JSON parsing overhead
    if (memoryCache.has(scopedKey)) {
      const cached = memoryCache.get(scopedKey);

      if (isTTL(cached)) {
        if (Date.now() > cached.expiresAt) {
          storage.remove(key);
          return defaultValue;
        }
        return cached.__pharma_ttl_value as T;
      }
      return cached as T;
    }

    const item = localStorage.getItem(scopedKey);
    if (item === null) return defaultValue;

    try {
      const parsed = JSON.parse(item);
      memoryCache.set(scopedKey, parsed);

      // TTL Validation
      if (isTTL(parsed)) {
        if (Date.now() > parsed.expiresAt) {
          storage.remove(key);
          return defaultValue;
        }
        return parsed.__pharma_ttl_value as T;
      }

      if (typeof parsed === 'string' && parsed === '[object Object]') {
        return defaultValue;
      }
      return parsed as T;
    } catch (error) {
      if (
        typeof item === 'string' &&
        typeof defaultValue === 'string' &&
        !item.trim().startsWith('{') &&
        !item.trim().startsWith('[')
      ) {
        memoryCache.set(scopedKey, item);
        return item as unknown as T;
      }
      return defaultValue;
    }
  },

  /**
   * Set a value in storage
   */
  set: <T>(key: StorageKeys | string, value: T, ttlMs?: number): void => {
    if (typeof localStorage === 'undefined') return;

    if (key === SESSION_KEY) {
      try {
        cachedUserId = value && typeof value === 'object' && 'userId' in value ? (value as { userId: string }).userId : null;
        hasLoadedUserId = true;
      } catch {
        hasLoadedUserId = false;
      }
    }

    try {
      const scopedKey = storage.getScopedKey(key);
      const dataToStore = ttlMs !== undefined
        ? { __pharma_ttl_value: value, expiresAt: Date.now() + ttlMs }
        : value;
      
      memoryCache.set(scopedKey, dataToStore);
      const stringValue = JSON.stringify(dataToStore);
      
      let oldVal: string | null = null;
      if (cachedUsageBytes !== null) {
        oldVal = localStorage.getItem(scopedKey);
      }

      localStorage.setItem(scopedKey, stringValue);
      
      // Update cache after successful write
      if (cachedUsageBytes !== null) {
        const oldLen = oldVal !== null ? (scopedKey.length + oldVal.length) * 2 : 0;
        const newLen = (scopedKey.length + stringValue.length) * 2;
        cachedUsageBytes = cachedUsageBytes - oldLen + newLen;
      }
      
      // Auto-stamp version if missing
      if (!isVersionStamped) {
        if (!localStorage.getItem(StorageKeys.STORAGE_VERSION)) {
          localStorage.setItem(StorageKeys.STORAGE_VERSION, CURRENT_APP_VERSION);
          if (cachedUsageBytes !== null) {
            const newLen = (StorageKeys.STORAGE_VERSION.length + CURRENT_APP_VERSION.length) * 2;
            cachedUsageBytes += newLen;
          }
        }
        isVersionStamped = true;
      }

      // Dispatch simulated StorageEvent locally for same-tab reactivity
      if (typeof window !== 'undefined' && typeof StorageEvent !== 'undefined') {
        const event = new StorageEvent('storage', {
          key: scopedKey,
          newValue: stringValue,
          storageArea: localStorage,
        });
        Object.defineProperty(event, 'isSimulated', { value: true, writable: true, configurable: true });
        window.dispatchEvent(event);
      }
    } catch (err: unknown) {
      console.error(`Error writing storage key "${key}":`, err);
      
      const error = err as Record<string, unknown>;
      const isQuotaError = 
        error?.name === 'QuotaExceededError' || 
        error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error?.code === 22 ||
        error?.number === 0x8007000E;
        
      if (isQuotaError && typeof window !== 'undefined') {
        const event = new CustomEvent('pharma_storage_quota_exceeded', {
          detail: { key, error }
        });
        window.dispatchEvent(event);
      }
    }
  },

  /**
   * Remove a value from storage
   */
  remove: (key: StorageKeys | string): void => {
    if (typeof localStorage === 'undefined') return;

    if (key === SESSION_KEY) {
      cachedUserId = null;
      hasLoadedUserId = true;
    }

    const scopedKey = storage.getScopedKey(key);
    memoryCache.delete(scopedKey);
    
    let oldVal: string | null = null;
    if (cachedUsageBytes !== null) {
      oldVal = localStorage.getItem(scopedKey);
    }

    localStorage.removeItem(scopedKey);

    if (cachedUsageBytes !== null && oldVal !== null) {
      const oldLen = (scopedKey.length + oldVal.length) * 2;
      cachedUsageBytes = Math.max(0, cachedUsageBytes - oldLen);
    }

    if (typeof window !== 'undefined' && typeof StorageEvent !== 'undefined') {
      const event = new StorageEvent('storage', {
        key: scopedKey,
        newValue: null,
        storageArea: localStorage,
      });
      Object.defineProperty(event, 'isSimulated', { value: true, writable: true, configurable: true });
      window.dispatchEvent(event);
    }
  },

  /**
   * Atomically read, increment, and write a numeric counter.
   */
  increment: (key: string, defaultValue: number = 0): number => {
    if (typeof localStorage === 'undefined') return defaultValue + 1;
    try {
      const scopedKey = storage.getScopedKey(key);
      const raw = localStorage.getItem(scopedKey);
      const current = raw !== null ? (JSON.parse(raw) as number) : defaultValue;
      const next = current + 1;
      storage.set(key, next);
      return next;
    } catch (error) {
      console.error(`Error incrementing storage key "${key}":`, error);
      return defaultValue + 1;
    }
  },

  /**
   * Clear all storage values and reset caches
   */
  clear: (): void => {
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
    memoryCache.clear();
    cachedUserId = null;
    hasLoadedUserId = false;
    cachedUsageBytes = 0;
    isVersionStamped = false;
  },

  /**
   * Reset in-memory caches without touching localStorage.
   * Call this on logout to prevent stale data leaking into the next session.
   */
  resetCaches: (): void => {
    memoryCache.clear();
    cachedUserId = null;
    hasLoadedUserId = false;
    cachedUsageBytes = null;
  },

  /**
   * Performs periodic/initial cleanup of expired closed tabs and stale branch keys.
   */
  performCleanup: (activeBranchId: string, availableBranchIds: string[]): void => {
    if (typeof localStorage === 'undefined') return;

    try {
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      // 1. Maintain access registry
      const ACCESS_REGISTRY_KEY = 'pharma_branch_last_access';
      const accessRegistry = storage.get<Record<string, number>>(ACCESS_REGISTRY_KEY, {});
      
      if (activeBranchId) {
        accessRegistry[activeBranchId] = now;
      }
      
      availableBranchIds.forEach(id => {
        if (!accessRegistry[id]) {
          accessRegistry[id] = now;
        }
      });
      
      storage.set(ACCESS_REGISTRY_KEY, accessRegistry);

      // 2. Scan and prune closed tabs older than 7 days
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('pharma_pos_closed_tabs_') || key.startsWith('pharma_purchase_closed_tabs_')) {
          try {
            const rawVal = localStorage.getItem(key);
            if (rawVal) {
              const closedTabs = JSON.parse(rawVal);
              if (Array.isArray(closedTabs)) {
                const activeClosed = closedTabs.filter((tab: { closedAt?: number } | null) => {
                  return tab && (typeof tab.closedAt !== 'number' || now - tab.closedAt <= SEVEN_DAYS_MS);
                });
                if (activeClosed.length !== closedTabs.length) {
                  setRawKey(key, activeClosed);
                }
              }
            }
          } catch (e) {
            console.error(`[Storage] Failed to prune closed tabs for key ${key}:`, e);
          }
        }
      });

      // 3. Identify and delete stale branches (inactive for >30 days or no longer exists)
      const registryBranchIds = Object.keys(accessRegistry);
      const branchesToDelete: string[] = [];

      registryBranchIds.forEach(branchId => {
        const lastAccess = accessRegistry[branchId];
        const isNotAvailable = !availableBranchIds.includes(branchId);
        const isStale = now - lastAccess > THIRTY_DAYS_MS;

        if (branchId !== activeBranchId && (isNotAvailable || isStale)) {
          branchesToDelete.push(branchId);
        }
      });

      if (branchesToDelete.length > 0) {
        allKeys.forEach(key => {
          const hasBranch = branchesToDelete.some(branchId => 
            key.includes(`_${branchId}`) || key.includes(`purchases_cart_${branchId}`)
          );
          if (hasBranch) {
            removeRawKey(key);
          }
        });

        // Prune from registry
        branchesToDelete.forEach(branchId => {
          delete accessRegistry[branchId];
        });
        storage.set(ACCESS_REGISTRY_KEY, accessRegistry);
      }
      cachedUsageBytes = null; // Force recalculation after bulk pruning
    } catch (error) {
      console.error('[Storage] Error during cleanup operation:', error);
    }
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SESSION_KEY) {
      hasLoadedUserId = false;
    }
    if (!('isSimulated' in e && e.isSimulated)) {
      cachedUsageBytes = null;
      if (e.key) {
        memoryCache.delete(e.key);
      } else {
        memoryCache.clear();
      }
    }
  });
}


