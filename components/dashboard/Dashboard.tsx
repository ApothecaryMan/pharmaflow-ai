import type React from 'react';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type UserRole } from '../../config/permissions';
import { HasPermission } from '../common/HasPermission';
import { DASHBOARD_HELP } from '../../i18n/helpInstructions';
import type { Drug, ExpandedView, Purchase, Sale } from '../../types';
import { formatCompactCurrency, formatCurrency, getCurrencySymbol } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { CARD_BASE } from '../../utils/themeStyles';
import { ChartWidget } from '../common/ChartWidget';
import { ExpandedModal } from '../common/ExpandedModal';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { CurrencyValue, InsightTooltip } from '../common/InsightTooltip';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { SmallCard } from '../common/SmallCard';
import { useDashboardAnalytics } from './useDashboardAnalytics';
import { useSettings } from '../../context';
import { formatExpiryDate, parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { batchService } from '../../services/inventory/batchService';
import { useData } from '../../services/DataContext';
import { SegmentedControl } from '../common/SegmentedControl';

interface DashboardProps {
  inventory: Drug[];
  sales: Sale[];
  purchases: Purchase[];
  color: string;
  t: any;
  onRestock: (id: string, qty: number, isUnit?: boolean) => void;
  subView?: string;
  language: string;
}

// --- Helper Functions ---
const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

const getDaysUntilExpiry = (dateStr: string) => {
  const diff = parseExpiryEndOfMonth(dateStr).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getRelativeTime = (d: Date, t: any, language: string) => {
  const diff = new Date().getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const isAR = language === 'AR';

  if (mins < 1) return t.justNow || (isAR ? 'الآن' : 'Just now');
  if (mins < 60) return isAR ? `منذ ${mins} د` : `${mins}m ago`;
  if (hours < 24) return isAR ? `منذ ${hours} س` : `${hours}h ago`;
  return d.toLocaleDateString(isAR ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' });
};

// --- Modular Private Components ---

const ExpandButton: React.FC<{ onClick: () => void; title?: string }> = ({ onClick, title }) => (
  <button
    onClick={onClick}
    className="w-10 h-10 flex items-center justify-center text-(--text-tertiary) hover:text-(--text-primary) transition-all rounded-xl hover:bg-(--bg-menu-hover) active:scale-95 opacity-0 group-hover:opacity-100"
    title={title || 'Expand'}
  >
    <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-md)' }}>open_in_full</span>
  </button>
);

const SectionHeader: React.FC<{ icon: string; title: string; onExpand?: () => void; iconColor?: string }> = ({ icon, title, onExpand, iconColor = 'text-primary-500' }) => (
  <div className="flex justify-between items-center mb-3">
    <h3 className="text-base font-semibold text-(--text-primary) flex items-center gap-2">
      <span className={`material-symbols-rounded ${iconColor}`} style={{ fontSize: 'var(--icon-navbar-dropdown)' }}>{icon}</span>
      {title}
    </h3>
    {onExpand && <ExpandButton onClick={onExpand} />}
  </div>
);

const SummaryCard: React.FC<{ title: string; value: number | string; colorClass: string; footer?: string }> = ({ title, value, colorClass, footer }) => (
  <div className={`p-6 rounded-2xl border ${colorClass}`}>
    <p className="text-sm font-bold uppercase mb-1 opacity-80">{title}</p>
    <p className="text-4xl font-bold">{typeof value === 'number' ? formatCurrency(value) : value}</p>
    {footer && <p className="text-sm mt-2 opacity-60">{footer}</p>}
  </div>
);

const MetricsGrid: React.FC<{ items: { label: string; value: string | number }[] }> = ({ items }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${items.length} gap-4`}>
    {items.map((item, i) => (
      <div key={i} className="p-4 rounded-xl bg-(--bg-page-surface) border border-(--border-divider)">
        <p className="text-xs font-bold text-(--text-tertiary) uppercase mb-1">{item.label}</p>
        <p className="text-2xl font-bold text-(--text-primary)">{item.value}</p>
      </div>
    ))}
  </div>
);

const GenericListItem: React.FC<{ 
  icon?: string; 
  title: string; 
  subtitle: string; 
  value?: string; 
  badge?: string; 
  badgeColor?: string;
  onClick?: () => void;
  actionLabel?: string;
}> = ({ icon, title, subtitle, value, badge, badgeColor = 'text-primary-600', onClick, actionLabel }) => (
  <div className="p-4 rounded-xl bg-(--bg-page-surface) border border-(--border-divider) flex items-center justify-between hover:bg-(--bg-menu-hover) transition-colors">
    <div className="flex items-center gap-4 min-w-0">
      {icon && (
        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-600 shrink-0">
          <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-md)' }}>{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="font-bold text-(--text-primary) truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-(--text-tertiary)">{subtitle}</p>
          {badge && <span className={`text-[10px] font-bold uppercase ${badgeColor}`}>{badge}</span>}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      {value && <p className="font-bold text-(--text-primary)">{value}</p>}
      {onClick && (
        <button onClick={onClick} className="px-4 py-2 rounded-full bg-(--bg-menu) text-primary-600 font-medium text-sm hover:bg-primary-50 transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
  inventory,
  sales,
  purchases,
  color,
  t,
  onRestock,
  subView,
  language,
}) => {
  const [restockDrug, setRestockDrug] = useState<Drug | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockIsUnit, setRestockIsUnit] = useState(false);
  const [expandedView, setExpandedView] = useState<ExpandedView>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { textTransform } = useSettings();
  const { activeBranchId, batches, isLoading } = useData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Scroll to top when subView changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [subView]);

  // --- STATS & ANALYTICS ---
  const totalExpenses = useMemo(
    () => purchases.reduce((sum, p) => sum + p.totalCost, 0),
    [purchases]
  );

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
    lowStockTooltip: lowStockTooltipData,
  } = useDashboardAnalytics({ sales, inventory, batches, totalExpenses, language, branchId: activeBranchId });

  const lowStockItems = useMemo(() => {
    return inventory.filter((d) => {
      const drugBatches = batches.filter(b => b.drugId === d.id && b.branchId === activeBranchId);
      const totalStock = drugBatches.reduce((sum, b) => sum + b.quantity, 0);
      return totalStock <= 10;
    });
  }, [inventory, batches, activeBranchId]);

  const revenueTooltip = <InsightTooltip {...revenueTooltipData} language={language} />;
  const expensesTooltip = <InsightTooltip {...inventoryTooltipData} language={language} />;
  const profitTooltip = <InsightTooltip {...profitTooltipData} language={language} />;
  const lowStockTooltip = <InsightTooltip {...lowStockTooltipData} language={language} />;

  // --- CHART DATA (Sales by Date) ---
  const salesData = useMemo(() => {
    return sales
      .reduce((acc: any[], sale) => {
        const date = new Date(sale.date).toLocaleDateString('en-US', { weekday: 'short' });
        const existing = acc.find((a) => a.name === date);
        if (existing) {
          existing.sales += sale.total;
        } else {
          acc.push({ name: date, sales: sale.total });
        }
        return acc;
      }, [])
      .slice(-7);
  }, [sales]);

  // --- TOP SELLING PRODUCTS (accounting for returns) ---
  const topSelling = useMemo(() => {
    // Store full item details keyed by ID to preserve dosageForm
    const productSales: Record<string, { name: string; dosageForm?: string; qty: number }> = {};

    sales.forEach((sale) => {
      sale.items.forEach((item, idx) => {
        // Subtract returned quantities
        const lineKey = `${item.id}_${idx}`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualQty = item.quantity - returnedQty;

        if (actualQty > 0) {
          if (!productSales[item.id]) {
            productSales[item.id] = {
              name: item.name,
              dosageForm: item.dosageForm,
              qty: 0,
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
    const productSales: Record<
      string,
      { name: string; dosageForm?: string; qty: number; revenue: number }
    > = {};

    sales.forEach((sale) => {
      sale.items.forEach((item, idx) => {
        // Subtract returned quantities
        const lineKey = `${item.id}_${idx}`;
        const returnedQty =
          sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        const actualQty = item.quantity - returnedQty;

        if (actualQty > 0) {
          if (!productSales[item.id]) {
            productSales[item.id] = {
              name: item.name,
              dosageForm: item.dosageForm,
              qty: 0,
              revenue: 0,
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

  // --- EXPIRING SOON ITEMS (Next 3 months - based on real batches) ---
  const expiringItems = useMemo(() => {
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    // Use batches from context
    const branchBatches = batches.filter(b => b.branchId === activeBranchId && b.quantity > 0);
    
    return inventory
      .filter((d) => {
        const drugBatches = branchBatches.filter(b => b.drugId === d.id);
        return drugBatches.some(b => {
          const expDate = parseExpiryEndOfMonth(b.expiryDate);
          return expDate >= today && expDate <= threeMonthsFromNow;
        });
      })
      .map(d => {
         const drugBatches = branchBatches.filter(b => b.drugId === d.id);
         return {
           ...d,
           expiryDate: drugBatches.length > 0 ? drugBatches.sort((a, b) => 
             parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime()
           )[0].expiryDate : d.expiryDate
         };
      })
      .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());
  }, [inventory, batches, activeBranchId]);

  // --- RECENT TRANSACTIONS (exclude fully returned orders) ---
  const recentSales = useMemo(() => {
    return [...sales]
      .filter((sale) => {
        if ((sale.netTotal ?? sale.total) === 0) return false;
        if (sale.hasReturns && sale.itemReturnedQuantities) {
          const totalItemsQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
          const totalReturnedQty = (Object.values(sale.itemReturnedQuantities) as number[]).reduce(
            (sum, qty) => sum + qty,
            0
          );
          if (totalReturnedQty >= totalItemsQty) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(sale => {
        let totalReturned = 0;
        sale.items.forEach((item, idx) => {
          const lineKey = `${item.id}_${idx}`;
          totalReturned += sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        });
        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        return { 
          ...sale, 
          returnStats: { returned: totalReturned, total: totalItems },
          timeAgo: getRelativeTime(new Date(sale.date), t, language)
        };
      });
  }, [sales, t, language]);

  const recentSales20 = useMemo(() => {
    return [...sales]
      .filter((sale) => {
        if ((sale.netTotal ?? sale.total) === 0) return false;

        if (sale.hasReturns && sale.itemReturnedQuantities) {
          const totalItemsQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
          const totalReturnedQty = (Object.values(sale.itemReturnedQuantities) as number[]).reduce(
            (sum, qty) => sum + qty,
            0
          );
          if (totalReturnedQty >= totalItemsQty) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
      .map((sale) => {
        let totalReturned = 0;
        sale.items.forEach((item, idx) => {
          const lineKey = `${item.id}_${idx}`;
          totalReturned +=
            sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        });
        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        return { 
          ...sale, 
          returnStats: { returned: totalReturned, total: totalItems },
          timeAgo: getRelativeTime(new Date(sale.date), t, language)
        };
      });
  }, [sales, t, language]);

  const handleRestockSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (restockDrug && restockQty > 0) {
        onRestock(restockDrug.id, restockQty, restockIsUnit);
        setRestockDrug(null);
        setRestockQty(10);
        setRestockIsUnit(false);
      }
    },
    [restockDrug, restockQty, restockIsUnit, onRestock]
  );

  // --- CUSTOM TOOLTIP ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700'>
          <p className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'>{label}</p>
          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
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

  const chartColors = useMemo(() => {
    const colors: Record<string, any> = {
      up: { main: '#10b981', start: '#34d399', end: '#059669' },
      down: { main: '#ef4444', start: '#f87171', end: '#dc2626' },
      flat: { main: '#f97316', start: '#fb923c', end: '#ea580c' },
      default: {
        main: `var(--primary-500)`,
        start: `var(--primary-400)`,
        end: `var(--primary-600)`,
      },
    };
    return colors[chartStatus] || colors.default;
  }, [chartStatus]);

  return (
    <div
      ref={scrollContainerRef}
      className='h-full overflow-y-auto pe-2 space-y-4 animate-fade-in pb-10'
    >
      <h1 className='text-2xl font-bold tracking-tight mb-4 page-title'>{t.title}</h1>

      {/* Stats Cards Row */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'>
        {[
          {
            id: 'revenue',
            title: t.revenue,
            value: totalRevenue,
            icon: 'payments',
            iconColor: color === 'primary' ? 'primary' : color,
            type: 'currency',
            tooltip: revenueTooltip,
            permission: 'reports.view_financial',
          },
          {
            id: 'expenses',
            title: t.expenses,
            value: totalExpenses,
            icon: 'shopping_cart_checkout',
            iconColor: 'red',
            type: 'currency',
            tooltip: expensesTooltip,
            permission: 'reports.view_financial',
          },
          {
            id: 'profit',
            title: t.profit,
            value: netProfit,
            icon: 'trending_up',
            iconColor: 'emerald',
            type: 'currency',
            tooltip: profitTooltip,
            permission: 'reports.view_financial',
          },
          {
            id: 'lowStock',
            title: t.lowStock,
            value: lowStockItems.length,
            icon: 'warning',
            iconColor: 'orange',
            type: 'number',
            tooltip: lowStockTooltip,
          },
        ].map((card) => {
          const cardContent = (
            <div
              key={card.id}
              onClick={() => setExpandedView(card.id as ExpandedView)}
              className='cursor-pointer transition-transform active:scale-95 touch-manipulation'
            >
              <SmallCard
                title={card.title}
                value={card.value}
                icon={card.icon}
                iconColor={card.iconColor}
                type={card.type as any}
                currencyLabel={card.type === 'currency' ? getCurrencySymbol() : undefined}
                fractionDigits={card.type === 'currency' ? 2 : 0}
                iconTooltip={card.tooltip}
                isLoading={isLoading}
              />
            </div>
          );

          return card.permission ? (
            <HasPermission key={card.id} action={card.permission as any}>
              {cardContent}
            </HasPermission>
          ) : (
            cardContent
          );
        })}
      </div>

      {/* Row 2: Chart & Top Selling */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Sales Chart (2 Cols) */}
        <ChartWidget
          title={t.trend}
          data={salesData.map((d) => ({ date: d.name, sales: d.sales }))}
          dataKeys={{ primary: 'sales' }}
          color={chartColors.main}
          language={language as 'AR' | 'EN'}
          onExpand={() => setExpandedView('salesChart')}
          unit={getCurrencySymbol()}
          allowChartTypeSelection={true}
          primaryLabel={t.totalSales || 'Sales'}
          className='h-80'
          chartClassName='h-[90%]'
          isLoading={isLoading}
        />

        {/* Top Selling Products (1 Col) */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-80 flex flex-col group`}>
          <SectionHeader 
            icon="hotel_class" 
            title={t.topSelling} 
            onExpand={() => setExpandedView('topSelling')} 
            iconColor="text-yellow-500" 
          />
          <div className='flex-1 overflow-y-auto space-y-3 pe-1' dir='ltr'>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className='flex items-center justify-between p-2 animate-pulse'>
                  <div className='flex items-center gap-3 overflow-hidden'>
                    <div className='w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0' />
                    <div className='h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded' />
                  </div>
                  <div className='h-6 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-md' />
                </div>
              ))
            ) : topSelling.length === 0 ? (
              <div className='h-full flex items-center justify-center text-gray-400 text-sm'>
                {t.noResults || 'No sales data'}
              </div>
            ) : (
              topSelling.map((item, index) => (
                <div
                  key={item.name}
                  className='flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <div className='flex items-center gap-3 overflow-hidden'>
                    <div
                      className={`w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 font-bold text-xs flex items-center justify-center shrink-0`}
                    >
                      {index + 1}
                    </div>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-200 truncate item-name'>
                      {getDisplayName(item, textTransform)}
                    </span>
                  </div>
                  <span className='text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md whitespace-nowrap'>
                    {item.qty} {t.sold}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Alerts & Recent Sales */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Alerts Area */}
        <div className='flex flex-col gap-4'>
          {[
            {
              id: 'lowStock',
              title: t.attention,
              icon: 'priority_high',
              iconColor: 'text-orange-500',
              iconBg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
              data: lowStockItems.slice(0, 5),
              emptyText: t.allGood,
              onExpand: () => setExpandedView('lowStock'),
              renderItem: (item: any) => (
                <div key={item.id} className='flex justify-between items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'>
                  <div className='flex items-center gap-3 overflow-hidden'>
                    <div className='w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0'>
                      <span className='material-symbols-rounded text-base'>warning</span>
                    </div>
                    <div className='min-w-0'>
                      <p className='font-medium text-sm text-gray-700 dark:text-gray-200 truncate item-name'>
                        {getDisplayName(item, textTransform)}
                      </p>
                      <p className='text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase'>
                        {item.stock} {t.expand?.allItems || 'left'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setRestockDrug(item)}
                    className='text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-gray-700 transition-colors shrink-0 ms-2'
                  >
                    {t.restock}
                  </button>
                </div>
              )
            },
            {
              id: 'expiring',
              title: t.expiringSoon,
              icon: 'event_busy',
              iconColor: 'text-red-500',
              data: expiringItems.slice(0, 5),
              emptyText: t.noExpiring,
              onExpand: () => setExpandedView('expiring'),
              renderItem: (item: any) => {
                const days = getDaysUntilExpiry(item.expiryDate);
                const isExpired = days < 0;
                return (
                  <div key={item.id} className='flex justify-between items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'>
                    <div className='flex items-center gap-3 overflow-hidden'>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}`}>
                        <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-base)' }}>event_busy</span>
                      </div>
                      <div className='min-w-0'>
                        <p className='font-medium text-sm text-gray-700 dark:text-gray-200 truncate item-name'>
                          {getDisplayName(item, textTransform)}
                        </p>
                        <p className={`text-[10px] font-bold uppercase ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-500'}`}>
                          {isExpired ? t.expired : `${days} ${t.days}`}
                        </p>
                      </div>
                    </div>
                    <span className='text-xs text-gray-400 font-medium shrink-0 ms-2 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg'>
                      {formatExpiryDate(item.expiryDate)}
                    </span>
                  </div>
                );
              }
            }
          ].map((card) => (
            <div key={card.id} className={`p-5 rounded-3xl ${CARD_BASE} h-64 flex flex-col group`}>
              <SectionHeader 
                icon={card.icon} 
                title={card.title} 
                onExpand={card.onExpand} 
                iconColor={card.iconColor} 
              />
              <div className='flex-1 overflow-y-auto space-y-2 pe-1' dir='ltr'>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className='flex justify-between items-center p-2 animate-pulse'>
                      <div className='flex items-center gap-3 overflow-hidden'>
                        <div className='w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0' />
                        <div className='space-y-1.5'>
                          <div className='h-3.5 w-24 bg-zinc-100 dark:bg-zinc-800 rounded' />
                          <div className='h-2.5 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded' />
                        </div>
                      </div>
                      <div className='h-8 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg ms-2' />
                    </div>
                  ))
                ) : card.data.length === 0 ? (
                  <div className='h-full flex items-center justify-center text-gray-400 text-sm'>
                    {card.emptyText}
                  </div>
                ) : (
                  card.data.map(card.renderItem)
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Transactions */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-auto max-h-[530px] flex flex-col group`}>
          <SectionHeader 
            icon="receipt_long" 
            title={t.recentSales} 
            onExpand={() => setExpandedView('recentSales')} 
          />
          <div className='flex-1 overflow-y-auto space-y-0 divide-y divide-gray-100 dark:divide-gray-800'>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className='py-3 flex items-center justify-between px-2 animate-pulse'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0' />
                    <div className='space-y-2'>
                      <div className='h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded' />
                      <div className='h-3 w-48 bg-zinc-50 dark:bg-zinc-800/50 rounded' />
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <div className='h-4 w-20 bg-zinc-100 dark:bg-zinc-800 rounded' />
                    <div className='h-3 w-12 bg-zinc-50 dark:bg-zinc-800/50 rounded' />
                  </div>
                </div>
              ))
            ) : recentSales.length === 0 ? (
              <div className='h-full flex items-center justify-center text-gray-400 text-sm'>
                {t.noResults || 'No transactions yet'}
              </div>
            ) : (
              recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className='py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 px-2 rounded-lg transition-colors'
                >
                  <div className='flex items-center gap-3'>
                    <div
                      className={`w-10 h-10 flex items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400`}
                    >
                      <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-lg)' }}>shopping_bag</span>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                        {sale.customerName || 'Guest'}
                        {sale.customerCode && (
                          <span
                            dir='ltr'
                            className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider bg-transparent'
                          >
                            <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>tag</span>
                            {sale.customerCode}
                          </span>
                        )}
                      </p>
                      <p className='text-xs text-gray-500 flex items-center gap-2'>
                        <span className="text-(--text-tertiary)">
                          {sale.timeAgo}
                        </span>
                        <span className='w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600'></span>
                        <span className='text-xs'>#{sale.id}</span>
                        <span className='w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600'></span>
                        <span
                          className={`inline-flex items-center ${sale.paymentMethod === 'visa' ? 'text-primary-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}
                        >
                          <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-base)' }}>
                            {sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                          </span>
                        </span>
                        <span className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider bg-transparent'>
                          <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-sm)' }}>package_2</span>
                          {sale.items.length}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className='text-end'>
                    <p className='text-sm font-bold text-gray-900 dark:text-gray-100'>
                      {formatCurrency(sale.netTotal ?? sale.total)}
                    </p>
                    <p className='text-xs text-gray-500 flex items-center justify-end gap-1'>
                      {sale.hasReturns && sale.returnStats && (
                        <span className='text-orange-500 flex items-center gap-0.5'>
                          <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-xs)' }}>
                            keyboard_return
                          </span>
                          <span className='text-[10px]'>
                            ({sale.returnStats.returned}/{sale.returnStats.total})
                          </span>
                        </span>
                      )}
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
          size='sm'
          zIndex={50}
          title={t.modal.title}
          subtitle={`${getDisplayName(restockDrug, textTransform)} (${restockDrug.stock} left)`}
        >
          <form onSubmit={handleRestockSubmit} className='space-y-5'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <label className='text-xs font-bold text-gray-500 uppercase'>{t.modal.qty}</label>
                <SegmentedControl
                  options={[
                    { label: t.pos?.pack || 'Pack', value: 'pack' },
                    { label: t.pos?.unit || 'Unit', value: 'unit' },
                  ]}
                  value={restockIsUnit ? 'unit' : 'pack'}
                  onChange={(val) => setRestockIsUnit(val === 'unit')}
                  size='sm'
                />
              </div>
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={() => setRestockQty(Math.max(1, restockQty - 5))}
                  className='w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                >
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>remove</span>
                </button>
                <input
                  type='number'
                  required
                  min='1'
                  className='flex-1 p-2 text-center text-lg font-bold rounded-xl bg-gray-50 dark:bg-gray-950 border-none focus:ring-2 focus:ring-inset transition-all'
                  style={{ '--tw-ring-color': `var(--primary-500)` } as any}
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                />
                <button
                  type='button'
                  onClick={() => setRestockQty(restockQty + 5)}
                  className='w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                >
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>add</span>
                </button>
              </div>
            </div>

            <div className='flex gap-3'>
              <button
                type='button'
                onClick={() => setRestockDrug(null)}
                className='flex-1 py-2.5 rounded-full font-medium text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors'
              >
                {t.modal.cancel}
              </button>
              <button
                type='submit'
                className={`flex-1 py-2.5 rounded-full font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-md transition-all active:scale-95`}
              >
                {t.modal.confirm}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Unified Expanded View */}
      {expandedView && (
        <ExpandedModal
          isOpen={!!expandedView}
          onClose={() => setExpandedView(null)}
          title={t.dashboard?.[expandedView] || t[expandedView] || 'View'}
          color={color}
          t={t}
          actions={
            <button
              onClick={() => {
                const dataMap: Record<string, any> = {
                  revenue: [{ metric: 'Total Revenue', value: totalRevenue }],
                  expenses: [{ metric: 'Total Expenses', value: totalExpenses }],
                  profit: [
                    { metric: 'Revenue', value: totalRevenue },
                    { metric: 'Expenses', value: totalExpenses },
                    { metric: 'Net Profit', value: netProfit }
                  ],
                  lowStock: lowStockItems,
                  topSelling: topSelling20,
                  expiring: expiringItems,
                  recentSales: recentSales20,
                  salesChart: salesData
                };
                exportToCSV(dataMap[expandedView] || [], expandedView);
              }}
              className='px-3 py-1.5 text-sm rounded-lg bg-(--bg-page-surface) hover:bg-(--bg-menu-hover) text-(--text-primary) border border-(--border-divider) transition-colors flex items-center gap-2'
            >
              <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>download</span>
              {t.expand?.exportCSV || 'Export'}
            </button>
          }
        >
          <div className='space-y-6'>
            {['revenue', 'expenses', 'profit', 'salesChart'].includes(expandedView) && (
              <>
                <SummaryCard 
                  title={t[expandedView]} 
                  value={expandedView === 'salesChart' ? sales.length : (expandedView === 'revenue' ? totalRevenue : expandedView === 'expenses' ? totalExpenses : netProfit)} 
                  colorClass={expandedView === 'expenses' ? 'bg-red-50 dark:bg-red-950/20 border-red-100' : 'bg-primary-50 dark:bg-primary-950/20 border-primary-100'}
                  footer={expandedView === 'salesChart' ? t.trend : t.expand?.historicalTrend}
                />
                
                <MetricsGrid items={
                  expandedView === 'profit' ? [
                    { label: t.revenue, value: formatCurrency(totalRevenue) },
                    { label: t.expenses, value: formatCurrency(totalExpenses) },
                    { label: t.expand?.profitMargin || 'Margin', value: `${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'}%` }
                  ] : [
                    { label: t.expand?.metrics || 'Total Count', value: expandedView === 'expenses' ? purchases.length : sales.length },
                    { label: t.expand?.amount || 'Average', value: formatCurrency((expandedView === 'expenses' ? (purchases.length > 0 ? totalExpenses / purchases.length : 0) : (sales.length > 0 ? totalRevenue / sales.length : 0))) }
                  ]
                } />

                <div className='h-80' dir='ltr'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id='colorExp' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor={chartColors.main} stopOpacity={0.8} />
                          <stop offset='95%' stopColor={chartColors.main} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--border-divider)' />
                      <XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.main, strokeWidth: 2 }} />
                      <Area type='monotone' dataKey='sales' stroke={chartColors.main} fillOpacity={1} fill='url(#colorExp)' strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {expandedView === 'lowStock' && (
              <div className='grid gap-3'>
                {lowStockItems.map(item => (
                  <GenericListItem 
                    key={item.id}
                    title={getDisplayName(item, textTransform)}
                    subtitle={item.category || ''}
                    badge={`${item.stock} ${t.expand?.allItems || 'left'}`}
                    badgeColor="text-orange-600"
                    onClick={() => { setRestockDrug(item); setExpandedView(null); }}
                    actionLabel={t.restock}
                  />
                ))}
              </div>
            )}

            {expandedView === 'topSelling' && (
              <div className='space-y-3'>
                {topSelling20.map((item, index) => (
                  <GenericListItem 
                    key={item.name}
                    icon="hotel_class"
                    title={getDisplayName(item, textTransform)}
                    subtitle={`${item.qty} ${t.sold} • ${formatCurrency(item.revenue)} ${t.revenue}`}
                    value={formatCurrency(item.revenue)}
                  />
                ))}
              </div>
            )}

            {expandedView === 'expiring' && (
              <div className='space-y-3'>
                {expiringItems.map(item => {
                  const days = getDaysUntilExpiry(item.expiryDate);
                  const isExpired = days < 0;
                  return (
                    <GenericListItem 
                      key={item.id}
                      icon="event_busy"
                      title={getDisplayName(item, textTransform)}
                      subtitle={`${item.category} • ${item.stock} in stock`}
                      badge={isExpired ? t.expired : `${days} ${t.days}`}
                      badgeColor={isExpired ? 'text-red-600' : 'text-yellow-600'}
                      value={item.expiryDate}
                    />
                  );
                })}
              </div>
            )}

            {expandedView === 'recentSales' && (
              <div className="relative space-y-4 py-1">
                <div className={`absolute top-4 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-800 z-0 ${language === 'AR' ? 'right-[11px]' : 'left-[11px]'}`} />
                {recentSales20.map((sale, index) => (
                  <div key={sale.id} className="relative z-10">
                    <div className={`absolute top-6 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm z-10 ${sale.hasReturns ? 'bg-orange-400' : 'bg-primary-500'} ${language === 'AR' ? '-right-[18px]' : '-left-[18px]'}`} />
                    <MaterialTabs index={index} total={recentSales20.length} className='h-auto! py-2 flex-col! items-stretch! gap-1 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors shadow-xs'>
                      <div className='flex items-center justify-between gap-3'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-600 shrink-0'>
                            <span className='material-symbols-rounded text-lg'>shopping_bag</span>
                          </div>
                          <div>
                            <p className='font-bold text-gray-900 dark:text-gray-100 text-xs'>{sale.customerName || 'Guest'} <span className='text-[10px] font-normal opacity-50'>#{sale.id}</span></p>
                            <p className='text-[10px] text-gray-500'>{sale.timeAgo}</p>
                          </div>
                        </div>
                        <div className='text-end'>
                          <p className='font-bold text-sm'>{formatCurrency(sale.netTotal ?? sale.total)}</p>
                          {sale.hasReturns && <p className='text-[10px] text-orange-500 font-bold uppercase'>{t.returned}</p>}
                        </div>
                      </div>
                    </MaterialTabs>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ExpandedModal>
      )}

      {/* Help */}
      <HelpButton
        onClick={() => setShowHelp(true)}
        title={helpContent.title}
        color={color}
        isRTL={language === 'AR'}
      />
      <HelpModal
        show={showHelp}
        onClose={() => setShowHelp(false)}
        helpContent={helpContent as any}
        color={color}
        language={language}
      />
    </div>
  );
};
