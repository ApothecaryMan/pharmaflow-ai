import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Purchase } from '../../types';
import { settingsService } from '../settings/settingsService';
import { purchaseService } from './purchaseService';
import { purchaseRepository } from './repositories/purchaseRepository';

// Mocks
vi.mock('./repositories/purchaseRepository', () => ({
  purchaseRepository: {
    getAll: vi.fn(),
    getRecent: vi.fn(),
    listPage: vi.fn(),
    getById: vi.fn(),
    findByFilters: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('../settings/settingsService', () => ({
  settingsService: {
    getAll: vi.fn(),
  },
}));

describe('PurchaseService', () => {
  const mockPurchases: Purchase[] = [
    {
      id: 'P1',
      date: '2026-01-01',
      items: [],
      supplierId: 'SUP1',
      supplierName: 'Test Supplier 1',
      status: 'pending',
      totalCost: 1000,
      paymentMethod: 'cash',
      branchId: 'MAIN',
    },
    {
      id: 'P2',
      date: '2026-01-02',
      items: [],
      supplierId: 'SUP1',
      supplierName: 'Test Supplier 1',
      status: 'completed',
      totalCost: 500,
      paymentMethod: 'cash',
      branchId: 'MAIN',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.getAll).mockResolvedValue({ branchCode: 'MAIN', orgId: 'ORG_1' } as any);
    vi.mocked(purchaseRepository.getAll).mockResolvedValue([...mockPurchases]);
    vi.mocked(purchaseRepository.getById).mockImplementation(async (id) => {
      return mockPurchases.find((p) => p.id === id) || null;
    });
    vi.mocked(purchaseRepository.insert).mockImplementation(async (p) => p);
    vi.mocked(purchaseRepository.update).mockImplementation(async (id, updates) => {
      const p = mockPurchases.find((item) => item.id === id);
      return { ...p, ...updates } as Purchase;
    });
  });

  it('should retrieve all purchases', async () => {
    const result = await purchaseService.getAll();
    expect(result).toHaveLength(2);
  });

  it('should create purchase with pending status', async () => {
    const newPurchase: any = {
      supplierId: 'SUP2',
      supplierName: 'Test Supplier 2',
      items: [],
      totalCost: 200,
    };

    const created = await purchaseService.create(newPurchase);

    expect(created.status).toBe('pending');
    expect(created.branchId).toBe('MAIN');
    expect(purchaseRepository.insert).toHaveBeenCalled();
  });

  it('should approve purchase', async () => {
    const approved = await purchaseService.approve('P1', 'EMP1', 'Admin');

    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('Admin');
    expect(purchaseRepository.update).toHaveBeenCalled();
  });

  it('should reject purchase', async () => {
    const rejected = await purchaseService.reject('P1', 'Too expensive');

    expect(rejected.status).toBe('rejected');
    expect(purchaseRepository.update).toHaveBeenCalled();
  });

  it('should get correct stats', async () => {
    const stats = await purchaseService.getStats();

    expect(stats.totalOrders).toBe(2);
    expect(stats.pendingOrders).toBe(1); // P1 is pending
    expect(stats.totalValue).toBe(1500); // 1000 + 500
  });
});
