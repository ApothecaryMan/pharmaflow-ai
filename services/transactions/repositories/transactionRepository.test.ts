import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../lib/supabase';
import { transactionRepository } from './transactionRepository';

const { builder, stateRef } = vi.hoisted(() => {
  const stateRef: { value: { data: unknown; error: unknown } } = { value: { data: null, error: null } };
  const builder: any = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((onfulfilled) => Promise.resolve(stateRef.value).then(onfulfilled)),
  };
  return { builder, stateRef };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue(builder),
  },
}));

describe('transactionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateRef.value = { data: null, error: null };
  });

  describe('processCheckout', () => {
    it('calls process_checkout with the payload as p_payload', async () => {
      const payload = {
        branchId: 'BR1',
        orgId: 'ORG1',
        shiftId: 'SHIFT1',
        timestamp: 'T',
        performerId: 'U1',
        performerName: 'Emp',
        items: [],
        customerName: 'Guest',
        paymentMethod: 'cash',
        saleType: 'walk-in',
        status: 'completed',
        deliveryFee: 0,
        total: 100,
        subtotal: 100,
      } as any;
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
      const result = await transactionRepository.processCheckout(payload);
      expect(supabase.rpc).toHaveBeenCalledWith('process_checkout', { p_payload: payload });
      expect(result).toEqual({ data: { success: true }, error: null });
    });

    it('returns the raw RPC result unchanged when success is false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: false, error: 'stock shortfall' },
        error: null,
      });
      const result = await transactionRepository.processCheckout({} as any);
      expect(result).toEqual({ data: { success: false, error: 'stock shortfall' }, error: null });
    });

    it('propagates an RPC rejection', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('rpc down'));
      await expect(transactionRepository.processCheckout({} as any)).rejects.toThrow('rpc down');
    });
  });

  describe('processCancellation', () => {
    it('calls process_cancellation with the payload as p_payload', async () => {
      const payload = { saleId: 'SALE1', branchId: 'BR1', orgId: 'ORG1', performerId: 'U1', performerName: 'Emp' } as any;
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
      await transactionRepository.processCancellation(payload);
      expect(supabase.rpc).toHaveBeenCalledWith('process_cancellation', { p_payload: payload });
    });

    it('propagates an RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
      const result = await transactionRepository.processCancellation({} as any);
      expect(result).toEqual({ data: null, error: { message: 'db error' } });
    });
  });

  describe('processOrderModification', () => {
    it('calls process_order_modification with the payload as p_payload', async () => {
      const payload = { saleId: 'SALE1', branchId: 'BR1', orgId: 'ORG1', performerId: 'U1', performerName: 'Emp', total: 100, subtotal: 100, items: [] } as any;
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
      await transactionRepository.processOrderModification(payload);
      expect(supabase.rpc).toHaveBeenCalledWith('process_order_modification', {
        p_payload: payload,
      });
    });
  });

  describe('processReturn', () => {
    it('calls process_return with the payload as p_payload', async () => {
      const payload = {
        saleId: 'SALE1',
        branchId: 'BR1',
        orgId: 'ORG1',
        performerId: 'U1',
        performerName: 'Emp',
        returnType: 'partial',
        reason: 'customer_request',
        items: [],
      } as any;
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, returnId: 'R1', totalRefund: 50 },
        error: null,
      });
      const result = await transactionRepository.processReturn(payload);
      expect(supabase.rpc).toHaveBeenCalledWith('process_return', { p_payload: payload });
      expect(result).toEqual({ data: { success: true, returnId: 'R1', totalRefund: 50 }, error: null });
    });
  });

  describe('finalizeDeliveryOrder', () => {
    it('calls finalize_delivery_order with the payload as p_payload', async () => {
      const payload = { saleId: 'SALE1', shiftId: 'SHIFT1', performerId: 'U1', performerName: 'Emp' } as any;
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
      await transactionRepository.finalizeDeliveryOrder(payload);
      expect(supabase.rpc).toHaveBeenCalledWith('finalize_delivery_order', {
        p_payload: payload,
      });
    });
  });

  describe('deletePurchase', () => {
    it('deletes the purchase row by id', async () => {
      await transactionRepository.deletePurchase('P1');
      expect(supabase.from).toHaveBeenCalledWith('purchases');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'P1');
    });

    it('throws when the delete reports an error', async () => {
      stateRef.value = { data: null, error: { message: 'delete failed' } };
      await expect(transactionRepository.deletePurchase('P1')).rejects.toThrow('delete failed');
    });
  });
});
