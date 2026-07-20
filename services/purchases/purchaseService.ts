/**
 * Purchase Service - Purchase order operations
 * Business logic layer that orchestrates data access via PurchaseRepository.
 */

import type { Purchase, PurchaseStatus } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { money } from '../../utils/money';
import { BaseDomainService } from '../core/baseDomainService';
import { settingsService } from '../settings/settingsService';
import { purchaseRepository } from './repositories/purchaseRepository';
import type {
  PurchaseFilters,
  PurchaseService,
  PurchaseStats,
  PurchasesPageOptions,
} from './types';

class PurchaseServiceImpl extends BaseDomainService<Purchase> implements PurchaseService {
  protected tableName = 'purchases';

  public mapFromDb(db: any): Purchase {
    return purchaseRepository.mapFromDb(db);
  }

  public mapToDb(p: Partial<Purchase>): any {
    return purchaseRepository.mapToDb(p);
  }

  async getAll(branchId?: string): Promise<Purchase[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return purchaseRepository.getAll(effectiveBranchId, settings.orgId);
  }

  async getRecent(branchId?: string, limit: number = 100): Promise<Purchase[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return purchaseRepository.getRecent(effectiveBranchId, settings.orgId, limit);
  }

  async getById(id: string): Promise<Purchase | null> {
    return purchaseRepository.getById(id);
  }

  async getBySupplier(supplierId: string, branchId?: string): Promise<Purchase[]> {
    return this.filter({ supplierId }, branchId);
  }

  async getByStatus(status: PurchaseStatus, branchId?: string): Promise<Purchase[]> {
    return this.filter({ status }, branchId);
  }

  async getPending(branchId?: string): Promise<Purchase[]> {
    return this.getByStatus('pending', branchId);
  }

  async filter(filters: PurchaseFilters, branchId?: string): Promise<Purchase[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return purchaseRepository.findByFilters(filters, effectiveBranchId, settings.orgId);
  }

  async listPage(
    options: PurchasesPageOptions
  ): Promise<{ rows: Purchase[]; total: number; page: number; pageSize: number }> {
    const settings = await settingsService.getAll();
    return purchaseRepository.listPage({
      ...options,
      branchId: options.branchId || settings.activeBranchId || settings.branchCode,
      orgId: options.orgId || settings.orgId,
    });
  }

  async getNextInvoiceId(branchId?: string): Promise<string> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    try {
      const invoiceId = await purchaseRepository.getNextInvoiceId(effectiveBranchId);

      if (invoiceId) {
        const parts = invoiceId.split('-');
        if (parts.length === 2 && !Number.isNaN(Number.parseInt(parts[1], 10))) {
          const nextNum = Number.parseInt(parts[1], 10) + 1;
          return `INV-${nextNum.toString().padStart(6, '0')}`;
        }
      }
    } catch (error) {
      console.warn('Failed to get latest invoice ID', error);
    }
    return 'INV-000001';
  }

  async create(purchase: Omit<Purchase, 'id'>, branchId?: string): Promise<Purchase> {
    const settings = await settingsService.getAll();
    const effectiveBranchId =
      branchId || purchase.branchId || settings.activeBranchId || settings.branchCode;

    const items = purchase.items;
    const newPurchase: Purchase = {
      ...purchase,
      id: idGenerator.uuid(),
      status: purchase.status || 'pending',
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: purchase.date || new Date().toISOString(),
    };

    const created = await purchaseRepository.insert(newPurchase);

    if (items.length > 0) {
      const normalizeDate = (d: string | undefined | null): string | null => {
        if (!d) return null;
        if (d.length === 7) return d + '-01';
        return d;
      };

      const purchaseItems = items.map((item) => ({
        id: idGenerator.uuid(),
        purchase_id: created.id,
        branch_id: effectiveBranchId,
        drug_id: item.drugId,
        name: item.name,
        dosage_form: item.dosageForm || null,
        quantity: item.quantity,
        cost_price: item.costPrice,
        expiry_date: normalizeDate(item.expiryDate),
        discount: item.discount || 0,
        public_price: item.publicPrice,
        tax: item.tax || 0,
        is_unit: item.isUnit || false,
        units_per_pack: item.unitsPerPack || 1,
      }));

      try {
        await purchaseRepository.insertPurchaseItems(purchaseItems);
      } catch (insertError: any) {
        throw new Error(`Failed to insert purchase items: ${insertError.message}`);
      }
    }

    return created;
  }

  async update(id: string, updates: Partial<Purchase>): Promise<Purchase> {
    return purchaseRepository.update(id, updates);
  }

  async approve(id: string, _approverId: string, approverName: string): Promise<Purchase> {
    const purchase = await this.getById(id);
    if (!purchase) throw new Error('Purchase not found');

    const updates = {
      status: 'approved' as PurchaseStatus,
      approvedBy: approverName,
      approvalDate: new Date().toISOString(),
    };

    return this.update(id, updates);
  }

  async markAsReceived(
    id: string,
    receiverId: string,
    receiverName: string,
    shiftId?: string
  ): Promise<Purchase> {
    const purchase = await this.getById(id);
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status === 'received' || purchase.status === 'completed') return purchase;

    await this.processInventoryReceipt(purchase, receiverId, receiverName, shiftId);

    const updatedPurchase = await this.getById(id);
    return updatedPurchase || purchase;
  }

  private async processInventoryReceipt(
    purchase: Purchase,
    performerId: string,
    performerName: string,
    shiftId?: string
  ): Promise<void> {
    const data = await purchaseRepository.processReceiptRPC({
      purchaseId: purchase.id,
      performerId,
      performerName,
      shiftId,
    });

    if (!data?.success) {
      throw new Error(data?.error || 'Purchase receipt RPC failed');
    }
  }

  async reject(id: string, reason: string): Promise<Purchase> {
    const updates = {
      status: 'rejected' as PurchaseStatus,
      notes: reason,
    };
    return this.update(id, updates);
  }

  async getStats(branchId?: string): Promise<PurchaseStats> {
    const all = await this.getAll(branchId);
    return {
      totalOrders: all.length,
      pendingOrders: all.filter((p) => p.status === 'pending').length,
      totalValue: all.reduce((sum, p) => money.add(sum, p.totalCost || 0), 0),
    };
  }

  async save(purchases: Purchase[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    const processedPurchases = purchases.map((p) => ({
      ...p,
      branchId: p.branchId || effectiveBranchId,
      orgId: p.orgId || settings.orgId,
    }));

    await purchaseRepository.upsert(processedPurchases);
  }
}

export const purchaseService = new PurchaseServiceImpl();
