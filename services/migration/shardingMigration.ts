import { StorageKeys } from '../../config/storageKeys';
import type { Sale, Shift } from '../../types';
import { getShardKey } from '../../utils/sharding';
import { storage } from '../../utils/storage';

/**
 * Migration: Sharding
 * Splits monolithic SALEs and SHIFTs into monthly buckets.
 */
export const runShardingMigration = () => {
  if (typeof localStorage === 'undefined') return;

  const migratedFlag = 'pharma_migration_v2_sharding';
  if (localStorage.getItem(migratedFlag)) return;

  console.log('[Migration] Starting Data Sharding...');

  // --- 1. Migrate Sales ---
  const allSales = storage.get<Sale[]>(StorageKeys.SALES, []);
  if (allSales.length > 0) {
    console.log(`[Migration] Processing ${allSales.length} sales...`);

    // Group by Key
    const shards: Record<string, Sale[]> = {};

    allSales.forEach((sale) => {
      const key = getShardKey(StorageKeys.SALES, sale.date);
      if (!shards[key]) shards[key] = [];
      shards[key].push(sale);
    });

    // Write Shards
    Object.entries(shards).forEach(([key, items]) => {
      storage.set(key, items);
      console.log(`[Migration] Wrote ${items.length} items to ${key}`);
    });

    // Rename old key to backup
    localStorage.setItem(`${StorageKeys.SALES}_BACKUP_V2`, JSON.stringify(allSales));
    localStorage.removeItem(StorageKeys.SALES);
  }

  // --- 2. Migrate Shifts ---
  const allShifts = storage.get<Shift[]>(StorageKeys.SHIFTS, []);
  if (allShifts.length > 0) {
    console.log(`[Migration] Processing ${allShifts.length} shifts...`);

    const shards: Record<string, Shift[]> = {};

    allShifts.forEach((shift) => {
      // Use openTime for sharding
      const key = getShardKey(StorageKeys.SHIFTS, shift.openTime);
      if (!shards[key]) shards[key] = [];
      shards[key].push(shift);
    });

    Object.entries(shards).forEach(([key, items]) => {
      storage.set(key, items);
    });

    localStorage.setItem(`${StorageKeys.SHIFTS}_BACKUP_V2`, JSON.stringify(allShifts));
    localStorage.removeItem(StorageKeys.SHIFTS);
  }

  // Mark complete
  localStorage.setItem(migratedFlag, 'true');
  console.log('[Migration] Sharding Complete.');
};
