import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storage } from './storage';
import { StorageKeys } from '../config/storageKeys';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
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
    localStorage.setItem(StorageKeys.INVENTORY, '{invalid-json');
    
    const result = storage.get(StorageKeys.INVENTORY, 'default');
    expect(result).toBe('default');
  });

  it('should remove item correctly', () => {
    storage.set(StorageKeys.INVENTORY, ['data']);
    storage.remove(StorageKeys.INVENTORY);
    
    expect(localStorage.getItem(StorageKeys.INVENTORY)).toBeNull();
  });
});
