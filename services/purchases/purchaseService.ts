/**
 * Purchase Service - Purchase order operations
 * Business logic layer that orchestrates data access via PurchaseRepository.
 */

import { supabase } from '../../lib/supabase';
import type { Purchase, PurchaseStatus, StockBatch, StockMovement } from '../../types';
import { normalizeExpiryToISO } from '../../utils/expiryUtils';
import { idGenerator } from '../../utils/idGenerator';
import { money } from '../../utils/money';
import * as stockOps from '../../utils/stockOperations';
import { resolveUnits } from '../../utils/stockUtils';
import { BaseDomainService } from '../core/baseDomainService';
import { batchService } from '../inventory/batchService';
import { inventoryService } from '../inventory/inventoryService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import { settingsService } from '../settings/settingsService';
import { purchaseRepository } from './repositories/purchaseRepository';
import type { PurchaseFilters, PurchasesPageOptions, PurchaseService, PurchaseStats } from './types';

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

  async listPage(options: PurchasesPageOptions): Promise<{ rows: Purchase[]; total: number; page: number; pageSize: number }> {
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
    const { data, error } = await supabase
      .from(this.tableName)
      .select('invoice_id')
      .eq('branch_id', effectiveBranchId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Failed to get latest invoice ID', error);
      return 'INV-000001';
    }

    if (data?.invoice_id) {
      const parts = data.invoice_id.split('-');
      if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        const nextNum = parseInt(parts[1]) + 1;
        return `INV-${nextNum.toString().padStart(6, '0')}`;
      }
    }
    return 'INV-000001';
  }

  async create(purchase: Omit<Purchase, 'id'>, branchId?: string): Promise<Purchase> {
    const settings = await settingsService.getAll();
    const effectiveBranchId =
      branchId || (purchase as any).branchId || settings.activeBranchId || settings.branchCode;

    const newPurchase: Purchase = {
      ...purchase,
      id: idGenerator.uuid(),
      status: (purchase as any).status || 'pending',
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      date: purchase.date || new Date().toISOString(),
    } as Purchase;

    return purchaseRepository.insert(newPurchase);
  }

  async update(id: string, updates: Partial<Purchase>): Promise<Purchase> {
    return purchaseRepository.update(id, updates);
  }

  async approve(id: string, approverId: string, approverName: string): Promise<Purchase> {
    const purchase = await this.getById(id);
    if (!purchase) throw new Error('Purchase not found');

    const updates = {
      status: 'approved' as PurchaseStatus,
      approvedBy: approverName,
      approvalDate: new Date().toISOString(),
    };

    return this.update(id, updates);
  }

  async markAsReceived(id: string, receiverId: string, receiverName: string): Promise<Purchase> {
    const purchase = await this.getById(id);
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status === 'received' || purchase.status === 'completed') return purchase;

    // Use atomic server-side processing
    await this.processInventoryReceipt(purchase, receiverId, receiverName);

    // Refresh the local purchase record after processing
    const updatedPurchase = await this.getById(id);
    return updatedPurchase || purchase;
  }

  private async processInventoryReceipt(
    purchase: Purchase,
    performerId: string,
    performerName: string
  ): Promise<void> {
    try {
      // 🚀 Performance Optimization: Use Atomic Server-Side RPC
      const { data, error } = await supabase.rpc('process_purchase_receipt', {
        p_payload: {
          purchaseId: purchase.id,
          performerId,
          performerName,
          items: purchase.items.map((item) => ({
            drugId: item.drugId,
            name: item.name,
            quantity: resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack),
            expiryDate:
              normalizeExpiryToISO(item.expiryDate) ||
              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            costPrice: item.costPrice,
            publicPrice: item.publicPrice,
            unitPrice: item.unitPrice,
            unitCostPrice: item.unitCostPrice,
          })),
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'RPC failed');
      }

      console.log('[PurchaseService] Successfully processed inventory via atomic RPC');
    } catch (err) {
      console.warn('[PurchaseService] Atomic RPC failed, falling back to legacy processing:', err);
      // 🛡️ Safety Fallback: Use legacy sequential processing
      await this.processInventoryReceiptLegacy(purchase, performerId, performerName);

      // Update status manually since legacy path doesn't do it inside
      await this.update(purchase.id, {
        status: 'received',
        receivedBy: performerName,
        receivedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * 🛡️ Legacy Sequential Processing (Fallback Path)
   * This logic is kept to ensure system stability if the RPC is unavailable.
   */
  private async processInventoryReceiptLegacy(
    purchase: Purchase,
    performerId: string,
    performerName: string
  ): Promise<void> {
    const settings = await settingsService.getAll();
    const branchId = purchase.branchId;

    for (const item of purchase.items) {
      const currentStock = await batchService.getTotalStock(item.drugId);
      const unitsToAdd = resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack);

      const expiryDate =
        normalizeExpiryToISO(item.expiryDate) ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await batchService.createBatch(
        {
          drugId: item.drugId,
          quantity: unitsToAdd,
          expiryDate: expiryDate,
          costPrice: item.unitCostPrice || money.divide(item.costPrice, item.unitsPerPack || 1),
          purchaseId: purchase.id,
          dateReceived: new Date().toISOString(),
          branchId: branchId,
          orgId: purchase.orgId || settings.orgId,
          version: 1,
        },
        branchId
      );
    }

    for (const item of purchase.items) {
      const earliestExpiry = await batchService.getEarliestExpiry(item.drugId, branchId);
      const globalWAC = await batchService.calculateGlobalWAC(item.drugId, branchId); // Now returns a Unit WAC

      const normalizedExpiry =
        item.expiryDate && item.expiryDate.length === 7 && item.expiryDate.includes('-')
          ? `${item.expiryDate}-01`
          : item.expiryDate;

      await inventoryService.update(item.drugId, {
        publicPrice: item.publicPrice,
        unitPrice: item.unitPrice,
        costPrice: globalWAC ? money.multiply(globalWAC, item.unitsPerPack || 1, 2) : item.costPrice,
        unitCostPrice: globalWAC || item.unitCostPrice,
        expiryDate: earliestExpiry || normalizedExpiry,
      });
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
