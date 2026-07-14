import React, { useCallback, useMemo } from 'react';
import { useFinancialData } from '../../hooks/financials/useFinancialData';
import { DashboardService } from '../../services/dashboard/dashboardService';
import { dateRangeService, type FinancialPeriod } from '../../services/financials/dateRangeService';
import type { Drug, Sale, StockBatch } from '../../types';
import { CurrencyValue } from '../common/InsightTooltip';

interface AnalyticsProps {
  sales: Sale[];
  inventory: Drug[];
  batches: StockBatch[];
  totalExpenses: number;
  language?: string;
  branchId?: string;
  timeRange: string; // Added to scope financial queries
}

const translations = {
  AR: {
    primaryMetric: 'المؤشر الأساسي',
    netRevenue: 'صافي الإيرادات',
    avgOrder: 'متوسط الطلب (AOV)',
    returnRate: 'معدل المرتجعات',
    assetInventory: 'جرد الأصول',
    inventoryValue: 'القيمة',
    turnoverRatioLabel: 'نسبة الدوران = التكلفة / الأصول',
    daysStockLabel: 'أيام المخزون = الأصول / (التكلفة / 30)',
    remVelocity: 'سرعة البيع المتبقية',
    cogsTitle: 'تكلفة البضائع (COGS)=',
    cogsFormula: 'COGS = مجموع (الكمية × التكلفة)',
    financialResult: 'النتيجة المالية',
    grossProfit: 'إجمالي الربح',
    profitFormula: 'الربح = صافي الإيرادات - التكلفة',
    marginFormula: 'الهامش = (الربح / الإيرادات) × 100',
    netOperatingProfit: 'صافي الربح التشغيلي',
    revenueAtRisk: 'إيرادات معرضة للخطر',
    criticalStatus: 'حالة حرجة: المخزون ≤ 3',
    criticalLevel: 'المستوى الحرج',
    totalLowStock: 'إجمالي النواقص',
    items: 'أصناف',
    impacts: 'تؤثر على',
    fastMovingItems: 'أصناف سريعة',
    healthy: 'جيد',
    lowMargin: 'هامش منخفض',
    days: 'يوم',
    revenueCalculation: 'النتيجة = مجموع (المبيعات - المرتجعات)',
    expensesTitle: 'المصروفات التشغيلية',
    expensesValueLabel: 'إجمالي المصروفات',
    expensesFormula: 'المصروفات = مجموع المصاريف التشغيلية المسجلة للفرع',
    expensesDetailLabel: 'المعاملات المسجلة',
  },
  EN: {
    primaryMetric: 'Primary Metric',
    netRevenue: 'Net Revenue',
    avgOrder: 'Avg. Order (AOV)',
    returnRate: 'Return Rate',
    assetInventory: 'Asset Inventory',
    inventoryValue: 'Value',
    turnoverRatioLabel: 'Turnover Ratio = COGS / Assets',
    daysStockLabel: 'Days Stock = Assets / (COGS / 30)',
    remVelocity: 'Rem. Velocity',
    cogsTitle: 'Cost of Goods (COGS)=',
    cogsFormula: 'COGS = Σ (Sold Qty × Unit Cost)',
    financialResult: 'Financial Result',
    grossProfit: 'Gross Profit',
    profitFormula: 'Profit = Net Revenue - COGS',
    marginFormula: 'Margin = (Profit / Revenue) × 100',
    netOperatingProfit: 'Net Operating Profit',
    revenueAtRisk: 'Revenue at Risk',
    criticalStatus: 'Critical Status: Stock ≤ 3',
    criticalLevel: 'Critical Level',
    totalLowStock: 'Total Low Stock',
    items: 'Items',
    impacts: 'Impacts',
    fastMovingItems: 'Fast Items',
    excellent: 'Excellent',
    healthy: 'Healthy',
    lowMargin: 'Low Margin',
    days: 'Days',
    revenueCalculation: 'Result = Σ (Sold - Returned)',
    expensesTitle: 'Operating Expenses',
    expensesValueLabel: 'Total Expenses',
    expensesFormula: 'Expenses = Sum of all logged branch expenses',
    expensesDetailLabel: 'Recorded Transactions',
  },
};

