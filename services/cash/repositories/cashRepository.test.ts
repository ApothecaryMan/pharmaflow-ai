import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../lib/supabase';
import { cashRepository } from './cashRepository';

const { builder, stateRef } = vi.hoisted(() => {
  const stateRef: { value: { data: unknown; error: unknown } } = { value: { data: [], error: null } };
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(stateRef.value)),
    then: vi.fn().mockImplementation((onfulfilled) => Promise.resolve(stateRef.value).then(onfulfilled)),
  };
  return { builder, stateRef };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue(builder),
    rpc: vi.fn(),
  },
}));

const SHIFT_FULL_COLUMNS =
  'id, serial_id, branch_id, org_id, status, open_time, close_time, opened_by, opening_balance, closing_balance, expected_balance, cash_sales, card_sales, cash_in, cash_out, returns, cash_purchases, cash_purchase_returns, card_returns, branch_name, closed_by, notes';

const SHIFT_LIST_COLUMNS =
  'id, serial_id, branch_id, org_id, status, open_time, close_time, opened_by, opening_balance, closing_balance, expected_balance, cash_sales, card_sales, cash_in, cash_out, returns, cash_purchases, cash_purchase_returns, card_returns';

const TX_FULL_COLUMNS =
  'id, branch_id, shift_id, time, type, amount, reason, user_id, related_purchase_id, related_supplier_id, org_id, related_sale_id';

const TX_LIST_COLUMNS =
  'id, branch_id, shift_id, time, type, amount, reason, user_id, related_purchase_id, related_supplier_id';

