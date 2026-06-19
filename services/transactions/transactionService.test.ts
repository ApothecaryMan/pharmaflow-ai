import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../lib/supabase';
import { transactionService } from './transactionService';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  },
}));

vi.mock('../cash/cashService', () => ({
  cashService: {
    addTransaction: vi.fn().mockResolvedValue({ id: 'CASH1' }),
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
    expect(supabase.rpc).toHaveBeenCalledWith('process_checkout', expect.any(Object));
  });

  it('processReturn calls process_return rpc', async () => {
    const result = await transactionService.processReturn(
      { items: [], returnType: 'partial' } as any,
      [],
      { id: 'SALE1' } as any,
      mockContext
    );
    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('process_return', expect.any(Object));
  });

  it('processCancellation calls process_cancellation rpc', async () => {
    const result = await transactionService.processCancellation(
      { id: 'SALE1' } as any,
      [],
      mockContext
    );
    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('process_cancellation', expect.any(Object));
  });
});
