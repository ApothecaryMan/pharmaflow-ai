import React, { useMemo } from 'react';
import type { Drug, Sale, StockBatch } from '../../types';
import { CalculationBlock, CurrencyValue, DetailMetric } from '../common/InsightTooltip';
import { DashboardService } from '../../services/dashboard/DashboardService';

interface AnalyticsProps {
  sales: Sale[];
  inventory: Drug[];
  batches: StockBatch[];
  totalExpenses: number;
  language?: string;
  branchId?: string;
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
    excellent: 'ممتاز',
    healthy: 'جيد',
    lowMargin: 'هامش منخفض',
    days: 'يوم',
    revenueCalculation: 'النتيجة = مجموع (المبيعات - المرتجعات)',
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
  },
};

export const useDashboardAnalytics = ({
  sales,
  inventory,
  batches,
  totalExpenses,
  language = 'EN',
  branchId,
}: AnalyticsProps) => {
  const t = (key: keyof typeof translations.EN) => {
    const lang = (language?.toUpperCase() === 'AR' ? 'AR' : 'EN') as 'AR' | 'EN';
    return translations[lang][key];
  };

  // 1. Core Revenue Calculation
  const { totalRevenue, totalReturns } = useMemo(
    () => DashboardService.calculateRevenueAndReturns(sales),
    [sales]
  );

  // 2. COGS & Inventory Valuation
  const totalCogs = useMemo(
    () => DashboardService.calculateCogs(sales, inventory),
    [sales, inventory]
  );

  const inventoryValuation = useMemo(
    () => DashboardService.calculateInventoryValuation(batches, branchId),
    [batches, branchId]
  );

  // 3. Efficiency Metrics
  const { turnoverRatio: inventoryTurnoverRatio, daysOfInventory } = useMemo(
    () => DashboardService.calculateEfficiency(totalCogs, inventoryValuation),
    [totalCogs, inventoryValuation]
  );

  // 4. Profitability Metrics
  const { grossProfit, netProfit, marginPercent: profitMarginPercent } = useMemo(
    () => DashboardService.calculateProfitability(totalRevenue, totalCogs, totalExpenses),
    [totalRevenue, totalCogs, totalExpenses]
  );

  // 5. Customer Behavior
  const averageOrderValue = useMemo(() => {
    if (sales.length === 0) return 0;
    return totalRevenue / sales.length;
  }, [totalRevenue, sales.length]);

  const returnRate = useMemo(() => {
    const grossRevenue = totalRevenue + totalReturns;
    if (grossRevenue === 0) return 0;
    return (totalReturns / grossRevenue) * 100;
  }, [totalReturns, totalRevenue]);

  // 6. Movement & Impact Analysis
  const movingItemsAnalysis = useMemo(
    () => DashboardService.analyzeMovement(sales, inventory, batches, branchId),
    [sales, inventory, batches, branchId]
  );

  // 7. Health Grades
  const profitGrade = useMemo(() => {
    if (profitMarginPercent > 35) return { label: t('excellent'), color: 'emerald' as const };
    if (profitMarginPercent > 20) return { label: t('healthy'), color: 'primary' as const };
    return { label: t('lowMargin'), color: 'amber' as const };
  }, [profitMarginPercent, language]);

  // 8. Advanced Lists (for UI components)
  const topSelling = useMemo(() => DashboardService.getTopSelling(sales, 20), [sales]);

  const expiringItems = useMemo(
    () => DashboardService.getExpiringSoon(inventory, batches, branchId || 'all'),
    [inventory, batches, branchId]
  );

  const salesTrends = useMemo(() => DashboardService.getSalesTrends(sales, 7), [sales]);

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
    [totalRevenue, totalReturns, averageOrderValue, returnRate, language]
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
    [inventoryValuation, totalCogs, inventoryTurnoverRatio, daysOfInventory, language]
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
    [grossProfit, totalRevenue, totalCogs, profitGrade, profitMarginPercent, netProfit, language]
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
            React.createElement('span', null, `${movingItemsAnalysis.critical.length} ${t('items')}`),
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
    [movingItemsAnalysis, inventory, batches, branchId, language]
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
    profitTooltip,
    lowStockTooltip,
    topSelling,
    expiringItems,
    salesTrends,
  };
};
