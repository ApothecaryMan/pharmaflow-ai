/**
 * Stock Batch Service - FEFO (First Expiry First Out) Inventory Management
 *
 * Manages stock batches with different expiry dates for each drug.
 * Handles allocation, deallocation, and stock tracking.
 */

import { StorageKeys } from '../../config/storageKeys';
import type { BatchAllocation, Drug, StockBatch } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { storage } from '../../utils/storage';

// --- Storage Access ---
const getAllBatchesRaw = (): StockBatch[] => {
  return storage.get<StockBatch[]>(StorageKeys.STOCK_BATCHES, []);
};

const saveBatches = (batches: StockBatch[]): void => {
  storage.set(StorageKeys.STOCK_BATCHES, batches);
};

// --- Core Functions ---

/**
 * Get all batches, optionally filtered by drugId
 */
export const getAllBatches = (drugId?: string): StockBatch[] => {
  const all = getAllBatchesRaw();
  if (drugId) {
    return all.filter((b) => b.drugId === drugId);
  }
  return all;
};

/**
 * Get a single batch by ID
 */
export const getBatchById = (batchId: string): StockBatch | null => {
  const all = getAllBatchesRaw();
  return all.find((b) => b.id === batchId) || null;
};

/**
 * Create a new batch (usually from a purchase)
 */
export const createBatch = (batch: Omit<StockBatch, 'id'>): StockBatch => {
  const all = getAllBatchesRaw();
  const newBatch: StockBatch = {
    ...batch,
    id: idGenerator.generate('batch'),
  };
  all.push(newBatch);
  saveBatches(all);
  return newBatch;
};

/**
 * Update batch quantity (add or subtract)
 * Returns the updated batch or null if not found
 */
export const updateBatchQuantity = (batchId: string, delta: number): StockBatch | null => {
  // Input validation - technically delta can be negative, but resulting stock cannot be < 0
  // Handled by Math.max(0, ...) below, so delta check isn't strictly needed for safety here
  const all = getAllBatchesRaw();
  const index = all.findIndex((b) => b.id === batchId);

  if (index === -1) return null;

  all[index].quantity = Math.max(0, all[index].quantity + delta);

  // Remove batch if quantity is 0
  if (all[index].quantity === 0) {
    const removed = all.splice(index, 1)[0];
    saveBatches(all);
    return removed;
  }

  saveBatches(all);
  return all[index];
};

/**
 * Allocate stock using FEFO (First Expiry First Out)
 * Returns the batch allocations or null if insufficient stock
 *
 * @param drugId - The drug to allocate from
 * @param quantityNeeded - Total units needed
 * @param commitChanges - If true, actually deduct from batches. If false, just calculate.
 */
export const allocateStock = (
  drugId: string,
  quantityNeeded: number,
  commitChanges: boolean = true
): BatchAllocation[] | null => {
  if (quantityNeeded <= 0 || !Number.isInteger(quantityNeeded)) {
    console.error('[BatchService] Invalid quantity needed:', quantityNeeded);
    return null;
  }

  const batches = getAllBatches(drugId)
    // Filter out expired batches (robust date check)
    .filter((b) => {
      const exp = new Date(b.expiryDate);
      return !isNaN(exp.getTime()) && exp > new Date();
    })
    // Sort by expiry date (earliest first - FEFO)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  // Check total available
  const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalAvailable < quantityNeeded) {
    return null; // Insufficient stock
  }

  const allocations: BatchAllocation[] = [];
  let remaining = quantityNeeded;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const allocateFromThis = Math.min(batch.quantity, remaining);

    if (allocateFromThis > 0) {
      allocations.push({
        batchId: batch.id,
        quantity: allocateFromThis,
        expiryDate: batch.expiryDate,
      });
      remaining -= allocateFromThis;
    }
  }

  // Commit changes if requested
  if (commitChanges && allocations.length > 0) {
    const all = getAllBatchesRaw();
    for (const alloc of allocations) {
      const batch = all.find((b) => b.id === alloc.batchId);
      if (batch) {
        batch.quantity -= alloc.quantity;
      }
    }
    // Remove empty batches
    const nonEmpty = all.filter((b) => b.quantity > 0);
    saveBatches(nonEmpty);
  }

  return allocations;
};

/**
 * Return stock to original batches
 * Used when order is cancelled or items are removed
 *
 * @param allocations - The batch allocations to return
 */
export const returnStock = (allocations: BatchAllocation[]): void => {
  if (!allocations || allocations.length === 0) return;

  const all = getAllBatchesRaw();

  for (const alloc of allocations) {
    const batch = all.find((b) => b.id === alloc.batchId);
    if (batch) {
      // Return to existing batch
      batch.quantity += alloc.quantity;
    } else {
      // Batch was removed (was empty), need to recreate it
      // This shouldn't normally happen in the short delivery window
      console.warn(`Batch ${alloc.batchId} not found for return. Stock may be lost.`);
    }
  }

  saveBatches(all);
};

/**
 * Get total stock for a drug (sum of all batches)
 */
export const getTotalStock = (drugId: string): number => {
  return getAllBatches(drugId).reduce((sum, b) => sum + b.quantity, 0);
};

/**
 * Get earliest expiry date for a drug
 */
export const getEarliestExpiry = (drugId: string): string | null => {
  const batches = getAllBatches(drugId)
    .filter((b) => b.quantity > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  return batches.length > 0 ? batches[0].expiryDate : null;
};

/**
 * Check if sufficient stock is available
 */
export const hasStock = (drugId: string, quantityNeeded: number): boolean => {
  const total = getTotalStock(drugId);
  return total >= quantityNeeded;
};

/**
 * Migrate existing Drug stock to batch system
 * Creates a single batch per drug with existing stock/expiry
 */
export const migrateInventoryToBatches = (inventory: Drug[]): number => {
  const existingBatches = getAllBatchesRaw();
  const existingDrugIds = new Set(existingBatches.map((b) => b.drugId));

  let migratedCount = 0;
  const newBatches: StockBatch[] = [...existingBatches];

  for (const drug of inventory) {
    // Skip if already has batches or no stock
    if (existingDrugIds.has(drug.id) || drug.stock <= 0) continue;

    newBatches.push({
      id: idGenerator.generate('batch'),
      drugId: drug.id,
      quantity: drug.stock,
      expiryDate: drug.expiryDate,
      costPrice: drug.costPrice,
      purchaseId: 'MIGRATION',
      dateReceived: new Date().toISOString(),
      batchNumber: 'MIGRATED',
    });

    migratedCount++;
  }

  if (migratedCount > 0) {
    saveBatches(newBatches);
  }

  return migratedCount;
};

/**
 * Get stock summary for a drug (for display)
 */
export const getStockSummary = (
  drugId: string
): {
  totalStock: number;
  batchCount: number;
  earliestExpiry: string | null;
  batches: StockBatch[];
} => {
  const batches = getAllBatches(drugId).filter((b) => b.quantity > 0);

  return {
    totalStock: batches.reduce((sum, b) => sum + b.quantity, 0),
    batchCount: batches.length,
    earliestExpiry: getEarliestExpiry(drugId),
    batches: batches.sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    ),
  };
};

// Export as service object
export const batchService = {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatchQuantity,
  allocateStock,
  returnStock,
  getTotalStock,
  getEarliestExpiry,
  hasStock,
  migrateInventoryToBatches,
  getStockSummary,
};
