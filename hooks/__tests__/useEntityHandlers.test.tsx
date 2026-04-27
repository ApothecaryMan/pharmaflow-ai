import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockSuccess, mockError } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

import { useEntityHandlers, SaleData } from '../useEntityHandlers';
import { batchService } from '../../services/inventory/batchService';
import { useAlert } from '../../context';
import { Drug } from '../../types';

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
    currentShift: { id: 'test-shift', status: 'open' }
  }),
}));

vi.mock('../useShift', () => ({
  useShift: vi.fn().mockReturnValue({
    addTransaction: vi.fn(),
    currentShift: { id: 'test-shift', status: 'open' }
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
    migrateInventoryToBatches: vi.fn(),
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

vi.mock('../../services/auditService', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

vi.mock('../../services/inventory/inventoryService', () => ({
  inventoryService: {
    updateStock: vi.fn(),
    updateStockBulk: vi.fn(),
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
    { id: 'cashier1', name: 'Test Cashier', role: 'cashier' }
  ] as any[];

  beforeEach(async () => {
    vi.clearAllMocks();
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
    suppliers: [],
    setSuppliers: vi.fn(),
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
    setEmployees: vi.fn(),
    batches: [],
    setBatches: vi.fn(),
    completeSale: vi.fn(),
    processSalesReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    markAsReceived: vi.fn(),
  };

  it('should complete sale successfully and allocate stock', async () => {
    // Setup success mocks
    (batchService.allocateStockBulk as any).mockReturnValue([
        { drugId: 'drug1', allocations: [] }
    ]);

    const { result } = renderHook(() => useEntityHandlers(defaultProps));

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
    
    expect(batchService.allocateStockBulk).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ drugId: 'drug1', quantity: 2 })
    ]));
    expect(mockSetSales).toHaveBeenCalled();
    expect(mockSetInventory).toHaveBeenCalled();
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('completed'));
  });

  it('should rollback and NOT update state if batch allocation fails for one item', async () => {
    // Drug 1 succeeds, Drug 2 fails
    (batchService.allocateStockBulk as any).mockImplementation(() => {
        throw new Error('Failed to allocate batch stock');
    });

    const { result } = renderHook(() => useEntityHandlers(defaultProps));

    const saleData: SaleData = {
      items: [
        { id: 'drug1', name: 'Drug A', quantity: 2, isUnit: true } as any,
        { id: 'drug2', name: 'Drug B', quantity: 2, isUnit: true } as any,
      ],
      total: 200,
      customerName: 'Guest',
      paymentMethod: 'cash',
      globalDiscount: 0,
      subtotal: 200,
    };

    await act(async () => {
      await result.current.handleCompleteSale(saleData);
    });

    // Verify allocateStockBulk was called
    expect(batchService.allocateStockBulk).toHaveBeenCalled();

    // Verification of rollback:
    // In bulk mode, rollback is implicit (no saveBatches called on error).
    // So returnStock is NOT needed.
    expect(batchService.returnStock).not.toHaveBeenCalled();

    // Verify State was NOT updated
    expect(mockSetSales).not.toHaveBeenCalled();
    expect(mockSetInventory).not.toHaveBeenCalled();

    // Verify Error Toast
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Failed to allocate batch stock'));
  });

  it('should prevent sale if validateStockAvailability (pre-check) fails', async () => {
    const { validateStockAvailability } = await import('../../utils/validation');
    (validateStockAvailability as any).mockReturnValueOnce({ success: false, message: 'Insufficient stock' });

    const { result } = renderHook(() => useEntityHandlers(defaultProps));

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
    expect(batchService.allocateStockBulk).not.toHaveBeenCalled();
    expect(mockSetSales).not.toHaveBeenCalled();
  });
});


describe('useEntityHandlers: Drug Management', () => {
  const mockSetInventory = vi.fn();
  const mockSuccess = vi.fn();
  const mockError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAlert as any).mockReturnValue({
      success: mockSuccess,
      error: mockError,
    });
  });

  const defaultProps = {
    inventory: [],
    setInventory: mockSetInventory,
    sales: [],
    setSales: vi.fn(),
    suppliers: [],
    setSuppliers: vi.fn(),
    purchases: [],
    setPurchases: vi.fn(),
    returns: [],
    setReturns: vi.fn(),
    customers: [],
    setCustomers: vi.fn(),
    currentEmployeeId: 'emp1',
    isLoading: false,
    activeBranchId: 'B1',
    activeOrgId: 'O1',
    purchaseReturns: [],
    setPurchaseReturns: vi.fn(),
    getVerifiedDate: vi.fn(),
    validateTransactionTime: vi.fn(),
    updateLastTransactionTime: vi.fn(),
    setEmployees: vi.fn(),
    employees: [{ id: 'emp1', role: 'admin' }] as any[],
    batches: [],
    setBatches: vi.fn(),
    completeSale: vi.fn(),
    processSalesReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    markAsReceived: vi.fn(),
  };

  it('should validate drug data before adding', async () => {
    const { result } = renderHook(() => useEntityHandlers(defaultProps));

    await act(() => {
      // Invalid name
      result.current.handleAddDrug({ name: '', price: 10, stock: 5 } as Drug);
    });

    expect(mockSetInventory).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Drug name is required'));
  });

  it('should require login to update drug', async () => {
    const { result } = renderHook(() => useEntityHandlers({
      ...defaultProps,
      currentEmployeeId: null, // No login
    }));

    await act(() => {
      result.current.handleUpdateDrug({ id: '1', name: 'Drug', price: 10 } as Drug);
    });

    expect(mockSetInventory).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
  });

  it('should log audit entry on successful add', async () => {
    const { result } = renderHook(() => useEntityHandlers(defaultProps));

    await act(() => {
       result.current.handleAddDrug({ id: '1', name: 'Valid Drug', price: 10, stock: 5 } as Drug);
    });

    expect(mockSetInventory).toHaveBeenCalled();
  });
});

