/**
 * Purchase Service - Purchase order operations
 * Business logic layer that orchestrates data access via PurchaseRepository.
 */

import { BaseDomainService } from '../core/baseDomainService';
import type { Purchase, PurchaseStatus, StockMovement, StockBatch } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { inventoryService } from '../inventory/inventoryService';
import { batchService } from '../inventory/batchService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import * as stockOps from '../../utils/stockOperations';
import { money } from '../../utils/money';
import { purchaseRepository } from './repositories/purchaseRepository';
import type { PurchaseFilters, PurchaseService, PurchaseStats } from './types';

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

  async create(purchase: Omit<Purchase, 'id'>, branchId?: string): Promise<Purchase> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || (purchase as any).branchId || settings.activeBranchId || settings.branchCode;
    
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

    await this.processInventoryReceipt(purchase, receiverId, receiverName);

    const updates = {
      status: 'received' as PurchaseStatus,
      receivedBy: receiverName,
      receivedAt: new Date().toISOString(),
    };
    
    return this.update(id, updates);
  }

  private async processInventoryReceipt(purchase: Purchase, performerId: string, performerName: string): Promise<void> {
    const settings = await settingsService.getAll();
    const branchId = purchase.branchId;

    for (const item of purchase.items) {
      const currentStock = await batchService.getTotalStock(item.drugId);
      const unitsToAdd = stockOps.resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack);

      let expiryDate = item.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      
      if (expiryDate && expiryDate.length === 7 && expiryDate.includes('-')) {
        expiryDate = `${expiryDate}-01`;
      }

      const batch = await batchService.createBatch({
        drugId: item.drugId,
        quantity: unitsToAdd,
        expiryDate: expiryDate,
        costPrice: item.costPrice,
        purchaseId: purchase.id,
        dateReceived: new Date().toISOString(),
        branchId: branchId,
        orgId: purchase.orgId || settings.orgId,
        version: 1,
      }, branchId);

      await stockMovementService.logMovement({
        drugId: item.drugId,
        drugName: item.name,
        branchId: branchId || '',
        type: 'purchase',
        quantity: unitsToAdd,
        previousStock: currentStock,
        newStock: currentStock + unitsToAdd,
        referenceId: purchase.id,
        batchId: batch.id,
        expiryDate: batch.expiryDate,
        performedBy: performerId,
        performedByName: performerName,
        status: 'approved',
        orgId: purchase.orgId || settings.orgId,
        publicPrice: item.publicPrice,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        unitCostPrice: item.unitCostPrice,
      });
    }

    await inventoryService.updateStockBulk(
      purchase.items.map(i => ({ 
        id: i.drugId, 
        quantity: stockOps.resolveUnits(i.quantity, !!i.isUnit, i.unitsPerPack) 
      })),
      true
    );

    for (const item of purchase.items) {
      const earliestExpiry = await batchService.getEarliestExpiry(item.drugId, branchId);
      const globalWAC = await batchService.calculateGlobalWAC(item.drugId, branchId);
      
      const normalizedExpiry = item.expiryDate && item.expiryDate.length === 7 && item.expiryDate.includes('-') 
        ? `${item.expiryDate}-01` 
        : item.expiryDate;

      await inventoryService.update(item.drugId, {
        publicPrice: item.publicPrice,
        unitPrice: item.unitPrice,
        costPrice: globalWAC || item.costPrice,
        unitCostPrice: globalWAC ? money.divide(globalWAC, item.unitsPerPack || 1) : item.unitCostPrice,
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
    
    const processedPurchases = purchases.map(p => ({
      ...p,
      branchId: p.branchId || effectiveBranchId,
      orgId: p.orgId || settings.orgId
    }));

    await purchaseRepository.upsert(processedPurchases);
  }
}

export const purchaseService = new PurchaseServiceImpl();
