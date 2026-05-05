import type React from 'react';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell
} from 'recharts';
import { REALTIME_SALES_MONITOR_HELP } from '../../i18n/helpInstructions';
import {
  type Customer, type Drug, type Sale, type ThemeColor
} from '../../types';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { ChartWidget } from '../common/ChartWidget';
import { ExpandedModal } from '../common/ExpandedModal';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { InsightTooltip } from '../common/InsightTooltip';
import { FlexDataCard } from '../common/ProgressCard';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { FilterDropdown } from '../common/FilterDropdown';
import { useRealTimeSalesAnalytics } from './useRealTimeSalesAnalytics';
import { PageHeader } from '../common/PageHeader';
import { useSettings } from '../../context';
import { useData } from '../../context/DataContext';
import { useShift } from '../../hooks/sales/useShift';
import { formatCurrency, formatCurrencyParts, getCurrencySymbol } from '../../utils/currency';
import { money } from '../../utils/money';
import { getDisplayName } from '../../utils/drugDisplayName';
import { CARD_BASE } from '../../utils/themeStyles';

// --- Local Mini-Components for Clean Code ---

const StatCard = ({ title, value, icon, iconColor, subValue, trend, trendValue, tooltip, onClick, suffix, overlay, isLoading, type }: any) => (
  <div onClick={onClick} className='cursor-pointer transition-transform active:scale-95 touch-manipulation relative group'>
    <span className='material-symbols-rounded absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm rtl:right-auto rtl:left-2 z-10'>
      open_in_full
    </span>
    <SmallCard
      title={title}
      value={value}
      icon={icon}
      iconColor={iconColor}
      subValue={subValue}
      trend={trend}
      trendValue={trendValue}
      iconTooltip={tooltip}
      valueSuffix={suffix}
      iconOverlay={overlay}
      isLoading={isLoading}
      type={type}
    />
  </div>
);

const GenericListItem = ({ icon, title, subtitle, value, badge, badgeColor, onClick, actionLabel, rank }: any) => (
  <div className='flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors group'>
    <div className='flex items-center gap-3 overflow-hidden'>
      {rank ? (
        <div className='w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0'>
          {rank}
        </div>
      ) : (
        <div className='w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0'>
          <span className='material-symbols-rounded text-xl'>{icon}</span>
        </div>
      )}
      <div className='truncate'>
        <p className='text-sm font-bold text-gray-900 dark:text-gray-100 truncate'>{title}</p>
        <p className='text-xs text-gray-500 truncate'>{subtitle}</p>
      </div>
    </div>
    <div className='flex items-center gap-4'>
      <div className='text-end'>
        {value && <p className='font-bold text-gray-900 dark:text-gray-100 text-sm'>{value}</p>}
        {badge && <p className={`text-[10px] font-bold uppercase ${badgeColor || 'text-primary-500'}`}>{badge}</p>}
      </div>
      {onClick && (
        <button onClick={onClick} className='p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors'>
          <span className='material-symbols-rounded text-lg'>{actionLabel || 'arrow_forward'}</span>
        </button>
      )}
    </div>
  </div>
);

interface RealTimeSalesMonitorProps {
  sales: Sale[];
  customers: Customer[];
  products: Drug[];
  color: ThemeColor;
  t: any;
  language: 'AR' | 'EN';
  onViewChange?: (view: string) => void;
}

