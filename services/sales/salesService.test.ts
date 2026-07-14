import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sale } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { salesRepository } from './repositories/salesRepository';
import { salesService } from './salesService';

// Mocks
vi.mock('./repositories/salesRepository', () => ({
  salesRepository: {
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

vi.mock('../../utils/idGenerator', () => ({
  idGenerator: {
    generate: vi.fn(),
    uuid: vi.fn(() => 'SALE_NEW'),
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
      customerCode: 'C1',
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
      customerCode: 'C2',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.getAll).mockResolvedValue({
      branchCode: 'MAIN',
      orgId: 'ORG_1',
    } as any);
    vi.mocked(idGenerator.generate).mockResolvedValue('SALE_NEW');
    vi.mocked(salesRepository.getAll).mockResolvedValue([...mockSales]);
    vi.mocked(salesRepository.insert).mockImplementation(async (_s) => {
      return;
    });
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
      paymentMethod: 'cash',
    };

    const created = await salesService.create(newSaleData);

    expect(created.id).toBe('SALE_NEW');
    expect(created.branchId).toBe('MAIN');
    expect(salesRepository.insert).toHaveBeenCalled();
  });

  it('should calculate stats correctly', async () => {
    const stats = await salesService.getStats();

    expect(stats.totalSales).toBe(2);
    expect(stats.totalRevenue).toBe(150); // 100 + 50
    expect(stats.averageTransaction).toBe(75); // 150 / 2
  });

  it('should filter sales correctly', async () => {
    vi.mocked(salesRepository.findByFilters).mockResolvedValue([mockSales[0]]);
    const filters = { minAmount: 80 };
    const filtered = await salesService.filter(filters);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('S1');
  });
});
