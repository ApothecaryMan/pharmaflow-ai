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
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { syncQueueService } from '../syncQueueService';

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
export const getAllBatches = (branchId?: string, drugId?: string): StockBatch[] => {
  const all = getAllBatchesRaw();
  const effectiveBranchId = branchId; // Note: batchService is sync and doesn't use settingsService usually
  
  let results = all;
  if (effectiveBranchId) {
    results = results.filter((b) => b.branchId === effectiveBranchId);
  }
  if (drugId) {
    results = results.filter((b) => b.drugId === drugId);
  }
  return results;
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
export const createBatch = async (
  batch: Omit<StockBatch, 'id'>, 
  branchId?: string,
  skipSync = false
): Promise<StockBatch> => {
  const all = getAllBatchesRaw();
  const effectiveBranchId = branchId || batch.branchId;
  const newBatch: StockBatch = {
    ...batch,
    id: idGenerator.generate('batch', effectiveBranchId),
    branchId: effectiveBranchId,
  };
  all.push(newBatch);
  saveBatches(all);

  if (!skipSync) {
    await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { action: 'CREATE', batch: newBatch });
  }

  return newBatch;
};

/**
 * Update batch quantity (add or subtract)
 * Returns the updated batch or null if not found
 */
export const updateBatchQuantity = async (
  batchId: string, 
  delta: number,
  skipSync = false
): Promise<StockBatch | null> => {
  // Input validation - technically delta can be negative, but resulting stock cannot be < 0
  const all = getAllBatchesRaw();
  const index = all.findIndex((b) => b.id === batchId);

  if (index === -1) return null;

  all[index].quantity = Math.max(0, all[index].quantity + delta);

  saveBatches(all);

  if (!skipSync) {
    await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { action: 'UPDATE_QTY', id: batchId, delta });
  }

  return all[index];
};

/**
 * Update batch fields (e.g., drugId reassignment when creating new Drug entries for different expiries)
 * Returns the updated batch or null if not found
 */
export const updateBatch = (batchId: string, updates: Partial<StockBatch>): StockBatch | null => {
  const all = getAllBatchesRaw();
  const index = all.findIndex((b) => b.id === batchId);
  if (index === -1) return null;

  all[index] = { ...all[index], ...updates };
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
/**
 * Allocate stock for multiple items in a single storage transaction
 * Returns the allocations for all items. Throws error if any item fails.
 */
export const allocateStockBulk = async (
  requests: { drugId: string; quantity: number; name?: string }[],
  branchId: string,
  skipSync = true // Default to true because bulk is usually via transactions
): Promise<{ drugId: string; allocations: BatchAllocation[] }[]> => {
  const allBatches = getAllBatchesRaw();
  const result: { drugId: string; allocations: BatchAllocation[] }[] = [];

  for (const req of requests) {
    if (req.quantity <= 0 || !Number.isInteger(req.quantity)) continue;

    const drugBatches = allBatches
      .filter((b) => b.drugId === req.drugId && b.branchId === branchId)
      .filter((b) => {
        const exp = parseExpiryEndOfMonth(b.expiryDate);
        return !isNaN(exp.getTime()) && exp > new Date();
      })
      .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());

    const totalAvailable = drugBatches.reduce((sum, b) => sum + b.quantity, 0);
    if (totalAvailable < req.quantity) {
      const drugName = req.name || req.drugId;
      throw new Error(
        `Insufficient stock for: ${drugName} (Available: ${totalAvailable}, Needed: ${req.quantity})`
      );
    }

    const allocations: BatchAllocation[] = [];
    let remaining = req.quantity;

    for (const batch of drugBatches) {
      if (remaining <= 0) break;
      const allocateFromThis = Math.min(batch.quantity, remaining);
      if (allocateFromThis > 0) {
        allocations.push({
          batchId: batch.id,
          quantity: allocateFromThis,
          expiryDate: batch.expiryDate,
        });

        // Update the batch in allBatches reference
        const rawBatch = allBatches.find((b) => b.id === batch.id);
        if (rawBatch) rawBatch.quantity -= allocateFromThis;

        remaining -= allocateFromThis;
      }
    }
    result.push({ drugId: req.drugId, allocations });
  }

  // Note: We intentionally preserve empty batches to allow returns
  // to find their original batches.
  saveBatches(allBatches);

  // Note: allocateStockBulk is used in transactions, sync is handled by transactionService.
  // result includes drugId and allocations, which are needed for sync enqueuing in transactionService.

  return result;
};

export const allocateStock = async (
  drugId: string,
  quantityNeeded: number,
  branchId: string,
  commitChanges: boolean = true,
  skipSync = false
): Promise<BatchAllocation[] | null> => {
  if (quantityNeeded <= 0 || !Number.isInteger(quantityNeeded)) {
    console.error('[BatchService] Invalid quantity needed:', quantityNeeded);
    return null;
  }

  const batches = getAllBatches(branchId, drugId)
    // Filter out expired batches (robust date check)
    .filter((b) => {
      const exp = parseExpiryEndOfMonth(b.expiryDate);
      return !isNaN(exp.getTime()) && exp > new Date();
    })
    // Sort by expiry date (earliest first - FEFO)
    .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());

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
    // Note: We preserve empty batches to allow returns to find their original batches.
    saveBatches(all);

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { 
        action: 'ALLOCATE', 
        drugId, 
        quantity: quantityNeeded,
        allocations 
      });
    }
  }

  return allocations;
};

