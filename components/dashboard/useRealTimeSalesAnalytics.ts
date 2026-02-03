import React, { useMemo } from 'react';
import type { Customer, Drug, Sale } from '../../types';
import { CurrencyValue } from '../common/InsightTooltip';

interface RealTimeSalesAnalyticsProps {
  sales: Sale[];
  customers: Customer[];
  products: Drug[];
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
 *
 * Following the 3-tier tooltip architecture:
 * - TIER 1: Primary Result (Executive Summary)
 * - TIER 2: Calculation Logic (Transparency)
 * - TIER 3: Operational Insights (Strategic Action)
 */

export const useRealTimeSalesAnalytics = ({
  sales,
  customers,
  products,
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
    const revenue = todaysSales.reduce((sum, s) => sum + (s.netTotal ?? s.total), 0);
    const transactions = todaysSales.length;

    // Items sold (net of returns)
    const itemsSold = todaysSales.reduce((sum, s) => {
      let quantity = s.items.reduce((qSum, i) => qSum + i.quantity, 0);
      if (s.itemReturnedQuantities) {
        Object.values(s.itemReturnedQuantities).forEach((qty: number) => {
          quantity -= qty;
        });
      }
      return sum + quantity;
    }, 0);

    return { revenue, transactions, itemsSold };
  }, [todaysSales]);

  // === REVENUE CHANGE (MOCKED) ===
  const revenueChange = useMemo(() => {
    // Mock Yesterday's revenue as 90% of today's revenue for demo purposes
    const mockYesterdayRevenue = coreMetrics.revenue * 0.9;

    return mockYesterdayRevenue > 0
      ? ((coreMetrics.revenue - mockYesterdayRevenue) / mockYesterdayRevenue) * 100
      : 0;
  }, [coreMetrics.revenue]);

  // === HOURLY ANALYSIS ===

  const hourlyAnalysis = useMemo(() => {
    const nowHour = new Date().getHours();
    const nowMinutes = new Date().getMinutes();

    // Dynamic opening hour based on first sale
    let openingHour = 8;
    if (todaysSales.length > 0) {
      const earliestTime = Math.min(...todaysSales.map((s) => new Date(s.date).getTime()));
      openingHour = new Date(earliestTime).getHours();
    }

    const hoursOpen = Math.max(0.5, nowHour + nowMinutes / 60 - openingHour);

    // Hourly rates
    const hourlySalesRate = coreMetrics.revenue / hoursOpen;
    const hourlyInvoiceRate = coreMetrics.transactions / hoursOpen;

    // Find peak hour
    const hourlyRevenue: Record<number, number> = {};
    todaysSales.forEach((s) => {
      const h = new Date(s.date).getHours();
      hourlyRevenue[h] = (hourlyRevenue[h] || 0) + (s.netTotal ?? s.total);
    });

    let peakHour = nowHour;
    let peakRevenue = 0;
    Object.entries(hourlyRevenue).forEach(([hour, rev]) => {
      if (rev > peakRevenue) {
        peakRevenue = rev;
        peakHour = parseInt(hour);
      }
    });

    // Format peak hour for display
    const period =
      peakHour >= 12 ? (language === 'AR' ? 'م' : 'PM') : language === 'AR' ? 'ص' : 'AM';
    const hour12 = peakHour % 12 || 12;
    const peakHourLabel = `${hour12} ${period}`;

    // Projected daily revenue (assuming 12-hour business day)
    const projectedRevenue = hourlySalesRate * 12;

    // Hourly New Customer Rate
    // Heuristic: Check if customerName exists but is not in customers list (new walk-in)
    const newCustomersToday =
      todaysSales.filter((s) => s.customerName && !customers.find((c) => c.name === s.customerName))
        ?.length || 0;
    const hourlyNewCustomerRate = newCustomersToday / hoursOpen;

    // Hourly Data for Chart
    const hourlyData = Array(24)
      .fill(0)
      .map((_, i) => {
        // Format time: English numbers, but localized AM/PM
        let period = i >= 12 ? 'PM' : 'AM';
        const hour12 = i % 12 || 12; // 0 becomes 12

        // Localize PM/AM if needed, but KEEP NUMBERS in English
        if (language === 'AR') {
          period = i >= 12 ? 'م' : 'ص';
        }

        return {
          hour: i.toString().padStart(2, '0') + ':00',
          date: `${hour12} ${period}`,
          revenue: 0,
          sales: 0,
        };
      });

    todaysSales.forEach((s) => {
      const h = new Date(s.date).getHours();
      if (hourlyData[h]) {
        hourlyData[h].revenue += s.netTotal ?? s.total;
        hourlyData[h].sales += 1;
      }
    });

    // Filter to current hour for cleaner view
    const currentHour = new Date().getHours();
    const filteredHourlyData = hourlyData.slice(0, currentHour + 1);

    return {
      hoursOpen,
      hourlySalesRate,
      hourlyInvoiceRate,
      hourlyNewCustomerRate,
      peakHour,
      peakHourLabel,
      peakRevenue,
      projectedRevenue,
      hourlyData: filteredHourlyData,
    };
  }, [todaysSales, coreMetrics, language, customers]);

