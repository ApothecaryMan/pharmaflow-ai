/**
 * Stock Batch Service - FEFO (First Expiry First Out) Inventory Management
 * Online-Only implementation using Supabase.
 */

import type { BatchAllocation, StockBatch } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../settings/settingsService';

const mapBatchToDb = (b: Partial<StockBatch>): any => {
  const db: any = {};
  if (b.id !== undefined) db.id = b.id;
  if (b.branchId !== undefined) db.branch_id = b.branchId;
  if (b.drugId !== undefined) db.drug_id = b.drugId;
  if (b.quantity !== undefined) db.quantity = b.quantity;
  if (b.expiryDate !== undefined) {
    if (b.expiryDate === '') db.expiry_date = null;
    else if (b.expiryDate.length === 7 && /^\d{4}-\d{2}$/.test(b.expiryDate)) db.expiry_date = `${b.expiryDate}-01`;
    else db.expiry_date = b.expiryDate;
  }
  if (b.costPrice !== undefined) db.cost_price = b.costPrice;
  if (b.purchaseId !== undefined) db.purchase_id = b.purchaseId;
  if (b.dateReceived !== undefined) db.date_received = b.dateReceived;
  if (b.batchNumber !== undefined) db.batch_number = b.batchNumber;
  if (b.version !== undefined) db.version = b.version;
  return db;
};

