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
import { StockVersionConflictError } from '../../utils/errors';
import { supabase } from '../../lib/supabase';

const mapBatchToDb = (b: Partial<StockBatch>): any => {
  const db: any = {};
  if (b.id !== undefined) db.id = b.id;
  if (b.branchId !== undefined) db.branch_id = b.branchId;
  if (b.drugId !== undefined) db.drug_id = b.drugId;
  if (b.quantity !== undefined) db.quantity = b.quantity;
  if (b.expiryDate !== undefined) db.expiry_date = b.expiryDate;
  if (b.costPrice !== undefined) db.cost_price = b.costPrice;
  if (b.purchaseId !== undefined) db.purchase_id = b.purchaseId;
  if (b.dateReceived !== undefined) db.date_received = b.dateReceived;
  if (b.batchNumber !== undefined) db.batch_number = b.batchNumber;
  if (b.version !== undefined) db.version = b.version;
  return db;
};

const mapDbToBatch = (db: any): StockBatch => ({
  id: db.id,
  branchId: db.branch_id,
  drugId: db.drug_id,
  quantity: db.quantity,
  expiryDate: db.expiry_date,
  costPrice: db.cost_price,
  purchaseId: db.purchase_id || undefined,
  dateReceived: db.date_received,
  batchNumber: db.batch_number || undefined,
  version: db.version || 1,
});

// --- Storage Access ---
const getAllBatchesRaw = (): StockBatch[] => {
  return storage.get<StockBatch[]>(StorageKeys.STOCK_BATCHES, []);
};

const saveBatches = (batches: StockBatch[]): void => {
  storage.set(StorageKeys.STOCK_BATCHES, batches);
};

// --- Core Functions ---

export const fetchBatchesFromSupabase = async (branchId?: string): Promise<StockBatch[]> => {
  try {
    let query = supabase.from('stock_batches').select('*').limit(10000);
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(mapDbToBatch);
      const all = getAllBatchesRaw();
      // Keep other branches intact
      const preserved = branchId ? all.filter(b => b.branchId !== branchId) : [];
      saveBatches([...preserved, ...mapped]);
      return mapped;
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Supabase fetch failed for stock_batches', err);
  }
  return getAllBatchesRaw();
};

export const getAllBatches = (branchId?: string, drugId?: string): StockBatch[] => {
  const all = getAllBatchesRaw();
  const effectiveBranchId = branchId; 
  
  let results = all;
  if (effectiveBranchId) {
    results = results.filter((b) => b.branchId === effectiveBranchId);
  }
  if (drugId) {
    results = results.filter((b) => b.drugId === drugId);
  }
  return results;
};

export const getBatchById = (batchId: string): StockBatch | null => {
  const all = getAllBatchesRaw();
  return all.find((b) => b.id === batchId) || null;
};

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
    version: 1, 
  };

  try {
    const { error } = await supabase.from('stock_batches').insert(mapBatchToDb(newBatch));
    if (error && import.meta.env.DEV) console.warn('Supabase batch insert failed', error);
  } catch {}

  all.push(newBatch);
  saveBatches(all);

  if (!skipSync) {
    await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { action: 'CREATE', batch: newBatch });
  }

  return newBatch;
};

export const updateBatchQuantity = async (
  batchId: string, 
  delta: number,
  skipSync = false
): Promise<StockBatch | null> => {
  const all = getAllBatchesRaw();
  const index = all.findIndex((b) => b.id === batchId);

  if (index === -1) return null;

  all[index].quantity = Math.max(0, all[index].quantity + delta);
  all[index].version = (all[index].version || 0) + 1; 

  try {
    const { error } = await supabase
      .from('stock_batches')
      .update({ quantity: all[index].quantity, version: all[index].version })
      .eq('id', batchId);
    if (error && import.meta.env.DEV) console.warn('Supabase batch qty update failed', error);
  } catch {}

  saveBatches(all);

  if (!skipSync) {
    await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { action: 'UPDATE_QTY', id: batchId, delta });
  }

  return all[index];
};