  // === CUSTOMER ANALYSIS ===

  const customerAnalysis = useMemo(() => {
    let vipTransactions = 0;
    let registeredTransactions = 0;

    todaysSales.forEach((s) => {
      // Check if VIP (totalPurchases >= 1000)
      let customer: Customer | undefined;
      if (s.customerCode) {
        customer = customers.find(
          (c) => c.code === s.customerCode || c.serialId?.toString() === s.customerCode
        );
      } else if (s.customerName) {
        customer = customers.find((c) => c.name === s.customerName);
      }

      if (customer) {
        registeredTransactions++;
        if (customer.totalPurchases >= 1000) {
          vipTransactions++;
        }
      }
    });

    const vipRate =
      coreMetrics.transactions > 0 ? (vipTransactions / coreMetrics.transactions) * 100 : 0;
    const registeredRate =
      coreMetrics.transactions > 0 ? (registeredTransactions / coreMetrics.transactions) * 100 : 0;
    const anonymousRate = 100 - registeredRate;

    return {
      vipTransactions,
      registeredTransactions,
      vipRate,
      registeredRate,
      anonymousRate,
    };
  }, [todaysSales, customers, coreMetrics.transactions]);

  // === PAYMENT ANALYSIS ===

  const paymentAnalysis = useMemo(() => {
    let cashRevenue = 0;
    let cardRevenue = 0;
    let cashCount = 0;
    let cardCount = 0;

    todaysSales.forEach((s) => {
      const amount = s.netTotal ?? s.total;
      if (s.paymentMethod === 'visa') {
        cardRevenue += amount;
        cardCount++;
      } else {
        cashRevenue += amount;
        cashCount++;
      }
    });

    const cashRate =
      coreMetrics.transactions > 0 ? (cashCount / coreMetrics.transactions) * 100 : 0;
    const cardRate = 100 - cashRate;

    return { cashRevenue, cardRevenue, cashCount, cardCount, cashRate, cardRate };
  }, [todaysSales, coreMetrics.transactions]);

  // === HIGH VALUE TRANSACTIONS ===

  const highValueAnalysis = useMemo(() => {
    const sortedToday = [...todaysSales].sort((a, b) => {
      return (b.netTotal || b.total) - (a.netTotal || a.total);
    });

    // Top 5% are high value
    const topCount = Math.ceil(sortedToday.length * 0.05);
    const highValueIds = new Set(sortedToday.slice(0, topCount).map((s) => s.id));

    const avgTransactionValue =
      coreMetrics.transactions > 0 ? coreMetrics.revenue / coreMetrics.transactions : 0;

    // Calculate high value threshold (top 5% minimum)
    const highValueThreshold =
      sortedToday[topCount - 1]?.netTotal ?? sortedToday[topCount - 1]?.total ?? 0;

    return {
      highValueCount: topCount,
      highValueIds,
      avgTransactionValue,
      highValueThreshold,
    };
  }, [todaysSales, coreMetrics]);

  // === ITEMS ANALYSIS ===

  const itemsAnalysis = useMemo(() => {
    const itemsPerTransaction =
      coreMetrics.transactions > 0 ? coreMetrics.itemsSold / coreMetrics.transactions : 0;

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    todaysSales.forEach((s) => {
      s.items.forEach((i) => {
        const cat = i.category || 'General';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + i.quantity;
      });
    });

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const topCategoryCount = categoryCounts[topCategory] || 0;

    // Return rate for today
    let totalItems = 0;
    let returnedItems = 0;
    todaysSales.forEach((s) => {
      totalItems += s.items.reduce((sum, i) => sum + i.quantity, 0);
      if (s.itemReturnedQuantities) {
        returnedItems += Object.values(s.itemReturnedQuantities).reduce(
          (sum, qty) => sum + (qty as number),
          0
        );
      }
    });

    const returnRate = totalItems > 0 ? (returnedItems / totalItems) * 100 : 0;
    const returnsCount = todaysSales.filter((s) => s.hasReturns).length;

    return {
      itemsPerTransaction,
      topCategory,
      topCategoryCount,
      returnRate,
      returnsCount,
      returnedItems,
    };
  }, [todaysSales, coreMetrics]);

