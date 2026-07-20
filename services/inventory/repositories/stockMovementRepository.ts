import { supabase } from '../../../lib/supabase';

export const stockMovementRepository = {
  async deleteByIds(ids: string[]): Promise<boolean> {
    const { error } = await supabase.from('stock_movements').delete().in('id', ids);
    return !error;
  },

  async deleteByReferenceId(referenceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('stock_movements')
      .delete()
      .eq('reference_id', referenceId);
    return !error;
  },

  async setStockContextRPC(
    type: string,
    refId?: string,
    perfId?: string,
    perfName?: string,
    reason?: string,
    notes?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('set_stock_context', {
      p_type: type,
      p_ref_id: refId || null,
      p_perf_id: perfId || null,
      p_perf_name: perfName || null,
      p_reason: reason || null,
      p_notes: notes || null,
    });
    if (error) console.error('[StockMovementRepository] Failed to set context:', error);
  },
};
