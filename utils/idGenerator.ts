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
    // Only truly transient or UI-only types should be generated synchronously
    const nonCriticalTypes: EntityType[] = ['notification', 'generic', 'tabs'];
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
      // Do not fallback to timestamp - throw a clear error to preserve data integrity
      console.error(`[idGenerator] Sequence generation failed for ${type}:`, err);
      throw new Error(
        `Failed to generate ID for ${type}. ` +
        `This may indicate a database connectivity issue. ` +
        `Transaction aborted to preserve data integrity.`
      );
    }
  },

  /**
   * Synchronous generator for non-critical IDs (tabs, notifications, etc.)
   * Uses timestamp + random to ensure uniqueness without DB roundtrip.
   */
  generateSync: (type: EntityType, branchCode?: string): string => {
    const prefix = branchCode || GLOBAL_PREFIX;
    // Use full timestamp in Base36 (unlikely to wrap around for centuries)
    const timePart = Date.now().toString(36).toUpperCase();
    // Add 4-character alphanumeric entropy for high-frequency calls
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timePart}${randomPart}`;
  },

  /**
   * Generates a secondary mnemonic code (e.g., B1-000042)
   * Backed by database sequence to ensure absolute uniqueness.
   * @param prefix The type of code ('CUST' for customers, 'DRUG' for inventory)
   * @param branchId The UUID of the branch
   * @param branchCode The short code of the branch (e.g., "B1")
   * @returns Formatted code string
   */
  code: async (prefix: 'CUST' | 'DRUG', branchId: string, branchCode?: string): Promise<string> => {
    const type: EntityType = prefix === 'CUST' ? 'customers-serial' : 'inventory';
    
    try {
      const { data, error } = await supabase.rpc('increment_sequence', {
        p_branch_id: branchId,
        p_entity_type: type
      });
      if (error) throw error;
      
      // Use branchCode for customers (e.g., B1-1), 
      // but keep 'DRUG' for medications to maintain clear classification.
      const finalPrefix = (prefix === 'CUST' && branchCode) ? branchCode : prefix;
      
      return `${finalPrefix}-${data}`;
    } catch (err) {
      console.error(`[idGenerator] Code generation failed for ${prefix}:`, err);
      const ts = Date.now().toString(36).toUpperCase();
      const finalPrefix = (prefix === 'CUST' && branchCode) ? branchCode : prefix;
      return `${finalPrefix}-TEMP-${ts}`;
    }
  },

  /**
   * Generates a numeric-only barcode for medications (e.g., 1042)
   * Starts from 1000 to differentiate from manufacturer barcodes.
   * @param branchId The UUID of the branch
   * @returns Formatted numeric string
   */
  barcode: async (branchId: string): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('increment_sequence', {
        p_branch_id: branchId,
        p_entity_type: 'barcodes'
      });
      if (error) throw error;
      
      // Start from 1000 (DB sequence starts at 1, so we add 999)
      const finalValue = Number(data) + 999;
      return finalValue.toString();
    } catch (err) {
      console.error(`[idGenerator] Barcode generation failed:`, err);
      return Date.now().toString().slice(-8); // Fallback
    }
  },

  /**
   * Generates a short, smart, and deterministic batch barcode.
   * Format: [DrugID in Base36][Months since 2024 in Base36]
   * Example: Drug 2166 + Expiry 2027-10 => "1O62D"
   * @param drugId Numeric ID of the drug
   * @param expiryDate Expiry date of the batch
   */
  generateBatchBarcode: (drugId: number, expiryDate: string | Date): string => {
    // 1. Encode Drug ID (e.g., 2166 => "1O6")
    const drugPart = drugId.toString(36).toUpperCase();
    
    // 2. Encode Expiry Date as months since 2024-01
    const date = new Date(expiryDate);
    const startYear = 2024;
    const months = (date.getFullYear() - startYear) * 12 + date.getMonth();
    const datePart = months.toString(36).toUpperCase().padStart(2, '0');
    
    return `${drugPart}${datePart}`;
  },

  /**
   * Decodes a smart batch barcode back into drugId and approximate expiry date.
   * Useful for offline interpretation of scanned internal stickers.
   */
  decodeBatchBarcode: (barcode: string): { drugId: number; expiryDate: Date } => {
    const datePart = barcode.slice(-2);
    const drugPart = barcode.slice(0, -2);
    
    const drugId = parseInt(drugPart, 36);
    const months = parseInt(datePart, 36);
    
    const year = Math.floor(months / 12) + 2024;
    const month = months % 12;
    
    return {
      drugId,
      expiryDate: new Date(year, month, 1)
    };
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