export const useDashboardAnalytics = ({
  sales,
  inventory,
  batches,
  totalExpenses: _totalExpenses,
  language = 'EN',
  branchId,
  timeRange,
}: AnalyticsProps) => {
  const t = useCallback(
    (key: keyof typeof translations.EN) => {
      const lang = (language?.toUpperCase() === 'AR' ? 'AR' : 'EN') as 'AR' | 'EN';
      return translations[lang][key];
    },
    [language]
  );

  // Map timeRange string to FinancialPeriod
  const period = useMemo<FinancialPeriod>(() => {
    switch (timeRange) {
      case '7':
        return 'last_7_days';
      case '30':
        return 'last_30_days';
      case '90':
        return 'last_3_months';
      default:
        return 'this_year';
    }
  }, [timeRange]);

  // Fetch financial data from RPC + snapshots via unified hook
  const {
    summary: finSummary,
    daily: finDaily,
    topProducts: finTopProducts,
    loading: finLoading,
    error: finError,
  } = useFinancialData(period);

  // Extract metrics from the summary
  const totalRevenue = finSummary?.net_revenue ?? 0;
  const totalReturns = finSummary?.return_revenue ?? 0;
  const totalCogs = finSummary?.net_cogs ?? 0;
  const grossProfit = finSummary?.gross_profit ?? 0;
  const netProfit = finSummary?.net_profit ?? 0;
  const totalTransactions = finSummary?.total_transactions ?? 0;
  const expensesTotal = finSummary?.expenses_total ?? 0;

  const profitMarginPercent = useMemo(() => {
    return totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  }, [totalRevenue, grossProfit]);

  const averageOrderValue = useMemo(() => {
    return totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  }, [totalRevenue, totalTransactions]);

  const returnRate = useMemo(() => {
    const grossRevenue = totalRevenue + totalReturns;
    return grossRevenue > 0 ? (totalReturns / grossRevenue) * 100 : 0;
  }, [totalReturns, totalRevenue]);

  // Local inventory valuation
  const inventoryValuation = useMemo(
    () => DashboardService.calculateInventoryValuation(batches, branchId),
    [batches, branchId]
  );

  // Efficiency metrics
  const { turnoverRatio: inventoryTurnoverRatio, daysOfInventory } = useMemo(
    () => DashboardService.calculateEfficiency(totalCogs, inventoryValuation),
    [totalCogs, inventoryValuation]
  );

  // Local movement analysis (uses filtered sales for local UI highlights)
  const movingItemsAnalysis = useMemo(
    () => DashboardService.analyzeMovement(sales, inventory, batches, branchId),
    [sales, inventory, batches, branchId]
  );

  // Health Grades
  const profitGrade = useMemo(() => {
    if (profitMarginPercent > 35) return { label: t('excellent'), color: 'emerald' as const };
    if (profitMarginPercent > 20) return { label: t('healthy'), color: 'primary' as const };
    return { label: t('lowMargin'), color: 'amber' as const };
  }, [profitMarginPercent, t]);

  // Top Selling products mapped to UI-friendly structure
  const topSelling = useMemo(() => {
    return finTopProducts.map((p) => ({
      id: p.product_id,
      name: p.product_name,
      dosageForm: p.dosage_form,
      qty: p.quantity_sold,
      revenue: p.revenue,
    }));
  }, [finTopProducts]);

  const topSellingByQty = useMemo(() => {
    return [...finTopProducts]
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .map((p) => ({
        id: p.product_id,
        name: p.product_name,
        dosageForm: p.dosage_form,
        qty: p.quantity_sold,
        revenue: p.revenue,
      }));
  }, [finTopProducts]);

  // Expiring items
  const expiringItems = useMemo(
    () => DashboardService.getExpiringSoon(inventory, batches, branchId || 'all'),
    [inventory, batches, branchId]
  );

  // Daily sales trends for charting
  const salesTrends = useMemo(() => {
    if (!finDaily) return [];

    type DailyData = { day: string; net?: number; sales?: number };
    let aggregated: { day: string; sales: number }[] = [];

    if (timeRange === '7' || timeRange === '30') {
      // Get the range from dateRangeService to maintain consistency with app-wide verified time
      const range = dateRangeService.getDateRange(period);
      const days = dateRangeService.getDaysInRange(range.start, range.end);
      const dayMap = new Map<string, number>(days.map((day) => [day, 0]));

      // Populate with actual data (convert UTC timestamps to local dates)
      finDaily.forEach((d: unknown) => {
        const data = d as DailyData;
        const dayKey = dateRangeService.toLocalDateString(data.day);
        if (dayMap.has(dayKey)) {
          dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + (data.net || 0));
        }
      });

      aggregated = Array.from(dayMap.entries()).map(([day, sales]) => ({
        day,
        sales,
      }));
    } else {
      let rawAggregated: DailyData[] = finDaily as DailyData[];
      if (period === 'this_year') {
        const monthlyMap = new Map<string, { day: string; sales: number }>();
        finDaily.forEach((d: unknown) => {
          const data = d as DailyData;
          const monthKey = data.day.substring(0, 7); // YYYY-MM
          const existing = monthlyMap.get(monthKey) || { day: `${monthKey}-01`, sales: 0 };
          existing.sales += data.net || 0;
          monthlyMap.set(monthKey, existing);
        });
        rawAggregated = Array.from(monthlyMap.values());
      } else if (period === 'last_3_months') {
        const weeklyMap = new Map<string, { day: string; sales: number }>();
        finDaily.forEach((d: unknown) => {
          const data = d as DailyData;
          const dateObj = new Date(data.day);
          const day = dateObj.getDate();
          const weekNum = Math.ceil(day / 7);
          const monthKey = data.day.substring(0, 7); // YYYY-MM
          const weekKey = `${monthKey}-W${weekNum}`;

          const existing = weeklyMap.get(weekKey) || { day: weekKey, sales: 0 };
          existing.sales += data.net || 0;
          weeklyMap.set(weekKey, existing);
        });
        rawAggregated = Array.from(weeklyMap.values());
      }

      aggregated = rawAggregated.map((d) => ({
        day: d.day,
        sales: d.sales !== undefined ? d.sales : d.net || 0,
      }));
    }

    return aggregated;
  }, [finDaily, period, timeRange]);

  // --- TOOLTIP CONFIGURATIONS ---

  const revenueTooltip = useMemo(
    () => ({
      title: t('primaryMetric'),
      value: totalRevenue,
      valueLabel: t('netRevenue'),
      icon: 'payments',
      iconColorClass: 'text-emerald-400',
      calculations: [
        {
          label: t('revenueCalculation'),
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(CurrencyValue, { val: totalRevenue + totalReturns, language }),
            React.createElement('span', { className: 'opacity-50' }, '-'),
            React.createElement(CurrencyValue, { val: totalReturns, language }),
            React.createElement('span', { className: 'opacity-50' }, '='),
            React.createElement(CurrencyValue, { val: totalRevenue, language })
          ),
        },
      ],
      details: [
        { icon: 'shopping_cart', label: t('avgOrder'), value: averageOrderValue },
        {
          icon: 'undo',
          label: t('returnRate'),
          value: `${returnRate.toFixed(1)}%`,
          colorClass: 'text-rose-300',
        },
      ],
    }),
    [totalRevenue, totalReturns, averageOrderValue, returnRate, language, t]
  );

  const inventoryTooltip = useMemo(
    () => ({
      title: t('assetInventory'),
      value: inventoryValuation,
      valueLabel: t('inventoryValue'),
      icon: 'inventory_2',
      iconColorClass: 'text-primary-400',
      calculations: [
        {
          label: t('turnoverRatioLabel'),
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(CurrencyValue, { val: totalCogs, language }),
            React.createElement('span', { className: 'opacity-50' }, '/'),
            React.createElement(CurrencyValue, { val: inventoryValuation, language }),
            React.createElement('span', { className: 'opacity-50' }, '='),
            React.createElement(
              'span',
              { className: 'text-amber-300' },
              `${inventoryTurnoverRatio.toFixed(2)}x`
            )
          ),
        },
        {
          label: t('daysStockLabel'),
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement('span', null, `${daysOfInventory.toFixed(0)} ${t('days')}`),
            React.createElement('span', { className: 'opacity-50 text-[10px]' }, t('remVelocity'))
          ),
        },
      ],
      details: [
        {
          icon: 'local_shipping',
          label: t('cogsTitle'),
          value: totalCogs,
          subLabel: t('cogsFormula'),
        },
      ],
    }),
    [inventoryValuation, totalCogs, inventoryTurnoverRatio, daysOfInventory, language, t]
  );

  const profitTooltip = useMemo(
    () => ({
      title: t('financialResult'),
      value: grossProfit,
      valueLabel: t('grossProfit'),
      icon: 'account_balance',
      iconColorClass: 'text-emerald-400',
      calculations: [
        {
          label: t('profitFormula'),
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(CurrencyValue, { val: totalRevenue, language }),
            React.createElement('span', { className: 'opacity-50' }, '-'),
            React.createElement(CurrencyValue, { val: totalCogs, language }),
            React.createElement('span', { className: 'opacity-50' }, '='),
            React.createElement(CurrencyValue, { val: grossProfit, language })
          ),
        },
        {
          label: t('marginFormula'),
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'span',
              { className: `text-${profitGrade.color}-400` },
              `${profitMarginPercent.toFixed(1)}%`
            ),
            React.createElement(
              'span',
              {
                className: `text-${profitGrade.color}-400/50 px-1 rounded-sm border border-current scale-75 uppercase`,
              },
              profitGrade.label
            )
          ),
        },
      ],
      details: [
        {
          icon: 'monitoring',
          label: t('netOperatingProfit'),
          value: netProfit,
          colorClass: 'text-emerald-300',
        },
      ],
    }),
    [grossProfit, totalRevenue, totalCogs, profitGrade, profitMarginPercent, netProfit, language, t]
  );

  const expensesTooltip = useMemo(
    () => ({
      title: t('expensesTitle'),
      value: expensesTotal,
      valueLabel: t('expensesValueLabel'),
      icon: 'receipt_long',
      iconColorClass: 'text-rose-400',
      calculations: [
        {
          label: t('expensesFormula'),
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(CurrencyValue, { val: expensesTotal, language })
          ),
        },
      ],
      details: [
        {
          icon: 'payments',
          label: t('expensesTitle'),
          value: expensesTotal,
        },
      ],
    }),
    [expensesTotal, language, t]
  );

  const lowStockTooltip = useMemo(
    () => ({
      title: t('revenueAtRisk'),
      value: movingItemsAnalysis.revenueAtRisk,
      icon: 'warning',
      iconColorClass: 'text-rose-500',
      calculations: [
        {
          label: t('criticalStatus'),
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'span',
              null,
              `${movingItemsAnalysis.critical.length} ${t('items')}`
            ),
            React.createElement('span', { className: 'opacity-50' }, t('impacts')),
            React.createElement(
              'span',
              { className: 'text-amber-300' },
              `${movingItemsAnalysis.fastMoving.length} ${t('fastMovingItems')}`
            )
          ),
        },
      ],
      details: [
        {
          icon: 'warning',
          label: t('criticalLevel'),
          value: movingItemsAnalysis.critical.length,
          colorClass: 'text-rose-300',
          isCurrency: false,
        },
        {
          icon: 'trending_down',
          label: t('totalLowStock'),
          value: movingItemsAnalysis.lowStockCount,
          isCurrency: false,
        },
      ],
    }),
    [movingItemsAnalysis, t]
  );

  return {
    totalRevenue,
    totalReturns,
    totalCogs,
    inventoryValuation,
    inventoryTurnoverRatio,
    daysOfInventory,
    grossProfit,
    netProfit,
    profitMarginPercent,
    averageOrderValue,
    returnRate,
    movingItemsAnalysis,
    profitGrade,
    revenueTooltip,
    inventoryTooltip,
    expensesTooltip,
    profitTooltip,
    lowStockTooltip,
    topSelling,
    topSellingByQty,
    expiringItems,
    salesTrends,
    loading: finLoading,
    error: finError,
    expensesTotal,
  };
};
