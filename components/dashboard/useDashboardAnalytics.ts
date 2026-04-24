import React, { useMemo } from 'react';
import type { Drug, Sale, StockBatch } from '../../types';
import { CalculationBlock, CurrencyValue, DetailMetric } from '../common/InsightTooltip';

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
  const { totalRevenue, totalReturns } = useMemo(() => {
    let rev = 0;
    let ret = 0;
    sales.forEach((sale) => {
      rev += sale.netTotal ?? sale.total;
      if (sale.hasReturns && sale.netTotal !== undefined) {
        ret += sale.total - sale.netTotal;
      }
    });
    return { totalRevenue: rev, totalReturns: ret };
  }, [sales]);

  // 2. COGS & Inventory Valuation
  const { totalCogs, inventoryValuation } = useMemo(() => {
    let cogs = 0;

    sales.forEach((sale) => {
      sale.items.forEach((item, idx) => {
        const drug = inventory.find((d) => d.id === item.id);
        const costPrice = drug?.costPrice || 0;

        const lineKey = `${item.id}_${idx}`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualSoldQty = item.quantity - returnedQty;

        if (actualSoldQty > 0) {
          let effectiveCost = costPrice;
          if (item.isUnit && item.unitsPerPack) {
            effectiveCost = costPrice / item.unitsPerPack;
          }
          cogs += actualSoldQty * effectiveCost;
        }
      });
    });

    // IMPROVED Inventory Valuation: Sum of all batch values for this branch
    const branchBatches = branchId ? batches.filter(b => b.branchId === branchId) : batches;
    const valuation = branchBatches.reduce((sum, b) => sum + (b.quantity || 0) * (b.costPrice || 0), 0);

    return { totalCogs: cogs, inventoryValuation: valuation };
  }, [sales, inventory, batches, branchId]);

  // 3. Efficiency Metrics
  const { inventoryTurnoverRatio, daysOfInventory } = useMemo(() => {
    const turnover = inventoryValuation > 0 ? totalCogs / inventoryValuation : 0;
    const dailyCogs = totalCogs / 30 || 1;
    const days = inventoryValuation / dailyCogs;

    return { inventoryTurnoverRatio: turnover, daysOfInventory: days };
  }, [totalCogs, inventoryValuation]);

  // 4. Profitability Metrics
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalExpenses;

  const profitMarginPercent = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return (grossProfit / totalRevenue) * 100;
  }, [grossProfit, totalRevenue]);

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
  const movingItemsAnalysis = useMemo(() => {
    const salesByDrug: Record<string, number> = {};
    let totalPotentialLoss = 0;

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        salesByDrug[item.id] = (salesByDrug[item.id] || 0) + item.quantity;
      });
    });

    // Helper to get stock precisely from batches array
    const getStock = (drugId: string) => {
      const drugBatches = branchId ? batches.filter(b => b.drugId === drugId && b.branchId === branchId) : batches.filter(b => b.drugId === drugId);
      return drugBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    };

    const critical = inventory.filter((d) => getStock(d.id) <= 3);

    // Revenue at Risk Forecast (1-week approximation)
    critical.forEach((d) => {
      totalPotentialLoss += (d.price || 0) * 5;
    });

    return {
      critical,
      fastMoving: inventory.filter((d) => (salesByDrug[d.id] || 0) >= 10),
      slowMoving: inventory.filter(
        (d) => (salesByDrug[d.id] || 0) < 3 && (salesByDrug[d.id] || 0) > 0
      ),
      revenueAtRisk: totalPotentialLoss,
    };
  }, [sales, inventory, batches, branchId]);

  // 7. Health Grades
  const profitGrade = useMemo(() => {
    if (profitMarginPercent > 35) return { label: t('excellent'), color: 'emerald' as const };
    if (profitMarginPercent > 20) return { label: t('healthy'), color: 'primary' as const };
    return { label: t('lowMargin'), color: 'amber' as const };
  }, [profitMarginPercent, language]);

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
          value: inventory.filter((d) => {
            const drugBatches = branchId ? batches.filter(b => b.drugId === d.id && b.branchId === branchId) : batches.filter(b => b.drugId === d.id);
            return drugBatches.reduce((sum, b) => sum + (b.quantity || 0), 0) <= 10;
          }).length,
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
  };
};