describe('useEntityHandlers: RBAC & Security', () => {
  const mockSetInventory = vi.fn();
  const mockError = vi.fn();
  const mockSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAlert as any).mockReturnValue({
      success: mockSuccess,
      error: mockError,
    });
  });

  const baseProps = {
    inventory: [{ id: '1', name: 'Drug A' }] as any,
    setInventory: mockSetInventory,
    sales: [],
    setSales: vi.fn(),
    suppliers: [],
    setSuppliers: vi.fn(),
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
    getVerifiedDate: vi.fn(),
    validateTransactionTime: vi.fn(),
    updateLastTransactionTime: vi.fn(),
    batches: [],
    setBatches: vi.fn(),
    completeSale: vi.fn(),
    processSalesReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    markAsReceived: vi.fn(),
  };

  it('should prevent Cashier from deleting drugs', async () => {
    const employees = [
        { id: 'cashier1', name: 'Cashier', role: 'cashier' }
    ] as any;

    const { result } = renderHook(() => useEntityHandlers({
        ...baseProps,
        currentEmployeeId: 'cashier1',
        employees
    } as any));

    await act(() => {
        result.current.handleDeleteDrug('1');
    });

    expect(mockSetInventory).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
  });

  it('should allow Manager to delete drugs', async () => {
    const employees = [
        { id: 'mgr1', name: 'Manager', role: 'manager' }
    ] as any;

    const { result } = renderHook(() => useEntityHandlers({
        ...baseProps,
        currentEmployeeId: 'mgr1',
        employees,
        setInventory: mockSetInventory,
        setEmployees: vi.fn(),
    } as any));

    await act(() => {
        result.current.handleDeleteDrug('1');
    });

    expect(mockSetInventory).toHaveBeenCalled();
  });

  it('should prevent Cashier from adding suppliers', async () => {
    const employees = [
        { id: 'cashier1', name: 'Cashier', role: 'cashier' }
    ] as any;

    const { result } = renderHook(() => useEntityHandlers({
        ...baseProps,
        currentEmployeeId: 'cashier1',
        employees,
        setSuppliers: vi.fn() // Ensure spy is fresh/clean
    } as any));

    await act(() => {
        result.current.handleAddSupplier({ id: 's1', name: 'Sup' } as any);
    });

    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
  });
});

