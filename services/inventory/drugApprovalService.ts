import { supabase } from '../../lib/supabase';
import type { DrugApproval } from '../../types';

class DrugApprovalService {
  async fetchPendingApprovals(): Promise<DrugApproval[]> {
    const { data, error } = await supabase
      .from('drug_approvals')
      .select('*, global_drugs(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DrugApprovalService] fetch failed:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      globalDrugId: item.global_drug_id,
      orgId: item.org_id,
      status: item.status,
      reviewedBy: item.reviewed_by,
      reviewedAt: item.reviewed_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      globalDrug: item.global_drugs
        ? {
            id: item.global_drugs.id,
            name: item.global_drugs.name_en,
            nameAr: item.global_drugs.name_ar,
            activeSubstance: item.global_drugs.active_substance,
            barcode: item.global_drugs.barcode,
            category: item.global_drugs.category,
            publicPrice: Number(item.global_drugs.public_price || 0),
            manufacturer: item.global_drugs.manufacturer,
            dosageForm: item.global_drugs.dosage_form,
            updatedAt: item.global_drugs.updated_at,
          }
        : undefined,
    }));
  }

  async approveDrugs(approvalIds: string[]): Promise<void> {
    if (approvalIds.length === 0) return;

    const { error } = await supabase.rpc('approve_global_drugs', {
      p_approval_ids: approvalIds,
    });

    if (error) {
      console.error('[DrugApprovalService] approve failed:', error);
      throw error;
    }
  }

  async suspendDrugs(approvalIds: string[]): Promise<void> {
    if (approvalIds.length === 0) return;

    const { error } = await supabase
      .from('drug_approvals')
      .update({ status: 'suspended' })
      .in('id', approvalIds);

    if (error) {
      console.error('[DrugApprovalService] suspend failed:', error);
      throw error;
    }
  }

  async reactivateDrugs(approvalIds: string[]): Promise<void> {
    if (approvalIds.length === 0) return;

    const { error } = await supabase
      .from('drug_approvals')
      .update({ status: 'pending' })
      .in('id', approvalIds);

    if (error) {
      console.error('[DrugApprovalService] reactivate failed:', error);
      throw error;
    }
  }
}

export const drugApprovalService = new DrugApprovalService();
