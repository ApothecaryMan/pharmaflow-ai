import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Drug } from '../../types';
import { settingsService } from '../settings/settingsService';
import { inventoryService } from './inventoryService';
import { inventoryRepository } from './repositories/inventoryRepository';

// Mocks
vi.mock('./repositories/inventoryRepository', () => ({
  inventoryRepository: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByBarcode: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('./batchService', () => ({
  batchService: {
    createBatch: vi.fn(),
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
        publicPrice: 10,
        unitsPerPack: 1,
        minStock: 10,
      } as Drug,
      {
        id: 'D2',
        name: 'Aspirin',
        stock: 5, // Low stock
        expiryDate: '2020-01-01', // Expired
        category: 'Painkillers',
        branchId: 'B1',
        publicPrice: 5,
        unitsPerPack: 1,
        minStock: 10,
      } as Drug,
    ];

    vi.clearAllMocks();
    vi.mocked(inventoryRepository.getAll).mockResolvedValue(mockInventory);
    vi.mocked(settingsService.getAll).mockResolvedValue({
      branchCode: 'B1',
      orgId: 'ORG_1',
    } as any);
  });

  it('should filter low stock', async () => {
    const results = await inventoryService.filter({ lowStock: true });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Aspirin');
  });

  it('should filter expiring soon (or expired)', async () => {
    const results = await inventoryService.filter({ expiringSoon: 30 });
    const aspirin = results.find((d) => d.name === 'Aspirin');
    expect(aspirin).toBeDefined();

    const panadol = results.find((d) => d.name === 'Panadol');
    expect(panadol).toBeUndefined();
  });

  it('should get stats correctly', async () => {
    const stats = await inventoryService.getStats();
    expect(stats.totalProducts).toBe(2);
    expect(stats.lowStockCount).toBe(1); // D2
    expect(stats.outOfStockCount).toBe(0);
    expect(stats.totalValue).toBe(50 * 10 + 5 * 5); // 525
  });
});
