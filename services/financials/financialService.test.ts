import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../lib/supabase';
import type { Sale } from '../../types';
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

  describe('calculateRevenueAndReturns', () => {
    it('calculates revenue and returns with precision math', () => {
      const mockSales: Sale[] = [
        {
          id: 'S1',
          serialId: 'PF-001',
          branchId: 'BR1',
          orgId: 'ORG1',
          status: 'completed',
          date: '2026-05-28T12:00:00Z',
          total: 100,
          paymentMethod: 'cash',
          items: [
            {
              id: 'item1',
              name: 'Panadol',
              quantity: 2,
              publicPrice: 60, // Total 120 gross
              discount: 10, // 10% discount -> 54 each -> 108 net
              isUnit: false,
            } as any,
          ],
          globalDiscount: 8, // 108 - 8 = 100 final total
          itemReturnedQuantities: {
            item1_pack: 0,
          },
        },
      ];

      const result = financialService.calculateRevenueAndReturns(mockSales);
      expect(result.totalRevenue).toBe(100);
      expect(result.totalReturns).toBe(0);
    });

    it('handles returned items correctly', () => {
      const mockSales: Sale[] = [
        {
          id: 'S1',
          serialId: 'PF-001',
          branchId: 'BR1',
          orgId: 'ORG1',
          status: 'completed',
          date: '2026-05-28T12:00:00Z',
          total: 50,
          paymentMethod: 'cash',
          items: [
            {
              id: 'item1',
              name: 'Panadol',
              quantity: 2,
              publicPrice: 50, // Total 100 gross
              discount: 0,
              isUnit: false,
            } as any,
          ],
          itemReturnedQuantities: {
            item1_pack: 1, // 1 pack returned -> 1 pack actual sold
          },
        },
      ];

      const result = financialService.calculateRevenueAndReturns(mockSales);
      // Actual revenue kept: 1 pack = 50. Returned value = 50.
      expect(result.totalRevenue).toBe(50);
      expect(result.totalReturns).toBe(50);
    });
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

    it('falls back to client-side calculations when RPC fails', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('RPC function not found'));

      const spyFallback = vi
        .spyOn(financialService, 'fallbackFinancialSummary')
        .mockResolvedValueOnce({
          gross_revenue: 200,
          return_revenue: 20,
          net_revenue: 180,
          gross_cogs: 100,
          return_cogs: 10,
          net_cogs: 90,
          gross_profit: 90,
          expenses_total: 20,
          net_profit: 70,
          total_transactions: 2,
          total_units_sold: 4,
          total_returns_count: 1,
        });

      const summary = await financialService.getFinancialSummary('this_month', 'BR1');
      expect(spyFallback).toHaveBeenCalled();
      expect(summary.net_revenue).toBe(180);
    });

    it('throws error in production when RPC fails', async () => {
      vi.spyOn(financialService, 'isDev').mockReturnValue(false);

      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Database Connection Error'));

      await expect(
        financialService.getFinancialSummary('this_month', 'BR1')
      ).rejects.toThrow('Database Connection Error');
    });
  });

  describe('getDailyBreakdown', () => {
    it('uses the get_daily_financial_breakdown RPC', async () => {
      const mockData = [{ day: '2026-06-01', revenue: 100, refund: 10, net: 90, sale_count: 5, return_count: 1 }];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null });

      const result = await financialService.getDailyBreakdown('2026-06-01', '2026-06-02', 'BR1');
      expect(supabase.rpc).toHaveBeenCalledWith('get_daily_financial_breakdown', {
        p_branch_id: 'BR1',
        p_date_from: '2026-06-01',
        p_date_to: '2026-06-02',
      });
      expect(result).toEqual(mockData);
    });

    it('falls back to client-side calculations in dev when RPC fails', async () => {
      vi.spyOn(financialService, 'isDev').mockReturnValue(true);
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('RPC failed'));
      const spyFallback = vi.spyOn(financialService, 'fallbackDailyBreakdown').mockResolvedValueOnce([]);

      await financialService.getDailyBreakdown('2026-06-01', '2026-06-02', 'BR1');
      expect(spyFallback).toHaveBeenCalled();
    });

    it('throws error in production when RPC fails', async () => {
      vi.spyOn(financialService, 'isDev').mockReturnValue(false);
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Database Connection Error'));

      await expect(
        financialService.getDailyBreakdown('2026-06-01', '2026-06-02', 'BR1')
      ).rejects.toThrow('Database Connection Error');
    });
  });

  describe('getTopProducts', () => {
    it('uses the get_top_products_financial RPC', async () => {
      const mockData = [{ id: 'p1', product_id: 'p1', product_name: 'Product A', abc_class: 'A' as const, quantity_sold: 10, revenue: 100, cogs: 50, gross_profit: 50, margin_percent: 50 }];
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

    it('falls back to client-side calculations in dev when RPC fails', async () => {
      vi.spyOn(financialService, 'isDev').mockReturnValue(true);
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('RPC failed'));
      const spyFallback = vi.spyOn(financialService, 'fallbackTopProducts').mockResolvedValueOnce([]);

      await financialService.getTopProducts('this_month', 'BR1', 5);
      expect(spyFallback).toHaveBeenCalled();
    });

    it('throws error in production when RPC fails', async () => {
      vi.spyOn(financialService, 'isDev').mockReturnValue(false);
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Database Connection Error'));

      await expect(
        financialService.getTopProducts('this_month', 'BR1', 5)
      ).rejects.toThrow('Database Connection Error');
    });
  });

  describe('getCategoryBreakdownByDates', () => {
    it('uses the get_category_financial_breakdown RPC', async () => {
      const mockData = [{ category: 'GENERAL', revenue: 100, cogs: 50, profit: 50 }];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null });

      const result = await financialService.getCategoryBreakdownByDates('2026-06-01', '2026-06-02', 'BR1');
      expect(supabase.rpc).toHaveBeenCalledWith('get_category_financial_breakdown', {
        p_branch_id: 'BR1',
        p_date_from: '2026-06-01',
        p_date_to: '2026-06-02',
      });
      expect(result).toEqual(mockData);
    });

    it('falls back to client-side calculations in dev when RPC fails', async () => {
      vi.spyOn(financialService, 'isDev').mockReturnValue(true);
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('RPC failed'));
      const spyFallback = vi.spyOn(financialService, 'fallbackCategoryBreakdown').mockResolvedValueOnce([]);

      await financialService.getCategoryBreakdownByDates('2026-06-01', '2026-06-02', 'BR1');
      expect(spyFallback).toHaveBeenCalled();
    });

    it('throws error in production when RPC fails', async () => {
      vi.spyOn(financialService, 'isDev').mockReturnValue(false);
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Database Connection Error'));

      await expect(
        financialService.getCategoryBreakdownByDates('2026-06-01', '2026-06-02', 'BR1')
      ).rejects.toThrow('Database Connection Error');
    });
  });
});