  // === TOP PRODUCTS ANALYSIS ===

  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};

    todaysSales.forEach((s) => {
      s.items.forEach((i) => {
        // Find current drug info from products prop for consistent naming
        const drug = products.find((d) => d.id === i.id);
        const name = drug?.name || i.name;

        if (!productMap[i.id]) {
          productMap[i.id] = { name, qty: 0, revenue: 0 };
        }
        // Quantity accumulation uses effectiveQty to account for returns
        let effectiveQty = i.quantity;
        if (s.itemReturnedQuantities && s.itemReturnedQuantities[i.id]) {
          effectiveQty -= s.itemReturnedQuantities[i.id];
        }

        // Use effective quantity for both count and revenue
        productMap[i.id].qty += effectiveQty;
        productMap[i.id].revenue += i.price * effectiveQty;
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // Top 5
  }, [todaysSales, products]);

  // === ORDER TYPE ANALYSIS ===

  const orderTypeAnalysis = useMemo(() => {
    const deliveryCount = todaysSales.filter((s) => s.saleType === 'delivery').length;
    const walkInCount = coreMetrics.transactions - deliveryCount;

    const deliveryRate =
      coreMetrics.transactions > 0 ? (deliveryCount / coreMetrics.transactions) * 100 : 0;
    const walkInRate = 100 - deliveryRate;

    return { deliveryCount, walkInCount, deliveryRate, walkInRate };
  }, [todaysSales, coreMetrics.transactions]);

  // === TOOLTIP CONFIGURATIONS ===

  // 1. REVENUE TOOLTIP
  const revenueTooltip = useMemo(
    () => ({
      title: language === 'AR' ? 'إيرادات اليوم' : "Today's Revenue",
      value: coreMetrics.revenue,
      icon: 'payments',
      iconColorClass: 'text-emerald-400',
      calculations: [
        {
          label: language === 'AR' ? 'معدل المبيعات / ساعة' : 'Sales Velocity',
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(CurrencyValue, { val: hourlyAnalysis.hourlySalesRate, language }),
            React.createElement(
              'span',
              { className: 'opacity-50 text-[10px] ms-1' },
              language === 'AR' ? '/ ساعة' : '/hr'
            )
          ),
        },
        {
          label: language === 'AR' ? 'التوقع اليومي' : 'Projected Daily',
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(CurrencyValue, { val: hourlyAnalysis.projectedRevenue, language }),
            React.createElement(
              'span',
              { className: 'opacity-50 text-[10px] ms-1' },
              language === 'AR' ? '(12 ساعة)' : '(12hr day)'
            )
          ),
        },
      ],
      details: [
        {
          icon: 'schedule',
          label: language === 'AR' ? 'ساعة الذروة' : 'Peak Hour',
          value: hourlyAnalysis.peakHourLabel,
          isCurrency: false,
          colorClass: 'text-amber-400',
        },
        {
          icon: 'trending_up',
          label: language === 'AR' ? 'إيرادات الذروة' : 'Peak Revenue',
          value: hourlyAnalysis.peakRevenue,
        },
      ],
    }),
    [coreMetrics.revenue, hourlyAnalysis, language]
  );

  // 2. TRANSACTIONS TOOLTIP
  const transactionsTooltip = useMemo(
    () => ({
      title: language === 'AR' ? 'المعاملات' : 'Transactions',
      value: coreMetrics.transactions,
      isCurrency: false,
      valueLabel: language === 'AR' ? 'فاتورة' : 'invoices',
      icon: 'receipt_long',
      iconColorClass: 'text-blue-400',
      calculations: [
        {
          label: language === 'AR' ? 'متوسط قيمة الفاتورة' : 'Avg. Order Value (AOV)',
          math: React.createElement(CurrencyValue, {
            val: highValueAnalysis.avgTransactionValue,
            language,
          }),
        },
        {
          label: language === 'AR' ? 'توزيع الدفع' : 'Payment Split',
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'span',
              { className: 'text-emerald-400' },
              `${paymentAnalysis.cashRate.toFixed(0)}%`
            ),
            React.createElement('span', { className: 'opacity-50 mx-1' }, 'Cash'),
            React.createElement('span', { className: 'opacity-50' }, '•'),
            React.createElement(
              'span',
              { className: 'text-blue-400 mx-1' },
              `${paymentAnalysis.cardRate.toFixed(0)}%`
            ),
            React.createElement('span', { className: 'opacity-50' }, 'Card')
          ),
        },
      ],
      details: [
        {
          icon: 'verified',
          label: language === 'AR' ? 'عملاء VIP' : 'VIP Customers',
          value: `${customerAnalysis.vipRate.toFixed(1)}%`,
          colorClass: 'text-amber-400',
          isCurrency: false,
        },
        {
          icon: 'stars',
          label: language === 'AR' ? 'فاتورة عالية القيمة' : 'High-Value Orders',
          value: highValueAnalysis.highValueCount,
          colorClass: 'text-amber-400',
          isCurrency: false,
          subLabel: language === 'AR' ? 'أعلى 5%' : 'Top 5%',
        },
      ],
    }),
    [coreMetrics.transactions, highValueAnalysis, paymentAnalysis, customerAnalysis, language]
  );

  // 3. ITEMS SOLD TOOLTIP
  const itemsSoldTooltip = useMemo(
    () => ({
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
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'span',
              { className: 'text-purple-300' },
              itemsAnalysis.topCategory
            ),
            React.createElement(
              'span',
              { className: 'opacity-50 text-[10px] ms-2' },
              `(${itemsAnalysis.topCategoryCount} ${language === 'AR' ? 'وحدة' : 'units'})`
            )
          ),
        },
      ],
      details: [
        {
          icon: 'undo',
          label: language === 'AR' ? 'نسبة المرتجعات' : 'Return Rate',
          value: `${itemsAnalysis.returnRate.toFixed(1)}%`,
          colorClass: itemsAnalysis.returnRate > 5 ? 'text-rose-400' : 'text-emerald-400',
          isCurrency: false,
        },
        {
          icon: 'assignment_return',
          label: language === 'AR' ? 'طلبات بمرتجعات' : 'Orders with Returns',
          value: itemsAnalysis.returnsCount,
          isCurrency: false,
        },
      ],
    }),
    [coreMetrics.itemsSold, itemsAnalysis, language]
  );

  // 4. ACTIVE COUNTERS TOOLTIP (Mock data since counters are simulated)
  const activeCountersStats = useMemo(() => {
    return {
      activeCounters: 3, // Mocked
      totalCounters: 5,
      onHoldCount: 2,
    };
  }, []);

  const activeCountersTooltip = useMemo(() => {
    const { activeCounters, totalCounters, onHoldCount } = activeCountersStats;

    const utilizationRate = (activeCounters / totalCounters) * 100;
    const avgTransactionsPerCounter =
      coreMetrics.transactions > 0 && activeCounters > 0
        ? coreMetrics.transactions / activeCounters
        : 0;
    const avgRevenuePerCounter =
      coreMetrics.revenue > 0 && activeCounters > 0 ? coreMetrics.revenue / activeCounters : 0;

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
          math: React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'span',
              { className: utilizationRate >= 60 ? 'text-emerald-400' : 'text-amber-400' },
              `${utilizationRate.toFixed(0)}%`
            ),
            React.createElement(
              'span',
              { className: 'opacity-50 text-[10px] ms-1' },
              language === 'AR' ? 'من الطاقة' : 'capacity'
            )
          ),
        },
        {
          label: language === 'AR' ? 'الإيرادات / كاونتر' : 'Revenue per Counter',
          math: React.createElement(CurrencyValue, { val: avgRevenuePerCounter, language }),
        },
      ],
      details: [
        {
          icon: 'receipt',
          label: language === 'AR' ? 'فواتير / كاونتر' : 'Invoices per Counter',
          value: avgTransactionsPerCounter.toFixed(1),
          isCurrency: false,
        },
        {
          icon: 'pause_circle',
          label: language === 'AR' ? 'طلبات معلقة' : 'On Hold',
          value: onHoldCount,
          isCurrency: false,
          colorClass: onHoldCount > 0 ? 'text-amber-400' : 'text-gray-400',
        },
      ],
    };
  }, [coreMetrics, language]);

  return {
    // Core metrics
    ...coreMetrics,
    todaysSales,
    revenueChange,

    // Analysis objects
    hourlyAnalysis,
    customerAnalysis,
    paymentAnalysis,
    highValueAnalysis,
    itemsAnalysis,
    orderTypeAnalysis,
    topProducts,
    activeCountersStats,

    // Tooltip configurations
    revenueTooltip,
    transactionsTooltip,
    itemsSoldTooltip,
    activeCountersTooltip,
  };
};