const mapDbToBatch = (db: any): StockBatch => ({
  id: db.id,
  orgId: db.org_id,
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

export const batchService = {
  async fetchBatchesFromSupabase(branchId?: string, drugId?: string, drugIds?: string[]): Promise<StockBatch[]> {
    try {
      let query = supabase.from('stock_batches').select('*');
      if (branchId) query = query.eq('branch_id', branchId);
      if (drugId) query = query.eq('drug_id', drugId);
      if (drugIds && drugIds.length > 0) query = query.in('drug_id', drugIds);
      
      const { data, error } = await query.order('expiry_date', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapDbToBatch);
    } catch (err) {
      console.error('[BatchService] fetchBatches failed:', err);
      return [];
    }
  },

  async getAllBatches(branchId?: string, drugId?: string, drugIds?: string[]): Promise<StockBatch[]> {
    return this.fetchBatchesFromSupabase(branchId, drugId, drugIds);
  },

  async getBatchById(batchId: string): Promise<StockBatch | null> {
    const { data, error } = await supabase.from('stock_batches').select('*').eq('id', batchId).maybeSingle();
    if (error || !data) return null;
    return mapDbToBatch(data);
  },

  async createBatch(batch: Omit<StockBatch, 'id'>, branchId?: string): Promise<StockBatch> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || batch.branchId || settings.activeBranchId;
    
    // 1. Check for existing batch with same drug, branch, and expiry
    let query = supabase.from('stock_batches')
      .select('*')
      .eq('drug_id', batch.drugId)
      .eq('branch_id', effectiveBranchId);
      
    if (batch.expiryDate) {
      let expDate = batch.expiryDate;
      if (expDate.length === 7 && /^\d{4}-\d{2}$/.test(expDate)) expDate = `${expDate}-01`;
      query = query.eq('expiry_date', expDate);
    } else {
      query = query.is('expiry_date', null);
    }

    const { data: existingBatches, error: searchError } = await query;
    if (searchError) throw searchError;

    if (existingBatches && existingBatches.length > 0) {
      // Merge into the first matching batch
      const existing = existingBatches[0];
      const oldQty = existing.quantity || 0;
      const oldCost = existing.cost_price || 0;
      const addedQty = batch.quantity || 0;
      const addedCost = batch.costPrice || 0;
      
      const newQty = oldQty + addedQty;
      let newCost = oldCost;
      
      if (newQty > 0) {
         // Weighted average cost
         newCost = ((oldQty * oldCost) + (addedQty * addedCost)) / newQty;
      }
      
      // Use atomic increment for safety during merging
      const { data, error } = await supabase.rpc('atomic_increment_batch', {
        p_batch_id: existing.id,
        p_delta: addedQty,
      });
      
      if (error) throw error;
      
      // Update the cost price separately since RPC only updates quantity
      await supabase.from('stock_batches')
        .update({ cost_price: newCost, date_received: new Date().toISOString() })
        .eq('id', existing.id);
        
      const updatedBatch = await this.getBatchById(existing.id);
      return updatedBatch!;
    }

    const newBatch: StockBatch = {
      ...batch,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      version: 1, 
    };

    const { error } = await supabase.from('stock_batches').insert(mapBatchToDb(newBatch));
    if (error) throw error;
    return newBatch;
  },

  async updateBatchQuantity(batchId: string, delta: number, skipFetch: boolean = false): Promise<StockBatch | null> {
    // Atomic: SET quantity = quantity + delta, version = version + 1
    const { data, error } = await supabase.rpc('atomic_increment_batch', {
      p_batch_id: batchId,
      p_delta: delta,
    });
    if (error) throw error;
    
    if (skipFetch) {
      return null;
    }

    if (!data || data.length === 0) return null;

    const batch = await this.getBatchById(batchId);
    return batch;
  },

  async updateBatch(batchId: string, updates: Partial<StockBatch>): Promise<StockBatch | null> {
    const { error } = await supabase
      .from('stock_batches')
      .update(mapBatchToDb(updates))
      .eq('id', batchId);
      
    if (error) throw error;
    return this.getBatchById(batchId);
  },

  async allocateStockBulk(
    requests: { drugId: string; quantity: number; name?: string; preferredBatchId?: string }[],
    branchId: string
  ): Promise<{ drugId: string; allocations: BatchAllocation[] }[]> {
    const validRequests = requests.filter(req => req.quantity > 0);
    const drugIds = [...new Set(validRequests.map(r => r.drugId))];

    // --- Optimization: Fetch all batches for all requested drugs in ONE query ---
    const allBatches = await this.getAllBatches(branchId, undefined, drugIds);
    const batchesByDrug = drugIds.reduce((acc, id) => {
      acc[id] = allBatches.filter(b => b.drugId === id);
      return acc;
    }, {} as Record<string, StockBatch[]>);
    
    // Process all allocation requests in parallel for maximum speed
    const results = await Promise.all(validRequests.map(async (req) => {
      const drugBatches = batchesByDrug[req.drugId] || [];
      const allocs = await this.allocateStock(req.drugId, req.quantity, branchId, true, req.preferredBatchId, drugBatches);
      if (!allocs) throw new Error(`Insufficient stock for: ${req.name || req.drugId}`);
      return { drugId: req.drugId, allocations: allocs };
    }));
    
    return results;
  },

  async allocateStock(
    drugId: string,
    quantityNeeded: number,
    branchId: string,
    commitChanges: boolean = true,
    preferredBatchId?: string,
    preFetchedBatches?: StockBatch[]
  ): Promise<BatchAllocation[] | null> {
    if (quantityNeeded <= 0) return null;

    const batches = preFetchedBatches || await this.getAllBatches(branchId, drugId);
    
    let validBatches = [...batches]
      .filter((b) => {
        const exp = parseExpiryEndOfMonth(b.expiryDate);
        return !isNaN(exp.getTime()) && exp > new Date();
      });
      
    // Sort logic: if preferredBatchId matches, it comes first. Otherwise sort by expiry.
    validBatches.sort((a, b) => {
      if (preferredBatchId) {
        if (a.id === preferredBatchId) return -1;
        if (b.id === preferredBatchId) return 1;
      }
      return parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime();
    });

    const totalAvailable = validBatches.reduce((sum, b) => sum + b.quantity, 0);
    if (totalAvailable < quantityNeeded) return null;

    const allocations: BatchAllocation[] = [];
    let remaining = quantityNeeded;

    for (const batch of validBatches) {
      if (remaining <= 0) break;
      const allocateFromThis = Math.min(batch.quantity, remaining);
      if (allocateFromThis > 0) {
        allocations.push({
          batchId: batch.id,
          quantity: allocateFromThis,
          expiryDate: batch.expiryDate,
          batchNumber: batch.batchNumber,
        });
        remaining -= allocateFromThis;
      }
    }

    if (commitChanges && allocations.length > 0) {
      // Parallelize batch updates within a single drug allocation
      await Promise.all(allocations.map(alloc => 
        this.updateBatchQuantity(alloc.batchId, -alloc.quantity, true)
      ));
    }
    return allocations;
  },

  async returnStock(
    allocations: BatchAllocation[],
    quantityToReturn: number,
    drugId: string,
    branchId: string
  ): Promise<void> {
    if (!allocations || allocations.length === 0 || quantityToReturn <= 0) return;

    // Pro-rata redistribution: distribute quantityToReturn across original batches
    // according to their original allocation proportions.
    let remainingToReturn = quantityToReturn;
    
    // Sort allocations to return to the latest batches first (or any consistent order)
    const sortedAllocations = [...allocations].sort((a, b) => b.quantity - a.quantity);

    // Parallelize batch updates for better performance
    await Promise.all(sortedAllocations.map(async (alloc) => {
      if (remainingToReturn <= 0) return;
      
      const canReturnToThis = Math.min(alloc.quantity, remainingToReturn);
      if (canReturnToThis <= 0) return;

      // Atomic update - we use rpc directly or via optimized updateBatchQuantity
      // Try to update directly; if it doesn't exist, we'll handle it (though usually it should exist)
      const { data, error } = await supabase.rpc('atomic_increment_batch', {
        p_batch_id: alloc.batchId,
        p_delta: canReturnToThis,
      });

      if (error || !data || data.length === 0) {
        // Recreate batch if it was deleted but we are returning to it
        await this.createBatch({
          drugId,
          quantity: canReturnToThis,
          expiryDate: alloc.expiryDate,
          costPrice: 0,
          dateReceived: new Date().toISOString(),
          batchNumber: alloc.batchNumber || 'RECREATED',
          branchId: branchId,
          orgId: (await settingsService.getAll()).orgId,
          version: 1,
        });
      }
      
      remainingToReturn -= canReturnToThis;
    }));
    
    // If there's still remaining (e.g. user is returning more than original allocation for some reason),
    // we should ideally log a warning or put it in the most recent batch.
  },

  async getTotalStock(drugId: string, branchId?: string): Promise<number> {
    const batches = await this.getAllBatches(branchId, drugId);
    return batches.reduce((sum, b) => sum + b.quantity, 0);
  },

  async getEarliestExpiry(drugId: string, branchId?: string): Promise<string | null> {
    const batches = await this.getAllBatches(branchId, drugId);
    const valid = batches
      .filter((b) => b.quantity > 0)
      .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());
    return valid.length > 0 ? valid[0].expiryDate : null;
  },

  async hasStock(drugId: string, quantityNeeded: number, branchId: string): Promise<boolean> {
    const total = await this.getTotalStock(drugId, branchId);
    return total >= quantityNeeded;
  },

  async getStockSummary(drugId: string, branchId?: string) {
    const batches = await this.getAllBatches(branchId, drugId);
    const activeBatches = batches.filter((b) => b.quantity > 0);
    return {
      totalStock: activeBatches.reduce((sum, b) => sum + b.quantity, 0),
      batchCount: activeBatches.length,
      earliestExpiry: await this.getEarliestExpiry(drugId, branchId),
      batches: activeBatches.sort(
        (a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime()
      ),
    };
  },

  async deleteBatchById(batchId: string): Promise<boolean> {
    const { error } = await supabase.from('stock_batches').delete().eq('id', batchId);
    return !error;
  },

  async deleteBatchesByDrugId(drugId: string): Promise<boolean> {
    const { error } = await supabase.from('stock_batches').delete().eq('drug_id', drugId);
    return !error;
  },
};
