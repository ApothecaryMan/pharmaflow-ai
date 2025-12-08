import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sale, Drug, Customer, ThemeColor, Return } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend } from 'recharts';
import { ExpandedModal } from './ExpandedModal';

interface RealTimeSalesMonitorProps {
  sales: Sale[];
  customers: Customer[];
  products: Drug[]; // Mapped directly from App.tsx prop 'products'
  color: ThemeColor;
  t: any;
  language: 'AR' | 'EN';
}

// --- Animated Counter Component ---
const AnimatedCounter = ({ value, prefix = '', suffix = '', fractionDigits = 0 }: { value: number, prefix?: string, suffix?: string, fractionDigits?: number }) => {
    // Format number with commas and specified decimals
    const formatted = value.toLocaleString('en-US', { 
        minimumFractionDigits: fractionDigits, 
        maximumFractionDigits: fractionDigits 
    });
    
    // Split into characters
    const characters = formatted.split('');

    return (
        <div className="flex items-baseline overflow-hidden">
            {prefix && <span className="mr-0.5">{prefix}</span>}
            {characters.map((char, index) => {
                if (!/[0-9]/.test(char)) {
                    return <span key={index} className="mx-[1px]">{char}</span>;
                }

                const digit = parseInt(char, 10);
                return (
                    <div key={index} className="relative h-[1.1em] w-[0.65em] overflow-hidden inline-block" style={{ verticalAlign: 'text-bottom' }}>
                        <div 
                            className="absolute top-0 left-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                            style={{ transform: `translateY(-${digit * 10}%)` }}
                        >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <span key={num} className="h-[100%] flex items-center justify-center">
                                    {num}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
            {suffix && <span className="ml-0.5">{suffix}</span>}
        </div>
    );
};

export const RealTimeSalesMonitor: React.FC<RealTimeSalesMonitorProps> = ({
  sales = [],
  customers = [],
  products = [],
  color,
  t,
  language
}) => {
  const isRTL = language === 'AR';
  const [expandedView, setExpandedView] = useState<string | null>(null);
  
  // --- Live Pulse Effect ---
  // Simple state to force re-render every minute if needed, but sales prop updates drive Reactivity
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- Animation Logic for Recent Transactions ---
  const [displayedSales, setDisplayedSales] = useState<(Sale & { isNew?: boolean; isHighValue?: boolean; isVIP?: boolean })[]>([]);
  const processedSalesRef = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);
  
  // Filter State
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VIP' | 'HIGH_VALUE'>('ALL');

  // Reset animations when filter changes
  useEffect(() => {
      // When switching back to ALL, we might want to reset processed sales or retain them.
      // For simplicity, when switching filters, we treat it as a fresh load for that view.
      if (activeFilter === 'ALL') {
         isFirstRun.current = true;
         processedSalesRef.current.clear();
      }
  }, [activeFilter]);


  // --- Statistics Calculation ---
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter Today's Sales
    const todaysSales = sales.filter(s => {
      const d = new Date(s.date);
      return d >= today && d < new Date(today.getTime() + 86400000);
    });

    const revenue = todaysSales.reduce((sum, s) => sum + (s.netTotal || s.total), 0);
    const transactions = todaysSales.length;
    
    const itemsSold = todaysSales.reduce((sum, s) => {
      // Calculate net quantity (sold - returned)
      let quantity = s.items.reduce((qSum, i) => qSum + i.quantity, 0);
      
      // Subtract returned items if any
      if (s.itemReturnedQuantities) {
        Object.values(s.itemReturnedQuantities).forEach((qty: number) => {
          quantity -= qty;
        });
      }
      return sum + quantity;
    }, 0);

    // Mock Active Counters
    const activeCounters = 3; 
    const totalCounters = 5;
    const onHoldCount = 2;

    // --- Hourly & Customer Metrics ---
    const nowHour = new Date().getHours();
    const nowMinutes = new Date().getMinutes();
    
    // Dynamic opening hour: Use earliest sale time of the day (robust against unsorted data), fallback to 8 AM
    let openingHour = 8;
    if (todaysSales.length > 0) {
        const earliestTime = Math.min(...todaysSales.map(s => new Date(s.date).getTime()));
        openingHour = new Date(earliestTime).getHours();
    }
    
    // Calculate hours open with fractional precision
    const hoursOpen = Math.max(0.5, (nowHour + nowMinutes / 60) - openingHour);

    const hourlySalesRate = revenue / hoursOpen;
    const hourlyInvoiceRate = transactions / hoursOpen;
    // Improved "New Customers" Logic: Check if customer registration date is today?
    // Since we don't have explicit registration date in 'customers' array easily accessible here without a join/lookup,
    // we use a heuristic or strictly check against sales history if possible.
    // For now, retaining the heuristic but making it clearer it's an estimate if no precise data.
    const newCustomersToday = todaysSales.filter(s => s.customerName && !customers.find(c => c.name === s.customerName))?.length;
    // Only fallback if logic returns 0 and we want to show *something* for demo, otherwise 0 is valid.
    // Removing arbitrary 10% fallback to be more accurrate to data provided.
    const finalNewCustomers = newCustomersToday || 0; 
    const hourlyNewCustomerRate = finalNewCustomers / hoursOpen;

    // Order Types (Inside vs Delivery)
    const deliveryCount = todaysSales.filter(s => s.saleType === 'delivery').length;
    const walkInCount = todaysSales.length - deliveryCount;
    const deliveryRate = transactions > 0 ? (deliveryCount / transactions) * 100 : 0;
    const walkInRate = transactions > 0 ? (walkInCount / transactions) * 100 : 0;

    // Registered vs Anonymous
    const registeredCount = todaysSales.filter(s => s.customerCode).length;
    const anonymousCount = todaysSales.length - registeredCount;
    const registeredRate = transactions > 0 ? (registeredCount / transactions) * 100 : 0;
    const anonymousRate = transactions > 0 ? (anonymousCount / transactions) * 100 : 0;

    // Calculate Average Transaction Value
    const avgTransactionValue = transactions > 0 ? revenue / transactions : 0;

    // Revenue Change (Mocked Logic)
    const mockYesterdayRevenue = revenue * 0.9; 
    const revenueChange = mockYesterdayRevenue > 0 ? ((revenue - mockYesterdayRevenue) / mockYesterdayRevenue) * 100 : 0;

    // Top Categories
    const categoryCounts: Record<string, number> = {};
    todaysSales.forEach(s => {
      s.items.forEach(i => {
        categoryCounts[i.category] = (categoryCounts[i.category] || 0) + i.quantity;
      });
    });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Highlight Levels
    // High Value: Strict Top 5% of TODAY'S sales by rank.
    // We identify exactly which IDs are in the top 5% quota.
    const sortedToday = [...todaysSales].sort((a, b) => {
        const totalA = a.netTotal || a.total;
        const totalB = b.netTotal || b.total;
        return Number(totalB) - Number(totalA);
    });
    // Calculate how many make the cut (at least 1 if there is data, or strictly 5%?)
    // User asked for "Top 5%", so Math.ceil(length * 0.05).
    // Example: 20 sales -> 1 high value. 100 sales -> 5 high value.
    const topCount = Math.ceil(sortedToday.length * 0.05);
    const highValueIds = new Set(sortedToday.slice(0, topCount).map(s => s.id)); 

    return {
      revenue,
      transactions,
      itemsSold,
      activeCounters,
      totalCounters,
      onHoldCount,
      avgTransactionValue,
      revenueChange,
      topCategory,
      todaysSales,
      highValueIds,
      // New Metrics
      hourlySalesRate,
      hourlyInvoiceRate,
      hourlyNewCustomerRate,
      deliveryCount,
      deliveryRate,
      walkInCount,
      walkInRate,
      registeredCount,
      registeredRate,
      anonymousCount,
      anonymousRate
    };
  }, [sales, customers]); // Added customers dependency if needed, but mainly sales

  // Sync displayedSales with todayStats.todaysSales with animation detection
  useEffect(() => {
    const currentSales = todayStats.todaysSales;
    
    // FILTERED VIEW
    if (activeFilter !== 'ALL') {
        let filtered = currentSales;
        
        if (activeFilter === 'VIP') {
            filtered = currentSales.filter(s => {
                let isVIP = false;
                // Replicate VIP logic (should match render logic)
                if (s.customerCode) {
                    const c = customers.find(cust => cust.code === s.customerCode || cust.serialId?.toString() === s.customerCode);
                    if (c && c.totalPurchases >= 1000) isVIP = true;
                } else if (s.customerName) {
                    const c = customers.find(cust => cust.name === s.customerName);
                    if (c && c.totalPurchases >= 1000) isVIP = true;
                }
                return isVIP;
            });
        } else if (activeFilter === 'HIGH_VALUE') {
            filtered = currentSales.filter(s => todayStats.highValueIds.has(s.id));
        }

        // Just show them, no animation for filtered views usually needed or just fade in
        setDisplayedSales(filtered.slice().reverse().map(s => ({ ...s, isNew: false })));
        return;
    }

    // ALL (LIVE) VIEW
    if (isFirstRun.current) {
        // First load: just show top 20, no animation.
        // IMPORTANT: Mark ALL current sales of today as processed to avoid "old" sales appearing as "new" later.
        currentSales.forEach(s => processedSalesRef.current.add(s.id));
        
        const initial = currentSales.slice().reverse().slice(0, 20).map(s => ({ ...s, isNew: false }));
        setDisplayedSales(initial);
        isFirstRun.current = false;
        return;
    }

    // Find new sales
    const newSales = currentSales.filter(s => !processedSalesRef.current.has(s.id));
    
    if (newSales.length > 0) {
        newSales.forEach(s => processedSalesRef.current.add(s.id));
        // New sales are naturally at the end of todaysSales list, so we reverse them to put them at top of display
        const newRows = newSales.slice().reverse().map(s => ({ ...s, isNew: true }));
        
        setDisplayedSales(prev => {
            const updated = [...newRows, ...prev];
            return updated.slice(0, 20); // Keep max 20
        });
    }
  }, [todayStats, customers, activeFilter]); // Depend on activeFilter

  // --- Hourly Revenue Data for Chart ---
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({ 
      hour: i.toString().padStart(2, '0') + ':00', 
      revenue: 0,
      sales: 0
    }));
    
    todayStats.todaysSales.forEach(s => {
      const h = new Date(s.date).getHours();
      if (hours[h]) {
        hours[h].revenue += (s.netTotal || s.total);
        hours[h].sales += 1;
      }
    });
    
    // Filter to current hour for cleaner view
    const currentHour = new Date().getHours();
    return hours.slice(0, currentHour + 1);
  }, [todayStats.todaysSales]);

  // --- Top Products Data ---
  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string, qty: number, revenue: number }> = {};
    
    todayStats.todaysSales.forEach(s => {
      s.items.forEach(i => {
        // Find current drug info from products prop for consistent naming
        const drug = products.find(d => d.id === i.id);
        const name = drug?.name || i.name;
        
        if (!productMap[i.id]) {
          productMap[i.id] = { name, qty: 0, revenue: 0 };
        }
        // Quantity accumulation is now handled with effectiveQty below to account for returns
        let effectiveQty = i.quantity;
        if (s.itemReturnedQuantities && s.itemReturnedQuantities[i.id]) {
            effectiveQty -= s.itemReturnedQuantities[i.id];
        }
        
        // Use effective quantity for both count and revenue
        productMap[i.id].qty += effectiveQty;
        productMap[i.id].revenue += (i.price * effectiveQty);
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // Top 5
  }, [todayStats.todaysSales, products]);


  // Helper for Payment Method Visual
  const getPaymentMethodLabel = (method?: string) => {
      if (!method) return t.cash || 'Cash';
      return method === 'visa' ? (t.visa || 'Card') : (t.cash || 'Cash');
  };

  return (
    <div className="h-full overflow-y-auto pe-2 space-y-4 animate-fade-in pb-10" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with Live Indicator */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 type-expressive">
          <span className="material-symbols-rounded text-emerald-500">monitoring</span>
          {t.realTimeSales?.title || 'Real-time Sales Monitor'}
        </h2>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
           <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider">LIVE</span>
        </div>
      </div>

      {/* --- HERO STATS (Compact & Expandable) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* 1. Revenue Card */}
        <div 
            onClick={() => setExpandedView('revenue')}
            className={`p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4 cursor-pointer hover:border-${color}-300 transition-colors group relative`}
        >
             <span className="material-symbols-rounded absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm rtl:right-auto rtl:left-2">open_in_full</span>
          <div className={`text-${color}-600 dark:text-${color}-400`}>
            <span className="material-symbols-rounded text-4xl">payments</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">{t.realTimeSales?.todayRevenue || "Today's Revenue"}</p>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <AnimatedCounter value={todayStats.revenue} prefix="$" fractionDigits={2} />
              </div>
              <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  todayStats.revenueChange > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                 {todayStats.revenueChange > 0 ? '+' : ''}{Math.abs(todayStats.revenueChange).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* 2. Transactions Card */}
        <div 
            onClick={() => setExpandedView('transactions')}
            className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-300 transition-colors group relative"
        >
             <span className="material-symbols-rounded absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm rtl:right-auto rtl:left-2">open_in_full</span>
          <div className="text-blue-600 dark:text-blue-400">
            <span className="material-symbols-rounded text-4xl">receipt_long</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">{t.realTimeSales?.totalTransactions || 'Total Transactions'}</p>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <AnimatedCounter value={todayStats.transactions} />
              </div>
              <p className="text-[10px] text-gray-400">
                ${todayStats.avgTransactionValue.toFixed(0)} avg
              </p>
            </div>
          </div>
        </div>

        {/* 3. Items Sold Card */}
        <div 
            onClick={() => setExpandedView('items')}
            className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4 cursor-pointer hover:border-purple-300 transition-colors group relative"
        >
            <span className="material-symbols-rounded absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm rtl:right-auto rtl:left-2">open_in_full</span>
          <div className="text-purple-600 dark:text-purple-400">
            <span className="material-symbols-rounded text-4xl">inventory_2</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">{t.realTimeSales?.itemsSold || 'Items Sold'}</p>
             <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <AnimatedCounter value={todayStats.itemsSold} />
              </div>
              <p className="text-[10px] text-gray-400 truncate max-w-[80px]" title={todayStats.topCategory}>
                {todayStats.topCategory}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Active Counters Card */}
        <div 
            onClick={() => setExpandedView('counters')}
             className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4 cursor-pointer hover:border-amber-300 transition-colors group relative"
        >
            <span className="material-symbols-rounded absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm rtl:right-auto rtl:left-2">open_in_full</span>
          <div className="text-amber-600 dark:text-amber-400 relative">
            <span className="material-symbols-rounded text-4xl">point_of_sale</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">{t.realTimeSales?.activeCounters || 'Active Counters'}</p>
            <div className="flex items-baseline gap-2">
              <div className="flex items-center text-2xl font-bold text-gray-900 dark:text-gray-100">
                   <AnimatedCounter value={todayStats.activeCounters} />
                   <span className="text-sm font-normal text-gray-400 ms-1">/{todayStats.totalCounters}</span>
              </div>
               <p className="text-[10px] text-gray-400">
                {todayStats.onHoldCount} hold
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        
        {/* Left Column: Transactions + Insight Cards */}
        <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Recent Transactions Feed */}
            <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-[400px] overflow-hidden">
           <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 type-expressive">
                 <span className="material-symbols-rounded text-gray-400 text-xl">history</span>
                 {t.realTimeSales?.recentTransactions || 'Recent Transactions'}
               </h3>
               
               {/* Filters */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {['ALL', 'VIP', 'HIGH_VALUE'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter as any)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                                activeFilter === filter
                                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            {filter === 'ALL' ? 'All' : filter === 'VIP' ? 'VIP' : 'High Value'}
                        </button>
                    ))}
                </div>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left rtl:text-right border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <th className="pb-3 px-2">Time</th>
                          <th className="pb-3 px-2">ID</th>
                          <th className="pb-3 px-2">Items</th>
                          <th className="pb-3 px-2">Total</th>
                          <th className="pb-3 px-2">Method</th>
                          <th className="pb-3 px-2">Status</th>
                      </tr>
                  </thead>
                  <tbody>
                      {displayedSales.map((sale, idx) => {
                          const isHighValue = todayStats.highValueIds.has(sale.id);
                          let isVIP = false;
                          if (sale.customerCode) {
                              const customer = customers.find(c => c.code === sale.customerCode || c.serialId?.toString() === sale.customerCode);
                              if (customer && customer.totalPurchases >= 1000) isVIP = true;
                          } else if (sale.customerName) {
                               const customer = customers.find(c => c.name === sale.customerName);
                               if (customer && customer.totalPurchases >= 1000) isVIP = true;
                          }

                          return (
                          <tr key={sale.id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${sale.isNew ? 'new-transaction' : ''} ${(isVIP || isHighValue) ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                              <td className="py-3 px-2 text-sm text-gray-500">
                                  {new Date(sale.date).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 px-2 text-sm font-medium text-gray-900 dark:text-gray-200">#{sale.id}</td>
                              <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">{sale.items.length}</td>
                              <td className="py-3 px-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                  ${sale.total.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-xs">
                                  <span className={`flex items-center gap-1 w-fit text-xs font-bold ${
                                      sale.paymentMethod === 'visa' 
                                      ? 'text-blue-600 dark:text-blue-400' 
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                      <span className="material-symbols-rounded text-[16px]">
                                        {sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                                      </span>
                                      {getPaymentMethodLabel(sale.paymentMethod)}
                                  </span>
                              </td>
                              <td className="py-3 px-2 text-xs">
                                  <div className="flex flex-col gap-1 items-start">
                                      {isVIP && (
                                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                              <span className="material-symbols-rounded text-[16px]">verified</span>
                                              VIP
                                          </div>
                                      )}
                                      {isHighValue && (
                                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                              <span className="material-symbols-rounded text-[16px]">stars</span>
                                              High Value
                                          </div>
                                      )}
                                      {!isVIP && !isHighValue && (
                                           <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                      )}
                                  </div>
                              </td>
                          </tr>
                          );
                      })}
                      {todayStats.todaysSales.length === 0 && (
                          <tr>
                              <td colSpan={6} className="py-10 text-center text-gray-400">
                                  No transactions yet today.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
           </div>
            </div>
            
            {/* --- Insight Cards (Moved from bottom) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                {/* Hourly Sales Rate */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Sales Rate</p>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                             <AnimatedCounter value={todayStats.hourlySalesRate} prefix="$" fractionDigits={0} />
                             <span className="text-[10px] text-gray-400 font-normal ms-1">/hr</span>
                        </div>
                </div>

                {/* Hourly Invoice Rate */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Invoices</p>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                            <AnimatedCounter value={todayStats.hourlyInvoiceRate} fractionDigits={1} />
                            <span className="text-[10px] text-gray-400 font-normal ms-1">/hr</span>
                        </div>
                </div>

                {/* New Customers Per Hour */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">New Cust.</p>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                            <AnimatedCounter value={todayStats.hourlyNewCustomerRate} fractionDigits={1} />
                            <span className="text-[10px] text-gray-400 font-normal ms-1">/hr</span>
                        </div>
                </div>

                {/* Order Distribution (Simple) */}
                <div className="md:col-span-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0">Orders</p>
                    <div className="flex-1 flex items-center gap-4 text-[10px]">
                        <div className="flex-1">
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Walk-in</span> <span className="font-bold">{todayStats.walkInRate.toFixed(0)}%</span></div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${todayStats.walkInRate}%` }}></div></div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Delivery</span> <span className="font-bold">{todayStats.deliveryRate.toFixed(0)}%</span></div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5"><div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${todayStats.deliveryRate}%` }}></div></div>
                        </div>
                    </div>
                </div>

                {/* Customer Loyalty (Simple) */}
                <div className="md:col-span-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0">Customers</p>
                    <div className="flex-1 flex items-center gap-4 text-[10px]">
                        <div className="flex-1">
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Reg.</span> <span className="font-bold">{todayStats.registeredRate.toFixed(0)}%</span></div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${todayStats.registeredRate}%` }}></div></div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Anon.</span> <span className="font-bold">{todayStats.anonymousRate.toFixed(0)}%</span></div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5"><div className="bg-gray-400 h-1.5 rounded-full" style={{ width: `${todayStats.anonymousRate}%` }}></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Right: Top Products & Hourly Chart */}
        <div className="lg:col-span-2 space-y-4">
             {/* Hourly Chart (Compact) */}
             <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm min-h-[220px]">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4 type-expressive">Hourly Trend</h3>
                <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={hourlyData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} interval={2} />
                            <Tooltip 
                                cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl">
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                                ${Number(payload[0].value).toFixed(2)}
                                            </p>
                                        </div>
                                    );
                                    }
                                    return null;
                                }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* Top Products List */}
             <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex-1">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 type-expressive">Top Products</h3>
                    <span className="text-xs text-gray-400">by Qty</span>
                 </div>
                 <div className="space-y-3">
                     {topProducts.map((p, idx) => (
                         <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group">
                             <div className="flex items-center gap-3 overflow-hidden">
                                 <div className={`w-8 h-8 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 flex items-center justify-center font-bold text-xs shrink-0`}>
                                     {idx + 1}
                                 </div>
                                 <div className="truncate">
                                     <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-amber-600 transition-colors">{p.name}</p>
                                     <p className="text-xs text-gray-400">{p.qty} sold</p>
                                 </div>
                             </div>
                             <div className="text-right shrink-0">
                                 <div className="text-sm font-bold text-gray-900 dark:text-gray-100 flex justify-end">
                                      <AnimatedCounter value={p.revenue} prefix="$" fractionDigits={0} />
                                 </div>
                             </div>
                         </div>
                     ))}
                     {topProducts.length === 0 && (
                         <div className="text-center py-4 text-gray-400 text-sm">No data yet</div>
                     )}
                 </div>
             </div>
        </div>
      </div>

      {/* --- SECONDARY CONTENT GRID (Restored Cards) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          
          {/* Payment Methods Chart */}
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm min-h-[300px] flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 type-expressive">Payment Methods</h3>
              <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={[
                                  { name: t.cash || 'Cash', value: todayStats.todaysSales.filter(s => !s.paymentMethod || s.paymentMethod === 'cash').reduce((sum, s) => sum + (s.netTotal || s.total), 0), color: '#10b981' }, // Emerald
                                  { name: t.visa || 'Card', value: todayStats.todaysSales.filter(s => s.paymentMethod === 'visa').reduce((sum, s) => sum + (s.netTotal || s.total), 0), color: '#6366f1' } // Indigo
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {[0, 1].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#6366f1'} />
                              ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px' }} formatter={(value: number) => `$${value.toFixed(2)}`} />
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-center">
                          <p className="text-xs text-gray-400">Total</p>
                          <div className="text-xl font-bold text-gray-800 dark:text-gray-200 flex justify-center">
                              <AnimatedCounter value={todayStats.revenue} prefix="$" fractionDigits={0} />
                          </div>
                      </div>
                  </div>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t.cash || 'Cash'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t.visa || 'Card'}</span>
                  </div>
              </div>
          </div>

          {/* Category Distribution */}
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm min-h-[300px] flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 type-expressive">Sales by Category</h3>
              <div className="w-full h-[250px] relative">
                  {(() => {
                      // Group data into the 3 specific categories
                      const groups = {
                          'Medicine': 0,
                          'Cosmetic': 0,
                          'General': 0
                      };

                      todayStats.todaysSales.forEach(sale => {
                          sale.items.forEach(item => {
                              let cat = item.category || '';
                              if (!cat || typeof cat !== 'string' || cat.trim() === '') {
                                  const product = products.find(p => p.id === item.id);
                                  cat = product?.category || '';
                              }
                              
                              // Calculate item total (quantity * price)
                              // Use effective quantity if possible or just raw quantity since this is distribution
                              const itemTotal = (item.price || 0) * (item.quantity || 0);
                              const lowerCat = cat.toLowerCase();

                              // Simple keyword matching for demo/default categorization
                              if (lowerCat.match(/tablet|capsule|syrup|injection|antibiotic|medicine|pharmacy|drug|pill/)) {
                                  groups['Medicine'] += itemTotal;
                              } else if (lowerCat.match(/cream|lotion|skin|hair|cosmetic|beauty|shampoo|soap|gel/)) {
                                  groups['Cosmetic'] += itemTotal;
                              } else {
                                  groups['General'] += itemTotal;
                              }
                          });
                      });

                      const chartData = [
                          { name: 'Medicine', value: groups['Medicine'], color: '#3b82f6' },      // Blue-500
                          { name: 'Cosmetic', value: groups['Cosmetic'], color: '#ec4899' },      // Pink-500
                          { name: 'General', value: groups['General'], color: '#94a3b8' } // Slate-400
                      ].filter(d => d.value > 0);

                      if (chartData.length === 0) {
                           return (
                              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                  <span className="material-symbols-rounded text-4xl mb-2 opacity-50">donut_small</span>
                                  <p className="text-sm">No sales data yet</p>
                              </div>
                          );
                      }

                      return (
                          <div className="flex items-center h-full">
                              <div className="flex-1 h-full min-h-[220px] relative">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                          <Pie
                                              data={chartData}
                                              cx="50%"
                                              cy="50%"
                                              innerRadius={60}
                                              outerRadius={80}
                                              paddingAngle={5}
                                              dataKey="value"
                                          >
                                              {chartData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                              ))}
                                          </Pie>
                                          <Tooltip 
                                              cursor={false}
                                              content={({ active, payload }) => {
                                                  if (active && payload && payload.length) {
                                                      const data = payload[0];
                                                      return (
                                                          <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl">
                                                              <div className="flex items-center gap-2 mb-1">
                                                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }}></span>
                                                                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{data.name}</p>
                                                              </div>
                                                              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                                                  ${Number(data.value).toFixed(2)}
                                                              </p>
                                                          </div>
                                                      );
                                                  }
                                                  return null;
                                              }}
                                          />
                                      </PieChart>
                                  </ResponsiveContainer>
                                  {/* Center Text */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                      <span className="text-xs text-gray-400 font-medium uppercase">Total</span>
                                      <div className="text-xl font-bold text-gray-800 dark:text-gray-200 flex justify-center">
                                          <AnimatedCounter value={chartData.reduce((sum, item) => sum + item.value, 0)} prefix="$" fractionDigits={0} />
                                      </div>
                                  </div>
                              </div>
                              {/* Custom Legend */}
                              <div className="w-1/3 flex flex-col justify-center gap-3 pr-2">
                                  {chartData.map((item, idx) => (
                                      <div key={idx}>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                                          </div>
                                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 pl-4.5">${item.value.toFixed(2)}</p>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })()}
              </div>
          </div>

          {/* Returns Summary */}
            <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm min-h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Return Activity</h3>
                  <span className="text-xs font-bold px-2 py-1 bg-rose-100 text-rose-700 rounded-lg">Today</span>
              </div>
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
                   <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500">
                       <span className="material-symbols-rounded text-4xl">assignment_return</span>
                   </div>
                   <div>
                       <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex justify-center">
                           <AnimatedCounter value={todayStats.todaysSales.reduce((sum, s) => sum + (s.hasReturns ? 1 : 0), 0)} />
                       </div>
                       <p className="text-sm text-gray-500">Returns Processed</p>
                   </div>
                   <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
                       <div>
                           <p className="text-xs text-gray-400 uppercase">Value</p>
                           <div className="text-lg font-bold text-rose-600 flex justify-center">
                               <AnimatedCounter 
                                   value={todayStats.todaysSales
                                   .filter(s => s.hasReturns)
                                   .reduce((sum, s) => {
                                       let returnValue = 0;
                                       if (s.itemReturnedQuantities) {
                                           s.items.forEach(item => {
                                               const returnedQty = s.itemReturnedQuantities?.[item.id] || 0;
                                               returnValue += returnedQty * (item.price || 0);
                                           });
                                       }
                                       return sum + returnValue;
                                   }, 0)} 
                                   prefix="$" 
                                   fractionDigits={2} 
                               />
                           </div>
                       </div>
                       <div>
                           <p className="text-xs text-gray-400 uppercase">Rate</p>
                           <div className="text-lg font-bold text-gray-700 dark:text-gray-300 flex justify-center">
                               <AnimatedCounter 
                                   value={(todayStats.transactions > 0 
                                  ? (todayStats.todaysSales.filter(s => s.hasReturns).length / todayStats.transactions * 100) 
                                  : 0)} 
                                   suffix="%" 
                                   fractionDigits={1} 
                               />
                           </div>
                       </div>
                   </div>
              </div>
          </div>

      </div>



      {/* --- EXPANDED MODALS --- */}
      
      {/* Revenue Expansion */}
      <ExpandedModal
        isOpen={expandedView === 'revenue'}
        onClose={() => setExpandedView(null)}
        title="Revenue Analysis"
        color={color}
      >
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="h-[400px]">
                     <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={hourlyData}>
                             <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                             <XAxis 
                                dataKey="hour" 
                                axisLine={false} 
                                tickLine={false} 
                                tickFormatter={(val) => {
                                    // Format "14:00" -> "2 PM"
                                    const h = parseInt(val.split(':')[0]);
                                    const ampm = h >= 12 ? 'PM' : 'AM';
                                    const hour12 = h % 12 || 12;
                                    return `${hour12} ${ampm}`;
                                }}
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                             />
                             <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tickFormatter={(val) => `$${val}`} 
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                             />
                             <Tooltip 
                                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        // Parse label "14:00" -> "2 PM"
                                        const h = parseInt(label.split(':')[0]);
                                        const ampm = h >= 12 ? 'PM' : 'AM';
                                        const hour12 = h % 12 || 12;
                                        const timeLabel = `${hour12} ${ampm}`;

                                        return (
                                            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl">
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{timeLabel}</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                                    ${Number(payload[0].value).toFixed(2)}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                             />
                             <Area 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                fill="url(#revenueGradient)" 
                                animationDuration={1000}
                             />
                         </AreaChart>
                     </ResponsiveContainer>
                </div>
            </div>
            {/* Add more detailed stats here if needed */}
        </div>
      </ExpandedModal>

      {/* Transactions Expansion */}
      <ExpandedModal
        isOpen={expandedView === 'transactions'}
        onClose={() => setExpandedView(null)}
        title="Today's Transactions"
        color="blue"
      >
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden">
               <table className="w-full text-left rtl:text-right">
                   <thead className="bg-gray-50 dark:bg-gray-800/50">
                       <tr>
                           <th className="p-4 text-sm font-bold text-gray-500">ID</th>
                           <th className="p-4 text-sm font-bold text-gray-500">Time</th>
                           <th className="p-4 text-sm font-bold text-gray-500">Items</th>
                           <th className="p-4 text-sm font-bold text-gray-500">Customer</th>
                           <th className="p-4 text-sm font-bold text-gray-500">Payment</th>
                           <th className="p-4 text-sm font-bold text-gray-500 text-end">Total</th>
                       </tr>
                   </thead>
                   <tbody>
                       {todayStats.todaysSales.map(sale => (
                           <tr key={sale.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                               <td className="p-4 text-sm font-bold">#{sale.id}</td>
                               <td className="p-4 text-sm text-gray-500">{new Date(sale.date).toLocaleTimeString()}</td>
                               <td className="p-4 text-sm">{sale.items.length} items</td>
                               <td className="p-4 text-sm">{sale.customerName}</td>
                               <td className="p-4 text-sm">{getPaymentMethodLabel(sale.paymentMethod)}</td>
                               <td className="p-4 text-sm font-bold text-end">${sale.total.toFixed(2)}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>
          </div>
      </ExpandedModal>
      
      {/* Items Expansion */}
      <ExpandedModal
        isOpen={expandedView === 'items'}
        onClose={() => setExpandedView(null)}
        title="Inventory Analysis"
        color="purple"
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden">
             <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                 <h3 className="font-bold text-lg">Top Performing Products</h3>
                 <div className="flex gap-2">
                     <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">By Quantity</span>
                     <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold">By Revenue</span>
                 </div>
             </div>
             <table className="w-full text-left rtl:text-right">
                 <thead className="bg-gray-50 dark:bg-gray-800/50">
                     <tr>
                         <th className="p-4 text-sm font-bold text-gray-500">Rank</th>
                         <th className="p-4 text-sm font-bold text-gray-500">Product Name</th>
                         <th className="p-4 text-sm font-bold text-gray-500">Category</th>
                         <th className="p-4 text-sm font-bold text-gray-500 text-end">Qty Sold</th>
                         <th className="p-4 text-sm font-bold text-gray-500 text-end">Revenue</th>
                     </tr>
                 </thead>
                 <tbody>
                     {topProducts.map((p, idx) => (
                         <tr key={idx} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                             <td className="p-4 text-sm text-gray-500">#{idx + 1}</td>
                             <td className="p-4 text-sm font-bold">{p.name}</td>
                             <td className="p-4 text-sm text-gray-500">General</td>
                             <td className="p-4 text-sm font-bold text-end">{p.qty}</td>
                             <td className="p-4 text-sm font-bold text-end">${p.revenue.toFixed(2)}</td>
                         </tr>
                     ))}
                 </tbody>
             </table>
        </div>
      </ExpandedModal>

      {/* Counters Expansion */}
      <ExpandedModal
        isOpen={expandedView === 'counters'}
        onClose={() => setExpandedView(null)}
        title="Counter Status"
        color="amber"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map(id => (
                <div key={id} className={`p-6 rounded-2xl border ${id <= 3 ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900' : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-rounded text-2xl">point_of_sale</span>
                            <div>
                                <h4 className="font-bold text-lg">Counter {id}</h4>
                                <p className="text-xs text-gray-500">Main Hall</p>
                            </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${id <= 3 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                            {id <= 3 ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                    <div className="flex justify-between items-end">
                         <div>
                             <p className="text-xs text-gray-500 mb-1">Operator</p>
                             <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                                 <span className="text-sm font-medium">{id <= 3 ? `User ${id}` : 'Unmanned'}</span>
                             </div>
                         </div>
                         <div className="text-right">
                             <p className="text-xs text-gray-500 mb-0.5">Today's Sales</p>
                             <p className="font-bold text-lg">{id <= 3 ? `$${(Math.random() * 1000).toFixed(2)}` : '-'}</p>
                         </div>
                    </div>
                </div>
            ))}
        </div>
      </ExpandedModal>
    </div>
  );
};
