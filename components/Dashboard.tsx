

import React, { useState, useMemo } from 'react';
import { Drug, Sale, Purchase } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

interface DashboardProps {
  inventory: Drug[];
  sales: Sale[];
  purchases: Purchase[];
  color: string;
  t: any;
  onRestock: (id: string, qty: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ inventory, sales, purchases, color, t, onRestock }) => {
  const [restockDrug, setRestockDrug] = useState<Drug | null>(null);
  const [restockQty, setRestockQty] = useState(10);

  // --- Nested/Future Functions for Item Actions ---
  const handleWidgetRefresh = (widgetName: string) => {
    console.log(`[Future Implementation] Refreshing data for widget: ${widgetName}`);
  };

  const handleExportWidget = (widgetName: string) => {
    console.log(`[Future Implementation] Exporting data for widget: ${widgetName}`);
  };

  // --- STATS ---
  const lowStockItems = useMemo(() => inventory.filter(d => d.stock <= 10), [inventory]);
  const totalRevenue = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);
  const totalExpenses = useMemo(() => purchases.reduce((sum, p) => sum + p.totalCost, 0), [purchases]);
  // Simple Profit calculation: Revenue - Expenses. 
  // Note: For accounting, we usually track cost of goods sold (COGS), but this is a simplified view.
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

  return (
    <div className="h-full overflow-y-auto pe-2 space-y-4 animate-fade-in pb-10">
      <h2 className="text-2xl font-medium tracking-tight mb-4">{t.title}</h2>
      
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className={`p-5 rounded-3xl bg-${color}-50 dark:bg-${color}-950/20 border border-${color}-100 dark:border-${color}-900 flex flex-col justify-between min-h-[120px]`}>
          <div className={`text-${color}-600 dark:text-${color}-400 mb-1`}>
            <span className="material-symbols-rounded text-3xl">payments</span>
          </div>
          <div>
            <p className={`text-xs font-bold text-${color}-800 dark:text-${color}-300 uppercase opacity-70`}>{t.revenue}</p>
            <p className={`text-2xl font-bold text-${color}-900 dark:text-${color}-100`}>${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Expenses */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[120px]">
           <div className="text-red-500 mb-1">
            <span className="material-symbols-rounded text-3xl">shopping_cart_checkout</span>
          </div>
           <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t.expenses}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${totalExpenses.toFixed(2)}</p>
          </div>
        </div>

        {/* Net Profit */}
         <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[120px]">
           <div className="text-emerald-500 mb-1">
            <span className="material-symbols-rounded text-3xl">trending_up</span>
          </div>
           <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t.profit}</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>${netProfit.toFixed(2)}</p>
          </div>
        </div>

        {/* Low Stock */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[120px]">
          <div className="text-orange-500 mb-1">
            <span className="material-symbols-rounded text-3xl">warning</span>
          </div>
           <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{t.lowStock}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{lowStockItems.length}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Chart & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-80 relative group">
          <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{t.trend}</h3>
              <button onClick={() => handleExportWidget('SalesTrend')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-rounded text-sm">download</span>
              </button>
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={salesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${color}-500)`} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={`var(--color-${color}-500)`} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: `var(--color-${color}-300)`, strokeWidth: 2 }}
              />
              <Area type="monotone" dataKey="sales" stroke={`var(--color-${color}-500)`} fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Products (1 Col) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-80 flex flex-col group">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-rounded text-yellow-500 text-[20px]">hotel_class</span>
                    {t.topSelling}
                </h3>
                <button onClick={() => handleWidgetRefresh('TopSelling')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-rounded text-sm">refresh</span>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pe-1">
                {topSelling.length === 0 ? (
                     <div className="h-full flex items-center justify-center text-slate-400 text-sm">{t.noResults || "No sales data"}</div>
                ) : (
                    topSelling.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-6 h-6 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 font-bold text-xs flex items-center justify-center shrink-0`}>
                                    {index + 1}
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.name}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md whitespace-nowrap">
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
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-64 flex flex-col">
                <h3 className="text-base font-semibold mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-rounded text-orange-500 text-[20px]">priority_high</span>
                    {t.attention}
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pe-1">
                    {lowStockItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">{t.allGood}</div>
                    ) : (
                        lowStockItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-2.5 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50">
                                <div>
                                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.name}</p>
                                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase">{item.stock} {t.restock ? 'left' : ''}</p>
                                </div>
                                <button 
                                    onClick={() => setRestockDrug(item)}
                                    className={`text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm font-medium text-${color}-600 hover:bg-${color}-50 dark:hover:bg-slate-700 transition-colors`}
                                >
                                    {t.restock}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Expiring Soon List */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-64 flex flex-col">
                <h3 className="text-base font-semibold mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-rounded text-red-500 text-[20px]">event_busy</span>
                    {t.expiringSoon}
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pe-1">
                    {expiringItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">{t.noExpiring}</div>
                    ) : (
                        expiringItems.map(item => {
                            const days = getDaysUntilExpiry(item.expiryDate);
                            const isExpired = days < 0;
                            return (
                                <div key={item.id} className={`flex justify-between items-center p-2.5 rounded-2xl border ${isExpired ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-100 dark:border-yellow-900/50'}`}>
                                    <div>
                                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.name}</p>
                                        <p className={`text-[10px] font-bold uppercase ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-500'}`}>
                                            {isExpired ? t.expired : `${days} ${t.days}`}
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-auto max-h-[530px] flex flex-col">
            <h3 className="text-base font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="material-symbols-rounded text-blue-500 text-[20px]">receipt_long</span>
                {t.recentSales}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
                {recentSales.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">{t.noResults || "No transactions yet"}</div>
                ) : (
                    recentSales.map(sale => (
                        <div key={sale.id} className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-${color}-50 dark:bg-${color}-900/30 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}>
                                    <span className="material-symbols-rounded">shopping_bag</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {sale.customerName || "Guest"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {new Date(sale.date).toLocaleDateString()} • {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                            <div className="text-end">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">${sale.total.toFixed(2)}</p>
                                <p className="text-xs text-slate-500">{sale.items.length} {t.items || "items"}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>

       {/* Restock Modal */}
       {restockDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
             <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900`}>
                 <h3 className={`text-lg font-semibold text-${color}-900 dark:text-${color}-100`}>
                    {t.modal.title}
                 </h3>
                 <p className="text-xs text-slate-500 mt-1">{restockDrug.name} ({restockDrug.stock} left)</p>
             </div>
             
             <form onSubmit={handleRestockSubmit} className="p-5 space-y-5">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.qty}</label>
                   <div className="flex items-center gap-3">
                       <button 
                         type="button" 
                         onClick={() => setRestockQty(Math.max(1, restockQty - 5))}
                         className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                       >
                           <span className="material-symbols-rounded text-lg">remove</span>
                       </button>
                       <input 
                          type="number" 
                          required
                          min="1"
                          className="flex-1 p-2 text-center text-lg font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 focus:ring-inset transition-all"
                          style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                          value={restockQty} 
                          onChange={e => setRestockQty(parseInt(e.target.value) || 0)} 
                       />
                       <button 
                         type="button" 
                         onClick={() => setRestockQty(restockQty + 5)}
                         className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                       >
                           <span className="material-symbols-rounded text-lg">add</span>
                       </button>
                   </div>
                </div>

                <div className="flex gap-3">
                   <button 
                     type="button" 
                     onClick={() => setRestockDrug(null)} 
                     className="flex-1 py-2.5 rounded-full font-medium text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
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
    </div>
  );
};
