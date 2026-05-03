import { supabase } from '../../../lib/supabase';
import type { StockBatch } from '../../../types';

export const mapBatchToDb = (b: Partial<StockBatch>): any => {
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

export const mapDbToBatch = (db: any): StockBatch => ({
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

export const batchRepository = {
  async getAll(branchId?: string, drugId?: string, drugIds?: string[]): Promise<StockBatch[]> {
    try {
      let query = supabase.from('stock_batches').select('*');
      if (branchId) query = query.eq('branch_id', branchId);
      if (drugId) query = query.eq('drug_id', drugId);
      if (drugIds && drugIds.length > 0) query = query.in('drug_id', drugIds);
      
      const { data, error } = await query.order('expiry_date', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapDbToBatch);
    } catch (err) {
      console.error('[BatchRepository] getAll failed:', err);
      return [];
    }
  },

  async getById(batchId: string): Promise<StockBatch | null> {
    const { data, error } = await supabase.from('stock_batches').select('*').eq('id', batchId).maybeSingle();
    if (error || !data) return null;
    return mapDbToBatch(data);
  },

  async findExistingBatch(drugId: string, branchId: string, expiryDate: string | null): Promise<StockBatch | null> {
    let query = supabase.from('stock_batches')
      .select('*')
      .eq('drug_id', drugId)
      .eq('branch_id', branchId);
      
    if (expiryDate) {
      let expDate = expiryDate;
      if (expDate.length === 7 && /^\d{4}-\d{2}$/.test(expDate)) expDate = `${expDate}-01`;
      query = query.eq('expiry_date', expDate);
    } else {
      query = query.is('expiry_date', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? mapDbToBatch(data) : null;
  },

  async insert(batch: StockBatch): Promise<void> {
    const { error } = await supabase.from('stock_batches').insert(mapBatchToDb(batch));
    if (error) throw error;
  },

  async update(batchId: string, updates: Partial<StockBatch>): Promise<void> {
    const { error } = await supabase
      .from('stock_batches')
      .update(mapBatchToDb(updates))
      .eq('id', batchId);
      
    if (error) throw error;
  },

  async atomicIncrement(batchId: string, delta: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('atomic_increment_batch', {
      p_batch_id: batchId,
      p_delta: delta,
    });
    if (error) throw error;
    return !!(data && data.length > 0);
  },

  async delete(batchId: string): Promise<boolean> {
    const { error } = await supabase.from('stock_batches').delete().eq('id', batchId);
    return !error;
  },

  async deleteByDrugId(drugId: string): Promise<boolean> {
    const { error } = await supabase.from('stock_batches').delete().eq('drug_id', drugId);
    return !error;
  },

  async deleteByPurchaseId(purchaseId: string): Promise<boolean> {
    const { error } = await supabase.from('stock_batches').delete().eq('purchase_id', purchaseId);
    return !error;
  }
};
