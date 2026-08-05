/**
 * Purchase Service - Purchase order operations
 * Business logic layer that orchestrates data access via PurchaseRepository.
 */

import { supabase } from '../../lib/supabase';
import type { Purchase, PurchaseStatus } from '../../types';
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

  /**
   * Returns the most recently minted purchase number (display-only).
   * Purchase numbers are AUTHORITATIVE on the server (generate_serial_id, 'PU').
   * The client never predicts/increments the next number — that caused
   * duplicate invoice numbers under concurrent purchases. Returns '' if none.
   */
  async getNextInvoiceId(branchId?: string): Promise<string> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;

    try {
      return (await purchaseRepository.getNextInvoiceId(effectiveBranchId)) || '';
    } catch (error) {
      console.warn('Failed to get latest invoice ID', error);
      return '';
    }
  }

  async create(purchase: Omit<Purchase, 'id'>, branchId?: string): Promise<Purchase> {
    const settings = await settingsService.getAll();
    const effectiveBranchId =
      branchId || purchase.branchId || settings.activeBranchId || settings.branchCode;

    const normalizeDate = (d: string | undefined | null): string | null => {
      if (!d) return null;
      if (d.length === 7) return `${d}-01`;
      return d;
    };

    // Purchase creation is ATOMIC on the server: create_purchase mints the PU
    // serial via generate_serial_id and inserts header + items in ONE database
    // transaction. The client never mints numbers or predicts them — it sends
    // the computed payload and the server returns the authoritative serial.
    const payload = {
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: purchase.date,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      subtotal: purchase.subtotal,
      discount: purchase.discount,
      totalTax: purchase.totalTax,
      totalCost: purchase.totalCost,
      status: purchase.status,
      paymentMethod: purchase.paymentMethod,
      externalInvoiceId: purchase.externalInvoiceId,
      createdBy: purchase.createdBy,
      createdByName: purchase.createdByName,
      notes: purchase.notes,
      dueDate: purchase.dueDate,
      items: (purchase.items || []).map((item) => ({
        drugId: item.drugId,
        name: item.name,
        dosageForm: item.dosageForm,
        quantity: item.quantity,
        costPrice: item.costPrice,
        expiryDate: normalizeDate(item.expiryDate),
        discount: item.discount,
        publicPrice: item.publicPrice,
        unitPrice: item.unitPrice,
        unitCostPrice: item.unitCostPrice,
        tax: item.tax,
        isUnit: item.isUnit,
        unitsPerPack: item.unitsPerPack,
        batchNumber: item.batchNumber,
      })),
    };

    const { data, error } = await supabase.rpc('create_purchase', { p_payload: payload });

    if (error) {
      throw new Error(`Failed to create purchase: ${error.message}`);
    }
    if (!data?.success) {
      throw new Error(data?.error || 'Failed to create purchase');
    }

    return {
      ...purchase,
      id: data.purchaseId,
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: data.purchase?.date || purchase.date || new Date().toISOString(),
      status: data.purchase?.status || purchase.status || 'pending',
      invoiceId: data.invoiceId || purchase.invoiceId || '',
      items: purchase.items || [],
    };
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
    shiftId?: string,
    paidNow?: number
  ): Promise<Purchase> {
    const purchase = await this.getById(id);
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status === 'received' || purchase.status === 'completed') return purchase;

    await this.processInventoryReceipt(purchase, receiverId, receiverName, shiftId, paidNow);

    const updatedPurchase = await this.getById(id);
    return updatedPurchase || purchase;
  }

  private async processInventoryReceipt(
    purchase: Purchase,
    performerId: string,
    performerName: string,
    shiftId?: string,
    paidNow?: number
  ): Promise<void> {
    const data = await purchaseRepository.processReceiptRPC({
      purchaseId: purchase.id,
      performerId,
      performerName,
      shiftId,
      paidNow,
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
