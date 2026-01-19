/**
 * ID Generator Utility
 * 
 * Implements "Prefix Strategy" (BranchCode-Sequence) for entity IDs.
 * Features:
 * - Centralized sequence management
 * - Self-healing (finds max existing ID on startup/first run)
 * - Zero padding (e.g., B1-0042)
 * - Concurrency safety (reads latest before write)
 * - No circular dependencies (reads storage directly)
 */

import { storage } from './storage';
import { StorageKeys } from '../config/storageKeys';
import type { AppSettings } from '../services/settings/types';

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
  | 'generic';

// Sequence Map Interface
export interface SequenceMap {
  [key: string]: number;
}

const DEFAULT_BRANCH_CODE = 'B1';
const ID_PADDING = 4; // B1-0001

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
 * Initializes or heals the sequence for a specific entity type
 * @param type The entity type to heal
 * @param currentSequence The currently known sequence (from storage)
 */
const healSequence = (type: EntityType, currentSequence: number): number => {
  let maxExisting = 0;
  let data: any[] = [];

  try {
    switch (type) {
      case 'sales':
        data = storage.get(StorageKeys.SALES, []);
        break;
      case 'inventory':
        data = storage.get(StorageKeys.INVENTORY, []);
        break;
      case 'customers':
        data = storage.get(StorageKeys.CUSTOMERS, []);
        break;
      case 'suppliers':
        data = storage.get(StorageKeys.SUPPLIERS, []);
        break;
      case 'employees':
        data = storage.get(StorageKeys.EMPLOYEES, []);
        break;
      case 'purchases':
        data = storage.get(StorageKeys.PURCHASES, []);
        break;
      case 'returns':
        // Check both return types
        const salesReturns = storage.get(StorageKeys.RETURNS, []);
        const purchaseReturns = storage.get(StorageKeys.PURCHASE_RETURNS, []);
        data = [...salesReturns, ...purchaseReturns];
        break;
      case 'shifts':
        data = storage.get(StorageKeys.SHIFTS, []);
        break;
      // Transactions are nested in shifts, harder to heal efficiently, 
      // but usually shift IDs are unique enough or we can scan all shifts.
      // For now, we trust the sequence or start from 0 if totally lost.
      // Tabs and Generic might not need strict healing.
    }
    
    maxExisting = findMaxSequence(data);
  } catch (e) {
    console.warn(`Failed to heal sequence for ${type}`, e);
  }

  // If found max is greater than what we have in storage, update storage
  return Math.max(currentSequence, maxExisting);
};

export const idGenerator = {
  /**
   * Generates the next ID for a given entity type
   * @param type The type of entity (e.g., 'sales', 'inventory')
   * @returns Formatted ID string (e.g., "B1-1050")
   */
  generate: (type: EntityType): string => {
    // 1. Get Branch Code directly from storage to avoid circular dependency
    const settings = storage.get<Partial<AppSettings>>(StorageKeys.SETTINGS, {});
    const branchCode = settings.branchCode || DEFAULT_BRANCH_CODE;

    // 2. Get current sequences
    const sequences = storage.get<SequenceMap>(StorageKeys.SEQUENCES, {});
    
    // 3. Determine current sequence value
    let currentSeq = sequences[type] || 0;

    // 4. Critical: Self-Healing Check
    // If sequence is 0 (fresh start or cleared cache), try to heal
    if (currentSeq === 0) {
      currentSeq = healSequence(type, 0);
    }

    // 5. Increment
    const nextSeq = currentSeq + 1;

    // 6. Save immediately
    storage.set(StorageKeys.SEQUENCES, {
      ...sequences,
      [type]: nextSeq
    });

    // 7. Format and Return
    return `${branchCode}-${nextSeq.toString().padStart(ID_PADDING, '0')}`;
  }
};