export const updateBatch = async (batchId: string, updates: Partial<StockBatch>, skipSync = false): Promise<StockBatch | null> => {
  const all = getAllBatchesRaw();
  const index = all.findIndex((b) => b.id === batchId);
  if (index === -1) return null;

  all[index] = { ...all[index], ...updates };

  try {
    const { error } = await supabase
      .from('stock_batches')
      .update(mapBatchToDb(updates))
      .eq('id', batchId);
    if (error && import.meta.env.DEV) console.warn('Supabase batch update failed', error);
  } catch {}

  saveBatches(all);

  if (!skipSync) {
    await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { action: 'UPDATE', id: batchId, updates });
  }

  return all[index];
};

export const allocateStockBulk = async (
  requests: { drugId: string; quantity: number; name?: string }[],
  branchId: string,
  skipSync = true 
): Promise<{ drugId: string; allocations: BatchAllocation[] }[]> => {
  const allBatches = getAllBatchesRaw();
  const result: { drugId: string; allocations: BatchAllocation[] }[] = [];
  const batchesToUpdate: StockBatch[] = [];

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

        const rawBatch = allBatches.find((b) => b.id === batch.id);
        if (rawBatch) {
          if (rawBatch.version !== batch.version) {
            throw new StockVersionConflictError(batch.id, req.drugId);
          }
          rawBatch.quantity -= allocateFromThis;
          rawBatch.version = (rawBatch.version || 0) + 1;
          batchesToUpdate.push(rawBatch);
        }

        remaining -= allocateFromThis;
      }
    }
    result.push({ drugId: req.drugId, allocations });
  }

  saveBatches(allBatches);

  // Sync to Supabase in bulk
  if (batchesToUpdate.length > 0) {
    try {
      const dbBatches = batchesToUpdate.map(b => mapBatchToDb(b));
      await supabase.from('stock_batches').upsert(dbBatches, { onConflict: 'id' });
    } catch (e) {
      console.warn('Batch bulk alloc Supabase sync failed', e);
    }
  }

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
    .filter((b) => {
      const exp = parseExpiryEndOfMonth(b.expiryDate);
      return !isNaN(exp.getTime()) && exp > new Date();
    })
    .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());

  const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalAvailable < quantityNeeded) {
    return null; 
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

  if (commitChanges && allocations.length > 0) {
    const all = getAllBatchesRaw();
    const batchesToUpdate: StockBatch[] = [];
    
    for (const alloc of allocations) {
      const batch = all.find((b) => b.id === alloc.batchId);
      if (batch) {
        const originalBatch = batches.find((b) => b.id === alloc.batchId);
        if (originalBatch && batch.version !== originalBatch.version) {
           throw new StockVersionConflictError(batch.id, drugId);
        }
        batch.quantity -= alloc.quantity;
        batch.version = (batch.version || 0) + 1;
        batchesToUpdate.push(batch);
      }
    }
    
    saveBatches(all);

    // Sync to Supabase
    if (batchesToUpdate.length > 0) {
      try {
        const dbBatches = batchesToUpdate.map(b => mapBatchToDb(b));
        await supabase.from('stock_batches').upsert(dbBatches, { onConflict: 'id' });
      } catch (e) {
        console.warn('Batch alloc Supabase sync failed', e);
      }
    }

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

export const returnStock = async (
  allocations: BatchAllocation[], 
  drugId?: string,
  skipSync = false,
  branchId?: string
): Promise<void> => {
  if (!allocations || allocations.length === 0) return;

  const all = getAllBatchesRaw();
  const batchesToUpdate: StockBatch[] = [];

  for (const alloc of allocations) {
    let batch = all.find((b) => b.id === alloc.batchId);
    
    if (!batch && drugId) {
      batch = all.find((b) => b.drugId === drugId && b.expiryDate === alloc.expiryDate);
    }

    if (batch) {
      batch.quantity += alloc.quantity;
      batch.version = (batch.version || 0) + 1;
      batchesToUpdate.push(batch);
    } else if (drugId) {
      const newBatch: StockBatch = {
        id: idGenerator.generate('batch', branchId || drugId),
        drugId,
        quantity: alloc.quantity,
        expiryDate: alloc.expiryDate,
        costPrice: 0, 
        dateReceived: new Date().toISOString(),
        batchNumber: 'RECREATED',
        branchId: branchId as string,
        version: 1,
      };
      all.push(newBatch);
      batchesToUpdate.push(newBatch);
      console.log(`[BatchService] Recreated missing batch for drug ${drugId} during return.`);
    }
  }

  saveBatches(all);

  if (batchesToUpdate.length > 0) {
    try {
      const dbBatches = batchesToUpdate.map(b => mapBatchToDb(b));
      await supabase.from('stock_batches').upsert(dbBatches, { onConflict: 'id' });
    } catch {}
  }
};

export const getTotalStock = (drugId: string, branchId?: string): number => {
  return getAllBatches(branchId, drugId).reduce((sum, b) => sum + b.quantity, 0);
};

export const getEarliestExpiry = (drugId: string, branchId?: string): string | null => {
  const batches = getAllBatches(branchId, drugId)
    .filter((b) => b.quantity > 0)
    .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());
  return batches.length > 0 ? batches[0].expiryDate : null;
};

export const getEarliestExpiriesBulk = (drugIds: string[]): Record<string, string | null> => {
  const allBatches = getAllBatchesRaw();
  const result: Record<string, string | null> = {};

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

export const hasStock = (drugId: string, quantityNeeded: number, branchId: string): boolean => {
  const total = getTotalStock(drugId, branchId);
  return total >= quantityNeeded;
};

export const migrateInventoryToBatches = async (inventory: Drug[]): Promise<StockBatch[]> => {
  const existingBatches = getAllBatchesRaw();
  const existingDrugIds = new Set(existingBatches.map((b) => b.drugId));

  let migratedCount = 0;
  const newBatches: StockBatch[] = [...existingBatches];
  const batchesToInsert: StockBatch[] = [];

  for (const drug of inventory) {
    if (existingDrugIds.has(drug.id) || drug.stock <= 0) continue;

    const b = {
      id: idGenerator.generate('batch', drug.branchId),
      drugId: drug.id,
      quantity: drug.stock,
      expiryDate: drug.expiryDate,
      costPrice: drug.costPrice,
      purchaseId: 'MIGRATION',
      dateReceived: new Date().toISOString(),
      batchNumber: 'MIGRATED',
      branchId: drug.branchId,
      version: 1,
    };
    newBatches.push(b);
    batchesToInsert.push(b);
    migratedCount++;
  }

  if (migratedCount > 0) {
    saveBatches(newBatches);
    try {
      if (batchesToInsert.length > 0) {
        await supabase.from('stock_batches').insert(batchesToInsert.map(mapBatchToDb));
      }
    } catch {}
  }

  return newBatches;
};

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

export const deleteBatchById = async (batchId: string, skipSync = false): Promise<boolean> => {
  const all = getAllBatchesRaw();
  const filtered = all.filter((b) => b.id !== batchId);
  const removed = all.length > filtered.length;
  if (removed) {
    saveBatches(filtered);

    try {
      await supabase.from('stock_batches').delete().eq('id', batchId);
    } catch {}

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_BATCH_UPDATE', { action: 'DELETE', id: batchId });
    }
  }
  return removed;
};

export const deleteBatchesByDrugId = async (drugId: string, skipSync = false): Promise<number> => {
  const all = getAllBatchesRaw();
  const filtered = all.filter((b) => b.drugId !== drugId);
  const removedCount = all.length - filtered.length;
  if (removedCount > 0) {
    saveBatches(filtered);

    try {
      await supabase.from('stock_batches').delete().eq('drug_id', drugId);
    } catch {}

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

export const batchService = {
  fetchBatchesFromSupabase,
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
