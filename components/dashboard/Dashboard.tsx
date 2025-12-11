

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Drug, Sale, Purchase, ExpandedView } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { ExpandedModal } from '../common/ExpandedModal';
import { DASHBOARD_HELP } from '../../i18n/helpInstructions';
import { HelpModal, HelpButton } from '../common/HelpModal';

interface DashboardProps {
  inventory: Drug[];
  sales: Sale[];
  purchases: Purchase[];
  color: string;
  t: any;
  onRestock: (id: string, qty: number) => void;
  subView?: string;
  language: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ inventory, sales, purchases, color, t, onRestock, subView, language }) => {
  const [restockDrug, setRestockDrug] = useState<Drug | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [expandedView, setExpandedView] = useState<ExpandedView>(null);
  const [showHelp, setShowHelp] = useState(false);

  const helpContent = DASHBOARD_HELP[language as 'EN' | 'AR'] || DASHBOARD_HELP.EN;

  // Map subView to expandedView
  useEffect(() => {
    if (!subView) return;
    
    switch (subView) {
      case 'Top Selling Products':
        setExpandedView('topSelling');
        break;
      case 'Sales Trends (7 days)':
      case 'Sales Trends (30 days)':
        setExpandedView('salesChart');
        break;
      case 'Slow Moving Products':
      case 'Low Stock Alerts':
        setExpandedView('lowStock');
        break;
      case 'Expiring Soon':
        setExpandedView('expiring');
        break;
      case 'Recent Activities':
      case 'Real-time Sales Monitor':
        setExpandedView('recentSales');
        break;
      case 'Executive Summary':
      default:
        setExpandedView(null);
        break;
    }
  }, [subView]);

  // --- Helper Functions ---
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- STATS ---
  const lowStockItems = useMemo(() => inventory.filter(d => d.stock <= 10), [inventory]);
  const totalRevenue = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);
  const totalExpenses = useMemo(() => purchases.reduce((sum, p) => sum + p.totalCost, 0), [purchases]);
  const netProfit = totalRevenue - totalExpenses;

  // --- CHART DATA (Sales by Date) ---
  const salesData = useMemo(() => {
    return sales.reduce((acc: any[], sale) => {
      const date = new Date(sale.date).toLocaleDateString('en-US', { weekday: 'short' });
      const existing = acc.find(a => a.name === date);
      if (existing) {
        existing.sales += sale.total;
      } else {
        acc.push({ name: date, sales: sale.total });
      }
      return acc;
    }, []).slice(-7);
  }, [sales]);

  // --- TOP SELLING PRODUCTS ---
  const topSelling = useMemo(() => {
    const productSales: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  const topSelling20 = useMemo(() => {
    const productSales: Record<string, { qty: number, revenue: number }> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.name]) {
          productSales[item.name] = { qty: 0, revenue: 0 };
        }
        productSales[item.name].qty += item.quantity;
        productSales[item.name].revenue += item.price * item.quantity;
      });
    });
    return Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 20);
  }, [sales]);

  // --- EXPIRING SOON ITEMS (Next 3 months) ---
  const expiringItems = useMemo(() => {
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    return inventory
      .filter(d => {
        const expDate = new Date(d.expiryDate);
        return expDate <= threeMonthsFromNow;
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [inventory]);

  // --- RECENT TRANSACTIONS ---
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sales]);

  const recentSales20 = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [sales]);

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (restockDrug && restockQty > 0) {
        onRestock(restockDrug.id, restockQty);
        setRestockDrug(null);
        setRestockQty(10);
    }
  };

  const getDaysUntilExpiry = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Expand button component
  const ExpandButton = ({ onClick, title }: { onClick: () => void, title?: string }) => (
    <button 
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      title={title || t.expand?.expand || 'Expand'}
    >
      <span className="material-symbols-rounded text-[18px]">open_in_full</span>
    </button>
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when subView changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [subView]);

  // --- CUSTOM TOOLTIP ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            ${payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  // --- CHART COLOR LOGIC ---
  const chartStatus = useMemo(() => {
    if (salesData.length < 2) return 'default';
    const first = salesData[0].sales;
    const last = salesData[salesData.length - 1].sales;
    
    if (last > first) return 'up';
    if (last < first) return 'down';
    return 'flat';
  }, [salesData]);

  const getChartColors = (status: string) => {
    switch (status) {
      case 'up':
        return {
          main: '#10b981', // emerald-500
          start: '#34d399', // emerald-400
          end: '#059669',   // emerald-600
        };
      case 'down':
        return {
          main: '#ef4444', // red-500
          start: '#f87171', // red-400
          end: '#dc2626',   // red-600
        };
      case 'flat':
        return {
          main: '#f97316', // orange-500
          start: '#fb923c', // orange-400
          end: '#ea580c',   // orange-600
        };
      default:
        return {
          main: `var(--primary-500)`,
          start: `var(--primary-400)`,
          end: `var(--primary-600)`,
        };
    }
  };

  const chartColors = getChartColors(chartStatus);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto pe-2 space-y-4 animate-fade-in pb-10">
      <h2 className="text-2xl font-bold tracking-tight mb-4 type-expressive">{t.title}</h2>
      
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className={`p-5 rounded-3xl bg-${color}-50 dark:bg-${color}-950/20 ${CARD_BASE} flex flex-col justify-between min-h-[120px] group relative`}>
          <div className="absolute top-3 right-3">
            <ExpandButton onClick={() => setExpandedView('revenue')} />
          </div>
          <div className={`text-${color}-600 dark:text-${color}-400 mb-1`}>
            <span className="material-symbols-rounded text-3xl">payments</span>
          </div>
          <div>
            <p className={`text-xs font-bold text-${color}-800 dark:text-${color}-300 uppercase opacity-70`}>{t.revenue}</p>
            <p className={`text-2xl font-bold text-${color}-900 dark:text-${color}-100 type-expressive`}>${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Expenses */}
        <div className={`p-5 rounded-3xl flex flex-col justify-between min-h-[120px] group relative ${CARD_BASE}`}>
          <div className="absolute top-3 right-3">
            <ExpandButton onClick={() => setExpandedView('expenses')} />
          </div>
           <div className="text-red-500 mb-1">
            <span className="material-symbols-rounded text-3xl">shopping_cart_checkout</span>
          </div>
           <div>
            <p className="text-xs font-bold text-gray-500 uppercase">{t.expenses}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 type-expressive">${totalExpenses.toFixed(2)}</p>
          </div>
        </div>

        {/* Net Profit */}
         <div 
          className={`p-5 rounded-3xl flex flex-col justify-between min-h-[120px] group relative ${CARD_BASE}`}
        >
          <div className="absolute top-3 right-3">
            <ExpandButton onClick={() => setExpandedView('profit')} />
          </div>
           <div className="text-emerald-500 mb-1">
            <span className="material-symbols-rounded text-3xl">trending_up</span>
          </div>
           <div>
            <p className="text-xs font-bold text-gray-500 uppercase">{t.profit}</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} type-expressive`}>${netProfit.toFixed(2)}</p>
          </div>
        </div>

        {/* Low Stock */}
        <div className={`p-5 rounded-3xl flex flex-col justify-between min-h-[120px] group relative ${CARD_BASE}`}>
          <div className="absolute top-3 right-3">
            <ExpandButton onClick={() => setExpandedView('lowStock')} />
          </div>
          <div className="text-orange-500 mb-1">
            <span className="material-symbols-rounded text-3xl">warning</span>
          </div>
           <div>
            <p className="text-xs font-bold text-gray-500 uppercase">{t.lowStock}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 type-expressive">{lowStockItems.length}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Chart & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart (2 Cols) */}
        <div className={`lg:col-span-2 p-5 rounded-3xl ${CARD_BASE} h-80 relative group`}>
          <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 type-expressive">{t.trend}</h3>
              <ExpandButton onClick={() => setExpandedView('salesChart')} />
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={salesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.main} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartColors.main} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="strokeSales" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.start} stopOpacity={1}/>
                  <stop offset="100%" stopColor={chartColors.end} stopOpacity={1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ stroke: chartColors.start, strokeWidth: 2 }}
              />
              <Area type="monotone" dataKey="sales" stroke="url(#strokeSales)" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Products (1 Col) */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-80 flex flex-col group`}>
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 type-expressive">
                    <span className="material-symbols-rounded text-yellow-500 text-[20px]">hotel_class</span>
                    {t.topSelling}
                </h3>
                <ExpandButton onClick={() => setExpandedView('topSelling')} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pe-1">
                {topSelling.length === 0 ? (
                     <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t.noResults || "No sales data"}</div>
                ) : (
                    topSelling.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-6 h-6 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 font-bold text-xs flex items-center justify-center shrink-0`}>
                                    {index + 1}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate item-name">{item.name}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md whitespace-nowrap">
                                {item.qty} {t.sold}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Row 3: Alerts & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Low Stock & Expiring Combined Area */}
        <div className="flex flex-col gap-4">
            
            {/* Low Stock List */}
            <div className={`p-5 rounded-3xl ${CARD_BASE} h-64 flex flex-col group`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 type-expressive">
                      <span className="material-symbols-rounded text-orange-500 text-[20px]">priority_high</span>
                      {t.attention}
                  </h3>
                  <ExpandButton onClick={() => setExpandedView('lowStock')} />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pe-1">
                    {lowStockItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t.allGood}</div>
                    ) : (
                        lowStockItems.slice(0, 5).map(item => (
                            <div key={item.id} className="flex justify-between items-center p-2.5 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50">
                                <div>
                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 item-name">{item.name}</p>
                                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase">{item.stock} left</p>
                                </div>
                                <button 
                                    onClick={() => setRestockDrug(item)}
                                    className={`text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm font-medium text-${color}-600 hover:bg-${color}-50 dark:hover:bg-gray-700 transition-colors`}
                                >
                                    {t.restock}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Expiring Soon List */}
            <div className={`p-5 rounded-3xl ${CARD_BASE} h-64 flex flex-col group`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <span className="material-symbols-rounded text-red-500 text-[20px]">event_busy</span>
                      {t.expiringSoon}
                  </h3>
                  <ExpandButton onClick={() => setExpandedView('expiring')} />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pe-1">
                    {expiringItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t.noExpiring}</div>
                    ) : (
                        expiringItems.slice(0, 5).map(item => {
                            const days = getDaysUntilExpiry(item.expiryDate);
                            const isExpired = days < 0;
                            return (
                                <div key={item.id} className={`flex justify-between items-center p-2.5 rounded-2xl border ${isExpired ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-100 dark:border-yellow-900/50'}`}>
                                    <div>
                                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 item-name">{item.name}</p>
                                        <p className={`text-[10px] font-bold uppercase ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-500'}`}>
                                            {isExpired ? t.expired : `${days} ${t.days}`}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {item.expiryDate}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

        </div>

        {/* Recent Transactions */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-auto max-h-[530px] flex flex-col group`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <span className="material-symbols-rounded text-blue-500 text-[20px]">receipt_long</span>
                  {t.recentSales}
              </h3>
              <ExpandButton onClick={() => setExpandedView('recentSales')} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
                {recentSales.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t.noResults || "No transactions yet"}</div>
                ) : (
                    recentSales.map(sale => (
                        <div key={sale.id} className="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 px-2 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-${color}-50 dark:bg-${color}-900/30 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}>
                                    <span className="material-symbols-rounded">shopping_bag</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        {sale.customerName || "Guest"}
                                        {sale.customerCode && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">#{sale.customerCode}</span>}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{new Date(sale.date).toLocaleDateString()} • {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                        <span className="font-mono text-xs text-gray-400">#{sale.id}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                        <span className={`flex items-center gap-1 ${sale.paymentMethod === 'visa' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                                            <span className="material-symbols-rounded text-[14px]">{sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}</span>
                                            {sale.paymentMethod === 'visa' ? t.visa : t.cash}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-end">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">${sale.total.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">{sale.items.length} {t.items || "items"}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>

       {/* Restock Modal */}
       {restockDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
             <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900`}>
                 <h3 className={`text-lg font-semibold text-${color}-900 dark:text-${color}-100`}>
                    {t.modal.title}
                 </h3>
                 <p className="text-xs text-gray-500 mt-1">{restockDrug.name} ({restockDrug.stock} left)</p>
             </div>
             
             <form onSubmit={handleRestockSubmit} className="p-5 space-y-5">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase">{t.modal.qty}</label>
                   <div className="flex items-center gap-3">
                       <button 
                         type="button" 
                         onClick={() => setRestockQty(Math.max(1, restockQty - 5))}
                         className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                       >
                           <span className="material-symbols-rounded text-lg">remove</span>
                       </button>
                       <input 
                          type="number" 
                          required
                          min="1"
                          className="flex-1 p-2 text-center text-lg font-bold rounded-xl bg-gray-50 dark:bg-gray-950 border-none focus:ring-2 focus:ring-inset transition-all"
                          style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                          value={restockQty} 
                          onChange={e => setRestockQty(parseInt(e.target.value) || 0)} 
                       />
                       <button 
                         type="button" 
                         onClick={() => setRestockQty(restockQty + 5)}
                         className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                       >
                           <span className="material-symbols-rounded text-lg">add</span>
                       </button>
                   </div>
                </div>

                <div className="flex gap-3">
                   <button 
                     type="button" 
                     onClick={() => setRestockDrug(null)} 
                     className="flex-1 py-2.5 rounded-full font-medium text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                   >
                     {t.modal.cancel}
                   </button>
                   <button 
                     type="submit" 
                     className={`flex-1 py-2.5 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95`}
                   >
                     {t.modal.confirm}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Expanded Modals */}
      {/* Revenue Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'revenue'}
        onClose={() => setExpandedView(null)}
        title={t.revenue}
        color={color}
        actions={
          <button
            onClick={() => exportToCSV([{ metric: 'Total Revenue', value: totalRevenue }], 'revenue')}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">download</span>
            {t.expand?.exportCSV || 'Export'}
          </button>
        }
      >
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl bg-${color}-50 dark:bg-${color}-950/20 border border-${color}-100 dark:border-${color}-900`}>
            <p className={`text-sm font-bold text-${color}-800 dark:text-${color}-300 uppercase mb-2`}>{t.revenue}</p>
            <p className={`text-4xl font-bold text-${color}-900 dark:text-${color}-100`}>${totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-2">{t.expand?.historicalTrend || 'Based on all sales'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expand?.metrics || 'Total Sales'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sales.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expand?.amount || 'Average Sale'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSalesExpanded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.main} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={chartColors.main} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="strokeSalesExpanded" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartColors.start} stopOpacity={1}/>
                    <stop offset="100%" stopColor={chartColors.end} stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.start, strokeWidth: 2 }} />
                <Area type="monotone" dataKey="sales" stroke="url(#strokeSalesExpanded)" fillOpacity={1} fill="url(#colorSalesExpanded)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ExpandedModal>

      {/* Expenses Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'expenses'}
        onClose={() => setExpandedView(null)}
        title={t.expenses}
        color={color}
        actions={
          <button
            onClick={() => exportToCSV([{ metric: 'Total Expenses', value: totalExpenses }], 'expenses')}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">download</span>
            {t.expand?.exportCSV || 'Export'}
          </button>
        }
      >
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
            <p className="text-sm font-bold text-red-800 dark:text-red-300 uppercase mb-2">{t.expenses}</p>
            <p className="text-4xl font-bold text-red-900 dark:text-red-100">${totalExpenses.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-2">{t.expand?.historicalTrend || 'Based on all purchases'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expand?.metrics || 'Total Purchases'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{purchases.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expand?.amount || 'Average Purchase'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${purchases.length > 0 ? (totalExpenses / purchases.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.expand?.detailedView || 'Recent Purchases'}</h4>
            {purchases.slice(0, 10).map(purchase => (
              <div key={purchase.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{purchase.supplierName}</p>
                  <p className="text-xs text-gray-500">{new Date(purchase.date).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">${purchase.totalCost.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </ExpandedModal>

      {/* Profit Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'profit'}
        onClose={() => setExpandedView(null)}
        title={t.profit}
        color={color}
        actions={
          <button
            onClick={() => exportToCSV([
              { metric: 'Total Revenue', value: totalRevenue },
              { metric: 'Total Expenses', value: totalExpenses },
              { metric: 'Net Profit', value: netProfit }
            ], 'profit')}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">download</span>
            {t.expand?.exportCSV || 'Export'}
          </button>
        }
      >
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl ${netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900'}`}>
            <p className={`text-sm font-bold uppercase mb-2 ${netProfit >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>{t.profit}</p>
            <p className={`text-4xl font-bold ${netProfit >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>${netProfit.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-2">{t.expand?.breakdown || 'Revenue - Expenses'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.revenue}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expenses}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalExpenses.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expand?.profitMargin || 'Margin'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </div>
      </ExpandedModal>

      {/* Low Stock Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'lowStock'}
        onClose={() => setExpandedView(null)}
        title={`${t.lowStock} (${lowStockItems.length})`}
        color={color}
        actions={
          <button
            onClick={() => exportToCSV(
              lowStockItems.map(item => ({
                name: item.name,
                category: item.category,
                stock: item.stock,
                price: item.price
              })),
              'low_stock_items'
            )}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">download</span>
            {t.expand?.exportCSV || 'Export'}
          </button>
        }
      >
        <div className="space-y-4">
          {lowStockItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">{t.allGood}</div>
          ) : (
            <div className="grid gap-3">
              {lowStockItems.map(item => (
                <div key={item.id} className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.category}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase mt-1">
                      {item.stock} {t.expand?.allItems || 'units left'}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setRestockDrug(item);
                      setExpandedView(null);
                    }}
                    className={`px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-sm font-medium text-${color}-600 hover:bg-${color}-50 dark:hover:bg-gray-700 transition-colors`}
                  >
                    {t.restock}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ExpandedModal>

      {/* Top Selling Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'topSelling'}
        onClose={() => setExpandedView(null)}
        title={t.expand?.top20 || 'Top 20 Products'}
        color={color}
        actions={
          <button
            onClick={() => exportToCSV(
              topSelling20.map((item, i) => ({
                rank: i + 1,
                name: item.name,
                quantity: item.qty,
                revenue: item.revenue.toFixed(2)
              })),
              'top_selling_products'
            )}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">download</span>
            {t.expand?.exportCSV || 'Export'}
          </button>
        }
      >
        <div className="space-y-3">
          {topSelling20.length === 0 ? (
            <div className="text-center py-12 text-gray-400">{t.expand?.noData || 'No sales data'}</div>
          ) : (
            topSelling20.map((item, index) => (
              <div key={item.name} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 font-bold flex items-center justify-center shrink-0`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate item-name">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.qty} {t.sold} • ${item.revenue.toFixed(2)} {t.revenue}</p>
                  </div>
                </div>
                <div className="text-end">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`bg-${color}-500 h-2 rounded-full`}
                      style={{ width: `${(item.qty / topSelling20[0].qty) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ExpandedModal>

      {/* Expiring Items Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'expiring'}
        onClose={() => setExpandedView(null)}
        title={`${t.expiringSoon} (${expiringItems.length})`}
        color={color}
        actions={
          <button
            onClick={() => exportToCSV(
              expiringItems.map(item => ({
                name: item.name,
                category: item.category,
                stock: item.stock,
                expiryDate: item.expiryDate,
                daysUntilExpiry: getDaysUntilExpiry(item.expiryDate)
              })),
              'expiring_items'
            )}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">download</span>
            {t.expand?.exportCSV || 'Export'}
          </button>
        }
      >
        <div className="space-y-3">
          {expiringItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">{t.noExpiring}</div>
          ) : (
            expiringItems.map(item => {
              const days = getDaysUntilExpiry(item.expiryDate);
              const isExpired = days < 0;
              return (
                <div key={item.id} className={`p-4 rounded-2xl border ${isExpired ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-100 dark:border-yellow-900/50'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 item-name">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.category} • {item.stock} in stock</p>
                      <p className={`text-xs font-bold uppercase mt-1 ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-500'}`}>
                        {isExpired ? t.expired : `${days} ${t.days}`}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {item.expiryDate}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ExpandedModal>

      {/* Recent Sales Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'recentSales'}
        onClose={() => setExpandedView(null)}
        title={`${t.recentSales} (${recentSales20.length})`}
        color={color}
        actions={
          <button
            onClick={() => exportToCSV(
              recentSales20.map(sale => ({
                id: sale.id,
                date: new Date(sale.date).toLocaleString(),
                customer: sale.customerName || 'Guest',
                code: sale.customerCode || '-',
                payment: sale.paymentMethod === 'visa' ? 'Visa' : 'Cash',
                items: sale.items.length,
                total: sale.total.toFixed(2)
              })),
              'recent_transactions'
            )}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">download</span>
            {t.expand?.exportCSV || 'Export'}
          </button>
        }
      >
        <div className="space-y-3">
          {recentSales20.length === 0 ? (
            <div className="text-center py-12 text-gray-400">{t.expand?.noData || 'No transactions yet'}</div>
          ) : (
            recentSales20.map(sale => (
              <div key={sale.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-${color}-50 dark:bg-${color}-900/30 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}>
                      <span className="material-symbols-rounded">shopping_bag</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {sale.customerName || "Guest"}
                        {sale.customerCode && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">#{sale.customerCode}</span>}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>{new Date(sale.date).toLocaleDateString()} • {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                        <span className="font-mono text-xs text-gray-400">#{sale.id}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                        <span className={`flex items-center gap-1 ${sale.paymentMethod === 'visa' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                            <span className="material-symbols-rounded text-[14px]">{sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}</span>
                            {sale.paymentMethod === 'visa' ? t.visa : t.cash}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">${sale.total.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{sale.items.length} {t.items || "items"}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t.expand?.transactionDetails || 'Items'}</p>
                  <div className="space-y-1">
                    {sale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 item-name">{item.name} x{item.quantity}</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ExpandedModal>

      {/* Sales Chart Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'salesChart'}
        onClose={() => setExpandedView(null)}
        title={t.trend}
        color={color}
        actions={
          <button
            onClick={() => exportToCSV(salesData, 'sales_trend')}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">download</span>
            {t.expand?.exportCSV || 'Export'}
          </button>
        }
      >
        <div className="space-y-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSalesChartExpanded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.main} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={chartColors.main} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="strokeSalesChartExpanded" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartColors.start} stopOpacity={1}/>
                    <stop offset="100%" stopColor={chartColors.end} stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 13}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 13}} />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: chartColors.start, strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="sales" stroke="url(#strokeSalesChartExpanded)" fillOpacity={1} fill="url(#colorSalesChartExpanded)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expand?.metrics || 'Total Sales'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sales.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.revenue}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expand?.amount || 'Average'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </ExpandedModal>

      {/* Help */}
      <HelpButton onClick={() => setShowHelp(true)} title={helpContent.title} color={color} isRTL={language === 'AR'} />
      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} helpContent={helpContent as any} color={color} language={language} />
    </div>
  );
};
