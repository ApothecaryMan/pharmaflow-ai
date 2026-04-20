import { describe, it, expect, beforeEach, vi } from 'vitest';
import { purchaseService } from './purchaseService';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { Purchase } from '../../types';

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
      branchId: 'MAIN'
    },
    {
      id: 'P2',
      date: '2026-01-02',
      items: [],
      supplierId: 'SUP1',
      supplierName: 'Test Supplier 1',
      status: 'completed',
      totalCost: 500,
      branchId: 'MAIN'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (storage.get as any).mockReturnValue([...mockPurchases]);
    (settingsService.getAll as any).mockResolvedValue({ branchCode: 'MAIN' });
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
      totalCost: 200
    };
    
    const created = await purchaseService.create(newPurchase);
    
    expect(created.status).toBe('pending');
    expect(created.branchId).toBe('MAIN');
    expect(storage.set).toHaveBeenCalled();
  });

  it('should approve purchase', async () => {
    const approved = await purchaseService.approve('P1', 'Admin');
    
    expect(approved.status).toBe('completed');
    expect(approved.approvedBy).toBe('Admin');
    expect(storage.set).toHaveBeenCalled();
  });

  it('should reject purchase', async () => {
    const rejected = await purchaseService.reject('P1', 'Too expensive');
    
    expect(rejected.status).toBe('rejected');
    expect(storage.set).toHaveBeenCalled();
  });

  it('should get correct stats', async () => {
    const stats = await purchaseService.getStats();
    
    expect(stats.totalOrders).toBe(2);
    expect(stats.pendingOrders).toBe(1); // P1 is pending
    expect(stats.totalValue).toBe(1500); // 1000 + 500
  });
});
