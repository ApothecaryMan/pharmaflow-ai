import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sale } from '../../types';
import { dateRangeService } from '../financials/dateRangeService';
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
    getStats: vi.fn(),
    mapFromDb: vi.fn(),
    mapToDb: vi.fn(),
  },
}));

vi.mock('../settings/settingsService', () => ({
  settingsService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../financials/dateRangeService', () => ({
  dateRangeService: {
    getLocalDateString: vi.fn(),
  },
}));

vi.mock('../../utils/idGenerator', () => ({
  idGenerator: {
    uuid: vi.fn(() => 'SALE_NEW'),
  },
}));

const mockSales: Sale[] = [
  {
    id: 'S1',
    date: '2026-01-01T10:00:00.000Z',
    items: [],
    total: 100,
    customerName: 'Test Customer 1',
    subtotal: 100,
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
  vi.mocked(salesRepository.insert).mockImplementation(async (_s) => {
    return;
  });
});

describe('SalesService', () => {
  beforeEach(() => {
    vi.mocked(salesRepository.getAll).mockResolvedValue([...mockSales]);
    vi.mocked(salesRepository.getStats).mockResolvedValue({
      totalSales: 2,
      totalRevenue: 150,
      averageTransaction: 75,
      todaySales: 0,
      todayRevenue: 0,
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

describe('SalesService.getRecent', () => {
  it('should retrieve recent sales for default branch with default limit', async () => {
    vi.mocked(salesRepository.getRecent).mockResolvedValue([...mockSales]);

    const recent = await salesService.getRecent();

    expect(recent).toHaveLength(2);
    expect(salesRepository.getRecent).toHaveBeenCalledWith('MAIN', 'ORG_1', 100);
  });

  it('should pass explicit branchId and limit to the repository', async () => {
    vi.mocked(salesRepository.getRecent).mockResolvedValue([mockSales[0]]);

    const recent = await salesService.getRecent('BR2', 5);

    expect(recent).toHaveLength(1);
    expect(salesRepository.getRecent).toHaveBeenCalledWith('BR2', 'ORG_1', 5);
  });
});

describe('SalesService.listPage', () => {
  it('should return paged result shape and pass options through', async () => {
    const paged = { rows: mockSales, total: 2, page: 1, pageSize: 10 };
    vi.mocked(salesRepository.listPage).mockResolvedValue(paged);

    const result = await salesService.listPage({
      page: 1,
      pageSize: 10,
      filters: { status: 'completed' },
    });

    expect(result).toEqual(paged);
    expect(result.rows).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(salesRepository.listPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      filters: { status: 'completed' },
      branchId: 'MAIN',
      orgId: 'ORG_1',
    });
  });

  it('should respect explicit branchId and orgId in options', async () => {
    vi.mocked(salesRepository.listPage).mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });

    await salesService.listPage({ branchId: 'BR2', orgId: 'ORG_2' });

    expect(salesRepository.listPage).toHaveBeenCalledWith({
      branchId: 'BR2',
      orgId: 'ORG_2',
    });
  });
});

describe('SalesService.getById', () => {
  it('should return a sale by id', async () => {
    vi.mocked(salesRepository.getById).mockResolvedValue(mockSales[0]);

    const sale = await salesService.getById('S1');

    expect(sale?.id).toBe('S1');
    expect(salesRepository.getById).toHaveBeenCalledWith('S1');
  });

  it('should return null when the sale does not exist', async () => {
    vi.mocked(salesRepository.getById).mockResolvedValue(null);

    const sale = await salesService.getById('NOPE');

    expect(sale).toBeNull();
  });
});

describe('SalesService.getByCustomer', () => {
  it('should fetch sales by customer code for default branch', async () => {
    vi.mocked(salesRepository.findByFilters).mockResolvedValue([mockSales[0]]);

    const sales = await salesService.getByCustomer('C1');

    expect(sales).toHaveLength(1);
    expect(sales[0].id).toBe('S1');
    expect(salesRepository.findByFilters).toHaveBeenCalledWith(
      { customerCode: 'C1' },
      'MAIN',
      'ORG_1'
    );
  });

  it('should pass branchId through to the repository', async () => {
    vi.mocked(salesRepository.findByFilters).mockResolvedValue([]);

    await salesService.getByCustomer('C1', 'BR2');

    expect(salesRepository.findByFilters).toHaveBeenCalledWith(
      { customerCode: 'C1' },
      'BR2',
      'ORG_1'
    );
  });
});

describe('SalesService.getByDateRange', () => {
  it('should fetch sales within the date range for default branch', async () => {
    vi.mocked(salesRepository.findByFilters).mockResolvedValue(mockSales);

    const sales = await salesService.getByDateRange('2026-01-01', '2026-01-02');

    expect(sales).toHaveLength(2);
    expect(salesRepository.findByFilters).toHaveBeenCalledWith(
      { dateFrom: '2026-01-01', dateTo: '2026-01-02' },
      'MAIN',
      'ORG_1'
    );
  });

  it('should pass branchId through to the repository', async () => {
    vi.mocked(salesRepository.findByFilters).mockResolvedValue([]);

    await salesService.getByDateRange('2026-01-01', '2026-01-02', 'BR2');

    expect(salesRepository.findByFilters).toHaveBeenCalledWith(
      { dateFrom: '2026-01-01', dateTo: '2026-01-02' },
      'BR2',
      'ORG_1'
    );
  });
});

describe('SalesService.getToday', () => {
  it('should fetch today sales using the local date string for default branch', async () => {
    vi.mocked(dateRangeService.getLocalDateString).mockReturnValue('2026-08-06');
    vi.mocked(salesRepository.findByFilters).mockResolvedValue(mockSales);

    const sales = await salesService.getToday();

    expect(dateRangeService.getLocalDateString).toHaveBeenCalled();
    expect(sales).toHaveLength(2);
    expect(salesRepository.findByFilters).toHaveBeenCalledWith(
      { dateFrom: '2026-08-06T00:00:00', dateTo: '2026-08-06T23:59:59' },
      'MAIN',
      'ORG_1'
    );
  });

  it('should pass branchId through to the repository', async () => {
    vi.mocked(dateRangeService.getLocalDateString).mockReturnValue('2026-08-06');
    vi.mocked(salesRepository.findByFilters).mockResolvedValue([]);

    await salesService.getToday('BR2');

    expect(salesRepository.findByFilters).toHaveBeenCalledWith(
      { dateFrom: '2026-08-06T00:00:00', dateTo: '2026-08-06T23:59:59' },
      'BR2',
      'ORG_1'
    );
  });
});

describe('SalesService.create netTotal', () => {
  it('should default netTotal to total when netTotal is not provided', async () => {
    const created = await salesService.create({
      date: '2026-01-02T10:00:00.000Z',
      items: [],
      total: 200,
      subtotal: 200,
      paymentMethod: 'cash',
    } as Omit<Sale, 'id'>);

    expect(created.netTotal).toBe(200);
    expect(salesRepository.insert).toHaveBeenCalledWith(expect.objectContaining({ netTotal: 200 }));
  });

  it('should preserve explicit netTotal when provided', async () => {
    const created = await salesService.create({
      date: '2026-01-02T10:00:00.000Z',
      items: [],
      total: 200,
      netTotal: 190,
      subtotal: 200,
      paymentMethod: 'cash',
    } as Omit<Sale, 'id'>);

    expect(created.netTotal).toBe(190);
    expect(salesRepository.insert).toHaveBeenCalledWith(expect.objectContaining({ netTotal: 190 }));
  });
});

describe('SalesService.update', () => {
  it('should update and return merged object without fetching when skipFetch is true', async () => {
    const result = await salesService.update('S1', { total: 150 }, true);

    expect(salesRepository.update).toHaveBeenCalledWith('S1', { total: 150 });
    expect(salesRepository.getById).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'S1', total: 150 });
  });

  it('should fetch and return the updated sale when skipFetch is false', async () => {
    vi.mocked(salesRepository.getById).mockResolvedValue({ ...mockSales[0], total: 150 });

    const result = await salesService.update('S1', { total: 150 });

    expect(salesRepository.update).toHaveBeenCalledWith('S1', { total: 150 });
    expect(salesRepository.getById).toHaveBeenCalledWith('S1');
    expect(result.total).toBe(150);
  });

  it('should throw when the sale is not found after update', async () => {
    vi.mocked(salesRepository.getById).mockResolvedValue(null);

    await expect(salesService.update('NOPE', { total: 1 })).rejects.toThrow(
      'Sale not found after update'
    );
  });
});

describe('SalesService.save', () => {
  it('should upsert all sales applying the default orgId', async () => {
    await salesService.save([...mockSales]);

    expect(salesRepository.upsert).toHaveBeenCalledTimes(1);
    expect(salesRepository.upsert).toHaveBeenCalledWith(
      mockSales.map((s) => ({ ...s, orgId: 'ORG_1' }))
    );
  });

  it('should apply default branchId and orgId to sales missing them', async () => {
    const [sale] = mockSales;
    const stripped: Sale = { ...sale, branchId: undefined, orgId: undefined } as unknown as Sale;

    await salesService.save([stripped]);

    expect(salesRepository.upsert).toHaveBeenCalledWith([
      { ...stripped, branchId: 'MAIN', orgId: 'ORG_1' },
    ]);
  });

  it('should respect the explicit branchId argument', async () => {
    const [sale] = mockSales;
    const stripped: Sale = { ...sale, branchId: undefined, orgId: undefined } as unknown as Sale;

    await salesService.save([stripped], 'BR2');

    expect(salesRepository.upsert).toHaveBeenCalledWith([
      { ...stripped, branchId: 'BR2', orgId: 'ORG_1' },
    ]);
  });
});

describe('SalesService mappers', () => {
  it('should delegate mapFromDb to the repository', () => {
    vi.mocked(salesRepository.mapFromDb).mockReturnValue(mockSales[0]);

    const result = salesService.mapFromDb({ id: 'X' });

    expect(salesRepository.mapFromDb).toHaveBeenCalledWith({ id: 'X' });
    expect(result).toBe(mockSales[0]);
  });

  it('should delegate mapToDb to the repository', () => {
    vi.mocked(salesRepository.mapToDb).mockReturnValue({ id: 'X' });

    const result = salesService.mapToDb({ id: 'X' });

    expect(salesRepository.mapToDb).toHaveBeenCalledWith({ id: 'X' });
    expect(result).toEqual({ id: 'X' });
  });

  it('round-trip mapFromDb/mapToDb preserves id, date, and netTotal', async () => {
    const actual = await vi.importActual<typeof import('./repositories/salesRepository')>(
      './repositories/salesRepository'
    );
    const realRepo = actual.salesRepository;

    const dbRow = {
      id: 'S_RT',
      date: '2026-01-01T10:00:00.000Z',
      total: 2500,
      net_total: 2400,
      sale_items: [],
    };

    const sale = realRepo.mapFromDb(dbRow);
    expect(sale.id).toBe('S_RT');
    expect(sale.date).toBe('2026-01-01T10:00:00.000Z');
    expect(sale.total).toBe(2500);
    expect(sale.netTotal).toBe(2400);

    const dbBack = realRepo.mapToDb(sale);
    expect(dbBack.id).toBe('S_RT');
    expect(dbBack.date).toBe('2026-01-01T10:00:00.000Z');
    expect(dbBack.total).toBe(2500);
    expect(dbBack.net_total).toBe(2400);
  });

  it('mapFromDb defaults netTotal to total when net_total is absent', async () => {
    const actual = await vi.importActual<typeof import('./repositories/salesRepository')>(
      './repositories/salesRepository'
    );
    const realRepo = actual.salesRepository;

    const sale = realRepo.mapFromDb({ id: 'X', total: 1500, sale_items: [] });

    expect(sale.netTotal).toBe(1500);
  });
});

describe('SalesService error propagation', () => {
  it('should propagate repository errors from getRecent', async () => {
    vi.mocked(salesRepository.getRecent).mockRejectedValue(new Error('DB failure'));

    await expect(salesService.getRecent()).rejects.toThrow('DB failure');
  });

  it('should propagate repository errors from listPage', async () => {
    vi.mocked(salesRepository.listPage).mockRejectedValue(new Error('DB failure'));

    await expect(salesService.listPage({})).rejects.toThrow('DB failure');
  });

  it('should propagate repository errors from create insert', async () => {
    vi.mocked(salesRepository.insert).mockRejectedValue(new Error('DB failure'));

    await expect(
      salesService.create({
        date: '2026-01-02',
        items: [],
        total: 10,
        subtotal: 10,
      } as Omit<Sale, 'id'>)
    ).rejects.toThrow('DB failure');
  });
});

describe('unspecified behavior', () => {
  // INTENT-UNKNOWN: may be intentional OR a defect (e.g. cross-branch leak). Not a spec. Flag for review.
  it('CURRENT BEHAVIOR (verify intent): getById ignores branchId argument', async () => {
    vi.mocked(salesRepository.getById).mockResolvedValue(mockSales[0]);

    const sale = await salesService.getById('S1');

    expect(sale?.id).toBe('S1');
    expect(salesRepository.getById).toHaveBeenCalledWith('S1');
    expect(salesRepository.getById).not.toHaveBeenCalledWith('S1', 'OTHER_BRANCH');
  });
});