/**
 * Return stock to original batches
 * Used when order is cancelled or items are removed
 * 
 * If the original batch is missing (e.g. deleted or moved), it attempts to
 * find another batch for the same drug and expiry date, or creates a new one.
 *
 * @param allocations - The batch allocations to return
 * @param drugId - Optional drugId for fallback recreation
 */
export const returnStock = async (
  allocations: BatchAllocation[], 
  drugId?: string,
  skipSync = false
): Promise<void> => {
  if (!allocations || allocations.length === 0) return;

  const all = getAllBatchesRaw();

  for (const alloc of allocations) {
    let batch = all.find((b) => b.id === alloc.batchId);
    
    // Fallback: If specific batch ID is missing, try to find by drugId + expiry
    if (!batch && drugId) {
      batch = all.find((b) => b.drugId === drugId && b.expiryDate === alloc.expiryDate);
    }

    if (batch) {
      // Return to existing batch
      batch.quantity += alloc.quantity;
    } else if (drugId) {
      // Batch missing and no match by expiry -> Recreate the batch
      // This ensures stock is not "lost" to the system
      const newBatch: StockBatch = {
        id: idGenerator.generate('batch', drugId), // Regenerate or use old ID? Better regenerate
        drugId,
        quantity: alloc.quantity,
        expiryDate: alloc.expiryDate,
        costPrice: 0, // Unknown at this point, but better than losing stock
        dateReceived: new Date().toISOString(),
        batchNumber: 'RECREATED',
      };
      all.push(newBatch);
      console.log(`[BatchService] Recreated missing batch for drug ${drugId} during return.`);
    } else {
      console.warn(`Batch ${alloc.batchId} not found for return and no drugId provided for fallback. Stock may be lost.`);
    }
  }

  saveBatches(all);
};

/**
 * Get total stock for a drug (sum of all batches)
 */
export const getTotalStock = (drugId: string, branchId?: string): number => {
  return getAllBatches(branchId, drugId).reduce((sum, b) => sum + b.quantity, 0);
};

/**
 * Get earliest expiry date for a drug
 */
export const getEarliestExpiry = (drugId: string, branchId?: string): string | null => {
  const batches = getAllBatches(branchId, drugId)
    .filter((b) => b.quantity > 0)
    .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());

  return batches.length > 0 ? batches[0].expiryDate : null;
};

/**
 * Get earliest expiry dates for multiple drugs in a single storage read.
 * Returns a map of drugId → earliest expiry date (or null).
 */
export const getEarliestExpiriesBulk = (drugIds: string[]): Record<string, string | null> => {
  const allBatches = getAllBatchesRaw();
  const result: Record<string, string | null> = {};

  // Group active batches by drugId (single pass)
  const batchesByDrug = new Map<string, StockBatch[]>();
  for (const batch of allBatches) {
    if (batch.quantity > 0 && drugIds.includes(batch.drugId)) {
      const arr = batchesByDrug.get(batch.drugId);
      if (arr) arr.push(batch);
      else batchesByDrug.set(batch.drugId, [batch]);
    }
  }

  for (const drugId of drugIds) {
    const drugBatches = batchesByDrug.get(drugId);
    if (!drugBatches || drugBatches.length === 0) {
      result[drugId] = null;
      continue;
    }
    // Find minimum expiry
    let earliest = drugBatches[0];
    for (let i = 1; i < drugBatches.length; i++) {
      if (parseExpiryEndOfMonth(drugBatches[i].expiryDate).getTime() < parseExpiryEndOfMonth(earliest.expiryDate).getTime()) {
        earliest = drugBatches[i];
      }
    }
    result[drugId] = earliest.expiryDate;
  }

  return result;
};

/**
 * Check if sufficient stock is available
 */
export const hasStock = (drugId: string, quantityNeeded: number, branchId: string): boolean => {
  const total = getTotalStock(drugId, branchId);
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
      id: idGenerator.generate('batch', drug.branchId),
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
  drugId: string,
  branchId?: string
): {
  totalStock: number;
  batchCount: number;
  earliestExpiry: string | null;
  batches: StockBatch[];
} => {
  const batches = getAllBatches(branchId, drugId).filter((b) => b.quantity > 0);

  return {
    totalStock: batches.reduce((sum, b) => sum + b.quantity, 0),
    batchCount: batches.length,
    earliestExpiry: getEarliestExpiry(drugId, branchId),
    batches: batches.sort(
      (a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime()
    ),
  };
};

/**
 * Delete a specific batch by ID
 */
export const deleteBatchById = async (batchId: string, skipSync = false): Promise<boolean> => {
  const all = getAllBatchesRaw();
  const filtered = all.filter((b) => b.id !== batchId);
  const removed = all.length > filtered.length;
  if (removed) {
    saveBatches(filtered);
    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { action: 'DELETE', id: batchId });
    }
  }
  return removed;
};

/**
 * Delete all batches associated with a specific drug ID
 */
export const deleteBatchesByDrugId = async (drugId: string, skipSync = false): Promise<number> => {
  const all = getAllBatchesRaw();
  const filtered = all.filter((b) => b.drugId !== drugId);
  const removedCount = all.length - filtered.length;
  if (removedCount > 0) {
    saveBatches(filtered);
    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { 
        action: 'DELETE_BULK', 
        drugId,
        count: removedCount 
      });
    }
  }
  return removedCount;
};

// Export as service object
export const batchService = {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatchQuantity,
  updateBatch,
  allocateStock,
  allocateStockBulk,
  returnStock,
  getTotalStock,
  getEarliestExpiry,
  getEarliestExpiriesBulk,
  hasStock,
  migrateInventoryToBatches,
  getStockSummary,
  deleteBatchById,
  deleteBatchesByDrugId,
};