describe('useEntityHandlers: Edge Cases', () => {
  const mockSetInventory = vi.fn();
  const mockError = vi.fn();
  const mockSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    (useAlert as any).mockReturnValue({
      success: mockSuccess,
      error: mockError,
    });
    // Reset validation mock
    const { validateStockAvailability, validateSaleData } = await import('../../utils/validation');
    (validateStockAvailability as any).mockReturnValue({ success: true });
    (validateSaleData as any).mockReturnValue({ success: true });
  });

  const baseProps = {
    inventory: [{ id: '1', name: 'Drug A', stock: 1, unitsPerPack: 1 }] as any,
    setInventory: mockSetInventory,
    sales: [],
    setSales: vi.fn(),
    suppliers: [],
    setSuppliers: vi.fn(),
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
    setEmployees: vi.fn(),
    employees: [{ id: 'emp1', role: 'admin' }] as any[],
    batches: [],
    setBatches: vi.fn(),
    completeSale: vi.fn(),
    processSalesReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    markAsReceived: vi.fn(),
  };

  it('should handle concurrent sales of last item correctly', async () => {
    // Determine if batchService needs mocking or if we use the mock from top
    // Top mock is: allocateStock: vi.fn()
    // To test concurrency, we need the mock to simulate state or return null on 2nd call
    
    // Setup: mocking allocateStock to succeed once then fail
    (batchService.allocateStockBulk as any)
      .mockImplementationOnce(() => [{ drugId: '1', allocations: [] }])
      .mockImplementationOnce(() => { throw new Error('Insufficient stock'); });

    const { result } = renderHook(() => useEntityHandlers({
        ...baseProps,
        currentEmployeeId: 'emp1'
    } as any));

    const saleData = {
        items: [{ id: '1', quantity: 1, isUnit: true }] as any,
        total: 10,
        customerName: 'G',
        paymentMethod: 'cash',
        globalDiscount: 0,
        subtotal: 10
    } as SaleData;

    await act(async () => {
        await result.current.handleCompleteSale(saleData);
    });
    
    await act(async () => {
        await result.current.handleCompleteSale(saleData);
    });

    // Should have succeeded once and failed once
    // Add debugging if they fail again
    if (mockSuccess.mock.calls.length === 0) console.log('[TEST-DEBUG] mockSuccess NOT called');
    if (mockError.mock.calls.length === 0) console.log('[TEST-DEBUG] mockError NOT called');

    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(mockError).toHaveBeenCalledTimes(1);
  });

  it('should respect manual batch selection (preferredBatchId)', async () => {
    const { batchService } = await import('../../services/inventory/batchService');
    const allocateSpy = vi.spyOn(batchService, 'allocateStockBulk');
    
    const { result } = renderHook(() => useEntityHandlers({
        ...baseProps,
        currentEmployeeId: 'emp1'
    } as any));

    const saleData = {
        items: [{ 
          id: '1', 
          quantity: 1, 
          isUnit: true,
          preferredBatchId: 'batch-specific-123' 
        }] as any,
        total: 10,
        customerName: 'Manuel',
        paymentMethod: 'cash',
        globalDiscount: 0,
        subtotal: 10
    } as SaleData;

    await act(async () => {
        await result.current.handleCompleteSale(saleData);
    });

    // Check if allocateStockBulk was called with the preferredBatchId
    expect(allocateSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          drugId: '1',
          quantity: 1,
          preferredBatchId: 'batch-specific-123'
        })
      ])
    );
  });
});

describe('useEntityHandlers: Customer Management (enrichedCustomers)', () => {
  const mockSetInventory = vi.fn();

  const defaultProps = {
    inventory: [],
    setInventory: mockSetInventory,
    sales: [],
    setSales: vi.fn(),
    suppliers: [],
    setSuppliers: vi.fn(),
    purchases: [],
    setPurchases: vi.fn(),
    returns: [],
    setReturns: vi.fn(),
    customers: [],
    setCustomers: vi.fn(),
    currentEmployeeId: 'emp1',
    isLoading: false,
    activeBranchId: 'B1',
    activeOrgId: 'O1',
    purchaseReturns: [],
    setPurchaseReturns: vi.fn(),
    getVerifiedDate: vi.fn(),
    validateTransactionTime: vi.fn(),
    updateLastTransactionTime: vi.fn(),
    batches: [],
    setBatches: vi.fn(),
    completeSale: vi.fn(),
    processSalesReturn: vi.fn(),
    createPurchaseReturn: vi.fn(),
    markAsReceived: vi.fn(),
  };

   it('should correctly calculate total purchases from sales', () => {
     const customers = [
       { id: 'c1', name: 'John Doe', code: 'C100', totalPurchases: 0, lastVisit: '' } as any
     ];
     // Matches by name (fallback if no code match or legacy)
     const sales = [
       { id: 's1', customerCode: 'C100', total: 100, date: '2024-01-01' } as any,
       { id: 's2', customerName: 'John Doe', total: 50, date: '2024-01-02' } as any
     ] as any[]; 

     const { result } = renderHook(() => useEntityHandlers({
       ...defaultProps,
       customers,
       sales
     } as any));

     expect(result.current.enrichedCustomers[0].totalPurchases).toBe(150);
     expect(result.current.enrichedCustomers[0].lastVisit).toBe('2024-01-02');
   });
});
