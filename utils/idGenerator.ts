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
import { supabase } from '../lib/supabase';

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
  | 'customers-serial'
  | 'notification'
  | 'barcodes'
  | 'receipts'
  | 'branches'
  | 'branches-code'
  | 'generic';

// Sequence Map Interface
export interface SequenceMap {
  [key: string]: number;
}

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

// Sequences are now handled atomically in Supabase via increment_sequence RPC

export const idGenerator = {
  /**
   * Generates a standard UUID with fallbacks for non-secure contexts
   * @returns Formatted UUID string
   */
  uuid: (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Generates the next ID for a given entity type (Online-Only version)
   * @param type The type of entity (e.g., 'sales', 'inventory')
   * @param branchId The UUID of the branch (Required for DB sequence)
   * @param branchCode Optional branch code prefix (e.g., "B1")
   * @returns Formatted ID string (e.g., "B1-1050")
   */
  generate: async (type: EntityType, branchId: string, branchCode?: string): Promise<string> => {
    // For non-critical types, redirect to sync generator to save DB roundtrips
    const nonCriticalTypes: EntityType[] = ['notification', 'generic', 'barcodes', 'receipts', 'tabs', 'movement'];
    if (nonCriticalTypes.includes(type)) {
      return idGenerator.generateSync(type, branchCode);
    }

    try {
      // 1. Get next value from Supabase
      const { data, error } = await supabase.rpc('increment_sequence', {
        p_branch_id: branchId,
        p_entity_type: type
      });

      if (error) throw error;

      // 2. Format with branch prefix
      const prefix = branchCode || 'PF';
      return `${prefix}-${data.toString().padStart(ID_PADDING, '0')}`;
    } catch (err) {
      console.warn(`[idGenerator] Online sequence failed for ${type}, falling back to timestamp`, err);
      // Fallback to timestamp + random if DB is down to prevent UI crash
      return idGenerator.generateSync(type, branchCode);
    }
  },

  /**
   * Synchronous generator for non-critical IDs (tabs, notifications, etc.)
   * Uses timestamp + random to ensure uniqueness without DB roundtrip.
   */
  generateSync: (type: EntityType, branchCode?: string): string => {
    const prefix = branchCode || GLOBAL_PREFIX;
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${ts}${rand}`;
  },

  /**
   * Generates a secondary mnemonic code (e.g., CUST-123456)
   * This is typically used for user-facing codes that need to be short but unique.
   * @param prefix The prefix to use (e.g., 'CUST', 'DRUG')
   * @returns Formatted code string
   */
  code: (prefix: 'CUST' | 'DRUG'): string => {
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    return `${prefix}-${random}`;
  },

  /**
   * Validates if a string is a valid UUID
   * @param id The string to check
   */
  isUuid: (id: string): boolean => {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },
};
