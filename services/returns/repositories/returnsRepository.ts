import { supabase } from '../../../lib/supabase';
import type { Return, ReturnItem } from '../../../types';

export const returnsRepository = {
  async insertReturn(returnData: Return, processedBy: string): Promise<void> {
    const { error } = await (supabase as any).from('returns').insert({
      id: returnData.id,
      serial_id: returnData.serialId,
      branch_id: returnData.branchId,
      org_id: returnData.orgId,
      sale_id: returnData.saleId,
      date: returnData.date,
      return_type: returnData.returnType,
      total_refund: returnData.totalRefund,
      reason: returnData.reason,
      notes: returnData.notes,
      processed_by: processedBy,
    });
    if (error) throw error;
  },

  async insertReturnItems(items: any[]): Promise<void> {
    const { error } = await (supabase as any).from('return_items').insert(items);
    if (error) throw error;
  },

  async deleteReturn(returnId: string): Promise<boolean> {
    const { error } = await supabase.from('returns').delete().eq('id', returnId);
    return !error;
  },

  async deleteReturnItems(returnId: string): Promise<boolean> {
    const { error } = await supabase.from('return_items').delete().eq('return_id', returnId);
    return !error;
  }
};
