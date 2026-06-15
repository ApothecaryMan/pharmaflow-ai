import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageKeys } from '../config/storageKeys';
import { storage } from './storage';

describe('StorageService', () => {
  beforeEach(() => {
    storage.clear();
  });

  afterEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  it('should return default value if key does not exist', () => {
    const result = storage.get(StorageKeys.INVENTORY, []);
    expect(result).toEqual([]);
  });

  it('should save and retrieve data correctly', () => {
    const testData = [{ id: 1, name: 'Test Drug' }];
    storage.set(StorageKeys.INVENTORY, testData);

    const result = storage.get(StorageKeys.INVENTORY, []);
    expect(result).toEqual(testData);
  });

  it('should handle invalid JSON gracefully', () => {
    // Manually corrupt localStorage
    localStorage.setItem(storage.getScopedKey(StorageKeys.INVENTORY), '{invalid-json');

    const result = storage.get(StorageKeys.INVENTORY, 'default');
    expect(result).toBe('default');
  });

  it('should remove item correctly', () => {
    storage.set(StorageKeys.INVENTORY, ['data']);
    storage.remove(StorageKeys.INVENTORY);

    expect(localStorage.getItem(storage.getScopedKey(StorageKeys.INVENTORY))).toBeNull();
  });

  describe('TTL Expiration Mechanism', () => {
    it('should support TTL and expire items correctly', () => {
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValue(100000);

      storage.set('test_ttl', 'hello_world', 5000); // Expires at 105000
      expect(storage.get('test_ttl', 'default')).toBe('hello_world');

      nowSpy.mockReturnValue(106000); // 6 seconds later
      expect(storage.get('test_ttl', 'default')).toBe('default');

      nowSpy.mockRestore();
    });

    it('should return default value for expired keys and remove them', () => {
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValue(100000);

      storage.set('test_ttl_2', 'temp_value', 1000); // Expires at 101000
      nowSpy.mockReturnValue(102000); // Expired

      const val = storage.get('test_ttl_2', 'fallback');
      expect(val).toBe('fallback');

      // Ensure it is removed from localStorage
      const scopedKey = storage.getScopedKey('test_ttl_2');
      expect(localStorage.getItem(scopedKey)).toBeNull();

      nowSpy.mockRestore();
    });
  });

  describe('Storage Quota and Usage', () => {
    it('should measure storage usage in bytes correctly', () => {
      storage.clear();
      expect(storage.getUsageBytes()).toBe(0);

      // Auto-stamp the storage version first so it doesn't change during storage.set
      storage.validateVersion();
      const initialBytes = storage.getUsageBytes();

      const key = 'test_usage_key';
      const val = 'test_value';
      storage.set(key, val);

      const scopedKey = storage.getScopedKey(key);
      const storedVal = localStorage.getItem(scopedKey) || '';

      // UTF-16 characters are 2 bytes each
      const expectedBytes = initialBytes + (scopedKey.length + storedVal.length) * 2;
      expect(storage.getUsageBytes()).toBe(expectedBytes);
    });

    it('should calculate quota info properly', () => {
      storage.clear();
      const infoEmpty = storage.getQuotaInfo(1000);
      expect(infoEmpty.usage).toBe(0);
      expect(infoEmpty.percentage).toBe(0);
      expect(infoEmpty.isCloseToLimit).toBe(false);

      storage.set('a', 'b'); // Scoped key + stored val
      const infoFilled = storage.getQuotaInfo(100);
      expect(infoFilled.percentage).toBeGreaterThan(0);
    });

    it('should cache usage bytes and update incrementally on set and remove', () => {
      storage.clear();

      // Initially, it should fetch and cache the length
      expect(storage.getUsageBytes()).toBe(0);

      // Auto-stamp the storage version first so it doesn't change during storage.set
      storage.validateVersion();
      const initialBytes = storage.getUsageBytes();

      // Let's spy on localStorage.getItem to verify it is NOT called when using the cache
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      // This call should hit the cache and NOT call localStorage.getItem
      const bytes = storage.getUsageBytes();
      expect(bytes).toBe(initialBytes);
      expect(getItemSpy).not.toHaveBeenCalled();

      // Now set a key; it should update the cache
      storage.set('test_cache_key', 'value');

      // Restore spy to track subsequent reads
      getItemSpy.mockClear();

      const scopedKey = storage.getScopedKey('test_cache_key');
      const expectedNewBytes =
        initialBytes + (scopedKey.length + JSON.stringify('value').length) * 2;

      // Verify cached bytes matches expected bytes
      expect(storage.getUsageBytes()).toBe(expectedNewBytes);
      // Verify no direct getItem calls occurred to compute the usage during read
      expect(getItemSpy).not.toHaveBeenCalled();

      // Now remove the key; it should update cache back to initialBytes
      getItemSpy.mockClear();
      storage.remove('test_cache_key');

      // Verify the remove call itself checks the old value using getItem once
      expect(getItemSpy).toHaveBeenCalledTimes(1);
      expect(getItemSpy).toHaveBeenLastCalledWith(scopedKey);

      getItemSpy.mockClear();
      expect(storage.getUsageBytes()).toBe(initialBytes);
      // Verify no getItem calls occurred during the read (cache hit)
      expect(getItemSpy).not.toHaveBeenCalled();

      getItemSpy.mockRestore();
    });

    it('should dispatch custom event on QuotaExceededError', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      });

      let eventDispatched = false;
      const listener = (e: any) => {
        eventDispatched = true;
        expect(e.detail.key).toBe('test_quota_exceed');
      };

      window.addEventListener('pharma_storage_quota_exceeded', listener);

      storage.set('test_quota_exceed', 'some_data');

      expect(eventDispatched).toBe(true);

      window.removeEventListener('pharma_storage_quota_exceeded', listener);
      setItemSpy.mockRestore();
    });
  });

  describe('Cleanup Policies', () => {
    it('should prune closed tabs older than 7 days', () => {
      const nowSpy = vi.spyOn(Date, 'now');
      const now = 1000000000;
      nowSpy.mockReturnValue(now);

      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      const tabs = [
        { id: 'tab1', closedAt: now - 1000 }, // 1s ago (keep)
        { id: 'tab2', closedAt: now - SEVEN_DAYS_MS - 5000 }, // >7 days ago (prune)
        { id: 'tab3', closedAt: now - SEVEN_DAYS_MS + 5000 }, // <7 days ago (keep)
      ];

      const scopedKey = storage.getScopedKey('pharma_pos_closed_tabs_1');
      localStorage.setItem(scopedKey, JSON.stringify(tabs));

      storage.performCleanup('branch-1', ['branch-1']);

      const parsed = JSON.parse(localStorage.getItem(scopedKey) || '[]');
      expect(parsed.length).toBe(2);
      expect(parsed.map((t: any) => t.id)).toContain('tab1');
      expect(parsed.map((t: any) => t.id)).toContain('tab3');
      expect(parsed.map((t: any) => t.id)).not.toContain('tab2');

      nowSpy.mockRestore();
    });

    it('should delete stale branches and their keys', () => {
      const nowSpy = vi.spyOn(Date, 'now');
      const now = 1000000000;
      nowSpy.mockReturnValue(now);

      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      // Setup registry
      const ACCESS_REGISTRY_KEY = 'pharma_branch_last_access';
      const registry = {
        'branch-active': now,
        'branch-stale': now - THIRTY_DAYS_MS - 10000, // stale (>30 days)
        'branch-gone-stale': now - THIRTY_DAYS_MS - 50000, // not in available & stale
        'branch-gone-recent': now - 5000, // not in available but recent
      };

      storage.set(ACCESS_REGISTRY_KEY, registry);

      // Create dummy keys
      localStorage.setItem('key_branch-active', 'active');
      localStorage.setItem('key_branch-stale', 'stale');
      localStorage.setItem('key_branch-gone-stale', 'gone-stale');
      localStorage.setItem('key_branch-gone-recent', 'gone-recent');

      // available branches list only contains branch-active and branch-stale
      storage.performCleanup('branch-active', ['branch-active', 'branch-stale']);

      // 1. branch-active: active, preserved.
      expect(localStorage.getItem('key_branch-active')).toBe('active');

      // 2. branch-stale: stale (>30 days), must be deleted even if it was in available.
      expect(localStorage.getItem('key_branch-stale')).toBeNull();

      // 3. branch-gone-stale: not in available and stale, must be deleted.
      expect(localStorage.getItem('key_branch-gone-stale')).toBeNull();

      // 4. branch-gone-recent: not in available, must be deleted immediately.
      expect(localStorage.getItem('key_branch-gone-recent')).toBeNull();

      // Check remaining in registry
      const finalRegistry = storage.get<Record<string, number>>(ACCESS_REGISTRY_KEY, {});
      expect(finalRegistry['branch-active']).toBeDefined();
      expect(finalRegistry['branch-stale']).toBeUndefined();
      expect(finalRegistry['branch-gone-stale']).toBeUndefined();
      expect(finalRegistry['branch-gone-recent']).toBeUndefined();

      nowSpy.mockRestore();
    });
  });

  describe('In-Memory Caching', () => {
    it('should cache retrieved values in memory and avoid redundant localStorage reads', () => {
      storage.set('test_mem_cache', { val: 42 });

      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      // First read should hit memory cache (because set populated it)
      const result1 = storage.get('test_mem_cache', null);
      expect(result1).toEqual({ val: 42 });
      expect(getItemSpy).not.toHaveBeenCalled();

      // Setup a value directly in localStorage
      const scopedKey = storage.getScopedKey('test_clean_get');
      localStorage.setItem(scopedKey, JSON.stringify({ val: 99 }));
      getItemSpy.mockClear();

      // First read from localStorage should populate cache
      const res1 = storage.get('test_clean_get', null);
      expect(res1).toEqual({ val: 99 });
      expect(getItemSpy).toHaveBeenCalledTimes(1);

      // Second read should hit memory cache
      getItemSpy.mockClear();
      const res2 = storage.get('test_clean_get', null);
      expect(res2).toEqual({ val: 99 });
      expect(getItemSpy).not.toHaveBeenCalled();

      getItemSpy.mockRestore();
    });
  });
});
