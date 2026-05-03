import { supabase } from '../../../lib/supabase';
import type { Sale } from '../../../types';

export const salesRepository = {
  async getNextDailyOrderNumber(branchId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_next_daily_order_number', {
      p_branch_id: branchId
    });
    if (error) {
      console.warn('[SalesRepository] Failed to get atomic daily number, falling back to 1', error);
      return 1;
    }
    return data || 1;
  },

  async delete(saleId: string): Promise<boolean> {
    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    return !error;
  }
};
