import { StorageKeys } from '../../../config/storageKeys';
import { idGenerator } from '../../../utils/idGenerator';
import { storage } from '../../../utils/storage';
import { settingsService } from '../../settings/settingsService';
import { syncQueueService } from '../../syncQueueService';
import type {
  StockMovement,
  StockMovementFilters,
  StockMovementService,
  StockMovementSummary,
  StockMovementKPISummary,
  PaginatedStockMovements,
} from './types';

const getRawMovements = (): StockMovement[] => {
  return storage.get<StockMovement[]>(StorageKeys.STOCK_MOVEMENTS, []);
};

export const createStockMovementService = (): StockMovementService => ({
  getAll: async (): Promise<StockMovement[]> => {
    const all = getRawMovements();
    const settings = await settingsService.getAll();
    const effectiveBranchId = settings.activeBranchId || settings.branchCode;
    return all.filter((m) => !m.branchId || m.branchId === effectiveBranchId);
  },

  getByDrugId: async (drugId: string): Promise<StockMovement[]> => {
    const all = await stockMovementService.getAll();
    return all
      .filter((m) => m.drugId === drugId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  logMovement: async (
    movement: Omit<StockMovement, 'id' | 'timestamp'>,
    skipSync = false
  ): Promise<StockMovement> => {
    const all = getRawMovements();
    const settings = await settingsService.getAll();
    const activeBranchId = settings.activeBranchId || settings.branchCode;

    // Ensure accurate timestamp and ID
    const newMovement: StockMovement = {
      ...movement,
      id: idGenerator.uuid(),
      branchId: movement.branchId || activeBranchId,
      timestamp: new Date().toISOString(),
    };

    // Add to storage (prepend for newest first, or append? usually append is faster, sort on read)
    all.push(newMovement);

    // Prune old history if needed? For now keep all.
    storage.set(StorageKeys.STOCK_MOVEMENTS, all);

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_MOVEMENT_LOG', { action: 'LOG', movement: newMovement });
    }

    return newMovement;
  },

  getHistory: async (
    filters: StockMovementFilters
  ): Promise<StockMovement[] | PaginatedStockMovements> => {
    let results = await stockMovementService.getAll();

    if (filters.drugId) {
      results = results.filter((m) => m.drugId === filters.drugId);
    }
    if (filters.branchId) {
      results = results.filter((m) => m.branchId === filters.branchId);
    }
    if (filters.type) {
      results = results.filter((m) => m.type === filters.type);
    }
    if (filters.performedBy) {
      results = results.filter((m) => m.performedBy === filters.performedBy);
    }
    if (filters.status) {
      results = results.filter((m) => m.status === filters.status);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      results = results.filter((m) => new Date(m.timestamp).getTime() >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      results = results.filter((m) => new Date(m.timestamp).getTime() <= end);
    }

    // Default sort: Newest first
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Pagination
    if (filters.page !== undefined && filters.pageSize !== undefined) {
      const startIdx = (filters.page - 1) * filters.pageSize;
      const paginatedData = results.slice(startIdx, startIdx + filters.pageSize);
      return {
        data: paginatedData,
        total: results.length,
        hasMore: startIdx + filters.pageSize < results.length,
      };
    }

    return results;
  },

  getSummaryByDrug: async (
    drugId: string,
    filters: StockMovementFilters
  ): Promise<any> => { // Using any for summary temporarily to match interface if needed
    const history = (await stockMovementService.getHistory({
      ...filters,
      drugId,
      page: undefined, // Get all for summary
    })) as StockMovement[];

    const summary = history.reduce(
      (acc, m) => {
        if (m.type === 'purchase' || m.type === 'return_customer' || m.type === 'transfer_in' || (m.type === 'adjustment' && m.quantity > 0) || (m.type === 'initial')) {
          acc.totalIn += Math.abs(m.quantity);
        } else if (m.type === 'sale' || m.type === 'return_supplier' || m.type === 'transfer_out' || (m.type === 'adjustment' && m.quantity < 0) || (m.type === 'damage')) {
          acc.totalOut += Math.abs(m.quantity);
        }

        if (m.type === 'return_customer' || m.type === 'return_supplier') {
          acc.returns += Math.abs(m.quantity);
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
  },

  getKPISummary: async (filters: StockMovementFilters): Promise<any> => {
    const history = (await stockMovementService.getHistory({
      ...filters,
      page: undefined,
    })) as StockMovement[];

    const summary = history.reduce(
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

    // Note: inventoryValue calculation usually requires current stock prices. 
    // For KPI report within this service, we track the volume of movements.
    // Real-time valuation should be pulled from inventoryService.

    return summary;
  },

  approveMovement: async (id: string, userId: string, skipSync = false): Promise<void> => {
    const all = getRawMovements();
    const index = all.findIndex((m) => m.id === id);
    if (index !== -1) {
      all[index].status = 'approved';
      all[index].reviewedBy = userId;
      all[index].reviewedAt = new Date().toISOString();
      storage.set(StorageKeys.STOCK_MOVEMENTS, all);
      
      if (!skipSync) {
        await syncQueueService.enqueue('STOCK_MOVEMENT_LOG', { 
          action: 'APPROVE', 
          id, 
          userId, 
          timestamp: all[index].reviewedAt 
        });
      }
    }
  },

  rejectMovement: async (id: string, userId: string, skipSync = false): Promise<void> => {
    const all = getRawMovements();
    const index = all.findIndex((m) => m.id === id);
    if (index !== -1) {
      all[index].status = 'rejected';
      all[index].reviewedBy = userId;
      all[index].reviewedAt = new Date().toISOString();
      storage.set(StorageKeys.STOCK_MOVEMENTS, all);

      if (!skipSync) {
        await syncQueueService.enqueue('STOCK_MOVEMENT_LOG', { 
          action: 'REJECT', 
          id, 
          userId, 
          timestamp: all[index].reviewedAt 
        });
      }
    }
  },

  logMovementsBulk: async (
    movements: Omit<StockMovement, 'id' | 'timestamp'>[],
    skipSync = false
  ): Promise<void> => {
    if (movements.length === 0) return;

    const all = getRawMovements();
    const settings = await settingsService.getAll();
    const timestamp = new Date().toISOString();
    const activeBranchId = settings.activeBranchId || settings.branchCode;

    for (const movement of movements) {
      const effectiveBranchId = movement.branchId || activeBranchId;
      all.push({
        ...movement,
        id: idGenerator.uuid(),
        branchId: effectiveBranchId,
        timestamp,
      });
    }

    storage.set(StorageKeys.STOCK_MOVEMENTS, all);

    if (!skipSync) {
      await syncQueueService.enqueue('STOCK_MOVEMENT_LOG', { 
        action: 'LOG_BULK', 
        count: movements.length 
      });
    }
  },
});

export const stockMovementService = createStockMovementService();
