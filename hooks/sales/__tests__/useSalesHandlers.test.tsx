import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSuccess, mockError } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

import { permissionsService } from '../../../services/auth/permissionsService';
import type { Drug, Employee, Sale, Shift, StockBatch } from '../../../types';
import { type SaleData, useSalesHandlers } from '../useSalesHandlers';

vi.mock('../../../context', () => ({
  useAlert: vi.fn().mockReturnValue({
    success: mockSuccess,
    error: mockError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../../../services/auth/permissionsService', () => ({
  permissionsService: {
    can: vi.fn().mockReturnValue(true),
    getEffectiveRole: vi.fn().mockReturnValue('admin'),
  },
}));

vi.mock('../../../services/inventory/batchService', () => ({
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

vi.mock('../../../services/inventory/inventoryService', () => ({
  inventoryService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/sales/salesService', () => ({
  salesService: {
    update: vi.fn(),
  },
}));

vi.mock('../../../utils/validation', () => ({
  validateSaleData: vi.fn().mockReturnValue({ success: true }),
  validateStockAvailability: vi.fn().mockReturnValue({ success: true }),
}));

vi.mock('../../../utils/monitoring', () => ({
  measurePerformance: (_name: string, fn: () => Promise<any>) => fn(),
}));

const mockEmployee: Employee = {
  id: 'emp1',
  name: 'Test Admin',
  role: 'admin',
  email: '',
  phone: '',
  branchId: 'B1',
  orgId: 'O1',
  employeeCode: 'EMP-001',
  position: 'Pharmacist',
  department: 'pharmacy',
  startDate: '2024-01-01',
  status: 'active',
};

const defaultProps = {
  currentEmployeeId: 'emp1',
  employees: [mockEmployee],
  activeBranchId: 'B1',
  activeOrgId: 'O1',
  inventory: [
    { id: 'drug1', name: 'Drug A', stock: 10, unitsPerPack: 1 } as Drug,
    { id: 'drug2', name: 'Drug B', stock: 5, unitsPerPack: 1 } as Drug,
  ],
  setInventory: vi.fn(),
  sales: [] as Sale[],
  setSales: vi.fn(),
  setBatches: vi.fn() as (batches: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => void,
  setCustomers: vi.fn(),
  setReturns: vi.fn(),
  currentShift: { id: 'shift-1', status: 'open' } as Shift,
  addTransaction: vi.fn(),
  getVerifiedDate: vi.fn().mockReturnValue(new Date('2024-01-01T12:00:00Z')),
  validateTransactionTime: vi.fn().mockReturnValue({ valid: true }),
  updateLastTransactionTime: vi.fn(),
  completeSale: vi.fn(),
  processSalesReturn: vi.fn(),
};

function makeSaleData(overrides?: Partial<SaleData>): SaleData {
  return {
    items: [{ id: 'drug1', name: 'Drug A', quantity: 2, isUnit: true } as any],
    total: 100,
    customerName: 'Guest',
    paymentMethod: 'cash',
    globalDiscount: 0,
    subtotal: 100,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (permissionsService.can as any).mockReturnValue(true);
});

describe('useSalesHandlers — handleCompleteSale', () => {
  it('completes sale successfully', async () => {
    defaultProps.completeSale.mockResolvedValue({ serialId: 'PF-0001', id: 'sale-1' });

    const { result } = renderHook(() => useSalesHandlers(defaultProps));

    const outcome = await act(async () => result.current.handleCompleteSale(makeSaleData()));

    expect(outcome).toEqual({ success: true, sale: { serialId: 'PF-0001', id: 'sale-1' } });
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('PF-0001'));
  });

  it('rejects when no employee is logged in', async () => {
    const { result } = renderHook(() =>
      useSalesHandlers({ ...defaultProps, currentEmployeeId: null })
    );

    const outcome = await act(async () => result.current.handleCompleteSale(makeSaleData()));

    expect(outcome).toEqual({ success: false });
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Login required'));
    expect(defaultProps.completeSale).not.toHaveBeenCalled();
  });

  it('rejects when user lacks sale.create permission', async () => {
    (permissionsService.can as any).mockReturnValue(false);

    const { result } = renderHook(() => useSalesHandlers(defaultProps));

    const outcome = await act(async () => result.current.handleCompleteSale(makeSaleData()));

    expect(outcome).toEqual({ success: false });
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
    expect(defaultProps.completeSale).not.toHaveBeenCalled();
  });

  it('rejects when sale data validation fails', async () => {
    const { validateSaleData } = await import('../../../utils/validation');
    (validateSaleData as any).mockReturnValueOnce({
      success: false,
      message: 'Cart is empty',
    });

    const { result } = renderHook(() => useSalesHandlers(defaultProps));

    const outcome = await act(async () => result.current.handleCompleteSale(makeSaleData()));

    expect(outcome).toEqual({ success: false });
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Cart is empty'));
    expect(defaultProps.completeSale).not.toHaveBeenCalled();
  });

  it('rejects when transaction time is invalid', async () => {
    defaultProps.validateTransactionTime.mockReturnValueOnce({
      valid: false,
      message: 'Outside business hours',
    });

    const { result } = renderHook(() => useSalesHandlers(defaultProps));

    const outcome = await act(async () => result.current.handleCompleteSale(makeSaleData()));

    expect(outcome).toEqual({ success: false });
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Outside business hours'));
    expect(defaultProps.completeSale).not.toHaveBeenCalled();
  });

  it('handles mutation failure gracefully', async () => {
    defaultProps.completeSale.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useSalesHandlers(defaultProps));

    const outcome = await act(async () => result.current.handleCompleteSale(makeSaleData()));

    expect(outcome).toEqual({ success: false });
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Server error'));
  });

  it('calls updateLastTransactionTime on success', async () => {
    defaultProps.completeSale.mockResolvedValue({ serialId: 'PF-0001', id: 'sale-1' });

    const { result } = renderHook(() => useSalesHandlers(defaultProps));

    await act(async () => result.current.handleCompleteSale(makeSaleData()));

    expect(defaultProps.updateLastTransactionTime).toHaveBeenCalled();
  });

  it('passes context with performer and branch info', async () => {
    defaultProps.completeSale.mockResolvedValue({ serialId: 'PF-0001', id: 'sale-1' });

    const { result } = renderHook(() => useSalesHandlers(defaultProps));

    await act(async () => result.current.handleCompleteSale(makeSaleData()));

    expect(defaultProps.completeSale).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        performerId: 'emp1',
        performerName: 'Test Admin',
        branchId: 'B1',
        orgId: 'O1',
      })
    );
  });
});
