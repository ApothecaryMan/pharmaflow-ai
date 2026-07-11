import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSuccess, mockError } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

import { useAlert } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { batchService } from '../../services/inventory/batchService';
import type { Drug } from '../../types';
import { type SaleData, useEntityHandlers } from '../useEntityHandlers';

// Mock Dependencies
vi.mock('../../context', () => ({
  useAlert: vi.fn().mockReturnValue({
    success: mockSuccess,
    error: mockError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
  useShift: vi.fn().mockReturnValue({
    addTransaction: vi.fn(),
    currentShift: { id: 'test-shift', status: 'open' },
  }),
}));

vi.mock('../sales/useShift', () => ({
  useShift: vi.fn().mockReturnValue({
    addTransaction: vi.fn(),
    currentShift: { id: 'test-shift', status: 'open' },
  }),
}));

vi.mock('../../services/inventory/batchService', () => ({
  batchService: {
    allocateStock: vi.fn(),
    allocateStockBulk: vi.fn(),
    returnStock: vi.fn(),
    getEarliestExpiry: vi.fn(),
    createBatch: vi.fn(),
    getAvailableStock: vi.fn(),
    getAllBatches: vi.fn().mockReturnValue([]),
    deleteBatchesByDrugId: vi.fn().mockResolvedValue(true),
    migrateInventoryToBatches: vi.fn(),
    validateCartStock: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/customers/customerService', () => ({
  customerService: {
    create: vi.fn().mockImplementation((c) => Promise.resolve({ ...c, id: 'c1' })),
    update: vi.fn().mockImplementation((id, c) => Promise.resolve({ ...c, id })),
    delete: vi.fn().mockResolvedValue(true),
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/suppliers/supplierService', () => ({
  supplierService: {
    create: vi.fn().mockImplementation((s) => Promise.resolve({ ...s, id: 's1' })),
    update: vi.fn().mockImplementation((id, s) => Promise.resolve({ ...s, id })),
    delete: vi.fn().mockResolvedValue(true),
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/migration', () => ({
  migrationService: {
    runMigrations: vi.fn().mockReturnValue({ hasUpdates: false, migratedInventory: [] }),
  },
}));

vi.mock('../../utils/storage', () => ({
  storage: {
    get: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('../../utils/shiftHelpers', () => ({
  addTransactionToOpenShift: vi.fn(),
}));

vi.mock('../../services/audit/auditService', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

vi.mock('../../services/auth/permissionsService', () => ({
  permissionsService: {
    can: vi.fn().mockReturnValue(true),
    isManager: vi.fn().mockReturnValue(false),
    isOrgAdmin: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/inventory/inventoryService', () => ({
  inventoryService: {
    updateStock: vi.fn(),
    updateStockBulk: vi.fn(),
    create: vi.fn().mockImplementation((d) => Promise.resolve({ ...d, id: 'new-id' })),
    update: vi.fn().mockImplementation((id, d) => Promise.resolve({ ...d, id })),
    delete: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../utils/validation', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    validateSaleData: vi.fn().mockReturnValue({ success: true }),
    validateStockAvailability: vi.fn().mockReturnValue({ success: true }),
  };
});

describe('useEntityHandlers: handleCompleteSale', () => {
  const mockSetInventory = vi.fn();
  const mockSetSales = vi.fn();
  const mockSetCustomers = vi.fn();
  const mockGetVerifiedDate = vi.fn().mockReturnValue(new Date('2024-01-01T12:00:00Z'));
  const mockValidateTransactionTime = vi.fn().mockReturnValue({ valid: true });
  const mockUpdateLastTransactionTime = vi.fn();

  const mockEmployees = [
    { id: 'emp1', name: 'Test Admin', role: 'admin' },
    { id: 'cashier1', name: 'Test Cashier', role: 'cashier' },
  ] as any[];

  beforeEach(async () => {
    vi.clearAllMocks();
    (permissionsService.can as any).mockReturnValue(true);
    // Reset validation mock to success by default
    const { validateStockAvailability, validateSaleData } = await import('../../utils/validation');
    (validateStockAvailability as any).mockReturnValue({ success: true });
    (validateSaleData as any).mockReturnValue({ success: true });
  });

  const defaultProps = {
    inventory: [
      { id: 'drug1', name: 'Drug A', stock: 10, unitsPerPack: 1 } as Drug,
      { id: 'drug2', name: 'Drug B', stock: 5, unitsPerPack: 1 } as Drug,
    ],
    setInventory: mockSetInventory,
    sales: [],
    setSales: mockSetSales,
    purchases: [],
    setPurchases: vi.fn(),
    returns: [],
    setReturns: vi.fn(),
    customers: [],
    setCustomers: mockSetCustomers,
    currentEmployeeId: 'emp1',
    employees: mockEmployees,
    isLoading: false,
    activeBranchId: 'B1',
    activeOrgId: 'O1',
    purchaseReturns: [],
    setPurchaseReturns: vi.fn(),
    getVerifiedDate: mockGetVerifiedDate,
    validateTransactionTime: mockValidateTransactionTime,
    updateLastTransactionTime: mockUpdateLastTransactionTime,
    batches: [],
    setBatches: vi.fn(),
    completeSale: vi.fn(),
    processSalesReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    markAsReceived: vi.fn(),
  };

  it('should complete sale successfully and allocate stock', async () => {
    defaultProps.completeSale.mockResolvedValue({ serialId: 'PF-0001', id: 'sale-1' });

    const { result } = renderHook(() => useEntityHandlers(defaultProps as any));

    const saleData: SaleData = {
      items: [{ id: 'drug1', name: 'Drug A', quantity: 2, isUnit: true } as any],
      total: 100,
      customerName: 'Guest',
      paymentMethod: 'cash',
      globalDiscount: 0,
      subtotal: 100,
    };

    await act(async () => {
      await result.current.handleCompleteSale(saleData);
    });

    expect(defaultProps.completeSale).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ id: 'drug1' })]),
      }),
      expect.any(Object)
    );
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('completed'));
  });

  it('should handle complete sale failure', async () => {
    defaultProps.completeSale.mockRejectedValue(new Error('Failed to complete sale'));
    const { result } = renderHook(() => useEntityHandlers(defaultProps as any));

    await act(async () => {
      await result.current.handleCompleteSale({ items: [] } as any);
    });

    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Failed to complete sale'));
  });

  it('should prevent sale if validateStockAvailability (pre-check) fails', async () => {
    const { validateStockAvailability } = await import('../../utils/validation');
    (validateStockAvailability as any).mockReturnValueOnce({
      success: false,
      message: 'Insufficient stock',
    });

    const { result } = renderHook(() => useEntityHandlers(defaultProps as any));

    // Request 20, have 10
    const saleData: SaleData = {
      items: [{ id: 'drug1', name: 'Drug A', quantity: 20, isUnit: true } as any],
      total: 100,
      customerName: 'Guest',
      paymentMethod: 'cash',
      globalDiscount: 0,
      subtotal: 100,
    };

    await act(async () => {
      await result.current.handleCompleteSale(saleData);
    });

    // Should fail before touching batch service
    expect(batchService.allocateStock).not.toHaveBeenCalled();
    expect(mockSetSales).not.toHaveBeenCalled();
  });
});

describe('useEntityHandlers: Edge Cases', () => {
  const mockSetInventory = vi.fn();
  const mockError = vi.fn();
  const mockSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    (permissionsService.can as any).mockReturnValue(true);
    (useAlert as any).mockReturnValue({
      success: mockSuccess,
      error: mockError,
    });
    const { validateStockAvailability, validateSaleData } = await import('../../utils/validation');
    (validateStockAvailability as any).mockReturnValue({ success: true });
    (validateSaleData as any).mockReturnValue({ success: true });
  });

  const getProps = () => ({
    inventory: [{ id: '1', name: 'Drug A', stock: 1, unitsPerPack: 1 }] as any,
    setInventory: mockSetInventory,
    sales: [],
    setSales: vi.fn(),
    purchases: [],
    setPurchases: vi.fn(),
    returns: [],
    setReturns: vi.fn(),
    customers: [],
    setCustomers: vi.fn(),
    isLoading: false,
    activeBranchId: 'B1',
    activeOrgId: 'O1',
    purchaseReturns: [],
    setPurchaseReturns: vi.fn(),
    getVerifiedDate: vi.fn().mockReturnValue(new Date()),
    validateTransactionTime: vi.fn().mockReturnValue({ valid: true }),
    updateLastTransactionTime: vi.fn(),
    employees: [{ id: 'emp1', role: 'admin' }] as any[],
    batches: [],
    setBatches: vi.fn(),
    completeSale: vi.fn().mockResolvedValue({ serialId: 'PF-0001', id: 'sale-1' }),
    processSalesReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    markAsReceived: vi.fn(),
  });

  it('should handle concurrent sales of last item correctly', async () => {
    const mockComplete = vi.fn();
    mockComplete
      .mockResolvedValueOnce({ serialId: 'PF-0001', id: 'sale-1' })
      .mockRejectedValueOnce(new Error('Insufficient stock'));

    const { result } = renderHook(() =>
      useEntityHandlers({
        ...getProps(),
        completeSale: mockComplete,
        currentEmployeeId: 'emp1',
      } as any)
    );

    const saleData = {
      items: [{ id: '1', quantity: 1, isUnit: true }] as any,
      total: 10,
      customerName: 'G',
      paymentMethod: 'cash',
      globalDiscount: 0,
      subtotal: 10,
    } as SaleData;

    await act(async () => {
      await result.current.handleCompleteSale(saleData);
    });

    await act(async () => {
      await result.current.handleCompleteSale(saleData);
    });

    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(mockError).toHaveBeenCalledTimes(1);
  });

  it('should respect manual batch selection (preferredBatchId)', async () => {
    const mockComplete = vi.fn().mockResolvedValue({ serialId: 'PF-0001', id: 'sale-1' });
    const { result } = renderHook(() =>
      useEntityHandlers({
        ...getProps(),
        completeSale: mockComplete,
        currentEmployeeId: 'emp1',
      } as any)
    );

    const saleData = {
      items: [
        {
          id: '1',
          quantity: 1,
          isUnit: true,
          preferredBatchId: 'batch-specific-123',
        },
      ] as any,
      total: 10,
      customerName: 'Manuel',
      paymentMethod: 'cash',
      globalDiscount: 0,
      subtotal: 10,
    } as SaleData;

    await act(async () => {
      await result.current.handleCompleteSale(saleData);
    });

    expect(mockComplete).toHaveBeenCalled();
  });
});