describe('cashRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateRef.value = { data: null, error: null };
  });

  describe('mapShiftFromDb', () => {
    it('maps a database row into a Shift', () => {
      const row = {
        id: 'S1',
        serial_id: 'CAI-SH-26-000001',
        branch_id: 'BR1',
        org_id: 'ORG1',
        branch_name: 'Main Branch',
        status: 'open' as const,
        open_time: '2026-01-01T08:00:00.000Z',
        close_time: '2026-01-01T16:00:00.000Z',
        opened_by: 'U1',
        closed_by: 'U2',
        opening_balance: '500',
        closing_balance: '1000',
        expected_balance: '1000',
        cash_in: '150',
        cash_out: '50',
        cash_sales: '800',
        card_sales: '200',
        returns: '20',
        card_returns: '10',
        cash_purchases: '100',
        cash_purchase_returns: '5',
        notes: 'note',
      };
      expect(cashRepository.mapShiftFromDb(row)).toEqual({
        id: 'S1',
        serialId: 'CAI-SH-26-000001',
        branchId: 'BR1',
        orgId: 'ORG1',
        branchName: 'Main Branch',
        status: 'open',
        openTime: '2026-01-01T08:00:00.000Z',
        closeTime: '2026-01-01T16:00:00.000Z',
        openedBy: 'U1',
        closedBy: 'U2',
        openingBalance: 500,
        closingBalance: 1000,
        expectedBalance: 1000,
        cashIn: 150,
        cashOut: 50,
        cashSales: 800,
        cardSales: 200,
        returns: 20,
        cardReturns: 10,
        cashPurchases: 100,
        cashPurchaseReturns: 5,
        notes: 'note',
        transactions: [],
      });
    });

    it('maps null balances to undefined and missing totals to 0', () => {
      const mapped = cashRepository.mapShiftFromDb({ id: 'S1', branch_id: 'BR1' });
      expect(mapped.closingBalance).toBeUndefined();
      expect(mapped.expectedBalance).toBeUndefined();
      expect(mapped.cashIn).toBe(0);
      expect(mapped.cashOut).toBe(0);
      expect(mapped.cashSales).toBe(0);
    });
  });

  describe('mapShiftToDb', () => {
    it('maps a partial Shift into a db row, only including defined fields', () => {
      expect(
        cashRepository.mapShiftToDb({
          id: 'S1',
          serialId: 'CAI-SH-26-000001',
          branchId: 'BR1',
          status: 'open',
          openingBalance: 500,
        } as any)
      ).toEqual({
        id: 'S1',
        serial_id: 'CAI-SH-26-000001',
        branch_id: 'BR1',
        status: 'open',
        opening_balance: 500,
      });
    });

    it('returns an empty object for an empty input', () => {
      expect(cashRepository.mapShiftToDb({})).toEqual({});
    });
  });

  describe('mapTransactionFromDb', () => {
    it('maps a database row into a CashTransaction', () => {
      const row = {
        id: 'T1',
        branch_id: 'BR1',
        org_id: 'ORG1',
        shift_id: 'SHIFT1',
        time: '2026-01-01T09:00:00.000Z',
        type: 'in' as const,
        amount: '50',
        reason: 'top-up',
        user_id: 'U1',
        related_sale_id: 'SALE1',
        related_purchase_id: 'P1',
        related_supplier_id: 'SUP1',
      };
      expect(cashRepository.mapTransactionFromDb(row)).toEqual({
        id: 'T1',
        branchId: 'BR1',
        orgId: 'ORG1',
        shiftId: 'SHIFT1',
        time: '2026-01-01T09:00:00.000Z',
        type: 'in',
        amount: 50,
        reason: 'top-up',
        userId: 'U1',
        relatedSaleId: 'SALE1',
        relatedPurchaseId: 'P1',
        relatedSupplierId: 'SUP1',
      });
    });
  });

  describe('mapTransactionToDb', () => {
    it('maps a partial CashTransaction into a db row', () => {
      expect(
        cashRepository.mapTransactionToDb({
          id: 'T1',
          branchId: 'BR1',
          shiftId: 'SHIFT1',
          amount: 50,
          relatedSaleId: 'SALE1',
        } as any)
      ).toEqual({
        id: 'T1',
        branch_id: 'BR1',
        shift_id: 'SHIFT1',
        amount: 50,
        related_sale_id: 'SALE1',
      });
    });
  });

  describe('getCurrentShift', () => {
    it('queries the open shift for the branch and maps it', async () => {
      stateRef.value = {
        data: { id: 'S1', branch_id: 'BR1', status: 'open', opening_balance: 100 },
        error: null,
      };
      const shift = await cashRepository.getCurrentShift('BR1');
      expect(supabase.from).toHaveBeenCalledWith('shifts');
      expect(builder.select).toHaveBeenCalledWith(SHIFT_FULL_COLUMNS);
      expect(builder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
      expect(builder.eq).toHaveBeenCalledWith('status', 'open');
      expect(shift).toEqual(
        expect.objectContaining({ id: 'S1', branchId: 'BR1', status: 'open' })
      );
    });

    it('returns null when no shift is found', async () => {
      const shift = await cashRepository.getCurrentShift('BR1');
      expect(shift).toBeNull();
    });

    it('propagates a repository error', async () => {
      stateRef.value = { data: null, error: { message: 'query failed' } };
      await expect(cashRepository.getCurrentShift('BR1')).rejects.toThrow('query failed');
    });
  });

  describe('getAllShifts', () => {
    it('queries all shifts for the branch ordered by open_time descending', async () => {
      stateRef.value = {
        data: [{ id: 'S1', branch_id: 'BR1' }, { id: 'S2', branch_id: 'BR1' }],
        error: null,
      };
      const shifts = await cashRepository.getAllShifts('BR1');
      expect(builder.select).toHaveBeenCalledWith(SHIFT_LIST_COLUMNS);
      expect(builder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
      expect(builder.order).toHaveBeenCalledWith('open_time', { ascending: false });
      expect(shifts).toHaveLength(2);
      expect(shifts[0].id).toBe('S1');
    });

    it('returns an empty array when no rows come back', async () => {
      const shifts = await cashRepository.getAllShifts('BR1');
      expect(shifts).toEqual([]);
    });
  });

  describe('getShiftById', () => {
    it('queries a single shift by id', async () => {
      stateRef.value = { data: { id: 'S1', branch_id: 'BR1' }, error: null };
      const shift = await cashRepository.getShiftById('S1');
      expect(supabase.from).toHaveBeenCalledWith('shifts');
      expect(builder.select).toHaveBeenCalledWith(SHIFT_FULL_COLUMNS);
      expect(builder.eq).toHaveBeenCalledWith('id', 'S1');
      expect(shift?.id).toBe('S1');
    });

    it('returns null when no shift matches', async () => {
      const shift = await cashRepository.getShiftById('NOPE');
      expect(shift).toBeNull();
    });
  });

  describe('getTransactions', () => {
    it('queries transactions for a shift ordered by time descending', async () => {
      stateRef.value = { data: [{ id: 'T1', shift_id: 'SHIFT1' }], error: null };
      const txs = await cashRepository.getTransactions('SHIFT1');
      expect(supabase.from).toHaveBeenCalledWith('cash_transactions');
      expect(builder.select).toHaveBeenCalledWith(TX_FULL_COLUMNS);
      expect(builder.eq).toHaveBeenCalledWith('shift_id', 'SHIFT1');
      expect(builder.order).toHaveBeenCalledWith('time', { ascending: false });
      expect(txs[0].id).toBe('T1');
    });
  });

  describe('getAllTransactions', () => {
    it('queries transactions for a branch ordered by time descending', async () => {
      stateRef.value = { data: [{ id: 'T1', branch_id: 'BR1' }], error: null };
      const txs = await cashRepository.getAllTransactions('BR1');
      expect(builder.select).toHaveBeenCalledWith(TX_LIST_COLUMNS);
      expect(builder.eq).toHaveBeenCalledWith('branch_id', 'BR1');
      expect(builder.order).toHaveBeenCalledWith('time', { ascending: false });
      expect(txs[0].id).toBe('T1');
    });
  });

  describe('deleteTransaction', () => {
    it('deletes a transaction by id and resolves true', async () => {
      stateRef.value = { data: null, error: null };
      const result = await cashRepository.deleteTransaction('T1');
      expect(supabase.from).toHaveBeenCalledWith('cash_transactions');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'T1');
      expect(result).toBe(true);
    });

    it('propagates a delete error', async () => {
      stateRef.value = { data: null, error: { message: 'delete failed' } };
      await expect(cashRepository.deleteTransaction('T1')).rejects.toThrow('delete failed');
    });
  });

  describe('openShiftRPC', () => {
    it('calls the open_shift RPC with the payload', async () => {
      const payload = { branchId: 'BR1', openedBy: 'U1', openingBalance: 100, openTime: 'T' };
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true, shiftId: 'S1' }, error: null });
      const result = await cashRepository.openShiftRPC(payload);
      expect(supabase.rpc).toHaveBeenCalledWith('open_shift', { p_payload: payload });
      expect(result).toEqual({ success: true, shiftId: 'S1' });
    });

    it('returns null when no data comes back', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null });
      const result = await cashRepository.openShiftRPC({} as any);
      expect(result).toBeNull();
    });

    it('propagates an RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });
      await expect(cashRepository.openShiftRPC({} as any)).rejects.toThrow('rpc failed');
    });
  });

  describe('closeShiftRPC', () => {
    it('calls the close_shift RPC with the payload', async () => {
      const payload = { id: 'S1', closedBy: 'U1', closingBalance: 1000, closeTime: 'T' };
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { success: true }, error: null });
      const result = await cashRepository.closeShiftRPC(payload);
      expect(supabase.rpc).toHaveBeenCalledWith('close_shift', { p_payload: payload });
      expect(result).toEqual({ success: true });
    });
  });

  describe('processCashTransactionRPC', () => {
    it('calls the process_cash_transaction RPC with the payload', async () => {
      const payload = {
        shiftId: 'SHIFT1',
        branchId: 'BR1',
        type: 'in',
        amount: 50,
        userId: 'U1',
        time: 'T',
      };
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, transactionId: 'T1' },
        error: null,
      });
      const result = await cashRepository.processCashTransactionRPC(payload);
      expect(supabase.rpc).toHaveBeenCalledWith('process_cash_transaction', { p_payload: payload });
      expect(result).toEqual({ success: true, transactionId: 'T1' });
    });
  });
});
