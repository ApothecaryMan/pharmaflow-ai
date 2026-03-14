/**
 * ID Generator Utility
 *
 * Implements "Prefix Strategy" (BranchCode-Sequence) for entity IDs.
 * Features:
 * - Centralized sequence management
 * - Self-healing (finds max existing ID on startup/first run)
 * - Zero padding (e.g., B1-0042)
 * - Sequential access pattern (single-threaded environment)
 * - No circular dependencies (reads storage directly)
 */

import { StorageKeys } from '../config/storageKeys';
import type { AppSettings } from '../services/settings/types';
import { getAllShardKeys } from './sharding';
import { storage } from './storage';

// Supported Entity Types
export type EntityType =
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'employees'
  | 'purchases'
  | 'returns'
  | 'shifts'
  | 'transactions'
  | 'tabs'
  | 'batch'
  | 'movement'
  | 'returnItem'
  | 'branches'
  | 'customers-serial'
  | 'notification'
  | 'barcodes'
  | 'receipts'
  | 'generic';

// Sequence Map Interface
export interface SequenceMap {
  [key: string]: number;
}

const DEFAULT_BRANCH_CODE = 'B1';
const ID_PADDING = 4; // B1-0001
const GLOBAL_PREFIX = 'PF'; // Systems/Branches use PF instead of BranchCode

/**
 * Parses an ID to extract its sequence number
 * @param id The ID string (e.g., "B1-0042")
 * @returns The sequence number (e.g., 42) or 0 if invalid
 */
const extractSequence = (id: string): number => {
  if (!id || typeof id !== 'string') return 0;
  const parts = id.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  return isNaN(seq) ? 0 : seq;
};

/**
 * Scans provided data to find the highest sequence number
 * Used for self-healing when sequence storage is lost or out of sync
 */
const findMaxSequence = <T extends { id: string }>(data: T[]): number => {
  if (!data || data.length === 0) return 0;
  return data.reduce((max, item) => {
    const seq = extractSequence(item.id);
    return seq > max ? seq : max;
  }, 0);
};

/**
 * Initializes or heals the sequence for a specific entity type within a branch
 * @param type The entity type to heal
 * @param branchCode The branch code to filter by (e.g., "B1")
 * @param currentSequence The currently known sequence
 */
const healSequence = (type: EntityType, branchCode: string, currentSequence: number): number => {
  let maxExisting = 0;
  let data: any[] = [];

  const filterByBranch = (items: any[]) => items.filter(val => {
    if (!val.id) return false;
    return val.id.startsWith(`${branchCode}-`);
  });

  try {
    switch (type) {
      case 'branches':
        data = storage.get(StorageKeys.BRANCHES, []);
        break;
      case 'sales': {
        const keys = getAllShardKeys(StorageKeys.SALES);
        for (const key of keys) {
          const shardData = storage.get<any[]>(key, []);
          maxExisting = Math.max(maxExisting, findMaxSequence(filterByBranch(shardData)));
        }
        return Math.max(currentSequence, maxExisting);
      }
      case 'inventory':
        data = filterByBranch(storage.get(StorageKeys.INVENTORY, []));
        break;
      case 'customers':
      case 'customers-serial':
        data = filterByBranch(storage.get(StorageKeys.CUSTOMERS, []));
        break;
      case 'suppliers':
        data = filterByBranch(storage.get(StorageKeys.SUPPLIERS, []));
        break;
      case 'employees':
        data = filterByBranch(storage.get(StorageKeys.EMPLOYEES, []));
        break;
      case 'purchases':
        data = filterByBranch(storage.get(StorageKeys.PURCHASES, []));
        break;
      case 'returns': {
        const salesReturns = filterByBranch(storage.get(StorageKeys.RETURNS, []));
        const purchaseReturns = filterByBranch(storage.get(StorageKeys.PURCHASE_RETURNS, []));
        data = [...salesReturns, ...purchaseReturns];
        break;
      }
      case 'shifts': {
        const keys = getAllShardKeys(StorageKeys.SHIFTS);
        for (const key of keys) {
          const shardData = storage.get<any[]>(key, []);
          maxExisting = Math.max(maxExisting, findMaxSequence(filterByBranch(shardData)));
        }
        return Math.max(currentSequence, maxExisting);
      }
      case 'movement':
        data = filterByBranch(storage.get(StorageKeys.STOCK_MOVEMENTS, []));
        break;
      case 'batch':
        data = filterByBranch(storage.get(StorageKeys.STOCK_BATCHES, []));
        break;
      case 'notification':
        data = filterByBranch(storage.get(StorageKeys.NOTIFICATIONS, []));
        break;
      case 'barcodes':
        data = filterByBranch(storage.get(StorageKeys.LABEL_TEMPLATES, []));
        break;
      case 'receipts':
        data = filterByBranch(storage.get(StorageKeys.RECEIPT_TEMPLATES, []));
        break;
    }

    maxExisting = Math.max(maxExisting, findMaxSequence(data));
  } catch (e) {
    console.warn(`Failed to heal sequence for ${type} in branch ${branchCode}`, e);
  }

  return Math.max(currentSequence, maxExisting);
};

export const idGenerator = {
  /**
   * Generates the next ID for a given entity type
   * @param type The type of entity (e.g., 'sales', 'inventory')
   * @param branchCode Optional branch code to use. If not provided, reads from settings.
   * @returns Formatted ID string (e.g., "B1-1050")
   */
  generate: (type: EntityType, branchCode?: string): string => {
    // 1. Get Branch Code: parameter > storage > default
    let effectiveBranchCode = branchCode;
    
    // Global entities (like system-wide branches) use PF prefix
    if (type === 'branches' || type === 'generic') {
      effectiveBranchCode = GLOBAL_PREFIX;
    } else if (!effectiveBranchCode) {
      const settings = storage.get<Partial<AppSettings>>(StorageKeys.SETTINGS, {});
      effectiveBranchCode = settings.branchCode || DEFAULT_BRANCH_CODE;
    }

    // 2. Get current sequences for this specific branch
    const seqKey = `${StorageKeys.SEQUENCES}_${effectiveBranchCode}`;
    const sequences = storage.get<SequenceMap>(seqKey, {});

    // 3. Determine current sequence value
    let currentSeq = sequences[type] || 0;

    // 4. Critical: Self-Healing Check
    // If sequence is 0 (fresh start or cleared cache), try to heal for this branch
    if (currentSeq === 0) {
      currentSeq = healSequence(type, effectiveBranchCode!, 0);
    }

    // 5. Increment
    const nextSeq = currentSeq + 1;

    // 6. Save immediately to the branch-specific key
    storage.set(seqKey, {
      ...sequences,
      [type]: nextSeq,
    });

    // 7. Format and Return
    return `${effectiveBranchCode}-${nextSeq.toString().padStart(ID_PADDING, '0')}`;
  },
};
