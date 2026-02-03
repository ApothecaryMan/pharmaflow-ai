import { StorageKeys } from '../../config/storageKeys';
import type { Drug } from '../../types';
import { validateStock } from '../../utils/inventory';

/**
 * Migration service for handling inventory data migrations.
 * Provides centralized migration logic and rollback capabilities.
 */

interface MigrationResult {
  hasUpdates: boolean;
  migratedInventory: Drug[];
}

/**
 * Run all inventory migrations
 * - Code Migration: Convert legacy internal codes to 6-digit format
 * - Unit Migration: Convert pack-based stock to unit-based
 */
export function runMigrations(inventory: Drug[]): MigrationResult {
  let migratedInventory = [...inventory];
  let hasUpdates = false;

  // 1. Code Migration - Convert to 6-digit format
  const needsCodeMigration = inventory.some(
    (d) =>
      d.internalCode &&
      (!/^\d{6}$/.test(d.internalCode) ||
        d.internalCode.includes('-') ||
        d.internalCode.includes('REAL') ||
        d.internalCode.includes('INT'))
  );

  if (needsCodeMigration) {
    if (import.meta.env.DEV) {
      console.log('[Migration] Converting inventory codes to 6-digit number format...');
    }
    migratedInventory = migratedInventory.map((d, index) => {
      if (!d.internalCode || !/^\d{6}$/.test(d.internalCode)) {
        return {
          ...d,
          internalCode: (index + 1).toString().padStart(6, '0'),
        };
      }
      return d;
    });
    hasUpdates = true;
  }

  // 2. Unit-Based Inventory Migration
  const isMigratedToUnits = localStorage.getItem(StorageKeys.MIGRATION_V1_UNITS);

  if (!isMigratedToUnits) {
    if (import.meta.env.DEV) {
      console.log('[Migration] STARTING: Converting Stock to Total Units...');
    }

    // A. BACKUP
    try {
      localStorage.setItem(StorageKeys.MIGRATION_BACKUP, JSON.stringify(inventory));
      if (import.meta.env.DEV) {
        console.log('[Migration] Backup created:', StorageKeys.MIGRATION_BACKUP);
      }
    } catch (error) {
      console.warn('[Migration] Backup failed: Storage Quota Exceeded. Proceeding without backup.');
    }

    // B. ROLLBACK MECHANISM (Development Only)
    if (import.meta.env.DEV) {
      (window as any).rollbackMigrationV1 = () => {
        const backup = localStorage.getItem(StorageKeys.MIGRATION_BACKUP);
        if (backup) {
          localStorage.setItem(StorageKeys.INVENTORY, backup);
          localStorage.removeItem(StorageKeys.MIGRATION_V1_UNITS);
          alert('Rollback successful. Reloading...');
          window.location.reload();
        } else {
          alert('No backup found (likely due to storage limits).');
        }
      };
      console.info('[Migration] To rollback, run: window.rollbackMigrationV1()');
    }

    // C. MIGRATE LOGIC
    migratedInventory = migratedInventory.map((d) => {
      const isLikelyPacks = d.stock < 1000 || !Number.isInteger(d.stock);

      if (isLikelyPacks) {
        const units = d.unitsPerPack || 1;
        const newStock = Math.round(d.stock * units); // Convert to Total Units
        return { ...d, stock: validateStock(newStock) };
      }
      return { ...d, stock: validateStock(d.stock) };
    });

    hasUpdates = true;
    localStorage.setItem(StorageKeys.MIGRATION_V1_UNITS, 'true');

    if (import.meta.env.DEV) {
      console.log('[Migration] Complete:', StorageKeys.MIGRATION_V1_UNITS, '= true');
    }
  }

  return { hasUpdates, migratedInventory };
}

/**
 * Migration service singleton
 */
export const migrationService = {
  runMigrations,
};

export default migrationService;