export const RealTimeSalesMonitor: React.FC<RealTimeSalesMonitorProps> = ({
  sales = [],
  customers = [],
  products = [],
  color,
  t,
  language,
  onViewChange,
}) => {
  const isRTL = language === 'AR';
  const { textTransform } = useSettings();
  const { playHighValue } = usePosSounds();
  const [expandedView, setExpandedView] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VIP' | 'HIGH_VALUE'>('ALL');
  const { isLoading, branches, activeBranchId } = useData();
  const { shifts } = useShift();
  const [branchFilter, setBranchFilter] = useState<string>(activeBranchId || 'all');

  // Sync with activeBranchId on initial load once it's available
  useEffect(() => {
    if (activeBranchId && branchFilter === 'all') {
      setBranchFilter(activeBranchId);
    }
  }, [activeBranchId]);

  const processedSalesRef = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);
  const [displayedSales, setDisplayedSales] = useState<(Sale & { isNew?: boolean })[]>([]);

  // === ANALYTICS & HOOKS ===
  // --- Branch Filtering Logic ---
  const filteredByBranchSales = useMemo(() => {
    if (branchFilter === 'all') return sales;
    return sales.filter(s => s.branchId === branchFilter);
  }, [sales, branchFilter]);

  const {
    revenue, transactions, itemsSold, todaysSales, revenueChange,
    returnedValue,
    hourlyAnalysis, customerAnalysis, paymentAnalysis, highValueAnalysis, itemsAnalysis,
    orderTypeAnalysis, topProducts, activeCountersStats,
    revenueTooltip: revT, transactionsTooltip: transT, itemsSoldTooltip: itemsT, activeCountersTooltip: countersT
  } = useRealTimeSalesAnalytics({ 
    sales: filteredByBranchSales, 
    customers, 
    products, 
    shifts,
    language 
  });


  const tooltips = useMemo(() => ({
    revenue: <InsightTooltip {...revT} language={language} />,
    transactions: <InsightTooltip {...transT} language={language} />,
    items: <InsightTooltip {...itemsT} language={language} />,
    counters: <InsightTooltip {...countersT} language={language} />
  }), [revT, transT, itemsT, countersT, language]);

  const helpContent = REALTIME_SALES_MONITOR_HELP[language] || REALTIME_SALES_MONITOR_HELP.EN;

  // --- Logic Helpers ---
  const isVIP = useCallback((sale: Sale) => {
    const cust = customers.find(c => c.code === sale.customerCode || c.serialId?.toString() === sale.customerCode || c.name === sale.customerName);
    return (cust?.totalPurchases || 0) >= 1000;
  }, [customers]);

  // Reset animation baseline when filters change to prevent mass animations
  useEffect(() => {
    processedSalesRef.current = new Set();
    isFirstRun.current = true;
    setDisplayedSales([]);
  }, [branchFilter, activeFilter]);

  const getPaymentLabel = useCallback((method?: string) => {
    if (!method || method === 'cash') return t.realTimeSales?.cash || t.cash || 'Cash';
    return t.realTimeSales?.visa || t.visa || 'Card';
  }, [t]);

  // --- Animation & Filter Logic ---
  useEffect(() => {
    // Only proceed if we have sales data or we're sure it's empty after loading
    if (isLoading && todaysSales.length === 0) return;

    if (activeFilter === 'ALL') {
      if (isFirstRun.current) {
        // Capture initial baseline without animations
        todaysSales.forEach(s => processedSalesRef.current.add(s.id));
        setDisplayedSales(todaysSales.slice(0, 20).map(s => ({ ...s, isNew: false })));
        
        // Only mark first run as complete if we actually got the data or loading finished
        if (!isLoading) {
          isFirstRun.current = false;
        }
        return;
      }

      const newSales = todaysSales.filter(s => !processedSalesRef.current.has(s.id));
      if (newSales.length > 0) {
        if (newSales.some(s => highValueAnalysis.highValueIds.has(s.id) || isVIP(s))) playHighValue();
        newSales.forEach(s => processedSalesRef.current.add(s.id));
        
        // For new sales arriving after initial load, mark them as NEW to trigger animation
        setDisplayedSales(prev => [...newSales.map(s => ({ ...s, isNew: true })), ...prev].slice(0, 20));
      }
    } else {
      // For filtered views, we don't show "new" animations to avoid visual clutter
      const filtered = todaysSales.filter(s => activeFilter === 'VIP' ? isVIP(s) : highValueAnalysis.highValueIds.has(s.id));
      setDisplayedSales(filtered.slice(0, 20).map(s => ({ ...s, isNew: false })));
    }
  }, [todaysSales, activeFilter, isVIP, highValueAnalysis.highValueIds, playHighValue, isLoading]);

  // --- Smart Registry for Expanded Views ---
  const monitorViews = useMemo(() => {
    const chartView = (data: any, dataKey: string, stroke: string) => (
      <div className={`p-6 rounded-3xl ${CARD_BASE} h-[450px] w-full min-w-0 flex flex-col relative`}>
        <ResponsiveContainer width='100%' height='100%' debounce={50}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id='viewGrad' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor={stroke} stopOpacity={0.5} />
                <stop offset='95%' stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--border-divider)' />
            <XAxis dataKey='hour' axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={val => formatCurrency(val, 'EGP', language === 'AR' ? 'ar-eg' : 'en-us', 0)} tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className='bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl'>
                  <p className='text-xs font-bold text-gray-500 mb-1'>{label}</p>
                  <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>{formatCurrency(Number(payload[0].value))}</p>
                </div>
              );
            }} />
            <Area type='monotone' dataKey={dataKey} stroke={stroke} strokeWidth={3} fill='url(#viewGrad)' />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );

    return {
      revenue: {
        title: t.realTimeSales?.revenueBreakdown || 'Revenue Analysis',
        children: chartView(hourlyAnalysis.hourlyData, 'revenue', '#3b82f6')
      },
      transactions: {
        title: t.realTimeSales?.transactionDetails || "Today's Transactions",
        children: (
          <div className={`rounded-3xl ${CARD_BASE} overflow-hidden overflow-x-auto`}>
            <table className='w-full text-left rtl:text-right'>
              <thead className='bg-gray-50 dark:bg-gray-800/50'>
                <tr className='text-sm font-bold text-gray-500'>
                  <th className='p-4'>ID</th><th className='p-4'>Time</th><th className='p-4'>Items</th><th className='p-4'>Customer</th><th className='p-4'>Payment</th><th className='p-4 text-end'>Total</th>
                </tr>
              </thead>
              <tbody>
                {todaysSales.map(s => (
                  <tr key={s.id} className='border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                    <td className='p-4 font-bold text-sm'>#{s.serialId || s.id.substring(0, 8)}</td>
                    <td className='p-4 text-sm text-gray-500'>{new Date(s.date).toLocaleTimeString()}</td>
                    <td className='p-4 text-sm'>{s.items.length}</td>
                    <td className='p-4 text-sm'>{s.customerName || '-'}</td>
                    <td className='p-4 text-sm'>{getPaymentLabel(s.paymentMethod)}</td>
                    <td className='p-4 font-bold text-end'>{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      },
      items: {
        title: t.realTimeSales?.itemAnalysis || 'Inventory Analysis',
        children: (
          <div className='grid gap-3'>
            {topProducts.map((p, idx) => (
              <GenericListItem 
                key={idx} rank={idx + 1}
                title={getDisplayName(p, textTransform)}
                subtitle={`${p.qty} units sold`}
                value={formatCurrency(p.revenue)}
              />
            ))}
          </div>
        )
      },
      counters: {
        title: t.realTimeSales?.counterPerformance || 'Counter Status',
        children: (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {[1, 2, 3, 4, 5].map(id => (
              <div key={id} className={`p-6 rounded-2xl border ${id <= 3 ? 'border-green-100 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-100 bg-gray-50 dark:bg-gray-800'}`}>
                <div className='flex justify-between items-start mb-4'>
                  <div className='flex items-center gap-3'><span className='material-symbols-rounded text-2xl'>point_of_sale</span>
                    <div><h4 className='font-bold'>{t.realTimeSales?.counter || 'Counter'} {id}</h4><p className='text-xs text-gray-500'>Main Hall</p></div>
                  </div>
                  <span className={`px-2 py-1 rounded-sm text-[10px] font-bold ${id <= 3 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {id <= 3 ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className='flex justify-between items-end'>
                  <div className='flex items-center gap-2'><div className='w-6 h-6 rounded-full bg-gray-200' /><span className='text-sm font-medium'>{id <= 3 ? `User ${id}` : 'Unmanned'}</span></div>
                  <div className='text-right'><p className='text-[10px] text-gray-500'>Today</p><p className='font-bold'>{id <= 3 ? formatCurrency(Math.random() * 1000) : '-'}</p></div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    };
  }, [todaysSales, topProducts, hourlyAnalysis.hourlyData, language, t, textTransform, getPaymentLabel, paymentAnalysis, itemsSold, products]);

  // --- Chart Data Mapping ---
  const paymentPieData = useMemo(() => [
    { name: t.cash || 'Cash', value: paymentAnalysis.cashRevenue, color: '#10b981' },
    { name: t.visa || 'Card', value: paymentAnalysis.cardRevenue, color: '#6366f1' }
  ], [paymentAnalysis, t]);

  const categoryPieData = useMemo(() => {
    const groups = { medicine: 0, cosmetic: 0, general: 0 };
    todaysSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.id);
        const cat = (product?.category || item.category || 'General').toLowerCase();
        const itemTotal = money.multiply(item.publicPrice || 0, item.quantity || 0, 0);
        
        if (cat.match(/tablet|capsule|syrup|injection|medicine|drug/)) groups.medicine = money.add(groups.medicine, itemTotal);
        else if (cat.match(/cream|lotion|skin|hair|cosmetic|beauty|shampoo/)) groups.cosmetic = money.add(groups.cosmetic, itemTotal);
        else groups.general = money.add(groups.general, itemTotal);
      });
    });
    return [
      { name: t.realTimeSales?.medicine || 'Medicine', value: groups.medicine, color: '#3b82f6' },
      { name: t.realTimeSales?.cosmetic || 'Cosmetic', value: groups.cosmetic, color: '#ec4899' },
      { name: t.realTimeSales?.general || 'General', value: groups.general, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [todaysSales, products, t]);

  return (
    <div className='h-full overflow-y-auto px-page space-y-4 animate-fade-in pb-10' dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        mb="mb-0"
        centerContent={
          <SegmentedControl
            options={[
              { label: language === 'AR' ? 'نظرة عامة' : 'Overview', value: 'dashboard' },
              { label: language === 'AR' ? 'المراقبة الفورية' : 'Real-time', value: 'real-time-sales' },
            ]}
            value='real-time-sales'
            onChange={(val) => onViewChange?.(String(val))}
            size="md"
            shape="pill"
          />
        }
        leftContent={
          <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'>
            <span className='relative flex h-3 w-3'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
              <span className='relative inline-flex rounded-full h-3 w-3 bg-emerald-500'></span>
            </span>
            <span className='text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider'>{t.realTimeSales?.live || 'LIVE'}</span>
          </div>
        }
        rightContent={
          <FilterDropdown
            items={[{ id: 'all', name: language === 'AR' ? 'جميع الفروع' : 'All Branches' }, ...branches]}
            selectedItem={branchFilter === 'all' ? { id: 'all', name: language === 'AR' ? 'جميع الفروع' : 'All Branches' } : branches.find(b => b.id === branchFilter)}
            onSelect={(b) => setBranchFilter(b.id)}
            renderSelected={(b) => (
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-lg opacity-60">store</span>
                <span className="truncate max-w-[100px]">{b?.name}</span>
              </div>
            )}
            renderItem={(b) => (
              <div className="flex items-center gap-2 py-1">
                <span className="material-symbols-rounded text-lg opacity-40">store</span>
                <span>{b.name}</span>
              </div>
            )}
            keyExtractor={(b) => b.id}
            variant="input"
            dense
            onBackground
            floating={true}
            minHeight={34}
            zIndexHigh="z-50"
            className="min-w-[140px]"
          />
        }
      />

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'>
        <StatCard title={t.realTimeSales?.todayRevenue} value={revenue} icon='payments' iconColor='primary' trend={revenueChange > 0 ? 'up' : 'neutral'} trendValue={`${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`} tooltip={tooltips.revenue} onClick={() => setExpandedView('revenue')} isLoading={isLoading} type='currency' />
        <StatCard title={t.realTimeSales?.totalTransactions} value={transactions} icon='receipt_long' iconColor='blue' subValue={`${formatCurrency(highValueAnalysis.avgTransactionValue)} ${t.realTimeSales?.avg || 'avg'}`} tooltip={tooltips.transactions} onClick={() => setExpandedView('transactions')} isLoading={isLoading} />
        <StatCard title={t.realTimeSales?.itemsSold} value={itemsSold} icon='inventory_2' iconColor='purple' subValue={itemsAnalysis.topCategory} tooltip={tooltips.items} onClick={() => setExpandedView('items')} isLoading={isLoading} />
        <StatCard title={t.realTimeSales?.activeCounters} value={activeCountersStats.activeCounters} icon='point_of_sale' iconColor='amber' suffix={`/${activeCountersStats.totalCounters}`} subValue={`${activeCountersStats.onHoldCount} on hold`} tooltip={tooltips.counters} onClick={() => setExpandedView('counters')} isLoading={isLoading} overlay={<span className='absolute -top-1 -right-1 flex h-3 w-3'><span className='animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75'></span><span className='relative rounded-full h-3 w-3 bg-green-500'></span></span>} />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
        <div className='lg:col-span-3 flex flex-col gap-4'>
          <div className={`p-5 rounded-3xl ${CARD_BASE} flex flex-col h-[437px] overflow-hidden`}>
              <div className='flex items-center justify-between mb-4 gap-4'>
                <h3 className='text-lg font-bold flex items-center gap-2 shrink-0'>
                  <span className='material-symbols-rounded text-gray-400'>history</span>
                  {t.realTimeSales?.recentTransactions}
                </h3>
                
                <div className='flex items-center gap-2'>
                  <SegmentedControl
                    value={activeFilter}
                    onChange={(val: any) => setActiveFilter(val)}
                    size='xs'
                    fullWidth={false}
                    className='w-auto hidden sm:flex'
                    options={[
                      { label: t.realTimeSales?.filterAll || 'All', value: 'ALL' },
                      { label: 'VIP', value: 'VIP' },
                      { label: t.realTimeSales?.filterHighValue || 'High Value', value: 'HIGH_VALUE' }
                    ]}
                  />
                </div>
              </div>
            <div className='flex-1 overflow-y-auto custom-scrollbar'>
              <table className='w-full text-left rtl:text-right border-collapse'>
                <thead className='sticky top-0 bg-(--bg-card) z-10'>
                  <tr className='border-b border-[var(--border-divider)] text-xs font-bold text-gray-500 uppercase'>
                    <th className='pb-3 px-2'>{t.realTimeSales?.tableTime || 'Time'}</th>
                    <th className='pb-3 px-2'>{t.realTimeSales?.tableId || 'ID'}</th>
                    <th className='pb-3 px-2'>{t.realTimeSales?.tableItems || 'Items'}</th>
                    <th className='pb-3 px-2'>{t.realTimeSales?.tableTotal || 'Total'}</th>
                    <th className='pb-3 px-2'>{t.realTimeSales?.tableMethod || 'Method'}</th>
                    <th className='pb-3 px-2'>{t.realTimeSales?.tableStatus || 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className='border-b border-[var(--border-divider)] animate-pulse'>
                        <td className='py-4 px-2'><div className='h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded' /></td>
                        <td className='py-4 px-2'><div className='h-3 w-12 bg-gray-100 dark:bg-gray-800 rounded' /></td>
                        <td className='py-4 px-2'><div className='h-3 w-8 bg-gray-100 dark:bg-gray-800 rounded' /></td>
                        <td className='py-4 px-2'><div className='h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded' /></td>
                        <td className='py-4 px-2'><div className='h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded' /></td>
                        <td className='py-4 px-2'><div className='h-2 w-2 rounded-full bg-gray-100 dark:bg-gray-800' /></td>
                      </tr>
                    ))
                  ) : displayedSales.map(sale => {
                    const vip = isVIP(sale);
                    const high = highValueAnalysis.highValueIds.has(sale.id);
                    const isSpecial = vip || high;
                    
                    return (
                      <tr 
                        key={sale.id} 
                        className={`
                          group transition-all duration-300
                          ${sale.isNew ? 'new-transaction' : ''} 
                          relative
                        `}
                      >
                        <td className={`py-3 px-2 text-sm text-gray-500 transition-all duration-300 ${isSpecial ? 'bg-amber-100/80 dark:bg-amber-500/10 rounded-s-xl' : 'border-b border-[var(--border-divider)] group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 group-hover:rounded-s-xl'}`}>
                          {new Date(sale.date).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className={`py-3 px-2 text-sm font-medium transition-all duration-300 ${isSpecial ? 'bg-amber-100/80 dark:bg-amber-500/10' : 'border-b border-[var(--border-divider)] group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'}`}>#{sale.serialId || sale.id.substring(0, 8)}</td>
                        <td className={`py-3 px-2 text-sm transition-all duration-300 ${isSpecial ? 'bg-amber-100/80 dark:bg-amber-500/10' : 'border-b border-[var(--border-divider)] group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'}`}>{sale.items.length}</td>
                        <td className={`py-3 px-2 text-sm font-bold transition-all duration-300 ${isSpecial ? 'bg-amber-100/80 dark:bg-amber-500/10' : 'border-b border-[var(--border-divider)] group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'}`}>{formatCurrency(sale.total)}</td>
                        <td className={`py-3 px-2 transition-all duration-300 ${isSpecial ? 'bg-amber-100/80 dark:bg-amber-500/10' : 'border-b border-[var(--border-divider)] group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'}`}>
                          <span className='flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-400'>
                            <span className='material-symbols-rounded text-[16px] opacity-70'>{sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}</span>
                            {getPaymentLabel(sale.paymentMethod)}
                          </span>
                        </td>
                        <td className={`py-3 px-2 transition-all duration-300 ${isSpecial ? 'bg-amber-100/80 dark:bg-amber-500/10 rounded-e-xl' : 'border-b border-[var(--border-divider)] group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 group-hover:rounded-e-xl'}`}>
                          <div className='flex gap-1.5'>
                            {vip && (
                              <div className='p-1 rounded-lg bg-amber-200/80 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-300/50 dark:border-amber-500/30 shadow-xs' title='VIP'>
                                <span className='material-symbols-rounded text-[18px] block'>verified</span>
                              </div>
                            )}
                            {high && (
                              <div className='p-1 rounded-lg bg-amber-200/80 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-300/50 dark:border-amber-500/30 shadow-xs' title='High Value'>
                                <span className='material-symbols-rounded text-[18px] block'>stars</span>
                              </div>
                            )}
                            {!vip && !high && null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3'>
            <div className={`md:col-span-2 p-4 rounded-2xl ${CARD_BASE} flex flex-col justify-center`}>
              <p className='text-[10px] font-bold text-gray-500 uppercase mb-0.5'>{t.realTimeSales?.salesRate}</p>
              <div className='text-xl font-bold flex items-center'>
                {isLoading ? (
                  <div className='h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse' />
                ) : (
                  <>
                    <AnimatedCounter value={hourlyAnalysis.hourlySalesRate} />
                    <span className='text-[10px] text-gray-400 font-normal ms-1'>/hr</span>
                  </>
                )}
              </div>
            </div>
            <div className={`md:col-span-2 p-4 rounded-2xl ${CARD_BASE} flex flex-col justify-center`}>
              <p className='text-[10px] font-bold text-gray-500 uppercase mb-0.5'>{t.realTimeSales?.invoices}</p>
              <div className='text-xl font-bold flex items-center'>
                {isLoading ? (
                  <div className='h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse' />
                ) : (
                  <>
                    <AnimatedCounter value={hourlyAnalysis.hourlyInvoiceRate} fractionDigits={1} />
                    <span className='text-[10px] text-gray-400 font-normal ms-1'>/hr</span>
                  </>
                )}
              </div>
            </div>
            <div className={`md:col-span-2 p-4 rounded-2xl ${CARD_BASE} flex flex-col justify-center`}>
              <p className='text-[10px] font-bold text-gray-500 uppercase mb-0.5'>{t.realTimeSales?.newCust}</p>
              <div className='text-xl font-bold flex items-center'>
                {isLoading ? (
                  <div className='h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse' />
                ) : (
                  <>
                    <AnimatedCounter value={hourlyAnalysis.hourlyNewCustomerRate} fractionDigits={1} />
                    <span className='text-[10px] text-gray-400 font-normal ms-1'>/hr</span>
                  </>
                )}
              </div>
            </div>
            <div className='md:col-span-3'>
              <FlexDataCard 
                category={t.realTimeSales?.orders} 
                isLoading={isLoading}
                items={[
                  { label: t.realTimeSales?.walkIn, value: `${orderTypeAnalysis.walkInRate.toFixed(0)}%`, percentage: orderTypeAnalysis.walkInRate, color: 'indigo' }, 
                  { label: t.realTimeSales?.delivery, value: `${orderTypeAnalysis.deliveryRate.toFixed(0)}%`, percentage: orderTypeAnalysis.deliveryRate, color: 'orange' }
                ]} 
              />
            </div>
            <div className='md:col-span-3'>
              <FlexDataCard 
                category={t.realTimeSales?.customers} 
                isLoading={isLoading}
                items={[
                  { label: t.realTimeSales?.reg, value: `${customerAnalysis.registeredRate.toFixed(0)}%`, percentage: customerAnalysis.registeredRate, color: 'primary' }, 
                  { label: t.realTimeSales?.anon, value: `${customerAnalysis.anonymousRate.toFixed(0)}%`, percentage: customerAnalysis.anonymousRate, color: 'gray' }
                ]} 
              />
            </div>
          </div>
        </div>
        <div className='lg:col-span-2 flex flex-col gap-4'>
          <ChartWidget title={t.realTimeSales?.hourlyTrend} icon='trending_up' data={hourlyAnalysis.hourlyData} dataKeys={{ primary: 'sales' }} color='#3b82f6' language={language} unit='' allowChartTypeSelection={false} className='card-shadow rounded-3xl! border-0 p-0!' headerClassName='px-6 pt-5' chartClassName='h-[200px] w-full px-2' xAxisInterval={2} chartMargin={{ top: 15, right: 10, left: -30, bottom: 20 }} isLoading={isLoading} />
          <div className={`p-5 rounded-3xl ${CARD_BASE} flex-1 flex flex-col`}>
            <div className='flex items-center justify-between mb-4'><h3 className='text-lg font-bold flex items-center gap-2'><span className='material-symbols-rounded text-yellow-500'>hotel_class</span>{t.realTimeSales?.topProducts}</h3><span className='text-xs text-gray-400'>{t.realTimeSales?.byQty}</span></div>
            <div className='space-y-3'>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='flex items-center justify-between p-2 animate-pulse'>
                    <div className='flex items-center gap-3'>
                      <div className='w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800' />
                      <div className='space-y-1.5'>
                        <div className='h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded' />
                        <div className='h-2 w-16 bg-gray-50 dark:bg-gray-800/50 rounded' />
                      </div>
                    </div>
                    <div className='h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded' />
                  </div>
                ))
              ) : topProducts.map((p, idx) => (<GenericListItem key={idx} rank={idx + 1} title={getDisplayName(p, textTransform)} subtitle={`${p.qty} sold`} value={formatCurrency(p.revenue)} />))}
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4'>
        {/* Payment Methods Chart */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} min-h-[300px] flex flex-col min-w-0`}>
          <h3 className='text-lg font-bold mb-4'>{t.realTimeSales?.paymentMethods}</h3>
          <div className='flex-1 w-full min-w-0 relative h-[220px]'>
            {isLoading ? (
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='w-40 h-40 rounded-full border-8 border-gray-100 dark:border-gray-800 border-t-primary-500 animate-spin opacity-20' />
                <div className='absolute w-32 h-32 rounded-full bg-gray-50 dark:bg-gray-800/50 animate-pulse' />
              </div>
            ) : (
              <ResponsiveContainer width='100%' height='100%' debounce={50}>
                <PieChart>
                  <Pie data={paymentPieData} cx='50%' cy='50%' innerRadius={60} outerRadius={80} paddingAngle={5} dataKey='value'>
                    {paymentPieData.map((e, i) => (<Cell key={i} fill={e.color} />))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
              <p className='text-xs text-gray-400'>Total</p>
              <div className='text-xl font-bold'>
                {isLoading ? <div className='h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse' /> : <AnimatedCounter value={revenue} />}
              </div>
            </div>
          </div>
          <div className='flex justify-center gap-6 mt-2'>
            <div className='flex items-center gap-2'><span className='w-3 h-3 rounded-full bg-emerald-500' /><span>Cash</span></div>
            <div className='flex items-center gap-2'><span className='w-3 h-3 rounded-full bg-indigo-500' /><span>Card</span></div>
          </div>
        </div>

        {/* Category Chart */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} min-h-[300px] flex flex-col min-w-0`}>
          <h3 className='text-lg font-bold mb-4'>{t.realTimeSales?.salesByCategory}</h3>
          <div className='w-full h-[250px] min-w-0 relative'>
            {isLoading ? (
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='w-40 h-40 rounded-full border-8 border-gray-100 dark:border-gray-800 border-t-primary-500 animate-spin opacity-20' />
                <div className='absolute w-32 h-32 rounded-full bg-gray-50 dark:bg-gray-800/50 animate-pulse' />
              </div>
            ) : (
              <ResponsiveContainer width='100%' height='100%' debounce={50}>
                <PieChart>
                  <Pie data={categoryPieData} cx='50%' cy='50%' innerRadius={60} outerRadius={80} paddingAngle={5} dataKey='value'>
                    {categoryPieData.map((e, i) => (<Cell key={i} fill={e.color} />))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
              <span className='text-xs text-gray-400'>Items</span>
              <div className='text-xl font-bold'>
                {isLoading ? <div className='h-6 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse' /> : <AnimatedCounter value={itemsSold} />}
              </div>
            </div>
          </div>
        </div>

        {/* Returns Chart */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} min-h-[300px] flex flex-col`}>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-bold'>{t.realTimeSales?.returnActivity}</h3>
            <span className='text-xs font-bold px-2 py-1 bg-rose-100 text-rose-700 rounded-lg'>Today</span>
          </div>
          <div className='flex-1 flex flex-col justify-center items-center text-center space-y-4'>
            <div className='w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center'><span className='material-symbols-rounded text-4xl'>assignment_return</span></div>
            <div>
              <div className='text-3xl font-bold'><AnimatedCounter value={todaysSales.filter(s => s.hasReturns).length} /></div>
              <p className='text-sm text-gray-500'>Returns Processed</p>
            </div>
            <div className='w-full pt-4 border-t border-gray-100 grid grid-cols-2 gap-4'>
              <div><p className='text-xs text-gray-400'>Value</p><div className='text-lg font-bold text-rose-600'><AnimatedCounter value={returnedValue} /></div></div>
              <div><p className='text-xs text-gray-400'>Rate</p><div className='text-lg font-bold flex items-baseline gap-0.5'><AnimatedCounter value={(todaysSales.filter(s => s.hasReturns).length / (transactions || 1)) * 100} fractionDigits={1} /><span className="text-sm font-normal opacity-50">%</span></div></div>
            </div>
          </div>
        </div>
      </div>

      <ExpandedModal isOpen={!!expandedView} activeView={expandedView} views={monitorViews as any} onClose={() => setExpandedView(null)} color={color.name} />
      <HelpButton onClick={() => setShowHelp(true)} title={helpContent.title} color={color.name} isRTL={isRTL} />
      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} helpContent={helpContent as any} color={color.name} language={language} />
    </div>
  );
};
