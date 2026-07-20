import { supabase } from '../../../lib/supabase';
import type { DailyFinancialData, ProductFinancialItem, CategoryFinancialReport } from '../../../types/intelligence';

interface FinancialSummaryRpcRow {
  gross_revenue: number;
  total_refunds: number;
  net_revenue: number;
  gross_cogs: number;
  return_cogs: number;
  net_cogs: number;
  gross_profit: number;
  expenses_total: number;
  net_profit: number;
  total_transactions: number;
  total_units_sold: number;
  total_returns_count: number;
}

export const financialRepository = {
  async computeFinancialSummary(branchId: string | null, dateFrom: string, dateTo: string): Promise<FinancialSummaryRpcRow | null> {
    const { data, error } = await supabase.rpc('compute_financial_summary_with_snapshots', {
      p_branch_id: branchId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
    });

    if (error) throw error;
    return data as FinancialSummaryRpcRow | null;
  },

  async getDailyBreakdown(branchId: string | null, dateFrom: string, dateTo: string): Promise<DailyFinancialData[]> {
    const { data, error } = await supabase.rpc('get_daily_financial_breakdown', {
      p_branch_id: branchId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
    });

    if (error) throw error;
    return (data || []) as DailyFinancialData[];
  },

  async getTopProducts(branchId: string | null, dateFrom: string, dateTo: string, limit: number): Promise<ProductFinancialItem[]> {
    const { data, error } = await supabase.rpc('get_top_products_financial', {
      p_branch_id: branchId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_limit: limit,
    });

    if (error) throw error;
    return (data || []) as ProductFinancialItem[];
  },

  async getCategoryBreakdown(branchId: string | null, dateFrom: string, dateTo: string): Promise<CategoryFinancialReport[]> {
    const { data, error } = await supabase.rpc('get_category_financial_breakdown', {
      p_branch_id: branchId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
    });

    if (error) throw error;
    return (data || []) as CategoryFinancialReport[];
  },
};
