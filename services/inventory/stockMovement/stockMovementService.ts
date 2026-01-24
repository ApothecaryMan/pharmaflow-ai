import { StockMovement, StockMovementService, StockMovementFilters } from './types';
import { storage } from '../../../utils/storage';
import { StorageKeys } from '../../../config/storageKeys';
import { idGenerator } from '../../../utils/idGenerator';
import { settingsService } from '../../settings/settingsService';

const getRawMovements = (): StockMovement[] => {
  return storage.get<StockMovement[]>(StorageKeys.STOCK_MOVEMENTS, []);
};

export const createStockMovementService = (): StockMovementService => ({
  getAll: async (): Promise<StockMovement[]> => {
    const all = getRawMovements();
    const settings = await settingsService.getAll();
    return all.filter(m => !m.branchId || m.branchId === settings.branchCode);
  },

  getByDrugId: async (drugId: string): Promise<StockMovement[]> => {
    const all = await stockMovementService.getAll();
    return all.filter(m => m.drugId === drugId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  logMovement: async (movement: Omit<StockMovement, 'id' | 'timestamp'>): Promise<StockMovement> => {
    const all = getRawMovements();
    const settings = await settingsService.getAll();
    
    // Ensure accurate timestamp and ID
    const newMovement: StockMovement = {
      ...movement,
      id: idGenerator.generate('movement'),
      branchId: movement.branchId || settings.branchCode,
      timestamp: new Date().toISOString()
    };

    // Add to storage (prepend for newest first, or append? usually append is faster, sort on read)
    all.push(newMovement);
    
    // Prune old history if needed? For now keep all.
    storage.set(StorageKeys.STOCK_MOVEMENTS, all);
    
    return newMovement;
  },

  getHistory: async (filters: StockMovementFilters): Promise<StockMovement[]> => {
    let results = await stockMovementService.getAll();

    if (filters.drugId) {
      results = results.filter(m => m.drugId === filters.drugId);
    }
    if (filters.type) {
      results = results.filter(m => m.type === filters.type);
    }
    if (filters.performedBy) {
      results = results.filter(m => m.performedBy === filters.performedBy);
    }
    if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        results = results.filter(m => new Date(m.timestamp).getTime() >= start);
    }
    if (filters.endDate) {
        const end = new Date(filters.endDate).getTime();
        results = results.filter(m => new Date(m.timestamp).getTime() <= end);
    }
    if (filters.status) {
        results = results.filter(m => m.status === filters.status);
    }

    // Default sort: Newest first
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  approveMovement: async (id: string, userId: string): Promise<void> => {
      const all = getRawMovements();
      const index = all.findIndex(m => m.id === id);
      if (index !== -1) {
          all[index].status = 'approved';
          all[index].reviewedBy = userId;
          all[index].reviewedAt = new Date().toISOString();
          storage.set(StorageKeys.STOCK_MOVEMENTS, all);
      }
  },

  rejectMovement: async (id: string, userId: string): Promise<void> => {
      const all = getRawMovements();
      const index = all.findIndex(m => m.id === id);
      if (index !== -1) {
          all[index].status = 'rejected';
          all[index].reviewedBy = userId;
          all[index].reviewedAt = new Date().toISOString();
          storage.set(StorageKeys.STOCK_MOVEMENTS, all);
      }
  }
});

export const stockMovementService = createStockMovementService();
