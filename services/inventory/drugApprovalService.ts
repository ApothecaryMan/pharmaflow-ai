import { drugApprovalRepository } from './repositories/drugApprovalRepository';
import type { DrugApproval } from '../../types';
import type { DrugApprovalDbRow } from './repositories/drugApprovalRepository';

class DrugApprovalService {
  async fetchPendingApprovals(): Promise<DrugApproval[]> {
    try {
      const data = await drugApprovalRepository.fetchPendingApprovals();

      return data.map((item) => ({
        id: item.id,
        globalDrugId: item.global_drug_id,
        orgId: item.org_id,
        status: item.status as DrugApproval['status'],
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
    } catch (error) {
      console.error('[DrugApprovalService] fetch failed:', error);
      throw error;
    }
  }

  async approveDrugs(approvalIds: string[]): Promise<void> {
    try {
      await drugApprovalRepository.approveDrugs(approvalIds);
    } catch (error) {
      console.error('[DrugApprovalService] approve failed:', error);
      throw error;
    }
  }

  async suspendDrugs(approvalIds: string[]): Promise<void> {
    try {
      await drugApprovalRepository.updateStatus(approvalIds, 'suspended');
    } catch (error) {
      console.error('[DrugApprovalService] suspend failed:', error);
      throw error;
    }
  }

  async reactivateDrugs(approvalIds: string[]): Promise<void> {
    try {
      await drugApprovalRepository.updateStatus(approvalIds, 'pending');
    } catch (error) {
      console.error('[DrugApprovalService] reactivate failed:', error);
      throw error;
    }
  }
}

export const drugApprovalService = new DrugApprovalService();
