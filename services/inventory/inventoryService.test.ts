import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inventoryService } from './inventoryService';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { Drug } from '../../types';

// Mocks
vi.mock('../../utils/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../settings/settingsService', () => ({
  settingsService: {
    getAll: vi.fn(),
  },
}));

describe('InventoryService', () => {
  let mockInventory: Drug[];

  beforeEach(() => {
    mockInventory = [
      { 
        id: 'D1', 
        name: 'Panadol', 
        stock: 50, 
        expiryDate: '2030-01-01', // Future
        category: 'Painkillers',
        branchId: 'B1', 
        price: 10
      } as Drug,
      { 
        id: 'D2', 
        name: 'Aspirin', 
        stock: 5, // Low stock
        expiryDate: '2020-01-01', // Expired
        category: 'Painkillers',
        branchId: 'B1',
        price: 5
      } as Drug
    ];
    
    vi.clearAllMocks();
    (storage.get as any).mockReturnValue(mockInventory);
    (settingsService.getAll as any).mockResolvedValue({ branchCode: 'B1' });
  });

  it('should filter low stock', async () => {
    const results = await inventoryService.filter({ lowStock: true });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Aspirin');
  });

  it('should filter expiring soon (or expired)', async () => {
    // Logic checks if date <= threshold. Expired dates are definitely "soon" (past).
    // The filter checks <= (now + 30 days)
    const results = await inventoryService.filter({ expiringSoon: 30 });
    // Aspirin is expired (2020), Panadol is 2030
    // Should catch Aspirin
    const aspirin = results.find(d => d.name === 'Aspirin');
    expect(aspirin).toBeDefined();
    
    // Check it doesn't return Panadol
    const panadol = results.find(d => d.name === 'Panadol');
    expect(panadol).toBeUndefined();
  });

  it('should update stock', async () => {
    const updated = await inventoryService.updateStock('D1', -10);
    expect(updated.stock).toBe(40);
    expect(storage.set).toHaveBeenCalled();
  });
  
  it('should get stats correctly', async () => {
      const stats = await inventoryService.getStats();
      expect(stats.totalProducts).toBe(2);
      expect(stats.lowStockCount).toBe(1); // D2
      expect(stats.outOfStockCount).toBe(0);
      expect(stats.totalValue).toBe((50 * 10) + (5 * 5)); // 525
  });
});
