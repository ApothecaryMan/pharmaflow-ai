import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

import { formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { Icons } from '../common/Icons';
import { TanStackTable } from '../common/TanStackTable';
import { createColumnHelper } from '@tanstack/react-table';
import type { FinancialReport, DailyFinancialData, CategoryFinancialReport } from '../../types/intelligence';
import { intelligenceService } from '../../services/intelligence/intelligenceService';
import { useSettings } from '../../context';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardPageSkeleton } from '../intelligence/common/IntelligenceSkeletons';
import { SmallCard } from '../common/SmallCard';
import { SegmentedControl } from '../common/SegmentedControl';
import { CARD_BASE } from '../../utils/themeStyles';
import { PageHeader } from '../common/PageHeader';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

const categoryHelper = createColumnHelper<CategoryFinancialReport>();

const CurrencyDisplay: React.FC<{ value: number }> = ({ value }) => {
  const { amount, symbol } = formatCurrencyParts(value);
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-inherit">{amount}</span>
      <span className="text-[10px] opacity-50 font-bold uppercase tracking-tighter">{symbol}</span>
    </span>
  );
};

export const ProfitLossPage: React.FC<{ t: any; language?: string }> = ({ t, language = 'ar' }) => {
  const { theme } = useSettings();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'last_3_months' | 'this_year'>('this_month');
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPeriodRef = useRef<string | null>(null);

  const [showStats, setShowStats] = useState(() => storage.get<boolean>(StorageKeys.HEADER_STATS_VISIBLE, true));

  useEffect(() => {
    storage.set(StorageKeys.HEADER_STATS_VISIBLE, showStats);
  }, [showStats]);

  useEffect(() => {
    const fetchReport = async () => {
      // Prevent duplicate fetches for the same period
      if (lastPeriodRef.current === period && report) return;
      
      // Abort previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastPeriodRef.current = period;

      setLoading(true);
      try {
        const now = new Date();
        let start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date();

        if (period === 'last_month') {
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          end.setTime(lastMonthEnd.getTime());
        } else if (period === 'last_3_months') {
          start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        } else if (period === 'this_year') {
          start = new Date(now.getFullYear(), 0, 1);
        }

        const data = await intelligenceService.getFinancialReport(
          start.toISOString(),
          end.toISOString()
        );
        
        if (!controller.signal.aborted) {
          setReport(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load P&L report:', err);
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [period]);

  const categoryColumns = useMemo(() => [
    categoryHelper.accessor('category', {
      header: t.intelligence.financials.profitLoss.category,
      cell: info => <span className="font-bold text-gray-900 dark:text-white">{info.getValue() || t.intelligence.financials.profitLoss.unclassified}</span>
    }),
    categoryHelper.accessor('revenue', {
      header: t.intelligence.financials.profitLoss.revenue,
      cell: info => <span className="font-medium"><CurrencyDisplay value={info.getValue()} /></span>
    }),
    categoryHelper.accessor('profit', {
      header: t.intelligence.financials.profitLoss.profit,
      cell: info => <span className="font-bold"><CurrencyDisplay value={info.getValue()} /></span>
    }),
    categoryHelper.accessor('cogs', {
      header: t.intelligence.financials.profitLoss.cogs,
      cell: info => <span className="text-gray-500 dark:text-gray-400"><CurrencyDisplay value={info.getValue()} /></span>
    })
  ], [t]);

  // Full-page skeleton removed for progressive rendering

  const { summary, daily = [], categories = [] } = report || {};

  return (
    <div className="h-full overflow-y-auto pb-8 scrollbar-hide">
      {/* Header & Filters */}
      <PageHeader
        centerContent={
          <SegmentedControl
            options={[
              { label: t.intelligence.financials.filters.periods.this_month, value: 'this_month' },
              { label: t.intelligence.financials.filters.periods.last_month, value: 'last_month' },
              { label: t.intelligence.financials.filters.periods.last_3_months, value: 'last_3_months' },
              { label: t.intelligence.financials.filters.periods.this_year, value: 'this_year' },
            ]}
            value={period}
            onChange={(v) => setPeriod(v as any)}
            size="md"
            shape="pill"
            useGraphicFont={true}
            className="min-w-[400px]"
          />
        }
        sticky={true}
        mb="mb-4"
        showBottom={showStats}
        showStatsToggle={true}
        onToggleBottom={() => setShowStats(!showStats)}
        toggleTooltip={showStats ? t.global.actions.hideStats : t.global.actions.showStats}
        bottomContent={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SmallCard 
              title={t.intelligence.financials.profitLoss.netRevenue}
              value={summary?.net_revenue || 0}
              icon="account_balance_wallet"
              iconColor="emerald"
              type="currency"
              isLoading={loading}
            />
            <SmallCard 
              title={t.intelligence.financials.profitLoss.grossProfit}
              value={summary?.gross_profit || 0}
              icon="trending_up"
              iconColor="primary"
              type="currency"
              isLoading={loading}
            />
            <SmallCard 
              title={t.intelligence.financials.profitLoss.netCogs}
              value={summary?.net_cogs || 0}
              icon="inventory_2"
              iconColor="amber"
              type="currency"
              isLoading={loading}
            />
            <SmallCard 
              title={t.intelligence.financials.profitLoss.margin}
              value={summary?.net_revenue ? (summary.gross_profit / summary.net_revenue) * 100 : 0}
              icon="leaderboard"
              iconColor="indigo"
              fractionDigits={1}
              valueSuffix="%"
              isLoading={loading}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Main P&L Statement */}
        <div className={`lg:col-span-1 ${CARD_BASE} rounded-2xl p-6`}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-rounded text-gray-400" style={{ fontSize: '20px' }}>summarize</span>
            {t.intelligence.financials.profitLoss.statement}
          </h3>
          
          <div className="space-y-2">
            <PLRow label={t.intelligence.financials.profitLoss.grossSales} value={summary?.gross_revenue || 0} isLoading={loading} />
            <PLRow label={t.intelligence.financials.profitLoss.returns} value={-(summary?.return_revenue || 0)} isLoading={loading} />
            <hr className="border-(--border-divider)" />
            <PLRow label={t.intelligence.financials.profitLoss.netSales} value={summary?.net_revenue || 0} isBold isLoading={loading} />
            <PLRow label={t.intelligence.financials.profitLoss.costOfSales} value={-(summary?.net_cogs || 0)} isLoading={loading} />
            <hr className="border-(--border-divider)" />
            <PLRow 
              label={t.intelligence.financials.profitLoss.grossProfit} 
              value={summary?.gross_profit || 0} 
              isBold 
              isLoading={loading}
            />
            
            <div className="mt-4 pt-4 border-t border-dashed border-(--border-divider)">
              <PLRow 
                label={
                  <div className="flex items-center gap-2">
                    <span>{t.intelligence.financials.profitLoss.operatingExpenses}</span>
                    <span className="text-[10px] text-gray-400 italic font-normal">
                      * {t.intelligence.financials.profitLoss.noExpenses}
                    </span>
                  </div>
                } 
                value={0} 
                isLoading={loading} 
              />
            </div>
            
            <hr className="border-(--border-divider)" />
            <PLRow 
              label={t.intelligence.financials.profitLoss.estimatedNetProfit} 
              value={summary?.gross_profit || 0} 
              isBold 
              isFinal
              isLoading={loading}
            />
          </div>
        </div>

        {/* Category Table */}
        <div className={`lg:col-span-2 ${CARD_BASE} rounded-2xl p-6`}>
          <h3 className="text-lg font-bold mb-4">{t.intelligence.financials.profitLoss.profitabilityByCategory}</h3>
          <div className="h-full min-h-[300px]">
            <TanStackTable 
              data={categories}
              columns={categoryColumns}
              lite={true}
              tableId="pl-category-table"
              pageSize={5}
              isLoading={loading}
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={`${CARD_BASE} rounded-2xl p-6 h-[400px]`}>
        <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
          <span>{t.intelligence.financials.profitLoss.dailyPerformance}</span>
          <span className="text-xs font-normal text-gray-400">{t.intelligence.financials.profitLoss.salesVsReturns}</span>
        </h3>
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.primary} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
              <XAxis 
                dataKey="day" 
                tickFormatter={(val) => new Date(val).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#888' }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(val) => new Date(val).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              />
              <Area type="monotone" dataKey="revenue" name={t.intelligence.financials.profitLoss.sales} stroke={theme.primary} fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
              <Area type="monotone" dataKey="refund" name={t.intelligence.financials.profitLoss.refunds} stroke="#ef4444" fill="#ef444410" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const PLRow: React.FC<{ label: React.ReactNode; value: number; isBold?: boolean; isNegative?: boolean; isFinal?: boolean; isLoading?: boolean }> = ({ 
  label, value, isBold, isNegative, isFinal, isLoading 
}) => (
  <div className={`flex items-center justify-between py-1 ${isBold ? 'font-bold py-2' : 'text-sm'} ${isFinal ? 'text-lg mt-2' : ''}`}>
    <span className={`${isBold ? 'text-gray-900 dark:text-white' : 'text-gray-500'} ${isFinal ? 'text-primary-600' : ''}`}>{label}</span>
    <span className={`
      ${isBold ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}
      ${isFinal ? 'text-2xl font-black' : ''}
    `}>
      {isLoading ? (
        <div className={`h-4 ${isFinal ? 'h-8 w-32' : 'w-20'} bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse`} />
      ) : (
        <CurrencyDisplay value={value} />
      )}
    </span>
  </div>
);
