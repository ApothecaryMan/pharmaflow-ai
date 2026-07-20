import { financialRepository } from './repositories/financialRepository';
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

const EMPTY_SUMMARY: FinancialSummary = {
  gross_revenue: 0,
  return_revenue: 0,
  net_revenue: 0,
  gross_cogs: 0,
  return_cogs: 0,
  net_cogs: 0,
  gross_profit: 0,
  expenses_total: 0,
  net_profit: 0,
  total_transactions: 0,
  total_units_sold: 0,
  total_returns_count: 0,
};

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
      const s = await financialRepository.computeFinancialSummary(
        branchId || null, start, end
      );
      return {
        gross_revenue: Number(s?.gross_revenue ?? 0),
        return_revenue: Number(s?.total_refunds ?? 0),
        net_revenue: Number(s?.net_revenue ?? 0),
        gross_cogs: Number(s?.gross_cogs ?? 0),
        return_cogs: Number(s?.return_cogs ?? 0),
        net_cogs: Number(s?.net_cogs ?? 0),
        gross_profit: Number(s?.gross_profit ?? 0),
        expenses_total: Number(s?.expenses_total ?? 0),
        net_profit: Number(s?.net_profit ?? 0),
        total_transactions: Number(s?.total_transactions ?? 0),
        total_units_sold: Number(s?.total_units_sold ?? 0),
        total_returns_count: Number(s?.total_returns_count ?? 0),
      } as FinancialSummary;
    } catch (err) {
      console.error('RPC compute_financial_summary_with_snapshots error:', err);
      return EMPTY_SUMMARY;
    }
  },

  // Keep backward-compatible export for callers using supabase directly
  // All RPC calls now go through financialRepository

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
      const data = await financialRepository.getDailyBreakdown(branchId || null, dateFrom, dateTo);
      return (data || []) as DailyFinancialData[];
    } catch (err) {
      console.error('RPC get_daily_financial_breakdown error:', err);
      return [];
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
      const data = await financialRepository.getTopProducts(
        branchId || null, range.start, range.end, limit
      );
      return (data || []) as ProductFinancialItem[];
    } catch (err) {
      console.error('RPC get_top_products_financial error:', err);
      return [];
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
      const data = await financialRepository.getCategoryBreakdown(
        branchId || null, start, end
      );
      return (data || []) as CategoryFinancialReport[];
    } catch (err) {
      console.error('RPC get_category_financial_breakdown error:', err);
      return [];
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

};
