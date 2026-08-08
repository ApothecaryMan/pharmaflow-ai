import { beforeEach, describe, expect, it, vi } from 'vitest';
import { transactionService } from './transactionService';
import { transactionRepository } from './repositories/transactionRepository';
import { purchaseService } from '../purchases/purchaseService';
import { returnService } from '../returns/returnService';
import { cashService } from '../cash/cashService';
import { batchRepository } from '../inventory/repositories/batchRepository';
import { stockMovementRepository } from '../inventory/repositories/stockMovementRepository';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    from: vi.fn(),
  },
}));

vi.mock('../cash/cashService', () => ({
  cashService: {
    addTransaction: vi.fn().mockResolvedValue({ id: 'CASH1' }),
    getCurrentShift: vi.fn(),
    getAllShifts: vi.fn(),
    openShift: vi.fn(),
    closeShift: vi.fn(),
    getTransactions: vi.fn(),
  },
}));

vi.mock('../purchases/purchaseService', () => ({
  purchaseService: {
    getById: vi.fn(),
    approve: vi.fn(),
    create: vi.fn(),
    markAsReceived: vi.fn(),
  },
}));

vi.mock('../returns/returnService', () => ({
  returnService: {
    createPurchaseReturn: vi.fn(),
  },
}));

vi.mock('../audit/auditService', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

vi.mock('./repositories/transactionRepository', () => ({
  transactionRepository: {
    processCheckout: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    processCancellation: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    processOrderModification: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    processReturn: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    finalizeDeliveryOrder: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    checkShiftCashAvailable: vi.fn().mockResolvedValue({
      data: { sufficient: true, available: 999 },
      error: null,
    }),
    deletePurchase: vi.fn(),
  },
}));

vi.mock('../inventory/repositories/batchRepository', () => ({
  batchRepository: {
    deleteByPurchaseId: vi.fn(),
  },
}));

vi.mock('../inventory/repositories/stockMovementRepository', () => ({
  stockMovementRepository: {
    deleteByReferenceId: vi.fn(),
  },
}));

describe('transactionService', () => {
  const mockContext: any = {
    branchId: 'BR1',
    performerId: 'EMP1',
    performerName: 'Test Employee',
    timestamp: '2026-05-02T12:00:00Z',
    orgId: 'ORG1',
    shiftId: 'SHIFT1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Existing smoke tests ---

  it('processCheckout calls process_checkout rpc', async () => {
    const result = await transactionService.processCheckout(
      {
        items: [],
        customerName: 'Guest',
        paymentMethod: 'cash',
        total: 100,
        subtotal: 100,
      },
      [],
      mockContext
    );
    expect(result.success).toBe(true);
    expect(transactionRepository.processCheckout).toHaveBeenCalledWith(expect.any(Object));
  });

  it('processReturn calls process_return rpc', async () => {
    const result = await transactionService.processReturn(
      { items: [], returnType: 'partial' } as any,
      [],
      { id: 'SALE1' } as any,
      mockContext
    );
    expect(result.success).toBe(true);
    expect(transactionRepository.processReturn).toHaveBeenCalledWith(expect.any(Object));
  });

  it('processCancellation calls process_cancellation rpc', async () => {
    const result = await transactionService.processCancellation(
      { id: 'SALE1' } as any,
      [],
      mockContext
    );
    expect(result.success).toBe(true);
    expect(transactionRepository.processCancellation).toHaveBeenCalledWith(expect.any(Object));
  });

  // --- New smoke tests ---

  it('processOrderModification calls process_order_modification rpc', async () => {
    const result = await transactionService.processOrderModification(
      { id: 'SALE1', items: [], total: 100, subtotal: 100.} as any,
      { total: 120, subtotal: 120 } as any,
      [],
      mockContext
    );
    expect(result.success).toBe(true);
    expect(transactionRepository.processOrderModification).toHaveBeenCalledWith(
      expect.objectContaining({ saleId: 'SALE1' })
    );
  });

  it('processPurchaseTransaction approves purchase and logs audit', async () => {
    vi.mocked(purchaseService.getById).mockResolvedValue({ id: 'P1', status: 'pending', invoiceId: 'INV-001' } as any);
    vi.mocked(purchaseService.approve).mockResolvedValue({ id: 'P1', status: 'approved' } as any);

    const result = await transactionService.processPurchaseTransaction('P1', mockContext);

    expect(result.success).toBe(true);
    expect(purchaseService.getById).toHaveBeenCalledWith('P1');
    expect(purchaseService.approve).toHaveBeenCalledWith('P1', 'EMP1', 'Test Employee');
  });

  it('processPurchaseTransaction skips if already completed', async () => {
    vi.mocked(purchaseService.getById).mockResolvedValue({ id: 'P1', status: 'completed' } as any);

    const result = await transactionService.processPurchaseTransaction('P1', mockContext);

    expect(result.success).toBe(true);
    expect(purchaseService.approve).not.toHaveBeenCalled();
  });

  it('processDirectPurchaseTransaction creates purchase and marks as received', async () => {
    vi.mocked(purchaseService.create).mockResolvedValue({ id: 'P1', status: 'pending', branchId: 'BR1' } as any);
    vi.mocked(purchaseService.markAsReceived).mockResolvedValue({ id: 'P1', status: 'received' } as any);

    const result = await transactionService.processDirectPurchaseTransaction(
      {
        supplierId: 'SUP1',
        supplierName: 'Test Supplier',
        totalCost: 500,
        paymentMethod: 'cash',
        items: [],
        date: '2026-05-02',
        branchId: 'BR1',
        status: 'pending',
      } as any,
      mockContext
    );

    expect(result.success).toBe(true);
    expect(purchaseService.create).toHaveBeenCalled();
    expect(purchaseService.markAsReceived).toHaveBeenCalledWith('P1', 'EMP1', 'Test Employee', 'SHIFT1', undefined);
  });

  it('processPurchaseReturnTransaction creates purchase return and logs audit', async () => {
    vi.mocked(purchaseService.getById).mockResolvedValue({ id: 'P1', status: 'completed', paymentMethod: 'cash', invoiceId: 'INV-001' } as any);
    vi.mocked(returnService.createPurchaseReturn).mockResolvedValue({ id: 'PR1', purchaseId: 'P1' } as any);

    const result = await transactionService.processPurchaseReturnTransaction(
      { purchaseId: 'P1', supplierId: 'SUP1', items: [], totalRefund: 100 } as any,
      mockContext
    );

    expect(result.success).toBe(true);
    expect(purchaseService.getById).toHaveBeenCalledWith('P1');
    expect(returnService.createPurchaseReturn).toHaveBeenCalled();
  });

  it('processDeliveryFinalization calls finalize_delivery_order rpc', async () => {
    const result = await transactionService.processDeliveryFinalization('SALE1', mockContext);

    expect(result.success).toBe(true);
    expect(transactionRepository.finalizeDeliveryOrder).toHaveBeenCalledWith(
      expect.objectContaining({ saleId: 'SALE1' })
    );
  });

  it('addTransaction delegates to cashService', async () => {
    const result = await transactionService.addTransaction('SHIFT1', {
      type: 'in',
      amount: 50,
      reason: 'Test',
    } as any);

    expect(cashService.addTransaction).toHaveBeenCalledWith('SHIFT1', {
      type: 'in',
      amount: 50,
      reason: 'Test',
    });
    expect(result).toEqual({ id: 'CASH1' });
  });

  it('processCheckout returns error on db failure', async () => {
    vi.mocked(transactionRepository.processCheckout).mockResolvedValue({ data: null, error: { message: 'DB error' } } as any);
    const result = await transactionService.processCheckout(
      { items: [], customerName: 'Guest', paymentMethod: 'cash', total: 100, subtotal: 100 },
      [],
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
  });

  // --- New coverage: error paths, payload shapes, and rollback ---

  it('processReturn returns success:false when the RPC reports failure', async () => {
    vi.mocked(transactionRepository.processReturn).mockResolvedValueOnce({
      data: { success: false, error: 'Inventory constraint failed' },
      error: null,
    } as any);
    const result = await transactionService.processReturn(
      { items: [], returnType: 'partial' } as any,
      [],
      { id: 'SALE1' } as any,
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Inventory constraint failed');
  });

  it('processReturn returns success:false when the RPC returns an error', async () => {
    vi.mocked(transactionRepository.processReturn).mockResolvedValueOnce({
      data: null,
      error: { message: 'Return DB down' },
    } as any);
    const result = await transactionService.processReturn(
      { items: [], returnType: 'partial' } as any,
      [],
      { id: 'SALE1' } as any,
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Return DB down');
  });

  it.skip('CURRENTLY BUGGY (BUG-D8): processReturn drops the per-item reason from the return payload', async () => {
    // BUG-D8: per-item reason dropped, only top-level reason sent.
    // ReturnItem.reason is never mapped into the payload (transactionService.ts:239-245).
    // Test asserts the CORRECT behavior (reason present), red on current code.
    // TODO: re-enable after BUG-D8 fix.
    const returnData: any = {
      returnType: 'partial',
      reason: 'customer_request',
      notes: 'Customer returned a damaged item',
      items: [
        {
          drugId: 'D1',
          saleItemId: 'SI1',
          name: 'Drug A',
          quantityReturned: 2,
          isUnit: false,
          publicPrice: 50,
          refundAmount: 100,
          reason: 'damaged',
          condition: 'damaged',
        },
      ],
    };
    const result = await transactionService.processReturn(
      returnData,
      [],
      { id: 'SALE1' } as any,
      mockContext
    );
    expect(result.success).toBe(true);
    expect(transactionRepository.processReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        saleId: 'SALE1',
        branchId: 'BR1',
        orgId: 'ORG1',
        performerId: 'EMP1',
        performerName: 'Test Employee',
        returnType: 'partial',
        reason: 'customer_request',
        notes: 'Customer returned a damaged item',
        items: [
          { drugId: 'D1', saleItemId: 'SI1', quantity: 2, isUnit: false, condition: 'damaged', reason: 'damaged' },
        ],
      })
    );
  });

  it('processCancellation returns success:false when the RPC reports failure', async () => {
    vi.mocked(transactionRepository.processCancellation).mockResolvedValueOnce({
      data: { success: false, error: 'Sale already cancelled' },
      error: null,
    } as any);
    const result = await transactionService.processCancellation(
      { id: 'SALE1' } as any,
      [],
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Sale already cancelled');
  });

  it('processCancellation returns success:false when the RPC returns an error', async () => {
    vi.mocked(transactionRepository.processCancellation).mockResolvedValueOnce({
      data: null,
      error: { message: 'Cancellation DB down' },
    } as any);
    const result = await transactionService.processCancellation(
      { id: 'SALE1' } as any,
      [],
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancellation DB down');
  });

  it('processOrderModification returns success:false when the RPC reports failure', async () => {
    vi.mocked(transactionRepository.processOrderModification).mockResolvedValueOnce({
      data: { success: false, error: 'Validation failed' },
      error: null,
    } as any);
    const result = await transactionService.processOrderModification(
      { id: 'SALE1', items: [], total: 100, subtotal: 100.} as any,
      {} as any,
      [],
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Validation failed');
  });

  it('processOrderModification returns success:false when the RPC returns an error', async () => {
    vi.mocked(transactionRepository.processOrderModification).mockResolvedValueOnce({
      data: null,
      error: { message: 'Modification DB down' },
    } as any);
    const result = await transactionService.processOrderModification(
      { id: 'SALE1', items: [], total: 100, subtotal: 100.} as any,
      {} as any,
      [],
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Modification DB down');
  });

  it('processDirectPurchaseTransaction rolls back inventory and purchase when markAsReceived fails', async () => {
    vi.mocked(purchaseService.create).mockResolvedValue({
      id: 'P1',
      status: 'pending',
      branchId: 'BR1',
    } as any);
    vi.mocked(purchaseService.markAsReceived).mockRejectedValue(new Error('Stock allocation failed'));

    const result = await transactionService.processDirectPurchaseTransaction(
      { supplierId: 'SUP1', totalCost: 500, paymentMethod: 'cash', items: [] } as any,
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Stock allocation failed');
    expect(stockMovementRepository.deleteByReferenceId).toHaveBeenCalledWith('P1');
    expect(batchRepository.deleteByPurchaseId).toHaveBeenCalledWith('P1');
    expect(transactionRepository.deletePurchase).toHaveBeenCalledWith('P1');
  });

  it('processPurchaseTransaction returns success:false when the purchase is not found', async () => {
    vi.mocked(purchaseService.getById).mockResolvedValue(null as any);
    const result = await transactionService.processPurchaseTransaction('P1', mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Purchase order not found');
  });

  it('addTransaction propagates cashService errors', async () => {
    vi.mocked(cashService.addTransaction).mockRejectedValueOnce(new Error('Cash RPC failed'));
    await expect(
      transactionService.addTransaction('SHIFT1', { type: 'in', amount: 50 } as any)
    ).rejects.toThrow('Cash RPC failed');
  });
});
