

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Drug, Sale, Purchase, ExpandedView } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { formatCurrency, getCurrencySymbol, formatCompactCurrency } from '../../utils/currency';
import { useDashboardAnalytics } from './useDashboardAnalytics';
import { InsightTooltip, CurrencyValue } from '../common/InsightTooltip';
import { getDisplayName } from '../../utils/drugDisplayName';
import { MaterialTabs } from '../common/MaterialTabs';
import { ExpandedModal } from '../common/ExpandedModal';
import { ChartWidget } from '../common/ChartWidget';
import { SmallCard } from '../common/SmallCard';
import { DASHBOARD_HELP } from '../../i18n/helpInstructions';
import { HelpModal, HelpButton } from '../common/HelpModal';
import { Modal } from '../common/Modal';
import { UserRole, canPerformAction } from '../../config/permissions';

interface DashboardProps {
  inventory: Drug[];
  sales: Sale[];
  purchases: Purchase[];
  color: string;
  t: any;
  onRestock: (id: string, qty: number, isUnit?: boolean) => void;
  subView?: string;
  language: string;
  userRole: UserRole;
}

export const Dashboard: React.FC<DashboardProps> = ({ inventory, sales, purchases, color, t, onRestock, subView, language, userRole }) => {
  const [restockDrug, setRestockDrug] = useState<Drug | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockIsUnit, setRestockIsUnit] = useState(false);
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

  // --- STATS & ANALYTICS ---
  const totalExpenses = useMemo(() => purchases.reduce((sum, p) => sum + p.totalCost, 0), [purchases]);

  const { 
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
    revenueTooltip: revenueTooltipData,
    inventoryTooltip: inventoryTooltipData,
    profitTooltip: profitTooltipData,
    lowStockTooltip: lowStockTooltipData
  } = useDashboardAnalytics({ sales, inventory, totalExpenses, language });

  const lowStockItems = useMemo(() => inventory.filter(d => d.stock <= 10), [inventory]);

  const revenueTooltip = <InsightTooltip {...revenueTooltipData} language={language} />;
  const expensesTooltip = <InsightTooltip {...inventoryTooltipData} language={language} />;
  const profitTooltip = <InsightTooltip {...profitTooltipData} language={language} />;
  const lowStockTooltip = <InsightTooltip {...lowStockTooltipData} language={language} />;

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

  // --- TOP SELLING PRODUCTS (accounting for returns) ---
  const topSelling = useMemo(() => {
    // Store full item details keyed by ID to preserve dosageForm
    const productSales: Record<string, { name: string, dosageForm?: string, qty: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach((item, idx) => {
        // Subtract returned quantities
        const lineKey = `${item.id}_${idx}`;
        const returnedQty = sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualQty = item.quantity - returnedQty;
        
        if (actualQty > 0) {
          if (!productSales[item.id]) {
            productSales[item.id] = { 
              name: item.name, 
              dosageForm: item.dosageForm,
              qty: 0 
            };
          }
          productSales[item.id].qty += actualQty;
        }
      });
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  const topSelling20 = useMemo(() => {
    const productSales: Record<string, { name: string, dosageForm?: string, qty: number, revenue: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach((item, idx) => {
        // Subtract returned quantities
        const lineKey = `${item.id}_${idx}`;
        const returnedQty = sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualQty = item.quantity - returnedQty;
        
        if (actualQty > 0) {
          if (!productSales[item.id]) {
            productSales[item.id] = { 
                name: item.name, 
                dosageForm: item.dosageForm,
                qty: 0, 
                revenue: 0 
            };
          }
          const entry = productSales[item.id];
          entry.qty += actualQty;
          
          // Calculate effective price for units
          let effectivePrice = item.price;
          if (item.isUnit && item.unitsPerPack) {
            effectivePrice = item.price / item.unitsPerPack;
          }
          entry.revenue += effectivePrice * actualQty;
        }
      });
    });
    
    return Object.values(productSales)
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

  // --- RECENT TRANSACTIONS (exclude fully returned orders) ---
  const recentSales = useMemo(() => {
    return [...sales]
      .filter(sale => {
        // If netTotal is 0, it's definitely fully returned
        if ((sale.netTotal ?? sale.total) === 0) return false;
        
        // If it has returns, check if ALL items were returned (even if delivery fee remains)
        if (sale.hasReturns && sale.itemReturnedQuantities) {
           const totalItemsQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
           const totalReturnedQty = Object.values(sale.itemReturnedQuantities).reduce((sum, qty) => sum + qty, 0);
           
           // If all items returned, exclude from list (even if delivery fee exists)
           if (totalReturnedQty >= totalItemsQty) return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sales]);

  const recentSales20 = useMemo(() => {
    return [...sales]
      .filter(sale => {
        if ((sale.netTotal ?? sale.total) === 0) return false;
        
        if (sale.hasReturns && sale.itemReturnedQuantities) {
           const totalItemsQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
           const totalReturnedQty = Object.values(sale.itemReturnedQuantities).reduce((sum, qty) => sum + qty, 0);
           if (totalReturnedQty >= totalItemsQty) return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [sales]);

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (restockDrug && restockQty > 0) {
        onRestock(restockDrug.id, restockQty, restockIsUnit);
        setRestockDrug(null);
        setRestockQty(10);
        setRestockIsUnit(false);
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
      className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 opacity-0 group-hover:opacity-100"
      title={title || t.expand?.expand || 'Expand'}
    >
      <span className="material-symbols-rounded text-xl">open_in_full</span>
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
            {formatCurrency(payload[0].value)}
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
        {/* Revenue Card: Primary financial intake indicator */}
        {canPerformAction(userRole, 'reports.view_financial') && (
          <div 
            onClick={() => setExpandedView('revenue')}
            className="cursor-pointer transition-transform active:scale-95 touch-manipulation"
          >
            <SmallCard
              title={t.revenue}
              value={totalRevenue}
              icon="payments"
              iconColor={color}
              type="currency"
              currencyLabel={getCurrencySymbol()}
              fractionDigits={2}
              iconTooltip={revenueTooltip} // Advanced analytics on hover
            />
          </div>
        )}

        {/* Expenses Card: Direct spending on stock and operations */}
        {canPerformAction(userRole, 'reports.view_financial') && (
          <div 
            onClick={() => setExpandedView('expenses')}
            className="cursor-pointer transition-transform active:scale-95 touch-manipulation"
          >
            <SmallCard
              title={t.expenses}
              value={totalExpenses}
              icon="shopping_cart_checkout"
              iconColor="red"
              type="currency"
              currencyLabel={getCurrencySymbol()}
              fractionDigits={2}
              iconTooltip={expensesTooltip} // Advanced analytics on hover
            />
          </div>
        )}

        {/* Net Profit Card: Bottom-line pharmacy health */}
        {canPerformAction(userRole, 'reports.view_financial') && (
          <div 
            onClick={() => setExpandedView('profit')}
            className="cursor-pointer transition-transform active:scale-95 touch-manipulation"
          >
            <SmallCard
              title={t.profit}
              value={netProfit}
              icon="trending_up"
              iconColor="emerald"
              type="currency"
              currencyLabel={getCurrencySymbol()}
              fractionDigits={2}
              iconTooltip={profitTooltip} // Advanced analytics on hover
            />
          </div>
        )}

        {/* Low Stock Card: Operational critical alerts */}
        <div 
          onClick={() => setExpandedView('lowStock')}
          className="cursor-pointer transition-transform active:scale-95 touch-manipulation"
        >
          <SmallCard
            title={t.lowStock}
            value={lowStockItems.length}
            icon="warning"
            iconColor="orange"
            fractionDigits={0}
            iconTooltip={lowStockTooltip} // Advanced analytics on hover
          />
        </div>
      </div>

      {/* Row 2: Chart & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart (2 Cols) */}
        <ChartWidget
            title={t.trend}
            data={salesData.map(d => ({ date: d.name, sales: d.sales }))}
            dataKeys={{ primary: 'sales' }}
            color={chartColors.main}
            language={language as 'AR' | 'EN'}
            onExpand={() => setExpandedView('salesChart')}
            unit={getCurrencySymbol()}
            allowChartTypeSelection={true}
            primaryLabel={t.totalSales || 'Sales'}
            className="h-80"
            chartClassName="h-[90%]"
        />

        {/* Top Selling Products (1 Col) */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-80 flex flex-col group`}>
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 type-expressive">
                    <span className="material-symbols-rounded text-yellow-500 text-[20px]">hotel_class</span>
                    {t.topSelling}
                </h3>
                <ExpandButton onClick={() => setExpandedView('topSelling')} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pe-1" dir="ltr">
                {topSelling.length === 0 ? (
                     <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t.noResults || "No sales data"}</div>
                ) : (
                    topSelling.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-6 h-6 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 font-bold text-xs flex items-center justify-center shrink-0`}>
                                    {index + 1}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate item-name">{getDisplayName(item)}</span>
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
                <div className="flex-1 overflow-y-auto space-y-2 pe-1" dir="ltr">
                    {lowStockItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t.allGood}</div>
                    ) : (
                        lowStockItems.slice(0, 5).map(item => (
                            <div key={item.id} className="flex justify-between items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-rounded text-base">warning</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate item-name">{getDisplayName(item)}</p>
                                        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase">{item.stock} {t.expand?.allItems || 'left'}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setRestockDrug(item)}
                                    className={`text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium hover:bg-${color}-50 hover:text-${color}-600 dark:hover:bg-gray-700 transition-colors shrink-0 ms-2`}
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
                <div className="flex-1 overflow-y-auto space-y-2 pe-1" dir="ltr">
                    {expiringItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t.noExpiring}</div>
                    ) : (
                        expiringItems.slice(0, 5).map(item => {
                            const days = getDaysUntilExpiry(item.expiryDate);
                            const isExpired = days < 0;
                            return (
                                <div key={item.id} className="flex justify-between items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}`}>
                                            <span className="material-symbols-rounded text-base">event_busy</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate item-name">{getDisplayName(item)}</p>
                                            <p className={`text-[10px] font-bold uppercase ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-500'}`}>
                                                {isExpired ? t.expired : `${days} ${t.days}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium shrink-0 ms-2 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg">
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
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${color}-50 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
                                    <span className="material-symbols-rounded">shopping_bag</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        {sale.customerName || "Guest"}
                                        {sale.customerCode && (
                                            <span 
                                                dir="ltr"
                                                className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider bg-transparent"
                                            >
                                                <span className="material-symbols-rounded text-sm">tag</span>
                                                {sale.customerCode}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{new Date(sale.date).toLocaleDateString()} • {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                        <span className="text-xs">#{sale.id}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                        <span className={`inline-flex items-center ${sale.paymentMethod === 'visa' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                                            <span className="material-symbols-rounded text-base">{sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider bg-transparent">
                                            <span className="material-symbols-rounded text-sm">package_2</span>
                                            {sale.items.length}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-end">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(sale.netTotal ?? sale.total)}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                  {sale.hasReturns && (() => {
                                    // Calculate total returned items
                                    let totalReturned = 0;
                                    sale.items.forEach((item, idx) => {
                                      const lineKey = `${item.id}_${idx}`;
                                      totalReturned += sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
                                    });
                                    const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                                    return (
                                      <span className="text-orange-500 flex items-center gap-0.5">
                                        <span className="material-symbols-rounded text-[12px]">keyboard_return</span>
                                        <span className="text-[10px]">({totalReturned}/{totalItems})</span>
                                      </span>
                                    );
                                  })()}
                                  {/* Item count moved to payment badge */}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>

       {/* Restock Modal */}
       {restockDrug && (
        <Modal
            isOpen={true}
            onClose={() => setRestockDrug(null)}
            size="sm"
            zIndex={50}
            title={t.modal.title}
            subtitle={`${getDisplayName(restockDrug)} (${restockDrug.stock} left)`}
        >
             
             <form onSubmit={handleRestockSubmit} className="space-y-5">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                       <label className="text-xs font-bold text-gray-500 uppercase">{t.modal.qty}</label>
                       <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                           <button 
                               type="button"
                               onClick={() => setRestockIsUnit(false)}
                               className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!restockIsUnit ? `bg-white dark:bg-gray-700 text-${color}-600 shadow-sm` : 'text-gray-400'}`}
                           >
                               {t.pos?.pack || 'Pack'}
                           </button>
                           <button 
                               type="button"
                               onClick={() => setRestockIsUnit(true)}
                               className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${restockIsUnit ? `bg-white dark:bg-gray-700 text-${color}-600 shadow-sm` : 'text-gray-400'}`}
                           >
                               {t.pos?.unit || 'Unit'}
                           </button>
                       </div>
                   </div>
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
        </Modal>
      )}

      {/* Expanded Modals */}
      {/* Revenue Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'revenue'}
        onClose={() => setExpandedView(null)}
        title={t.dashboard?.revenue || 'Total Revenue'}
        color={color}
        t={t}
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
            <p className={`text-4xl font-bold text-${color}-900 dark:text-${color}-100`}>{formatCurrency(totalRevenue)}</p>
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
                {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : formatCurrency(0)}
              </p>
            </div>
          </div>

          <div className="h-80" dir="ltr">
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
        title={t.dashboard?.expenses || 'Expenses'}
        color={color}
        t={t}
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
            <p className="text-4xl font-bold text-red-900 dark:text-red-100">{formatCurrency(totalExpenses)}</p>
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
                {purchases.length > 0 ? formatCurrency(totalExpenses / purchases.length) : formatCurrency(0)}
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
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(purchase.totalCost)}</p>
              </div>
            ))}
          </div>
        </div>
      </ExpandedModal>

      {/* Profit Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'profit'}
        onClose={() => setExpandedView(null)}
        title={t.dashboard?.netProfit || 'Net Profit'}
        color={color}
        t={t}
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
            <p className={`text-4xl font-bold ${netProfit >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>{formatCurrency(netProfit)}</p>
            <p className="text-sm text-gray-500 mt-2">{t.expand?.breakdown || 'Revenue - Expenses'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.revenue}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expenses}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalExpenses)}</p>
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
        title={t.dashboard?.lowStockItems || 'Low Stock Items'}
        color={color}
        t={t}
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
                <div key={item.id} className="p-4 rounded-2xl bg-transparent border border-orange-200 dark:border-orange-800 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{getDisplayName(item)}</p>
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
        title={t.dashboard?.topSelling || 'Top Selling Products'}
        color={color}
        t={t}
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
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate item-name">{getDisplayName(item)}</p>
                    <p className="text-sm text-gray-500">{item.qty} {t.sold} • {formatCurrency(item.revenue)} {t.revenue}</p>
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
                <div key={item.id} className={`p-4 rounded-2xl border ${isExpired ? 'bg-transparent border-red-200 dark:border-red-800' : 'bg-transparent border-yellow-200 dark:border-yellow-800'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 item-name">{getDisplayName(item)}</p>
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
        <div className={`relative space-y-1 py-1 ${language === 'AR' ? 'pr-6' : 'pl-6'}`}>
          {/* Vertical Timeline Rail */}
          <div className={`absolute top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800 z-0 ${language === 'AR' ? 'right-[11px]' : 'left-[11px]'}`}></div>

          {recentSales20.length === 0 ? (
            <div className="text-center py-12 text-gray-400">{t.expand?.noData || 'No transactions yet'}</div>
          ) : (
            recentSales20.map((sale, index) => {
               // Determine node color based on status/returns
               const hasReturns = sale.hasReturns;
               const nodeColor = hasReturns ? 'orange' : (sale.customerCode ? 'blue' : 'gray');
               
               // Calculate relative time
               const getRelativeTime = (d: Date) => {
                  const now = new Date();
                  const diff = now.getTime() - d.getTime();
                  const mins = Math.floor(diff / 60000);
                  const hours = Math.floor(mins / 60);
                  
                  if (mins < 1) return t.justNow || 'Just now';
                  if (mins < 60) return language === 'AR' ? `${t.ago || 'منذ'} ${mins} د` : `${mins}m ${t.ago || 'ago'}`;
                  if (hours < 24) return language === 'AR' ? `${t.ago || 'منذ'} ${hours} س` : `${hours}h ${t.ago || 'ago'}`;
                  return d.toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
               };

               return (
                <div key={sale.id} className="relative z-10">
                   {/* Timeline Node */}
                   <div className={`absolute top-6 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm z-10 ${
                      hasReturns ? 'bg-orange-400' : `bg-${color}-500`
                   } ${language === 'AR' ? '-right-[18px]' : '-left-[18px]'}`}></div>

                    <MaterialTabs
                        index={index}
                        total={recentSales20.length}
                        className="!h-auto py-2 !flex-col !items-stretch gap-1 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors shadow-sm"
                    >
                        <div className="flex items-center justify-between gap-3 mb-1">
                            {/* Left Side: Icon, Name, Code, Time */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 dark:text-${color}-300 shrink-0`}>
                                    <span className="material-symbols-rounded text-[18px]">shopping_bag</span>
                                </div>
                                
                                <p className="font-bold text-gray-900 dark:text-gray-100 text-xs truncate">
                                    {sale.customerName || "Guest"}
                                </p>
                                
                                {sale.customerCode && (
                                    <span className="text-[9px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-mono border border-gray-200 dark:border-gray-700 shrink-0">
                                        #{sale.customerCode}
                                    </span>
                                )}
                                
                                <span className="text-[9px] text-gray-400 font-normal shrink-0">
                                    {getRelativeTime(new Date(sale.date))}
                                </span>
                            </div>

                            {/* Right Side: Payment, Price, Returns */}
                            <div className="flex items-center gap-3 shrink-0">
                                {/* Payment Icon */}
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${sale.paymentMethod === 'visa' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`} title={sale.paymentMethod === 'visa' ? t.visa : t.cash}>
                                    <span className="material-symbols-rounded text-[14px]">
                                        {sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                                    </span>
                                </div>

                                {/* Price */}
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {formatCurrency(sale.netTotal ?? sale.total)}
                                </p>
                                
                                {/* Item Count / Returns Info */}
                                <div className="text-[10px] text-gray-400 flex items-center gap-1 min-w-[30px] justify-end">
                                    {sale.hasReturns ? (() => {
                                        let totalReturned = 0;
                                        sale.items.forEach((item, idx) => {
                                            const lineKey = `${item.id}_${idx}`;
                                            totalReturned += sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
                                        });
                                        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                                        return (
                                            <span className="text-orange-500 flex items-center gap-0.5" title={`${totalReturned}/${totalItems} returned`}>
                                                <span className="material-symbols-rounded text-[14px]">keyboard_return</span>
                                            </span>
                                        );
                                    })() : (
                                        <span>({sale.items.length})</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-800" dir="ltr">
                        <div className="space-y-0.5">
                            {sale.items.map((item, idx) => {
                            const lineKey = `${item.id}_${idx}`;
                            const returnedQty = sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
                            const hasReturn = returnedQty > 0;
                            
                            return (
                                <div key={idx} className={`flex justify-between text-xs ${
                                    hasReturn 
                                        ? (returnedQty === item.quantity 
                                            ? 'bg-red-50 dark:bg-red-950/20 rounded px-1.5 py-0.5 -mx-1.5' // Full return
                                            : 'bg-orange-50 dark:bg-orange-950/20 rounded px-1.5 py-0.5 -mx-1.5') // Partial return
                                        : ''
                                }`}>
                                <span className={`${
                                    hasReturn 
                                        ? (returnedQty === item.quantity ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300') 
                                        : 'text-gray-600 dark:text-gray-400'
                                } item-name flex items-center gap-1`}>
                                    {hasReturn && <span className={`material-symbols-rounded text-[10px] ${returnedQty === item.quantity ? 'text-red-500' : 'text-orange-500'}`}>keyboard_return</span>}
                                    <span>{getDisplayName(item)}</span> 
                                    <span className="text-gray-400 text-[10px]">x{item.quantity}</span>
                                    {hasReturn && <span className={`text-[9px] ${returnedQty === item.quantity ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>({returnedQty})</span>}
                                </span>
                                <span className="text-gray-900 dark:text-gray-100 font-medium text-[11px]" dir="ltr">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            );
                            })}
                        </div>
                        </div>
                    </MaterialTabs>
                </div>
              );
            })
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
          <div className="h-96" dir="ltr">
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
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.expand?.amount || 'Average'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : formatCurrency(0)}
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
