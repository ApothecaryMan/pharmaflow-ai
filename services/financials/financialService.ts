import { supabase } from '../../lib/supabase';
import type { Sale } from '../../types';
import type {
  CategoryFinancialReport,
  DailyFinancialData,
  FinancialKPIs,
  FinancialReport,
  FinancialReportSummary,
  ProductFinancialItem,
} from '../../types/intelligence';
import { money } from '../../utils/money';
import { dateRangeService, type FinancialPeriod } from './dateRangeService';

export interface FinancialSummary extends FinancialReportSummary {
  expenses_total: number;
  net_profit: number;
  total_transactions: number;
  total_units_sold: number;
  total_returns_count: number;
}

function calculateChange(
  current: number,
  previous: number
): { percent: number; direction: 'up' | 'down' | 'unchanged' } {
  if (previous === 0) {
    return { percent: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'unchanged' };
  }
  const diff = current - previous;
  const percent = (diff / previous) * 100;
  const direction = percent > 0 ? 'up' : percent < 0 ? 'down' : 'unchanged';
  return { percent: Math.abs(Math.round(percent * 10) / 10), direction };
}

export const financialService = {
  /**
   * Calculates Total Revenue and Total Returns using precision math.
   * Duplicated from DashboardService for localized/isolated computations.
   */
  calculateRevenueAndReturns(sales: Sale[]): { totalRevenue: number; totalReturns: number } {
    let revenueCents = 0;
    let returnsCents = 0;

    sales.forEach((sale) => {
      let saleItemRevenueCents = 0;

      sale.items?.forEach((item) => {
        const lineKey = item.isUnit ? `${item.id}_unit` : `${item.id}_pack`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;

        const actualSoldQty = item.quantity - returnedQty;
        const itemPrice = item.publicPrice || 0;
        const itemDiscountPct = item.discount || 0;

        const factorInt = 100 - itemDiscountPct;
        const netItemPrice = money.multiply(itemPrice, factorInt, 2);

        if (actualSoldQty > 0) {
          const lineRevenue = money.multiply(netItemPrice, actualSoldQty, 0);
          saleItemRevenueCents += money.toSmallestUnit(lineRevenue);
        }

        if (returnedQty > 0) {
          const lineReturn = money.multiply(netItemPrice, returnedQty, 0);
          returnsCents += money.toSmallestUnit(lineReturn);
        }
      });

      if (sale.globalDiscount && sale.globalDiscount > 0) {
        const globalDiscountCents = money.toSmallestUnit(sale.globalDiscount);
        saleItemRevenueCents = Math.max(0, saleItemRevenueCents - globalDiscountCents);
      }

      revenueCents += saleItemRevenueCents;
    });

    return {
      totalRevenue: money.fromSmallestUnit(revenueCents),
      totalReturns: money.fromSmallestUnit(returnsCents),
    };
  },

  /**
   * Gets Financial Summary using snapshots + live hybrid engine.
   */
  async getFinancialSummary(period: FinancialPeriod, branchId?: string): Promise<FinancialSummary> {
    const range = dateRangeService.getDateRange(period);
    return this.getFinancialSummaryByDates(range.start, range.end, branchId);
  },

  /**
   * Gets Financial Summary for a custom date range.
   */
  async getFinancialSummaryByDates(
    start: string,
    end: string,
    branchId?: string
  ): Promise<FinancialSummary> {
    try {
      const { data, error } = await supabase.rpc('compute_financial_summary_with_snapshots', {
        p_branch_id: branchId || null,
        p_date_from: start,
        p_date_to: end,
      });

      if (error) {
        // Log error and trigger fallback
        console.warn(
          'RPC compute_financial_summary_with_snapshots failed, running client fallback:',
          error
        );
        return this.fallbackFinancialSummary(start, end, branchId);
      }

      const s = data as any;
      return {
        gross_revenue: Number(s.gross_revenue || 0),
        return_revenue: Number(s.total_refunds || 0),
        net_revenue: Number(s.net_revenue || 0),
        gross_cogs: Number(s.gross_cogs || 0),
        return_cogs: Number(s.return_cogs || 0),
        net_cogs: Number(s.net_cogs || 0),
        gross_profit: Number(s.gross_profit || 0),
        expenses_total: Number(s.expenses_total || 0),
        net_profit: Number(s.net_profit || 0),
        total_transactions: Number(s.total_transactions || 0),
        total_units_sold: Number(s.total_units_sold || 0),
        total_returns_count: Number(s.total_returns_count || 0),
      } as FinancialSummary;
    } catch (err) {
      console.warn(
        'RPC compute_financial_summary_with_snapshots error, running client fallback:',
        err
      );
      return this.fallbackFinancialSummary(start, end, branchId);
    }
  },

  /**
   * Gets Financial KPIs comparing current period with previous.
   */
  async getFinancialKPIs(period: FinancialPeriod, branchId?: string): Promise<FinancialKPIs> {
    const currentRange = dateRangeService.getDateRange(period);
    const prevRange = dateRangeService.getPreviousPeriodRange(period);

    const [currentSummary, prevSummary] = await Promise.all([
      this.getFinancialSummaryByDates(currentRange.start, currentRange.end, branchId),
      this.getFinancialSummaryByDates(prevRange.start, prevRange.end, branchId),
    ]);

    const currentMargin =
      currentSummary.net_revenue > 0
        ? (currentSummary.gross_profit / currentSummary.net_revenue) * 100
        : 0;
    const prevMargin =
      prevSummary.net_revenue > 0 ? (prevSummary.gross_profit / prevSummary.net_revenue) * 100 : 0;

    const revenueChange = calculateChange(currentSummary.net_revenue, prevSummary.net_revenue);
    const profitChange = calculateChange(currentSummary.gross_profit, prevSummary.gross_profit);
    const unitsChange = calculateChange(
      currentSummary.total_units_sold,
      prevSummary.total_units_sold
    );
    const marginDiff = currentMargin - prevMargin;

    return {
      revenue: {
        value: currentSummary.net_revenue,
        change_percent: revenueChange.percent,
        change_direction: revenueChange.direction,
      },
      gross_profit: {
        value: currentSummary.gross_profit,
        change_percent: profitChange.percent,
        change_direction: profitChange.direction,
      },
      margin_percent: {
        value: currentMargin,
        change_points: Number(marginDiff.toFixed(1)),
        change_direction: marginDiff > 0 ? 'up' : marginDiff < 0 ? 'down' : 'unchanged',
      },
      units_sold: {
        value: currentSummary.total_units_sold,
        change_percent: unitsChange.percent,
        change_direction: unitsChange.direction,
      },
    };
  },

  /**
   * Gets Daily breakdown of revenues and refunds.
   */
  async getDailyBreakdown(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<DailyFinancialData[]> {
    try {
      const { data, error } = await supabase.rpc('get_daily_financial_breakdown', {
        p_branch_id: branchId || null,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (error) {
        console.warn('RPC get_daily_financial_breakdown failed, running client fallback:', error);
        return this.fallbackDailyBreakdown(dateFrom, dateTo, branchId);
      }

      return (data || []) as DailyFinancialData[];
    } catch (err) {
      console.warn('RPC get_daily_financial_breakdown error, running client fallback:', err);
      return this.fallbackDailyBreakdown(dateFrom, dateTo, branchId);
    }
  },

  /**
   * Gets Top Products by revenue and profits.
   */
  async getTopProducts(
    period: FinancialPeriod,
    branchId?: string,
    limit: number = 10
  ): Promise<ProductFinancialItem[]> {
    const range = dateRangeService.getDateRange(period);
    try {
      const { data, error } = await supabase.rpc('get_top_products_financial', {
        p_branch_id: branchId || null,
        p_date_from: range.start,
        p_date_to: range.end,
        p_limit: limit,
      });

      if (error) {
        console.warn('RPC get_top_products_financial failed, running client fallback:', error);
        return this.fallbackTopProducts(range.start, range.end, branchId, limit);
      }

      return (data || []) as ProductFinancialItem[];
    } catch (err) {
      console.warn('RPC get_top_products_financial error, running client fallback:', err);
      return this.fallbackTopProducts(range.start, range.end, branchId, limit);
    }
  },

  /**
   * Gets Category breakdown.
   */
  async getCategoryBreakdown(
    period: FinancialPeriod,
    branchId?: string
  ): Promise<CategoryFinancialReport[]> {
    const range = dateRangeService.getDateRange(period);
    return this.getCategoryBreakdownByDates(range.start, range.end, branchId);
  },

  /**
   * Gets Category breakdown for custom dates.
   */
  async getCategoryBreakdownByDates(
    start: string,
    end: string,
    branchId?: string
  ): Promise<CategoryFinancialReport[]> {
    try {
      const { data, error } = await supabase.rpc('get_category_financial_breakdown', {
        p_branch_id: branchId || null,
        p_date_from: start,
        p_date_to: end,
      });

      if (error) {
        console.warn(
          'RPC get_category_financial_breakdown failed, running client fallback:',
          error
        );
        return this.fallbackCategoryBreakdown(start, end, branchId);
      }

      return (data || []) as CategoryFinancialReport[];
    } catch (err) {
      console.warn('RPC get_category_financial_breakdown error, running client fallback:', err);
      return this.fallbackCategoryBreakdown(start, end, branchId);
    }
  },

  /**
   * Generates full Profit and Loss Report.
   */
  async getFinancialReport(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<FinancialReport> {
    const [summary, daily, categories] = await Promise.all([
      this.getFinancialSummaryByDates(dateFrom, dateTo, branchId),
      this.getDailyBreakdown(dateFrom, dateTo, branchId),
      this.getCategoryBreakdownByDates(dateFrom, dateTo, branchId),
    ]);

    return {
      summary,
      daily,
      categories,
      generated_at: new Date().toISOString(),
    };
  },

  // ─────────────────────────────────────────────
  //  Client-side Fallbacks (Contingency)
  // ─────────────────────────────────────────────

  async fallbackFinancialSummary(
    start: string,
    end: string,
    branchId?: string
  ): Promise<FinancialSummary> {
    // 1. Fetch sales
    let salesQuery = supabase
      .from('sales')
      .select(
        'id, total, status, date, global_discount, items:sale_items(id, quantity, unit_price, cost_price, is_unit)'
      )
      .eq('status', 'completed')
      .gte('date', start)
      .lte('date', end);
    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId);

    // 2. Fetch returns
    let returnsQuery = supabase
      .from('returns')
      .select(
        'id, total_refund, date, items:return_items(drug_id, quantity_returned, refund_amount, sale_item_id)'
      )
      .gte('date', start)
      .lte('date', end);
    if (branchId) returnsQuery = returnsQuery.eq('branch_id', branchId);

    // 3. Fetch expenses
    let expensesQuery = supabase
      .from('expenses')
      .select('amount')
      .gte('recorded_at', start)
      .lte('recorded_at', end);
    if (branchId) expensesQuery = expensesQuery.eq('branch_id', branchId);

    const [salesRes, returnsRes, expensesRes] = await Promise.all([
      salesQuery,
      returnsQuery,
      expensesQuery,
    ]);

    const sales = salesRes.data || [];
    const returns = returnsRes.data || [];
    const expenses = expensesRes.data || [];

    // Calculate metrics
    let gross_revenue = 0;
    let gross_cogs = 0;
    let total_units_sold = 0;

    sales.forEach((s: any) => {
      gross_revenue = money.add(gross_revenue, s.total || 0);
      s.items?.forEach((item: any) => {
        total_units_sold += item.quantity || 0;
        const itemCost = money.multiply(item.cost_price || 0, item.quantity || 0, 0);
        gross_cogs = money.add(gross_cogs, itemCost);
      });
    });

    let total_refunds = 0;
    let return_cogs = 0;

    returns.forEach((r: any) => {
      total_refunds = money.add(total_refunds, r.total_refund || 0);
      r.items?.forEach((item: any) => {
        // Fallback return cogs calculation: locate original sale item if possible, or assume 70% of refund
        const refundAmt = item.refund_amount || 0;
        const estCost = money.multiply(refundAmt, 70, 2);
        return_cogs = money.add(return_cogs, estCost);
      });
    });

    const net_revenue = money.subtract(gross_revenue, total_refunds);
    const net_cogs = money.subtract(gross_cogs, return_cogs);
    const gross_profit = money.subtract(net_revenue, net_cogs);

    let expenses_total = 0;
    expenses.forEach((e: any) => {
      expenses_total = money.add(expenses_total, e.amount || 0);
    });

    const net_profit = money.subtract(gross_profit, expenses_total);

    return {
      gross_revenue,
      return_revenue: total_refunds,
      net_revenue,
      gross_cogs,
      return_cogs,
      net_cogs,
      gross_profit,
      expenses_total,
      net_profit,
      total_transactions: sales.length,
      total_units_sold,
      total_returns_count: returns.length,
    };
  },

  async fallbackDailyBreakdown(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<DailyFinancialData[]> {
    let salesQuery = supabase
      .from('sales')
      .select('total, date')
      .eq('status', 'completed')
      .gte('date', dateFrom)
      .lte('date', dateTo);
    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId);

    let returnsQuery = supabase
      .from('returns')
      .select('total_refund, date')
      .gte('date', dateFrom)
      .lte('date', dateTo);
    if (branchId) returnsQuery = returnsQuery.eq('branch_id', branchId);

    const [salesRes, returnsRes] = await Promise.all([salesQuery, returnsQuery]);

    const dailyMap = new Map<string, DailyFinancialData>();

    salesRes.data?.forEach((s: any) => {
      const day = dateRangeService.toLocalDateString(s.date);
      const existing = dailyMap.get(day) || {
        day,
        revenue: 0,
        refund: 0,
        net: 0,
        sale_count: 0,
        return_count: 0,
      };
      existing.revenue = money.add(existing.revenue, s.total || 0);
      existing.sale_count += 1;
      existing.net = money.subtract(existing.revenue, existing.refund);
      dailyMap.set(day, existing);
    });

    returnsRes.data?.forEach((r: any) => {
      const day = dateRangeService.toLocalDateString(r.date);
      const existing = dailyMap.get(day) || {
        day,
        revenue: 0,
        refund: 0,
        net: 0,
        sale_count: 0,
        return_count: 0,
      };
      existing.refund = money.add(existing.refund, r.total_refund || 0);
      existing.return_count += 1;
      existing.net = money.subtract(existing.revenue, existing.refund);
      dailyMap.set(day, existing);
    });

    return Array.from(dailyMap.values()).sort((a, b) => a.day.localeCompare(b.day));
  },

  async fallbackTopProducts(
    start: string,
    end: string,
    branchId?: string,
    limit: number = 10
  ): Promise<ProductFinancialItem[]> {
    let salesQuery = supabase
      .from('sales')
      .select(
        'id, items:sale_items(drug_id, quantity, unit_price, cost_price), drugs:sale_items(drugs(name, dosage_form))'
      )
      .eq('status', 'completed')
      .gte('date', start)
      .lte('date', end);
    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId);

    const { data: sales } = await salesQuery;
    const prodMap = new Map<
      string,
      { id: string; name: string; dosageForm: string; qty: number; rev: number; cost: number }
    >();

    sales?.forEach((s: any) => {
      s.items?.forEach((item: any) => {
        const drugId = item.drug_id;
        const existing = prodMap.get(drugId) || {
          id: drugId,
          name: 'Unknown Product',
          dosageForm: '',
          qty: 0,
          rev: 0,
          cost: 0,
        };

        existing.qty += item.quantity || 0;
        existing.rev = money.add(
          existing.rev,
          money.multiply(item.unit_price || 0, item.quantity || 0, 0)
        );
        existing.cost = money.add(
          existing.cost,
          money.multiply(item.cost_price || 0, item.quantity || 0, 0)
        );
        prodMap.set(drugId, existing);
      });
    });

    const items: ProductFinancialItem[] = Array.from(prodMap.values()).map((p) => {
      const gross_profit = money.subtract(p.rev, p.cost);
      return {
        id: p.id,
        product_id: p.id,
        product_name: p.name,
        abc_class: 'C' as const,
        quantity_sold: p.qty,
        revenue: p.rev,
        cogs: p.cost,
        gross_profit,
        margin_percent: p.rev > 0 ? Math.round((gross_profit / p.rev) * 100) : 0,
      };
    });

    // Sort by revenue desc
    items.sort((a, b) => b.revenue - a.revenue);

    // Apply Pareto ABC
    const totalRev = items.reduce((sum, item) => sum + item.revenue, 0);
    let cumulative = 0;
    items.forEach((item) => {
      cumulative += item.revenue;
      const ratio = totalRev > 0 ? cumulative / totalRev : 1;
      if (ratio <= 0.8) (item as any).abc_class = 'A';
      else if (ratio <= 0.95) (item as any).abc_class = 'B';
      else (item as any).abc_class = 'C';
    });

    return items.slice(0, limit);
  },

  async fallbackCategoryBreakdown(
    start: string,
    end: string,
    branchId?: string
  ): Promise<CategoryFinancialReport[]> {
    // Simply fetch top products (up to 200) and group them by a dummy general category or look up drugs.
    const products = await this.fallbackTopProducts(start, end, branchId, 200);
    const catMap = new Map<
      string,
      { category: string; revenue: number; cogs: number; profit: number }
    >();

    // For local fallback, put everything in "GENERAL"
    const general = { category: 'GENERAL', revenue: 0, cogs: 0, profit: 0 };
    products.forEach((p) => {
      general.revenue = money.add(general.revenue, p.revenue);
      general.cogs = money.add(general.cogs, p.cogs);
      general.profit = money.add(general.profit, p.gross_profit);
    });

    return [general];
  },
};
