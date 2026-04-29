/**
 * Purchase Service - Purchase order operations
 * Online-Only implementation using Supabase
 */

import { BaseDomainService } from '../core/BaseDomainService';
import type { Purchase, PurchaseStatus, StockMovement, StockBatch } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { inventoryService } from '../inventory/inventoryService';
import { batchService } from '../inventory/batchService';
import { stockMovementService } from '../inventory/stockMovement/stockMovementService';
import * as stockOps from '../../utils/stockOperations';
import { money } from '../../utils/money';
import { supabase } from '../../lib/supabase';
import type { PurchaseFilters, PurchaseService, PurchaseStats } from './types';

class PurchaseServiceImpl extends BaseDomainService<Purchase> implements PurchaseService {
  protected tableName = 'purchases';

  public mapFromDb(db: any): Purchase {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      date: db.date,
      supplierId: db.supplier_id,
      supplierName: db.supplier_name_snapshot,
      items: db.items || [],
      subtotal: db.subtotal,
      discount: db.discount,
      totalTax: db.total_tax,
      totalCost: db.total_cost,
      paymentMethod: db.payment_type || 'cash',
      status: db.status,
      approvedBy: db.approved_by,
      approvalDate: db.approval_date,
      receivedBy: db.received_by,
      receivedAt: db.received_at,
      externalInvoiceId: db.external_invoice_id,
      invoiceId: db.invoice_id,
      version: db.version,
    };
  }

  public mapToDb(p: Partial<Purchase>): any {
    const db: any = {};
    if (p.id !== undefined) db.id = p.id;
    if (p.orgId !== undefined) db.org_id = p.orgId;
    if (p.branchId !== undefined) db.branch_id = p.branchId;
    if (p.date !== undefined) db.date = p.date;
    if (p.supplierId !== undefined) db.supplier_id = p.supplierId;
    if (p.supplierName !== undefined) db.supplier_name_snapshot = p.supplierName;
    if (p.items !== undefined) db.items = p.items;
    if (p.subtotal !== undefined) db.subtotal = p.subtotal;
    if (p.discount !== undefined) db.discount = p.discount;
    if (p.totalTax !== undefined) db.total_tax = p.totalTax;
    if (p.totalCost !== undefined) db.total_cost = p.totalCost;
    if (p.paymentMethod !== undefined) db.payment_type = p.paymentMethod;
    if (p.status !== undefined) db.status = p.status;
    if (p.approvedBy !== undefined) db.approved_by = p.approvedBy;
    if (p.approvalDate !== undefined) db.approval_date = p.approvalDate;
    if (p.receivedBy !== undefined) db.received_by = p.receivedBy;
    if (p.receivedAt !== undefined) db.received_at = p.receivedAt;
    if (p.externalInvoiceId !== undefined) db.external_invoice_id = p.externalInvoiceId;
    if (p.invoiceId !== undefined) db.invoice_id = p.invoiceId;
    if (p.version !== undefined) db.version = p.version;
    return db;
  }

  async getAll(branchId?: string): Promise<Purchase[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName).select('*');
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => this.mapFromDb(item));
    } catch (err) {
      console.error('[PurchaseService] getAll failed:', err);
      return [];
    }
  }

  async getBySupplier(supplierId: string, branchId?: string): Promise<Purchase[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName)
        .select('*')
        .eq('supplier_id', supplierId);
      
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => this.mapFromDb(item));
    } catch (err) {
      console.error('[PurchaseService] getBySupplier failed:', err);
      return [];
    }
  }

  async getByStatus(status: PurchaseStatus, branchId?: string): Promise<Purchase[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName)
        .select('*')
        .eq('status', status);
      
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => this.mapFromDb(item));
    } catch (err) {
      console.error('[PurchaseService] getByStatus failed:', err);
      return [];
    }
  }

  async getPending(branchId?: string): Promise<Purchase[]> {
    return this.getByStatus('pending', branchId);
  }

  async filter(filters: PurchaseFilters, branchId?: string): Promise<Purchase[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    try {
      let query = supabase.from(this.tableName).select('*');
      
      const isAll = typeof effectiveBranchId === 'string' && effectiveBranchId.toLowerCase() === 'all';
      
      if (effectiveBranchId && !isAll) {
        query = query.eq('branch_id', effectiveBranchId);
      } else if (isAll && settings.orgId) {
        query = query.eq('org_id', settings.orgId);
      }
      
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
      if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('date', filters.dateTo);
      
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => this.mapFromDb(item));
    } catch (err) {
      console.error('[PurchaseService] filter failed:', err);
      return [];
    }
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

    const dbPurchase = this.mapToDb(newPurchase);
    const { error } = await supabase.from(this.tableName).insert(dbPurchase);
    if (error) throw error;

    return newPurchase;
  }

  async approve(id: string, approverName: string): Promise<Purchase> {
    const purchase = await this.getById(id);
    if (!purchase) throw new Error('Purchase not found');
    
    // Approval simply validates the order and moves it forward
    // In the decoupled workflow, batch creation is deferred until 'received' status
    const updates = {
      status: 'approved' as PurchaseStatus,
      approvedBy: approverName,
      approvalDate: new Date().toISOString(),
    };
    
    return this.update(id, updates);
  }

  async markAsReceived(id: string, receiverName: string): Promise<Purchase> {
    const purchase = await this.getById(id);
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status === 'received' || purchase.status === 'completed') return purchase;

    // Trigger automated batch creation
    await this.processInventoryReceipt(purchase, receiverName);

    const updates = {
      status: 'received' as PurchaseStatus,
      receivedBy: receiverName,
      receivedAt: new Date().toISOString(),
    };
    
    return this.update(id, updates);
  }

  /**
   * Internal helper to handle the automated batch creation and stock updates
   */
  private async processInventoryReceipt(purchase: Purchase, performedBy: string): Promise<void> {
    const settings = await settingsService.getAll();
    const branchId = purchase.branchId;

    for (const item of purchase.items) {
      const currentStock = await batchService.getTotalStock(item.drugId);
      const unitsToAdd = stockOps.resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack);

      const batch = await batchService.createBatch({
        drugId: item.drugId,
        quantity: unitsToAdd,
        expiryDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
        performedBy: performedBy,
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
      true // skipBatch: we already created batches above
    );

    // Update Drug pricing info from latest purchase
    for (const item of purchase.items) {
      await inventoryService.update(item.drugId, {
        publicPrice: item.publicPrice,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        unitCostPrice: item.unitCostPrice,
        expiryDate: item.expiryDate,
      });
    }
  }

  async reject(id: string, reason: string): Promise<Purchase> {
    const updates = {
      status: 'rejected' as PurchaseStatus,
      notes: reason, // Reusing notes for rejection reason
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
    
    const dbPurchases = purchases.map(p => this.mapToDb({
      ...p,
      branchId: p.branchId || effectiveBranchId,
      orgId: p.orgId || settings.orgId
    }));

    if (dbPurchases.length > 0) {
      const { error } = await supabase.from(this.tableName).upsert(dbPurchases);
      if (error) throw error;
    }
  }
}

export const purchaseService = new PurchaseServiceImpl();
