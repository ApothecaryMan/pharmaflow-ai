import { describe, it, expect, beforeEach, vi } from 'vitest';
import { salesService } from './salesService';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { idGenerator } from '../../utils/idGenerator';
import { Sale } from '../../types';

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

vi.mock('../../utils/idGenerator', () => ({
  idGenerator: {
    generate: vi.fn(),
  },
}));

describe('SalesService', () => {
  const mockSales: Sale[] = [
    {
      id: 'S1',
      date: '2026-01-01T10:00:00.000Z',
      items: [],
      total: 100,
      customerName: 'Test Customer 1',
      subtotal: 100,
      globalDiscount: 0,
      paymentMethod: 'cash',
      status: 'completed',
      branchId: 'MAIN',
      customerCode: 'C1'
    },
    {
      id: 'S2',
      date: '2026-01-01T11:00:00.000Z',
      items: [],
      total: 50,
      customerName: 'Test Customer 2',
      subtotal: 50,
      globalDiscount: 0,
      paymentMethod: 'visa',
      status: 'completed',
      branchId: 'MAIN',
      customerCode: 'C2'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Return mock sales for shards, but ensure we don't double count if service checks multiple shards
    const seenShards = new Set();
    (storage.get as any).mockImplementation((key: string, fallback: any) => {
      if (key.includes('sales') && !seenShards.has('SALES_DATA_RETURNED')) {
        seenShards.add('SALES_DATA_RETURNED');
        return [...mockSales];
      }
      return fallback || [];
    });
    (settingsService.getAll as any).mockResolvedValue({ branchCode: 'MAIN' });
    (idGenerator.generate as any).mockReturnValue('SALE_NEW');
  });

  it('should retrieve all sales for current branch', async () => {
    const sales = await salesService.getAll();
    expect(sales).toHaveLength(2);
    expect(settingsService.getAll).toHaveBeenCalled();
  });

  it('should create a new sale with correct branch ID', async () => {
    const newSaleData: any = {
      date: '2026-01-02',
      items: [],
      total: 200,
      subtotal: 200,
      paymentMethod: 'cash'
    };

    const created = await salesService.create(newSaleData);
    
    expect(created.id).toBe('SALE_NEW');
    expect(created.branchId).toBe('MAIN');
    expect(storage.set).toHaveBeenCalled();
  });

  it('should calculate stats correctly', async () => {
    // Mock date to match "today" logic in service (it uses new Date() internally)
    // For specific date tests, mocking Date is better, but here we can check total revenue simply
    
    const stats = await salesService.getStats();
    
    expect(stats.totalSales).toBe(2);
    expect(stats.totalRevenue).toBe(150); // 100 + 50
    expect(stats.averageTransaction).toBe(75); // 150 / 2
  });

  it('should filter sales correctly', async () => {
    // Filter by min amount
    const filters = { minAmount: 80 };
    const filtered = await salesService.filter(filters);
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('S1');
  });
});
