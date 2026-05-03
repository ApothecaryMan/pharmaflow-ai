import { supabase } from '../../../lib/supabase';

export const cashRepository = {
  async deleteTransaction(transactionId: string): Promise<boolean> {
    const { error } = await supabase.from('cash_transactions').delete().eq('id', transactionId);
    return !error;
  }
};
