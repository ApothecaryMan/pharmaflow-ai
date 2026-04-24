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
  if (b.orgId !== undefined) db.org_id = b.orgId;
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
  async fetchBatchesFromSupabase(branchId?: string, drugId?: string): Promise<StockBatch[]> {
    try {
      let query = supabase.from('stock_batches').select('*');
      if (branchId) query = query.eq('branch_id', branchId);
      if (drugId) query = query.eq('drug_id', drugId);
      
      const { data, error } = await query.order('expiry_date', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapDbToBatch);
    } catch (err) {
      console.error('[BatchService] fetchBatches failed:', err);
      return [];
    }
  },

  async getAllBatches(branchId?: string, drugId?: string): Promise<StockBatch[]> {
    return this.fetchBatchesFromSupabase(branchId, drugId);
  },

  async getBatchById(batchId: string): Promise<StockBatch | null> {
    const { data, error } = await supabase.from('stock_batches').select('*').eq('id', batchId).maybeSingle();
    if (error || !data) return null;
    return mapDbToBatch(data);
  },

  async createBatch(batch: Omit<StockBatch, 'id'>, branchId?: string): Promise<StockBatch> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || batch.branchId || settings.activeBranchId;
    
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

  async updateBatchQuantity(batchId: string, delta: number): Promise<StockBatch | null> {
    const batch = await this.getBatchById(batchId);
    if (!batch) return null;

    const newQty = Math.max(0, batch.quantity + delta);
    const newVersion = (batch.version || 0) + 1;

    const { error } = await supabase
      .from('stock_batches')
      .update({ quantity: newQty, version: newVersion })
      .eq('id', batchId);
      
    if (error) throw error;
    return { ...batch, quantity: newQty, version: newVersion };
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
    requests: { drugId: string; quantity: number; name?: string }[],
    branchId: string
  ): Promise<{ drugId: string; allocations: BatchAllocation[] }[]> {
    const result: { drugId: string; allocations: BatchAllocation[] }[] = [];
    for (const req of requests) {
      if (req.quantity <= 0) continue;
      const allocs = await this.allocateStock(req.drugId, req.quantity, branchId);
      if (!allocs) throw new Error(`Insufficient stock for: ${req.name || req.drugId}`);
      result.push({ drugId: req.drugId, allocations: allocs });
    }
    return result;
  },

  async allocateStock(
    drugId: string,
    quantityNeeded: number,
    branchId: string,
    commitChanges: boolean = true
  ): Promise<BatchAllocation[] | null> {
    if (quantityNeeded <= 0) return null;

    const batches = await this.getAllBatches(branchId, drugId);
    const validBatches = batches
      .filter((b) => {
        const exp = parseExpiryEndOfMonth(b.expiryDate);
        return !isNaN(exp.getTime()) && exp > new Date();
      })
      .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());

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
      for (const alloc of allocations) {
        await this.updateBatchQuantity(alloc.batchId, -alloc.quantity);
      }
    }
    return allocations;
  },

  async returnStock(allocations: BatchAllocation[], drugId?: string, branchId?: string): Promise<void> {
    if (!allocations || allocations.length === 0) return;
    for (const alloc of allocations) {
      const batch = await this.getBatchById(alloc.batchId);
      if (batch) {
        await this.updateBatchQuantity(alloc.batchId, alloc.quantity);
      } else if (drugId && branchId) {
        await this.createBatch({
          drugId,
          quantity: alloc.quantity,
          expiryDate: alloc.expiryDate,
          costPrice: 0,
          dateReceived: new Date().toISOString(),
          batchNumber: 'RECREATED',
          branchId: branchId,
          orgId: (await settingsService.getAll()).orgId,
          version: 1,
        });
      }
    }
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
