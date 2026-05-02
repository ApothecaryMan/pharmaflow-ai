import React, { useMemo } from 'react';
import type { Customer, Drug, Sale } from '../../types';
import { CurrencyValue } from '../common/InsightTooltip';
import { DashboardService } from '../../services/dashboard/dashboardService';
import { money } from '../../utils/money';

interface RealTimeSalesAnalyticsProps {
  sales: Sale[];
  customers: Customer[];
  products: Drug[];
  shifts: any[];
  language?: string;
}

/**
 * @fileoverview useRealTimeSalesAnalytics Hook
 * ═══════════════════════════════════════════════════════════════════════════
 * REAL-TIME SALES MONITOR - ANALYTICS ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Provides computed analytics and tooltip configurations for the
 * RealTimeSalesMonitor component's 4 hero stat cards.
 */

export const useRealTimeSalesAnalytics = ({
  sales,
  customers,
  products,
  shifts,
  language,
}: RealTimeSalesAnalyticsProps) => {
  // Filter to today's sales
  const todaysSales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sales.filter((s) => {
      const d = new Date(s.date);
      return d >= today && d < new Date(today.getTime() + 86400000);
    });
  }, [sales]);

  // === CORE METRICS ===
  const coreMetrics = useMemo(() => {
    const { totalRevenue, totalReturns } = DashboardService.calculateRevenueAndReturns(todaysSales);
    const transactions = todaysSales.length;

    // Items sold (net of returns) - Precise aggregation
    let totalItemsNet = 0;
    todaysSales.forEach((s) => {
      s.items.forEach((item, idx) => {
        const lineKey = `${item.id}_${idx}`;
        const returnedQty =
          s.itemReturnedQuantities?.[lineKey] || s.itemReturnedQuantities?.[item.id] || 0;
        totalItemsNet += Math.max(0, item.quantity - returnedQty);
      });
    });

    return { 
      revenue: totalRevenue, 
      transactions, 
      itemsSold: totalItemsNet,
      returns: totalReturns 
    };
  }, [todaysSales]);

  // === DYNAMICS ANALYSIS ===
  const dynamics = useMemo(() => {
    return DashboardService.getSalesDynamics(todaysSales, customers);
  }, [todaysSales, customers]);

  // === AVERAGES & RATES ===
  const averages = useMemo(() => {
    return DashboardService.calculateAverages(todaysSales);
  }, [todaysSales]);

  // === REVENUE CHANGE ===
  const revenueChange = useMemo(() => {
    // Mock Yesterday's revenue as 90% of today's revenue for demo purposes
    const currentCents = money.toSmallestUnit(coreMetrics.revenue);
    const mockYesterdayCents = Math.round(currentCents * 0.9);

    if (mockYesterdayCents > 0) {
      const diff = currentCents - mockYesterdayCents;
      return (diff / mockYesterdayCents) * 100;
    }
    return 0;
  }, [coreMetrics.revenue]);

  // === HOURLY ANALYSIS WRAPPER ===
  const hourlyAnalysis = useMemo(() => {
    const nowHour = new Date().getHours();
    const nowMinutes = new Date().getMinutes();

    let openingHour = 8;
    if (todaysSales.length > 0) {
      const earliestTime = Math.min(...todaysSales.map((s) => new Date(s.date).getTime()));
      openingHour = new Date(earliestTime).getHours();
    }

    const hoursOpen = Math.max(0.5, nowHour + nowMinutes / 60 - openingHour);

    const hourlySalesRate = hoursOpen > 0 ? money.divide(coreMetrics.revenue, hoursOpen) : 0;
    const hourlyInvoiceRate = hoursOpen > 0 ? money.divide(coreMetrics.transactions, hoursOpen) : 0;

    const peakHour = dynamics.hourly.peakHour ?? nowHour;
    const period = peakHour >= 12 ? (language === 'AR' ? 'م' : 'PM') : language === 'AR' ? 'ص' : 'AM';
    const hour12 = peakHour % 12 || 12;
    const peakHourLabel = `${hour12} ${period}`;

    const hourlyData = Array(24)
      .fill(0)
      .map((_, i) => {
        let period = i >= 12 ? (language === 'AR' ? 'م' : 'ص') : language === 'AR' ? 'ص' : 'AM';
        const hour12 = i % 12 || 12;
        return {
          hour: i.toString().padStart(2, '0') + ':00',
          date: `${hour12} ${period}`,
          revenue: dynamics.hourly.revenueMap[i] || 0,
          sales: dynamics.hourly.transactionsMap[i] || 0,
        };
      });

    return {
      hoursOpen,
      hourlySalesRate,
      hourlyInvoiceRate,
      hourlyNewCustomerRate: dynamics.customers.newCustomersToday / hoursOpen,
      peakHourLabel,
      peakRevenue: dynamics.hourly.peakRevenue,
      projectedRevenue: money.multiply(hourlySalesRate, 12, 0),
      hourlyData: hourlyData.slice(0, nowHour + 1),
    };
  }, [todaysSales, coreMetrics, dynamics.hourly, dynamics.customers, language]);

  // === ANALYSES ===
  const paymentAnalysis = useMemo(() => dynamics.payments, [dynamics.payments]);
  const customerAnalysis = useMemo(() => dynamics.customers, [dynamics.customers]);
  const orderTypeAnalysis = useMemo(() => dynamics.orderTypes, [dynamics.orderTypes]);

  const highValueAnalysis = useMemo(() => {
    const sortedToday = [...todaysSales].sort((a, b) => {
      const revA = DashboardService.calculateRevenueAndReturns([a]).totalRevenue;
      const revB = DashboardService.calculateRevenueAndReturns([b]).totalRevenue;
      return revB - revA;
    });

    const topCount = Math.ceil(sortedToday.length * 0.05);
    const highValueIds = new Set(sortedToday.slice(0, topCount).map((s) => s.id));
    const thresholdSale = sortedToday[topCount - 1];
    const highValueThreshold = thresholdSale 
      ? DashboardService.calculateRevenueAndReturns([thresholdSale]).totalRevenue
      : 0;

    return {
      highValueCount: topCount,
      highValueIds,
      avgTransactionValue: averages.avgOrderValue,
      highValueThreshold,
    };
  }, [todaysSales, averages.avgOrderValue]);

  const itemsAnalysis = useMemo(() => {
    const itemsPerTransaction = coreMetrics.transactions > 0 ? coreMetrics.itemsSold / coreMetrics.transactions : 0;
    const categoryCounts: Record<string, number> = {};
    
    todaysSales.forEach((s) => {
      s.items.forEach((i, idx) => {
        const lineKey = `${i.id}_${idx}`;
        const returnedQty = s.itemReturnedQuantities?.[lineKey] || s.itemReturnedQuantities?.[i.id] || 0;
        const actualQty = Math.max(0, i.quantity - returnedQty);
        if (actualQty > 0) {
          const cat = i.category || 'General';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + actualQty;
        }
      });
    });

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      itemsPerTransaction: coreMetrics.transactions > 0 ? money.divide(coreMetrics.itemsSold, coreMetrics.transactions) : 0,
      topCategory,
      topCategoryCount: categoryCounts[topCategory] || 0,
      returnRate: averages.returnRate,
      returnsCount: todaysSales.filter((s) => s.hasReturns).length,
      returnedItems: coreMetrics.returns,
    };
  }, [todaysSales, coreMetrics, averages.returnRate]);

  const topProducts = useMemo(() => DashboardService.getTopSelling(todaysSales, 5), [todaysSales]);

  // === TOOLTIP CONFIGURATIONS ===
  const revenueTooltip = useMemo(() => ({
    title: language === 'AR' ? 'إيرادات اليوم' : "Today's Revenue",
    value: coreMetrics.revenue,
    icon: 'payments',
    iconColorClass: 'text-emerald-400',
    calculations: [
      {
        label: language === 'AR' ? 'معدل المبيعات / ساعة' : 'Sales Velocity',
        math: React.createElement(React.Fragment, null,
          React.createElement(CurrencyValue, { val: hourlyAnalysis.hourlySalesRate, language }),
          React.createElement('span', { className: 'opacity-50 text-[10px] ms-1' }, language === 'AR' ? '/ ساعة' : '/hr')
        ),
      },
      {
        label: language === 'AR' ? 'التوقع اليومي' : 'Projected Daily',
        math: React.createElement(React.Fragment, null,
          React.createElement(CurrencyValue, { val: hourlyAnalysis.projectedRevenue, language }),
          React.createElement('span', { className: 'opacity-50 text-[10px] ms-1' }, language === 'AR' ? '(12 ساعة)' : '(12hr day)')
        ),
      },
    ],
    details: [
      { icon: 'schedule', label: language === 'AR' ? 'ساعة الذروة' : 'Peak Hour', value: hourlyAnalysis.peakHourLabel, isCurrency: false, colorClass: 'text-amber-400' },
      { icon: 'trending_up', label: language === 'AR' ? 'إيرادات الذروة' : 'Peak Revenue', value: hourlyAnalysis.peakRevenue },
    ],
  }), [coreMetrics.revenue, hourlyAnalysis, language]);

  const transactionsTooltip = useMemo(() => ({
    title: language === 'AR' ? 'المعاملات' : 'Transactions',
    value: coreMetrics.transactions,
    isCurrency: false,
    valueLabel: language === 'AR' ? 'فاتورة' : 'invoices',
    icon: 'receipt_long',
    iconColorClass: 'text-blue-400',
    calculations: [
      {
        label: language === 'AR' ? 'متوسط قيمة الفاتورة' : 'Avg. Order Value (AOV)',
        math: React.createElement(CurrencyValue, { val: highValueAnalysis.avgTransactionValue, language }),
      },
      {
        label: language === 'AR' ? 'توزيع الدفع' : 'Payment Split',
        math: React.createElement(React.Fragment, null,
          React.createElement('span', { className: 'text-emerald-400' }, `${paymentAnalysis.cashRate.toFixed(0)}%`),
          React.createElement('span', { className: 'opacity-50 mx-1' }, 'Cash'),
          React.createElement('span', { className: 'opacity-50' }, '•'),
          React.createElement('span', { className: 'text-blue-400 mx-1' }, `${paymentAnalysis.cardRate.toFixed(0)}%`),
          React.createElement('span', { className: 'opacity-50' }, 'Card')
        ),
      },
    ],
    details: [
      { icon: 'verified', label: language === 'AR' ? 'عملاء VIP' : 'VIP Customers', value: `${customerAnalysis.vipRate.toFixed(1)}%`, colorClass: 'text-amber-400', isCurrency: false },
      { icon: 'stars', label: language === 'AR' ? 'فاتورة عالية القيمة' : 'High-Value Orders', value: highValueAnalysis.highValueCount, colorClass: 'text-amber-400', isCurrency: false, subLabel: language === 'AR' ? 'أعلى 5%' : 'Top 5%' },
    ],
  }), [coreMetrics.transactions, highValueAnalysis, paymentAnalysis, customerAnalysis, language]);

  const itemsSoldTooltip = useMemo(() => ({
    title: language === 'AR' ? 'المنتجات المباعة' : 'Items Sold',
    value: coreMetrics.itemsSold,
    isCurrency: false,
    valueLabel: language === 'AR' ? 'وحدة' : 'units',
    icon: 'inventory_2',
    iconColorClass: 'text-purple-400',
    calculations: [
      {
        label: language === 'AR' ? 'متوسط المنتجات / فاتورة' : 'Avg. Items per Invoice',
        math: React.createElement('span', null, itemsAnalysis.itemsPerTransaction.toFixed(1)),
      },
      {
        label: language === 'AR' ? 'الفئة الأعلى مبيعاً' : 'Top Category',
        math: React.createElement(React.Fragment, null,
          React.createElement('span', { className: 'text-purple-300' }, itemsAnalysis.topCategory),
          React.createElement('span', { className: 'opacity-50 text-[10px] ms-2' }, `(${itemsAnalysis.topCategoryCount} ${language === 'AR' ? 'وحدة' : 'units'})`)
        ),
      },
    ],
    details: [
      { icon: 'undo', label: language === 'AR' ? 'نسبة المرتجعات' : 'Return Rate', value: `${itemsAnalysis.returnRate.toFixed(1)}%`, colorClass: itemsAnalysis.returnRate > 5 ? 'text-rose-400' : 'text-emerald-400', isCurrency: false },
      { icon: 'assignment_return', label: language === 'AR' ? 'طلبات بمرتجعات' : 'Orders with Returns', value: itemsAnalysis.returnsCount, isCurrency: false },
    ],
  }), [coreMetrics.itemsSold, itemsAnalysis, language]);

  const activeCountersStats = useMemo(() => {
    const openShifts = (shifts || []).filter(s => s.status === 'open');
    return { 
      activeCounters: openShifts.length, 
      totalCounters: 5, // Capacity can be a setting later
      onHoldCount: sales.filter(s => s.status === 'pending').length 
    };
  }, [shifts, sales]);

  const activeCountersTooltip = useMemo(() => {
    const { activeCounters, totalCounters, onHoldCount } = activeCountersStats;
    const utilizationRate = (activeCounters / totalCounters) * 100;
    const avgRevenuePerCounter = activeCounters > 0 ? coreMetrics.revenue / activeCounters : 0;
    const avgTransactionsPerCounter = activeCounters > 0 ? coreMetrics.transactions / activeCounters : 0;

    return {
      title: language === 'AR' ? 'الكاونترات النشطة' : 'Active Counters',
      value: activeCounters,
      isCurrency: false,
      valueLabel: `/ ${totalCounters}`,
      icon: 'point_of_sale',
      iconColorClass: 'text-amber-400',
      calculations: [
        {
          label: language === 'AR' ? 'نسبة الاستخدام' : 'Utilization Rate',
          math: React.createElement(React.Fragment, null,
            React.createElement('span', { className: utilizationRate >= 60 ? 'text-emerald-400' : 'text-amber-400' }, `${utilizationRate.toFixed(0)}%`),
            React.createElement('span', { className: 'opacity-50 text-[10px] ms-1' }, language === 'AR' ? 'من الطاقة' : 'capacity')
          ),
        },
        { label: language === 'AR' ? 'الإيرادات / كاونتر' : 'Revenue per Counter', math: React.createElement(CurrencyValue, { val: avgRevenuePerCounter, language }) },
      ],
      details: [
        { icon: 'receipt', label: language === 'AR' ? 'فواتير / كاونتر' : 'Invoices per Counter', value: avgTransactionsPerCounter.toFixed(1), isCurrency: false },
        { icon: 'pause_circle', label: language === 'AR' ? 'طلبات معلقة' : 'On Hold', value: onHoldCount, isCurrency: false, colorClass: onHoldCount > 0 ? 'text-amber-400' : 'text-gray-400' },
      ],
    };
  }, [coreMetrics, language]);

  return useMemo(() => ({
    ...coreMetrics,
    todaysSales,
    revenueChange,
    hourlyAnalysis,
    customerAnalysis,
    paymentAnalysis,
    highValueAnalysis,
    itemsAnalysis,
    orderTypeAnalysis,
    returnedValue: coreMetrics.returns,
    topProducts,
    activeCountersStats,
    revenueTooltip,
    transactionsTooltip,
    itemsSoldTooltip,
    activeCountersTooltip,
  }), [
    coreMetrics, todaysSales, revenueChange, hourlyAnalysis, customerAnalysis, 
    paymentAnalysis, highValueAnalysis, itemsAnalysis, orderTypeAnalysis, 
    topProducts, activeCountersStats, revenueTooltip, transactionsTooltip, 
    itemsSoldTooltip, activeCountersTooltip
  ]);
};
