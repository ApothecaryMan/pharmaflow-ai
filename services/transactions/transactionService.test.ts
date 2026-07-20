import { beforeEach, describe, expect, it, vi } from 'vitest';
import { transactionService } from './transactionService';
import { transactionRepository } from './repositories/transactionRepository';
import { purchaseService } from '../purchases/purchaseService';
import { returnService } from '../returns/returnService';
import { cashService } from '../cash/cashService';

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
        globalDiscount: 0,
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
      { id: 'SALE1', items: [], total: 100, subtotal: 100, globalDiscount: 0 } as any,
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
    purchaseService.getById.mockResolvedValue({ id: 'P1', status: 'pending', invoiceId: 'INV-001' });
    purchaseService.approve.mockResolvedValue({ id: 'P1', status: 'approved' });

    const result = await transactionService.processPurchaseTransaction('P1', mockContext);

    expect(result.success).toBe(true);
    expect(purchaseService.getById).toHaveBeenCalledWith('P1');
    expect(purchaseService.approve).toHaveBeenCalledWith('P1', 'EMP1', 'Test Employee');
  });

  it('processPurchaseTransaction skips if already completed', async () => {
    purchaseService.getById.mockResolvedValue({ id: 'P1', status: 'completed' });

    const result = await transactionService.processPurchaseTransaction('P1', mockContext);

    expect(result.success).toBe(true);
    expect(purchaseService.approve).not.toHaveBeenCalled();
  });

  it('processDirectPurchaseTransaction creates purchase and marks as received', async () => {
    purchaseService.create.mockResolvedValue({ id: 'P1', status: 'pending', branchId: 'BR1' });
    purchaseService.markAsReceived.mockResolvedValue({ id: 'P1', status: 'received' });

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
    expect(purchaseService.markAsReceived).toHaveBeenCalledWith('P1', 'EMP1', 'Test Employee', 'SHIFT1');
  });

  it('processPurchaseReturnTransaction creates purchase return and logs audit', async () => {
    purchaseService.getById.mockResolvedValue({ id: 'P1', status: 'completed', paymentMethod: 'cash', invoiceId: 'INV-001' });
    returnService.createPurchaseReturn.mockResolvedValue({ id: 'PR1', purchaseId: 'P1' });

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
    transactionRepository.processCheckout.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const result = await transactionService.processCheckout(
      { items: [], customerName: 'Guest', paymentMethod: 'cash', total: 100, subtotal: 100, globalDiscount: 0 },
      [],
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
  });
});
