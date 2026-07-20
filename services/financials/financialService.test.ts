import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../lib/supabase';
import { financialService } from './financialService';

vi.mock('../../lib/supabase', () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    // biome-ignore lint/suspicious/noThenProperty: mock query builder is a thenable
    then: vi
      .fn()
      .mockImplementation((onfulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onfulfilled)
      ),
  };

  return {
    supabase: {
      rpc: vi.fn(),
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    },
  };
});

describe('financialService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('getFinancialSummary', () => {
    it('uses the compute_financial_summary_with_snapshots RPC', async () => {
      const mockRpcResponse = {
        gross_revenue: 1000,
        total_refunds: 100,
        net_revenue: 900,
        gross_cogs: 600,
        return_cogs: 60,
        net_cogs: 540,
        gross_profit: 360,
        expenses_total: 100,
        net_profit: 260,
        total_transactions: 10,
        total_units_sold: 20,
        total_returns_count: 2,
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockRpcResponse,
        error: null,
      });

      const expectedSummary = {
        gross_revenue: 1000,
        return_revenue: 100,
        net_revenue: 900,
        gross_cogs: 600,
        return_cogs: 60,
        net_cogs: 540,
        gross_profit: 360,
        expenses_total: 100,
        net_profit: 260,
        total_transactions: 10,
        total_units_sold: 20,
        total_returns_count: 2,
      };

      const summary = await financialService.getFinancialSummary('this_month', 'BR1');
      expect(supabase.rpc).toHaveBeenCalledWith(
        'compute_financial_summary_with_snapshots',
        expect.any(Object)
      );
      expect(summary).toEqual(expectedSummary);
    });

    it('returns EMPTY_SUMMARY when RPC fails with error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('RPC function not found'),
      });

      const summary = await financialService.getFinancialSummary('this_month', 'BR1');
      expect(summary.gross_revenue).toBe(0);
      expect(summary.net_revenue).toBe(0);
      expect(summary.total_transactions).toBe(0);
    });

    it('returns EMPTY_SUMMARY when RPC throws', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Database Connection Error'));

      const summary = await financialService.getFinancialSummary('this_month', 'BR1');
      expect(summary.gross_revenue).toBe(0);
      expect(summary.net_revenue).toBe(0);
    });
  });

  describe('getDailyBreakdown', () => {
    it('uses the get_daily_financial_breakdown RPC', async () => {
      const mockData = [
        { day: '2026-06-01', revenue: 100, refund: 10, net: 90, sale_count: 5, return_count: 1 },
      ];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null });

      const result = await financialService.getDailyBreakdown('2026-06-01', '2026-06-02', 'BR1');
      expect(supabase.rpc).toHaveBeenCalledWith('get_daily_financial_breakdown', {
        p_branch_id: 'BR1',
        p_date_from: '2026-06-01',
        p_date_to: '2026-06-02',
      });
      expect(result).toEqual(mockData);
    });

    it('returns empty array when RPC fails with error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('RPC failed'),
      });

      const result = await financialService.getDailyBreakdown('2026-06-01', '2026-06-02', 'BR1');
      expect(result).toEqual([]);
    });

    it('returns empty array when RPC throws', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Database Connection Error'));

      const result = await financialService.getDailyBreakdown('2026-06-01', '2026-06-02', 'BR1');
      expect(result).toEqual([]);
    });
  });

  describe('getTopProducts', () => {
    it('uses the get_top_products_financial RPC', async () => {
      const mockData = [
        {
          id: 'p1',
          product_id: 'p1',
          product_name: 'Product A',
          abc_class: 'A' as const,
          quantity_sold: 10,
          revenue: 100,
          cogs: 50,
          gross_profit: 50,
          margin_percent: 50,
        },
      ];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null });

      const result = await financialService.getTopProducts('this_month', 'BR1', 5);
      expect(supabase.rpc).toHaveBeenCalledWith('get_top_products_financial', {
        p_branch_id: 'BR1',
        p_date_from: expect.any(String),
        p_date_to: expect.any(String),
        p_limit: 5,
      });
      expect(result).toEqual(mockData);
    });

    it('returns empty array when RPC fails with error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('RPC failed'),
      });

      const result = await financialService.getTopProducts('this_month', 'BR1', 5);
      expect(result).toEqual([]);
    });

    it('returns empty array when RPC throws', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Database Connection Error'));

      const result = await financialService.getTopProducts('this_month', 'BR1', 5);
      expect(result).toEqual([]);
    });
  });

  describe('getCategoryBreakdownByDates', () => {
    it('uses the get_category_financial_breakdown RPC', async () => {
      const mockData = [{ category: 'GENERAL', revenue: 100, cogs: 50, profit: 50 }];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null });

      const result = await financialService.getCategoryBreakdownByDates(
        '2026-06-01',
        '2026-06-02',
        'BR1'
      );
      expect(supabase.rpc).toHaveBeenCalledWith('get_category_financial_breakdown', {
        p_branch_id: 'BR1',
        p_date_from: '2026-06-01',
        p_date_to: '2026-06-02',
      });
      expect(result).toEqual(mockData);
    });

    it('returns empty array when RPC fails with error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('RPC failed'),
      });

      const result = await financialService.getCategoryBreakdownByDates(
        '2026-06-01',
        '2026-06-02',
        'BR1'
      );
      expect(result).toEqual([]);
    });

    it('returns empty array when RPC throws', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Database Connection Error'));

      const result = await financialService.getCategoryBreakdownByDates(
        '2026-06-01',
        '2026-06-02',
        'BR1'
      );
      expect(result).toEqual([]);
    });
  });
});
