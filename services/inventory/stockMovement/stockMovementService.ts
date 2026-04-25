import { BaseReportService, BaseReportFilters } from '../../core/BaseReportService';
import { idGenerator } from '../../../utils/idGenerator';
import { settingsService } from '../../settings/settingsService';
import { supabase } from '../../../lib/supabase';
import type { 
  StockMovement, 
  StockMovementFilters, 
  StockMovementService, 
  StockMovementSummary, 
  StockMovementKPISummary, 
  PaginatedStockMovements 
} from './types';

class StockMovementServiceImpl 
  extends BaseReportService<StockMovement, StockMovementFilters> 
  implements StockMovementService {
  
  protected tableName = 'stock_movements';

  protected mapDbToDomain(db: any): StockMovement {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      drugId: db.drug_id,
      drugName: db.drug_name_snapshot,
      type: db.type,
      quantity: db.quantity,
      previousStock: db.previous_stock,
      newStock: db.new_stock,
      reason: db.reason || undefined,
      notes: db.notes || undefined,
      referenceId: db.reference_id || undefined,
      transactionId: db.transaction_id || undefined,
      batchId: db.batch_id || undefined,
      performedBy: db.performed_by,
      performedByName: db.performed_by_name_snapshot || undefined,
      timestamp: db.timestamp,
      status: db.status,
      reviewedBy: db.reviewed_by || undefined,
      reviewedAt: db.reviewed_at || undefined,
      expiryDate: db.expiry_date || undefined,
      price: db.price_snapshot,
      unitPrice: db.unit_price_snapshot,
      costPrice: db.cost_price_snapshot,
      unitCostPrice: db.unit_cost_price_snapshot,
    };
  }

  protected mapDomainToDb(m: Partial<StockMovement>): any {
    const db: any = {};
    if (m.id) db.id = m.id;
    if (m.branchId) db.branch_id = m.branchId;
    if (m.drugId) db.drug_id = m.drugId;
    if (m.drugName) db.drug_name_snapshot = m.drugName;
    if (m.type) db.type = m.type;
    if (m.quantity !== undefined) db.quantity = m.quantity;
    if (m.previousStock !== undefined) db.previous_stock = m.previousStock;
    if (m.newStock !== undefined) db.new_stock = m.newStock;
    if (m.reason) db.reason = m.reason;
    if (m.notes) db.notes = m.notes;
    if (m.referenceId) db.reference_id = m.referenceId;
    if (m.transactionId) db.transaction_id = m.transactionId;
    if (m.batchId) db.batch_id = m.batchId;
    if (m.performedBy) db.performed_by = m.performedBy;
    if (m.performedByName) db.performed_by_name_snapshot = m.performedByName;
    if (m.timestamp) db.timestamp = m.timestamp;
    if (m.status) db.status = m.status;
    if (m.reviewedBy) db.reviewed_by = m.reviewedBy;
    if (m.reviewedAt) db.reviewed_at = m.reviewedAt;
    if (m.expiryDate) db.expiry_date = m.expiryDate;
    if (m.price !== undefined) db.price_snapshot = m.price;
    if (m.unitPrice !== undefined) db.unit_price_snapshot = m.unitPrice;
    if (m.costPrice !== undefined) db.cost_price_snapshot = m.costPrice;
    if (m.unitCostPrice !== undefined) db.unit_cost_price_snapshot = m.unitCostPrice;
    return db;
  }

  // --- Implementation of StockMovementService ---

  async getAll(branchId?: string): Promise<StockMovement[]> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const results = await this.getHistory({ branchId: effectiveBranchId } as StockMovementFilters);
    return results as StockMovement[];
  }

  async getByDrugId(drugId: string): Promise<StockMovement[]> {
    const results = await this.getHistory({ drugId } as StockMovementFilters);
    return results as StockMovement[];
  }

  async logMovement(
    movement: Omit<StockMovement, 'id' | 'timestamp'>
  ): Promise<StockMovement> {
    const settings = await settingsService.getAll();
    const activeBranchId = settings.activeBranchId || settings.branchCode;

    const newMovement: StockMovement = {
      ...movement,
      id: idGenerator.uuid(),
      branchId: movement.branchId || activeBranchId,
      orgId: movement.orgId || settings.orgId,
      timestamp: new Date().toISOString(),
    };

    const dbMovement = this.mapDomainToDb(newMovement);
    const { error } = await (supabase as any).from(this.tableName).insert(dbMovement);
    if (error) throw error;

    return newMovement;
  }

  /**
   * Overriding getHistory to handle pagination and custom filters like drugId, status, type.
   */
  async getHistory(filters: StockMovementFilters): Promise<StockMovement[] | PaginatedStockMovements> {
    try {
      let query = (supabase as any).from(this.tableName).select('*', { count: 'exact' });

      // Apply Base Filters
      if (filters.branchId) query = query.eq('branch_id', filters.branchId);
      if (filters.startDate) query = query.gte('timestamp', filters.startDate);
      if (filters.endDate) query = query.lte('timestamp', filters.endDate);

      // Apply Custom Filters
      if (filters.drugId) query = query.eq('drug_id', filters.drugId);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.performedBy) query = query.eq('performed_by', filters.performedBy);

      // Sorting
      query = query.order('timestamp', { ascending: false });

      // Pagination
      if (filters.page !== undefined && filters.pageSize !== undefined) {
        const from = (filters.page - 1) * filters.pageSize;
        const to = from + filters.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const results = (data || []).map(item => this.mapDbToDomain(item));

      if (filters.page !== undefined && filters.pageSize !== undefined) {
        return {
          data: results,
          total: count || 0,
          hasMore: (count || 0) > (filters.page * filters.pageSize),
        } as PaginatedStockMovements;
      }

      return results;
    } catch (err) {
      console.error('[StockMovementService] History fetch failed:', err);
      return [];
    }
  }

  async getSummaryByDrug(drugId: string, filters: StockMovementFilters): Promise<StockMovementSummary> {
    const history = await this.getHistory({ ...filters, drugId, page: undefined }) as StockMovement[];

    const summary = history.reduce(
      (acc, m) => {
        const qty = Math.abs(m.quantity);
        if (['purchase', 'return_customer', 'transfer_in', 'initial'].includes(m.type) || (m.type === 'adjustment' && m.quantity > 0)) {
          acc.totalIn += qty;
        } else if (['sale', 'return_supplier', 'transfer_out', 'damage'].includes(m.type) || (m.type === 'adjustment' && m.quantity < 0)) {
          acc.totalOut += qty;
        }

        if (m.type === 'return_customer' || m.type === 'return_supplier') {
          acc.returns += qty;
        }
        return acc;
      },
      { totalIn: 0, totalOut: 0, returns: 0 }
    );

    const latest = history[0];
    const currentStock = latest ? latest.newStock : 0;

    return {
      ...summary,
      netChange: summary.totalIn - summary.totalOut,
      currentStock,
    };
  }

  async getKPISummary(filters: StockMovementFilters): Promise<StockMovementKPISummary> {
    const history = await this.getHistory({ ...filters, page: undefined }) as StockMovement[];

    return history.reduce(
      (acc, m) => {
        const qty = Math.abs(m.quantity);
        if (['purchase', 'return_customer', 'transfer_in', 'initial'].includes(m.type) || (m.type === 'adjustment' && m.quantity > 0)) {
          acc.totalStockIn += qty;
        } else if (['sale', 'return_supplier', 'transfer_out', 'damage'].includes(m.type) || (m.type === 'adjustment' && m.quantity < 0)) {
          acc.totalStockOut += qty;
        }

        if (m.type === 'return_customer' || m.type === 'return_supplier') {
          acc.totalReturns += qty;
        }
        return acc;
      },
      { totalStockIn: 0, totalStockOut: 0, totalReturns: 0, inventoryValue: 0 }
    );
  }

  async approveMovement(id: string, userId: string): Promise<void> {
    await this.updateMovementStatus(id, 'approved', userId);
  }

  async rejectMovement(id: string, userId: string): Promise<void> {
    await this.updateMovementStatus(id, 'rejected', userId);
  }

  private async updateMovementStatus(id: string, status: 'approved' | 'rejected', userId: string): Promise<void> {
    const reviewedAt = new Date().toISOString();
    
    const { error } = await (supabase as any).from(this.tableName)
      .update({ status, reviewed_by: userId, reviewed_at: reviewedAt })
      .eq('id', id);
    if (error) throw error;
  }

  async logMovementsBulk(movements: Omit<StockMovement, 'id' | 'timestamp'>[]): Promise<StockMovement[]> {
    const settings = await settingsService.getAll();
    const timestamp = new Date().toISOString();
    const activeBranchId = settings.activeBranchId || settings.branchCode;

    const newMovements = movements.map(m => ({
      ...m,
      id: idGenerator.uuid(),
      branchId: m.branchId || activeBranchId,
      orgId: m.orgId || settings.orgId,
      timestamp,
    }));

    const dbMovements = newMovements.map(m => this.mapDomainToDb(m as StockMovement));
    const { error } = await (supabase as any).from(this.tableName).insert(dbMovements);
    if (error) throw error;

    return newMovements as StockMovement[];
  }

  calculateMovementValue(movement: StockMovement, drug: any): number {
    if (!drug) return 0;
    const qty = Math.abs(movement.quantity);
    if (['sale', 'return_customer'].includes(movement.type)) {
      return qty * (drug.price || 0);
    }
    return qty * (drug.costPrice || 0);
  }
}

export const stockMovementService = new StockMovementServiceImpl();
