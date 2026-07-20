import { supabase } from '../../../lib/supabase';

export interface DrugApprovalDbRow {
  id: string;
  global_drug_id: string;
  org_id: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  global_drugs?: {
    id: string;
    name_en: string;
    name_ar?: string;
    active_substance?: string;
    barcode?: string;
    category?: string;
    public_price?: number;
    manufacturer?: string;
    dosage_form?: string;
    updated_at: string;
  };
}

export const drugApprovalRepository = {
  async fetchPendingApprovals(): Promise<DrugApprovalDbRow[]> {
    const { data, error } = await supabase
      .from('drug_approvals')
      .select('*, global_drugs(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async approveDrugs(approvalIds: string[]): Promise<void> {
    if (approvalIds.length === 0) return;

    const { error } = await supabase.rpc('approve_global_drugs', {
      p_approval_ids: approvalIds,
    });

    if (error) throw error;
  },

  async updateStatus(approvalIds: string[], status: string): Promise<void> {
    if (approvalIds.length === 0) return;

    const { error } = await supabase
      .from('drug_approvals')
      .update({ status })
      .in('id', approvalIds);

    if (error) throw error;
  },
};
