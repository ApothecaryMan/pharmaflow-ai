import { supabase } from '../../../lib/supabase';

export const stockMovementRepository = {
  async deleteByIds(ids: string[]): Promise<boolean> {
    const { error } = await supabase.from('stock_movements').delete().in('id', ids);
    return !error;
  },

  async deleteByReferenceId(referenceId: string): Promise<boolean> {
    const { error } = await supabase.from('stock_movements').delete().eq('reference_id', referenceId);
    return !error;
  }
};
