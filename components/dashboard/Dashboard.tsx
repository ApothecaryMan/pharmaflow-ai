import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UserRole } from '../../config/permissions';
import { useSettings } from '../../context';
import { usePageHelp } from '../../context/HelpContext';
import { useBatches } from '../../hooks/queries/useInventoryQuery';
import { DASHBOARD_HELP } from '../../i18n/helpInstructions';
import { batchService } from '../../services/inventory/batchService';
import { useAuthStore } from '../../stores/authStore';
import type { Drug, ExpandedView, Purchase, Sale } from '../../types';
import { formatCompactCurrency, formatCurrency, getCurrencySymbol } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { formatExpiryDate, parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import {
  CARD_BASE,
  MODAL_FOOTER_BTN_CANCEL,
  MODAL_FOOTER_BTN_PRIMARY,
} from '../../utils/themeStyles';
import { ChartWidget } from '../common/ChartWidget';
import { ExpandedModal } from '../common/ExpandedModal';
import { HasPermission } from '../common/HasPermission';
import { CurrencyValue, InsightTooltip } from '../common/InsightTooltip';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { useDashboardAnalytics } from './useDashboardAnalytics';
import { useDailyAchievements } from '../../hooks/dashboard/useDailyAchievements';
import { MonthlyHeatmap } from '../common/MonthlyHeatmap';

interface DashboardProps {
  inventory: Drug[];
  sales: Sale[];
  purchases: Purchase[];
  color: string;
  t: Translations;
  onRestock: (id: string, qty: number, isUnit?: boolean) => void;
  onViewChange?: (view: string) => void;
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
    className='w-10 h-10 flex items-center justify-center text-(--text-tertiary) hover:text-(--text-primary) transition-all rounded-xl hover:bg-(--bg-menu-hover) active:scale-95 opacity-0 group-hover:opacity-100'
    title={title || 'Expand'}
  >
    <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
      open_in_full
    </span>
  </button>
);

const SectionHeader: React.FC<{
  icon?: string;
  title: string;
  onExpand?: () => void;
  iconColor?: string;
}> = ({ title, onExpand }) => (
  <div className='flex justify-between items-center mb-3'>
    <h3 className='text-base font-semibold text-(--text-primary) flex items-center gap-2'>
      {title}
    </h3>
    {onExpand && <ExpandButton onClick={onExpand} />}
  </div>
);

const SummaryCard: React.FC<{
  title: string;
  value: number | string;
  colorClass: string;
  footer?: string;
}> = ({ title, value, colorClass, footer }) => (
  <div className={`p-6 rounded-2xl border ${colorClass}`}>
    <p className='text-sm font-bold uppercase mb-1 opacity-80'>{title}</p>
    <p className='text-4xl font-bold'>
      {typeof value === 'number' ? formatCurrency(value) : value}
    </p>
    {footer && <p className='text-sm mt-2 opacity-60'>{footer}</p>}
  </div>
);

const MetricsGrid: React.FC<{ items: { label: string; value: string | number }[] }> = ({
  items,
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-${items.length} gap-4`}>
    {items.map((item, i) => (
      <div
        key={i}
        className='p-4 rounded-xl bg-(--bg-page-surface) border border-(--border-divider)'
      >
        <p className='text-xs font-bold text-(--text-tertiary) uppercase mb-1'>{item.label}</p>
        <p className='text-2xl font-bold text-(--text-primary)'>{item.value}</p>
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
}> = ({
  icon,
  title,
  subtitle,
  value,
  badge,
  badgeColor = 'text-primary-600',
  onClick,
  actionLabel,
}) => (
  <div
    dir='ltr'
    className='p-4 rounded-xl bg-(--bg-page-surface) border border-(--border-divider) flex items-center justify-between hover:bg-(--bg-menu-hover) transition-colors'
  >
    <div className='flex items-center gap-4 min-w-0 flex-1'>
      {icon && (
        <div className='badge-purple w-10 h-10! rounded-full! border! flex! items-center justify-center shrink-0'>
          <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
            {icon}
          </span>
        </div>
      )}
      <div className='min-w-0'>
        <p className='font-bold text-(--text-primary) truncate'>{title}</p>
      </div>
    </div>
    <div className='flex items-center gap-3 shrink-0 ms-4'>
      <p className='text-xs text-(--text-tertiary) shrink-0'>{subtitle}</p>
      {badge && (
        <span
          className={
            badgeColor.includes('badge-')
              ? `${badgeColor} shrink-0`
              : `text-[10px] font-bold uppercase shrink-0 ${badgeColor}`
          }
        >
          {badge}
        </span>
      )}
      {value && <p className='font-bold text-(--text-primary)'>{value}</p>}
      {onClick && (
        <button
          onClick={onClick}
          className='text-xs px-3 py-1.5 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-all active:scale-95'
        >
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
  onViewChange,
  subView,
  language,
}) => {
  const [restockDrug, setRestockDrug] = useState<Drug | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockIsUnit, setRestockIsUnit] = useState(false);
  const [expandedView, setExpandedView] = useState<ExpandedView>(null);
  const { textTransform } = useSettings();
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { data: batches = [] } = useBatches(activeBranchId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState('7');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const { data: achievements, isLoading: achievementsLoading } = useDailyAchievements(
    activeBranchId ?? undefined,
    currentYear,
    currentMonth,
    { language }
  );

  const filteredData = useMemo(() => {
    if (timeRange === 'ALL') return { sales, purchases };
    const days = parseInt(timeRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    return {
      sales: sales.filter((s) => new Date(s.date) >= cutoff),
      purchases: purchases.filter((p) => new Date(p.date) >= cutoff),
    };
  }, [sales, purchases, timeRange]);

  const formatXAxis = useCallback(
    (val: any) => {
      const locale = language?.toUpperCase() === 'AR' ? 'ar-EG-u-nu-latn' : 'en-US';
      if (timeRange === 'ALL') {
        const date = new Date(val);
        return date.toLocaleDateString(locale, { month: 'short' });
      }
      if (timeRange === '90') {
        if (!val || typeof val !== 'string') return '';
        const parts = val.split('-');
        if (parts.length < 3) return val;
        const [yyyy, mm, w] = parts;
        const monthName = new Date(parseInt(yyyy), parseInt(mm) - 1, 1).toLocaleDateString(locale, {
          month: 'short',
        });
        return `${monthName} ${w.replace('W', language?.toUpperCase() === 'AR' ? 'أسبوع ' : 'W')}`;
      }
      const date = new Date(val);
      const formatted = date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      return timeRange === '30' ? formatted.replace(' ', '\n') : formatted;
    },
    [language, timeRange]
  );

  const formatTooltipLabel = useCallback(
    (val: any) => {
      const locale = language?.toUpperCase() === 'AR' ? 'ar-EG-u-nu-latn' : 'en-US';
      if (timeRange === 'ALL') {
        const date = new Date(val);
        return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      }
      if (timeRange === '90') {
        if (!val || typeof val !== 'string') return '';
        const parts = val.split('-');
        if (parts.length < 3) return val;
        const [yyyy, mm, w] = parts;
        const monthName = new Date(parseInt(yyyy), parseInt(mm) - 1, 1).toLocaleDateString(locale, {
          month: 'long',
          year: 'numeric',
        });
        return `${language?.toUpperCase() === 'AR' ? 'الأسبوع' : 'Week'} ${w.replace('W', '')} - ${monthName}`;
      }
      const date = new Date(val);
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    },
    [language, timeRange]
  );

  const helpContent = DASHBOARD_HELP[language as 'EN' | 'AR'] || DASHBOARD_HELP.EN;
  usePageHelp(helpContent);

  useEffect(() => {
    if (!subView) return;

    let target: ExpandedView = null;
    switch (subView) {
      case 'Top Selling Products':
        target = 'topSelling';
        break;
      case 'Sales Trends (7 days)':
      case 'Sales Trends (30 days)':
        target = 'salesChart';
        break;
      case 'Slow Moving Products':
      case 'Low Stock Alerts':
        target = 'lowStock';
        break;
      case 'Expiring Soon':
        target = 'expiring';
        break;
      case 'Recent Activities':
      case 'Real-time Sales Monitor':
        target = 'recentSales';
        break;
      default:
        target = null;
        break;
    }

    setExpandedView(target);
  }, [subView]);

  // Scroll to top when subView changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [subView]);

  // --- STATS & ANALYTICS ---
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
    expensesTooltip: expensesTooltipData,
    profitTooltip: profitTooltipData,
    lowStockTooltip: lowStockTooltipData,
    topSelling: topSellingFull,
    expiringItems,
    salesTrends: salesData,
    loading: finLoading,
    expensesTotal,
  } = useDashboardAnalytics({
    sales: filteredData.sales,
    inventory,
    batches,
    totalExpenses: 0,
    language,
    branchId: activeBranchId,
    timeRange,
  });

  const lowStockItems = useMemo(() => {
    const combined = [...movingItemsAnalysis.critical, ...movingItemsAnalysis.lowStock];
    // Ensure uniqueness by ID
    return Array.from(new Map(combined.map((item) => [item.id, item])).values());
  }, [movingItemsAnalysis.critical, movingItemsAnalysis.lowStock]);

  const revenueTooltip = useMemo(
    () => <InsightTooltip {...revenueTooltipData} language={language} />,
    [revenueTooltipData, language]
  );
  const expensesTooltip = useMemo(
    () => <InsightTooltip {...expensesTooltipData} language={language} />,
    [expensesTooltipData, language]
  );
  const profitTooltip = useMemo(
    () => <InsightTooltip {...profitTooltipData} language={language} />,
    [profitTooltipData, language]
  );
  const lowStockTooltip = useMemo(
    () => <InsightTooltip {...lowStockTooltipData} language={language} />,
    [lowStockTooltipData, language]
  );

  const topSelling = useMemo(() => topSellingFull.slice(0, 5), [topSellingFull]);
  const topSelling20 = topSellingFull;

  // --- RECENT TRANSACTIONS (exclude fully returned orders) ---
  const recentSales = useMemo(() => {
    return [...filteredData.sales]
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
      .map((sale) => {
        let totalReturned = 0;
        sale.items.forEach((item) => {
          const lineKey = item.isUnit ? `${item.id}_unit` : `${item.id}_pack`;
          totalReturned +=
            sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        });
        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        return {
          ...sale,
          // Ensure we have a valid key if ID is missing or numeric
          key: `sale-${sale.id}-${new Date(sale.date).getTime()}`,
          returnStats: { returned: totalReturned, total: totalItems },
          timeAgo: getRelativeTime(new Date(sale.date), t, language),
        };
      });
  }, [sales, t, language]);

  const recentSales20 = useMemo(() => {
    return [...filteredData.sales]
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
        sale.items.forEach((item) => {
          const lineKey = item.isUnit ? `${item.id}_unit` : `${item.id}_pack`;
          totalReturned +=
            sale.itemReturnedQuantities?.[lineKey] || sale.itemReturnedQuantities?.[item.id] || 0;
        });
        const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        return {
          ...sale,
          key: `sale-exp-${sale.id}-${new Date(sale.date).getTime()}`,
          returnStats: { returned: totalReturned, total: totalItems },
          timeAgo: getRelativeTime(new Date(sale.date), t, language),
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

  // --- Smart Expanded Views Registry ---
  const dashboardViews = useMemo(() => {
    const exportBtn = (view: string, data: any) => (
      <button
        onClick={() => exportToCSV(data, view)}
        className='px-3 py-1.5 text-sm rounded-lg bg-(--bg-page-surface) hover:bg-(--bg-menu-hover) text-(--text-primary) border border-(--border-divider) transition-colors flex items-center gap-2'
      >
        <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
          download
        </span>
        {t.expand?.exportCSV || 'Export'}
      </button>
    );

    const chartView = (id: string, mainVal: number) => (
      <div className='space-y-6'>
        <SummaryCard
          title={t[id]}
          value={mainVal}
          colorClass={
            id === 'expenses'
              ? 'bg-red-50 dark:bg-red-950/20 border-red-100'
              : 'bg-primary-50 dark:bg-primary-950/20 border-primary-100'
          }
          footer={id === 'salesChart' ? t.trend : t.expand?.historicalTrend}
        />

        <MetricsGrid
          items={
            id === 'profit'
              ? [
                  { label: t.revenue, value: formatCurrency(totalRevenue) },
                  { label: t.expenses, value: formatCurrency(expensesTotal) },
                  {
                    label: t.expand?.profitMargin || 'Margin',
                    value: `${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'}%`,
                  },
                ]
              : id === 'expenses'
                ? [{ label: t.expenses, value: formatCurrency(expensesTotal) }]
                : [
                    {
                      label: t.expand?.metrics || 'Total Count',
                      value: filteredData.sales.length,
                    },
                    {
                      label: t.expand?.amount || 'Average',
                      value: formatCurrency(
                        filteredData.sales.length > 0 ? totalRevenue / filteredData.sales.length : 0
                      ),
                    },
                  ]
          }
        />

        <div className='h-80'>
          <ChartWidget
            title={id === 'salesChart' ? t.trend : t.expand?.historicalTrend || ''}
            data={salesData}
            dataKeys={{ primary: 'sales' }}
            color={chartColors.main}
            language={language as 'AR' | 'EN'}
            allowChartTypeSelection={false}
            className='border-0! bg-transparent! p-0! shadow-none!'
            chartClassName='h-[280px]!'
            headerClassName='hidden'
            xAxisKey='day'
            xAxisFormatter={formatXAxis}
            tooltipLabelFormatter={formatTooltipLabel}
          />
        </div>
      </div>
    );

    return {
      revenue: {
        title: t.dashboard?.revenue || t.revenue,
        actions: exportBtn('revenue', [{ metric: 'Total Revenue', value: totalRevenue }]),
        children: chartView('revenue', totalRevenue),
      },
      expenses: {
        title: t.dashboard?.expenses || t.expenses,
        actions: exportBtn('expenses', [{ metric: 'Total Expenses', value: expensesTotal }]),
        children: chartView('expenses', expensesTotal),
      },
      profit: {
        title: t.dashboard?.netProfit || t.profit,
        actions: exportBtn('profit', [{ metric: 'Profit', value: netProfit }]),
        children: chartView('profit', netProfit),
      },
      lowStock: {
        title: t.dashboard?.lowStockItems || t.lowStock,
        actions: exportBtn('low_stock', lowStockItems),
        children: (
          <div className='grid gap-3'>
            {lowStockItems.map((item, idx) => (
              <GenericListItem
                key={item.id || `low-${idx}`}
                title={getDisplayName(item, textTransform)}
                subtitle={item.category || ''}
                badge={`${item.stock} ${t.expand?.allItems || 'left'}`}
                badgeColor='badge-orange'
                onClick={() => {
                  setRestockDrug(item);
                  setExpandedView(null);
                }}
                actionLabel={t.restock}
              />
            ))}
          </div>
        ),
      },
      topSelling: {
        title: t.dashboard?.topSelling || t.topSelling,
        actions: exportBtn('top_selling', topSelling20),
        children: (
          <div className='space-y-3'>
            {topSelling20.map((item, index) => (
              <GenericListItem
                key={`${item.id}-${index}`}
                icon='hotel_class'
                title={getDisplayName(item, textTransform)}
                subtitle={`${item.qty} ${t.sold} • ${formatCurrency(item.revenue)} ${t.revenue}`}
                value={formatCurrency(item.revenue)}
              />
            ))}
          </div>
        ),
      },
      expiring: {
        title: t.expiringSoon,
        actions: exportBtn('expiring_items', expiringItems),
        children: (
          <div className='space-y-3'>
            {expiringItems.map((item, idx) => {
              const days = getDaysUntilExpiry(item.expiryDate);
              const isExpired = days < 0;
              return (
                <GenericListItem
                  key={item.id || `exp-${idx}`}
                  icon='event_busy'
                  title={getDisplayName(item, textTransform)}
                  subtitle={`${item.category} • ${item.stock} in stock`}
                  badge={isExpired ? t.expired : `${days} ${t.days}`}
                  badgeColor={isExpired ? 'badge-danger' : 'badge-warning'}
                  value={item.expiryDate}
                />
              );
            })}
          </div>
        ),
      },
      recentSales: {
        title: t.recentSales,
        actions: exportBtn('transactions', recentSales20),
        children: (
          <div className='flex flex-col space-y-4 py-2 px-1'>
            {recentSales20.map((sale, index) => (
              <div
                key={sale.key || sale.id || `rs20-${index}`}
                className='flex gap-4 relative group'
              >
                {/* Timeline Column */}
                <div className='relative flex flex-col items-center w-4 shrink-0'>
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-(--bg-card) shadow-sm z-10 mt-4 ${sale.hasReturns ? 'bg-orange-400' : 'bg-primary-500'} group-hover:scale-125 transition-transform`}
                  />
                  {index !== recentSales20.length - 1 && (
                    <div className='absolute top-7 -bottom-8 w-0.5 bg-gray-200 dark:bg-gray-700 z-0' />
                  )}
                </div>

                {/* Content Column */}
                <div className='flex-1 min-w-0'>
                  <div className='p-3.5 rounded-xl bg-(--bg-page-surface) border border-(--border-divider) flex items-center justify-between hover:bg-(--bg-menu-hover) transition-colors'>
                    <div className='min-w-0 flex-1'>
                      <p className='font-bold text-(--text-primary) text-sm truncate'>
                        {sale.customerName || 'Guest Customer'}{' '}
                        <span
                          data-no-convert='true'
                          dir='ltr'
                          className='text-[10px] font-normal opacity-50'
                        >
                          #{sale.serialId || sale.id}
                        </span>
                      </p>
                      <p className='text-[10px] text-(--text-tertiary) mt-0.5'>{sale.timeAgo}</p>
                    </div>
                    <div className='text-end shrink-0 ms-4'>
                      <p className='font-bold text-sm text-(--text-primary)'>
                        {formatCurrency(sale.netTotal ?? sale.total)}
                      </p>
                      {sale.hasReturns && (
                        <p className='text-[10px] text-orange-500 font-bold uppercase mt-0.5'>
                          {t.returned}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      salesChart: {
        title: t.trend,
        actions: exportBtn('sales_trend', salesData),
        children: chartView('salesChart', filteredData.sales.length),
      },
      achievements: achievements
        ? {
            title: `${t.target || 'Target'} — ${achievements.monthName} ${achievements.year}`,
            children: (
              <div className='space-y-6'>
                <SummaryCard
                  title={t.monthlyProgress || 'Monthly Progress'}
                  value={`${achievements.overallPct}%`}
                  colorClass={
                    achievements.overallPct >= 100
                      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-100'
                      : achievements.overallPct >= 80
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100'
                        : achievements.overallPct >= 50
                          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100'
                          : 'bg-red-50 dark:bg-red-950/20 border-red-100'
                  }
                  footer={`${achievements.monthlyRevenueFormatted} / ${achievements.monthlyTargetFormatted}`}
                />
                <MonthlyHeatmap
                  days={achievements.days}
                  year={currentYear}
                  month={currentMonth}
                  monthlyRevenue={achievements.monthlyRevenue}
                  monthlyTarget={achievements.monthlyTarget}
                  overallPct={achievements.overallPct}
                  monthlyRevenueFormatted={achievements.monthlyRevenueFormatted}
                  monthlyTargetFormatted={achievements.monthlyTargetFormatted}
                  language={language}
                  isLoading={achievementsLoading}
                />
              </div>
            ),
          }
        : {
            title: t.target || 'Target',
            children: (
              <div className='flex items-center justify-center h-64 text-(--text-tertiary)'>
                {language === 'AR' ? 'لا توجد بيانات' : 'No data available'}
              </div>
            ),
          },
    };
  }, [
    filteredData,
    totalRevenue,
    expensesTotal,
    netProfit,
    lowStockItems,
    topSelling20,
    expiringItems,
    recentSales20,
    salesData,
    chartColors,
    t,
    language,
    textTransform,
    achievements,
    achievementsLoading,
    currentYear,
    currentMonth,
  ]);

  // --- CHART COLOR LOGIC ---

  return (
    <div
      ref={scrollContainerRef}
      className='h-full overflow-y-auto px-page space-y-4 animate-fade-in'
    >
      <PageHeader
        mb='mb-0'
        centerContent={
          <SegmentedControl
            options={[
              {
                label: language === 'AR' ? 'نظرة عامة' : 'Overview',
                value: 'dashboard',
                icon: 'dashboard',
              },
              {
                label: language === 'AR' ? 'المراقبة الفورية' : 'Real-time',
                value: 'real-time-sales',
                dotColor: '#10b981',
                pulseDot: true,
              },
            ]}
            value='dashboard'
            onChange={(val) => onViewChange?.(String(val))}
            size='md'
            shape='pill'
          />
        }
        rightContent={
          <SegmentedControl
            options={[
              { label: language === 'AR' ? '٧ أيام' : '7 Days', value: '7' },
              { label: language === 'AR' ? '٣٠ يوم' : '30 Days', value: '30' },
              { label: language === 'AR' ? '٩٠ يوم' : '90 Days', value: '90' },
              { label: language === 'AR' ? 'الكل' : 'All', value: 'ALL' },
            ]}
            value={timeRange}
            onChange={(val) => setTimeRange(String(val))}
            size='sm'
          />
        }
      />

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
            value: expensesTotal,
            icon: 'receipt_long',
            iconColor: 'rose',
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
            <SmallCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              iconColor={card.iconColor}
              type={card.type as any}
              currencyLabel={card.type === 'currency' ? getCurrencySymbol() : undefined}
              fractionDigits={card.type === 'currency' ? 2 : 0}
              iconTooltip={card.tooltip}
              isLoading={isLoading || finLoading}
            />
          );

          const renderCard = (key: string) => (
            <div
              key={key}
              onClick={() => setExpandedView(card.id as ExpandedView)}
              className='cursor-pointer transition-transform active:scale-95 touch-manipulation'
            >
              {cardContent}
            </div>
          );

          return card.permission ? (
            <HasPermission key={card.id} action={card.permission as any}>
              {renderCard(`inner-${card.id}`)}
            </HasPermission>
          ) : (
            renderCard(card.id)
          );
        })}
      </div>

      {/* Row 2: Chart & Top Selling */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Sales Chart (2 Cols) */}
        <ChartWidget
          title={t.trend}
          icon=''
          data={salesData}
          dataKeys={{ primary: 'sales' }}
          color={chartColors.main}
          language={language as 'AR' | 'EN'}
          onExpand={() => setExpandedView('salesChart')}
          unit={getCurrencySymbol()}
          allowChartTypeSelection={true}
          primaryLabel={t.totalSales || 'Sales'}
          className='h-80'
          chartClassName='h-[90%]'
          isLoading={isLoading || finLoading}
          xAxisKey='day'
          xAxisFormatter={formatXAxis}
          tooltipLabelFormatter={formatTooltipLabel}
        />

        {/* Top Selling Products (1 Col) */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-80 flex flex-col group`}>
          <SectionHeader
            icon='hotel_class'
            title={t.topSelling}
            onExpand={() => setExpandedView('topSelling')}
            iconColor='text-yellow-500'
          />
          <div className='flex-1 overflow-y-auto space-y-1 pe-1' dir='ltr'>
            {isLoading || finLoading ? (
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
                  key={item.id || `ts-${index}`}
                  className='flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <div className='flex items-center gap-3 overflow-hidden'>
                    <span className='text-2xl font-black text-gray-300 dark:text-gray-600 shrink-0 w-6 text-center mt-1'>
                      {index + 1}
                    </span>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-200 truncate item-name'>
                      {getDisplayName(item, textTransform)}
                    </span>
                  </div>
                  <span className='badge-zinc whitespace-nowrap'>
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
                <div
                  key={item.id}
                  className='flex justify-between items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <div className='flex items-center gap-3 overflow-hidden flex-1'>
                    <div className='min-w-0'>
                      <p className='font-medium text-sm text-gray-700 dark:text-gray-200 truncate item-name'>
                        {getDisplayName(item, textTransform)}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3 shrink-0 ms-2'>
                    <p className='text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase'>
                      {item.stock} {t.expand?.allItems || 'left'}
                    </p>
                    <button
                      onClick={() => setRestockDrug(item)}
                      className='text-xs px-3 py-1.5 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-all active:scale-95'
                    >
                      {t.restock}
                    </button>
                  </div>
                </div>
              ),
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
                  <div
                    key={item.id}
                    className='flex justify-between items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                  >
                    <div className='flex items-center gap-3 overflow-hidden flex-1'>
                      <div className='min-w-0'>
                        <p className='font-medium text-sm text-gray-700 dark:text-gray-200 truncate item-name'>
                          {getDisplayName(item, textTransform)}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3 shrink-0 ms-2'>
                      <p
                        className={`text-[10px] font-bold uppercase ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-500'}`}
                      >
                        {isExpired ? t.expired : `${days} ${t.days}`}
                      </p>
                      <span className='badge-zinc'>{formatExpiryDate(item.expiryDate)}</span>
                    </div>
                  </div>
                );
              },
            },
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

          {/* Monthly Target Achievement Heatmap */}
          <MonthlyHeatmap
            days={achievements?.days ?? []}
            year={currentYear}
            month={currentMonth}
            monthlyRevenue={achievements?.monthlyRevenue ?? 0}
            monthlyTarget={achievements?.monthlyTarget ?? 0}
            overallPct={achievements?.overallPct ?? 0}
            monthlyRevenueFormatted={achievements?.monthlyRevenueFormatted}
            monthlyTargetFormatted={achievements?.monthlyTargetFormatted}
            onExpand={() => setExpandedView('achievements')}
            language={language}
            isLoading={isLoading || achievementsLoading}
          />
        </div>

        {/* Recent Transactions */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-auto max-h-[530px] flex flex-col group`}>
          <SectionHeader
            icon='receipt_long'
            title={t.recentSales}
            onExpand={() => setExpandedView('recentSales')}
          />
          <div className='flex-1 overflow-y-auto space-y-2 pe-1'>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className='flex items-center justify-between p-2 rounded-xl animate-pulse'
                >
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
              recentSales.map((sale, idx) => (
                <div
                  key={sale.key || sale.id || `rs-${idx}`}
                  className='flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <div className='flex items-center gap-3'>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                        {sale.customerName || 'Guest'}
                        {sale.customerCode && (
                          <span
                            dir='ltr'
                            className='badge-zinc inline-flex items-center gap-1.5! px-1.5! py-0.5! text-[10px]! tracking-wider'
                          >
                            <span
                              className='material-symbols-rounded'
                              style={{ fontSize: 'var(--icon-sm)' }}
                            >
                              tag
                            </span>
                            {sale.customerCode}
                          </span>
                        )}
                      </p>
                      <p className='text-xs text-gray-500 flex items-center gap-2'>
                        <span className='text-(--text-tertiary)'>{sale.timeAgo}</span>
                        <span className='w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600'></span>
                        <span data-no-convert='true' dir='ltr' className='text-xs'>
                          #{sale.serialId || sale.id}
                        </span>
                        <span className='w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600'></span>
                        <span
                          className={`inline-flex items-center ${sale.paymentMethod === 'visa' ? 'text-primary-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}
                        >
                          <span
                            className='material-symbols-rounded'
                            style={{ fontSize: 'var(--icon-base)' }}
                          >
                            {sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                          </span>
                        </span>
                        <span className='badge-zinc inline-flex items-center gap-1! px-1.5! py-0.5! text-[10px]! tracking-wider'>
                          <span
                            className='material-symbols-rounded'
                            style={{ fontSize: 'var(--icon-sm)' }}
                          >
                            package_2
                          </span>
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
                          <span
                            className='material-symbols-rounded'
                            style={{ fontSize: 'var(--icon-xs)' }}
                          >
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
          disabled={isLoading || finLoading}
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
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
                    remove
                  </span>
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
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
                    add
                  </span>
                </button>
              </div>
            </div>

            <div className='flex gap-3'>
              <button
                type='button'
                onClick={() => setRestockDrug(null)}
                className={MODAL_FOOTER_BTN_CANCEL}
              >
                {t.modal.cancel}
              </button>
              <button type='submit' className={MODAL_FOOTER_BTN_PRIMARY}>
                {t.modal.confirm}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Unified Expanded View */}
      <ExpandedModal
        isOpen={!!expandedView}
        activeView={expandedView}
        views={dashboardViews as any}
        onClose={() => setExpandedView(null)}
        color={color}
        disabled={isLoading || finLoading}
      />
    </div>
  );
};
