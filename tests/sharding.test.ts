/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageKeys } from '../config/storageKeys';
import { runShardingMigration } from '../services/migration/shardingMigration';
import { salesService } from '../services/sales/salesService';
import { idGenerator } from '../utils/idGenerator';
import { getShardKey } from '../utils/sharding';
import { storage } from '../utils/storage';

// Mock settings service to avoid dependency on real settings
vi.mock('../services/settings/settingsService', () => ({
  settingsService: {
    getAll: async () => ({ branchCode: 'B1' }),
  },
}));

describe('Data Sharding & Migration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should migrate monolithic sales data into monthly shards', () => {
    // 1. Seed Legacy Data (Monolithic)
    const legacySales = [
      { id: 'S1', date: '2024-01-15T10:00:00Z', total: 100, branchId: 'B1' }, // Jan 2024
      { id: 'S2', date: '2024-02-15T10:00:00Z', total: 200, branchId: 'B1' }, // Feb 2024
      { id: 'S3', date: '2025-01-01T10:00:00Z', total: 300, branchId: 'B1' }, // Jan 2025
    ];
    localStorage.setItem(StorageKeys.SALES, JSON.stringify(legacySales));

    // 2. Run Migration
    runShardingMigration();

    // 3. Verify Legacy Key is gone/backup
    expect(localStorage.getItem(StorageKeys.SALES)).toBeNull();
    expect(localStorage.getItem(`${StorageKeys.SALES}_BACKUP_V2`)).not.toBeNull();

    // 4. Verify Shards exist
    const shardJan24 = storage.get(getShardKey(StorageKeys.SALES, '2024-01-01'), []);
    const shardFeb24 = storage.get(getShardKey(StorageKeys.SALES, '2024-02-01'), []);
    const shardJan25 = storage.get(getShardKey(StorageKeys.SALES, '2025-01-01'), []);

    // 5. Check Content
    expect(shardJan24).toHaveLength(1);
    expect(shardJan24[0].id).toBe('S1');
    
    expect(shardFeb24).toHaveLength(1);
    expect(shardFeb24[0].id).toBe('S2');

    expect(shardJan25).toHaveLength(1);
    expect(shardJan25[0].id).toBe('S3');
  });

  it('should create new sales in the correct monthly shard', async () => {
    // 1. Create a sale for today
    const today = new Date(); // e.g., 2025-02
    const newSale = {
      date: today.toISOString(),
      total: 500,
      customerCode: 'CUST1',
      paymentMethod: 'cash',
      items: [],
    };

    await salesService.create(newSale as any);

    // 2. Check Shard
    const currentShardKey = getShardKey(StorageKeys.SALES, today);
    const shard = storage.get<any[]>(currentShardKey, []);
    
    expect(shard).toHaveLength(1);
    expect(shard[0].total).toBe(500);
  });

  it('should load sales from active shards (Current + Previous Month)', async () => {
    // 1. Setup Shards directly
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(today.getMonth() - 2);

    const keyCurrent = getShardKey(StorageKeys.SALES, today);
    const keyLast = getShardKey(StorageKeys.SALES, lastMonth);
    const keyOld = getShardKey(StorageKeys.SALES, twoMonthsAgo);

    storage.set(keyCurrent, [{ id: 'CURRENT', date: today.toISOString(), branchId: 'B1' }]);
    storage.set(keyLast, [{ id: 'LAST', date: lastMonth.toISOString(), branchId: 'B1' }]);
    storage.set(keyOld, [{ id: 'OLD', date: twoMonthsAgo.toISOString(), branchId: 'B1' }]);

    // 2. Call getAll()
    const result = await salesService.getAll();

    // 3. Verify: Should contain CURRENT and LAST, but NOT OLD
    const ids = result.map(s => s.id);
    expect(ids).toContain('CURRENT');
    expect(ids).toContain('LAST');
    expect(ids).not.toContain('OLD');
  });

  it('should heal idGenerator sequence from sharded data', () => {
    // 1. Simulate existing sharded data (e.g. max ID is 5)
    // We intentionally DO NOT set StorageKeys.SEQUENCES
    const today = new Date();
    const key = getShardKey(StorageKeys.SALES, today);
    const existingSales = [
       { id: 'B1-0001', date: today.toISOString() },
       { id: 'B1-0005', date: today.toISOString() }, // Gap intended
    ];
    storage.set(key, existingSales);

    // 2. Generate new ID
    const newId = idGenerator.generate('sales');

    // 3. Expect B1-0006 (Healed from 5 + 1)
    expect(newId).toBe('B1-0006');
    
    // 4. Verify sequence is saved
    const seq = storage.get<any>(StorageKeys.SEQUENCES, {});
    expect(seq.sales).toBe(6);
  });

  it('should handle return of an old sale (from inactive shard)', async () => {
    // 1. Create a sale 3 months ago (Inactive Shard)
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 3);
    const oldKey = getShardKey(StorageKeys.SALES, oldDate);
    
    const oldSale = { 
      id: 'S-OLD-1', 
      date: oldDate.toISOString(), 
      total: 100,
      items: [],
      branchId: 'B1' 
    };
    storage.set(oldKey, [oldSale]);

    // 2. Mock salesService.getById to search globally if not found in cache
    // Currently salesService.getById searches "all", which is only active shards.
    // This test expects it to FAIL initially, proving we need a fix.
    
    // We expect this to return the sale now (Fixed logic)
    const foundSale = await salesService.getById('S-OLD-1');
    
    expect(foundSale).not.toBeNull();
    expect(foundSale?.id).toBe('S-OLD-1');
  });
});
