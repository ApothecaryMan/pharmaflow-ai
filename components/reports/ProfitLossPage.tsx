import { createColumnHelper } from '@tanstack/react-table';
import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StorageKeys } from '../../config/storageKeys';
import { useSettings } from '../../context';
import { useAuthStore } from '../../stores/authStore';
import { dateRangeService } from '../../services/financials/dateRangeService';
import { financialService } from '../../services/financials/financialService';
import type {
  CategoryFinancialReport,
  DailyFinancialData,
  FinancialReport,
} from '../../types/intelligence';
import { formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { storage } from '../../utils/storage';
import { CARD_BASE } from '../../utils/themeStyles';
import { ChartWidget } from '../common/ChartWidget';
import { Icons } from '../common/Icons';
import { PageHeader } from '../common/PageHeader';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { TanStackTable } from '../common/TanStackTable';
import { DashboardPageSkeleton } from '../intelligence/common/IntelligenceSkeletons';

const categoryHelper = createColumnHelper<CategoryFinancialReport>();

const CurrencyDisplay: React.FC<{ value: number }> = ({ value }) => {
  const { amount, symbol } = formatCurrencyParts(value);
  return (
    <span className='inline-flex items-baseline gap-1'>
      <span className='font-inherit'>{amount}</span>
      <span className='text-[10px] opacity-50 font-bold uppercase tracking-tighter'>{symbol}</span>
    </span>
  );
};

export const ProfitLossPage: React.FC<{ t: Translations; language?: string }> = ({
  t,
  language = 'ar',
}) => {
  const { theme } = useSettings();
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'last_3_months' | 'this_year'>(
    'this_month'
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPeriodRef = useRef<string | null>(null);

  const [showStats, setShowStats] = useState(() =>
    storage.get<boolean>(StorageKeys.HEADER_STATS_VISIBLE, true)
  );

  useEffect(() => {
    storage.set(StorageKeys.HEADER_STATS_VISIBLE, showStats);
  }, [showStats]);

  useEffect(() => {
    const fetchReport = async () => {
      const fetchKey = `${activeBranchId}-${period}`;
      // Prevent duplicate fetches for the same period and branch
      if (lastPeriodRef.current === fetchKey && report) return;

      // Abort previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastPeriodRef.current = fetchKey;

      setLoading(true);
      try {
        const range = dateRangeService.getDateRange(period);
        const data = await financialService.getFinancialReport(
          range.start,
          range.end,
          activeBranchId
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
  }, [period, activeBranchId]);

  const categoryColumns = useMemo(
    () => [
      categoryHelper.accessor('category', {
        header: t.intelligence.financials.profitLoss.category,
        cell: (info) => (
          <span className='font-bold text-gray-900 dark:text-white'>
            {info.getValue() || t.intelligence.financials.profitLoss.unclassified}
          </span>
        ),
      }),
      categoryHelper.accessor('revenue', {
        header: t.intelligence.financials.profitLoss.revenue,
        cell: (info) => (
          <span className='font-medium'>
            <CurrencyDisplay value={info.getValue()} />
          </span>
        ),
      }),
      categoryHelper.accessor('profit', {
        header: t.intelligence.financials.profitLoss.profit,
        cell: (info) => (
          <span className='font-bold'>
            <CurrencyDisplay value={info.getValue()} />
          </span>
        ),
      }),
      categoryHelper.accessor('cogs', {
        header: t.intelligence.financials.profitLoss.cogs,
        cell: (info) => (
          <span className='text-gray-500 dark:text-gray-400'>
            <CurrencyDisplay value={info.getValue()} />
          </span>
        ),
      }),
    ],
    [t]
  );

  // Full-page skeleton removed for progressive rendering

  const { summary, daily = [], categories = [] } = report || {};

  const aggregatedChartData = useMemo(() => {
    if (!daily || daily.length === 0) return [];

    if (period === 'this_year') {
      const monthlyMap = new Map<string, any>();
      daily.forEach((d: any) => {
        const monthKey = d.day.substring(0, 7); // YYYY-MM
        const existing = monthlyMap.get(monthKey) || {
          day: `${monthKey}-01`,
          revenue: 0,
          refund: 0,
        };
        existing.revenue += d.revenue || 0;
        existing.refund += d.refund || 0;
        monthlyMap.set(monthKey, existing);
      });
      return Array.from(monthlyMap.values());
    } else if (period === 'last_3_months') {
      const weeklyMap = new Map<string, any>();
      daily.forEach((d: any) => {
        const dateObj = new Date(d.day);
        const day = dateObj.getDate();
        const weekNum = Math.ceil(day / 7);
        const monthKey = d.day.substring(0, 7); // YYYY-MM
        const weekKey = `${monthKey}-W${weekNum}`;

        const existing = weeklyMap.get(weekKey) || { day: weekKey, revenue: 0, refund: 0 };
        existing.revenue += d.revenue || 0;
        existing.refund += d.refund || 0;
        weeklyMap.set(weekKey, existing);
      });
      return Array.from(weeklyMap.values());
    }

    return daily;
  }, [daily, period]);

  return (
    <div className='h-full overflow-y-auto scrollbar-hide'>
      {/* Header & Filters */}
      <PageHeader
        centerContent={
          <SegmentedControl
            options={[
              { label: t.intelligence.financials.filters.periods.this_month, value: 'this_month' },
              { label: t.intelligence.financials.filters.periods.last_month, value: 'last_month' },
              {
                label: t.intelligence.financials.filters.periods.last_3_months,
                value: 'last_3_months',
              },
              { label: t.intelligence.financials.filters.periods.this_year, value: 'this_year' },
            ]}
            value={period}
            onChange={(v) => setPeriod(v as any)}
            size='md'
            shape='pill'
            useGraphicFont={true}
            className='min-w-[400px]'
          />
        }
        sticky={true}
        mb='mb-4'
        showBottom={showStats}
        showStatsToggle={true}
        onToggleBottom={() => setShowStats(!showStats)}
        toggleTooltip={showStats ? t.global.actions.hideStats : t.global.actions.showStats}
        bottomContent={
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <SmallCard
              title={t.intelligence.financials.profitLoss.netRevenue}
              value={summary?.net_revenue || 0}
              icon='account_balance_wallet'
              iconColor='emerald'
              type='currency'
              isLoading={loading}
            />
            <SmallCard
              title={t.intelligence.financials.profitLoss.grossProfit}
              value={summary?.gross_profit || 0}
              icon='trending_up'
              iconColor='primary'
              type='currency'
              isLoading={loading}
            />
            <SmallCard
              title={t.intelligence.financials.profitLoss.netCogs}
              value={summary?.net_cogs || 0}
              icon='inventory_2'
              iconColor='amber'
              type='currency'
              isLoading={loading}
            />
            <SmallCard
              title={t.intelligence.financials.profitLoss.margin}
              value={summary?.net_revenue ? (summary.gross_profit / summary.net_revenue) * 100 : 0}
              icon='leaderboard'
              iconColor='indigo'
              fractionDigits={1}
              valueSuffix='%'
              isLoading={loading}
            />
          </div>
        }
      />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6'>
        {/* Main P&L Statement */}
        <div className={`lg:col-span-1 ${CARD_BASE} rounded-2xl p-6`}>
          <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
            <span className='material-symbols-rounded text-gray-400' style={{ fontSize: '20px' }}>
              summarize
            </span>
            {t.intelligence.financials.profitLoss.statement}
          </h3>

          <div className='space-y-2'>
            <PLRow
              label={t.intelligence.financials.profitLoss.grossSales}
              value={summary?.gross_revenue || 0}
              isLoading={loading}
            />
            <PLRow
              label={t.intelligence.financials.profitLoss.returns}
              value={-(summary?.return_revenue || 0)}
              isLoading={loading}
            />
            <hr className='border-(--border-divider)' />
            <PLRow
              label={t.intelligence.financials.profitLoss.netSales}
              value={summary?.net_revenue || 0}
              isBold
              isLoading={loading}
            />
            <PLRow
              label={t.intelligence.financials.profitLoss.costOfSales}
              value={-(summary?.net_cogs || 0)}
              isLoading={loading}
            />
            <hr className='border-(--border-divider)' />
            <PLRow
              label={t.intelligence.financials.profitLoss.grossProfit}
              value={summary?.gross_profit || 0}
              isBold
              isLoading={loading}
            />

            <div className='mt-4 pt-4 border-t border-dashed border-(--border-divider)'>
              <PLRow
                label={
                  <div className='flex items-center gap-2'>
                    <span>{t.intelligence.financials.profitLoss.operatingExpenses}</span>
                    {(!summary?.expenses_total || summary.expenses_total === 0) && (
                      <span className='text-[10px] text-gray-400 italic font-normal'>
                        * {t.intelligence.financials.profitLoss.noExpenses}
                      </span>
                    )}
                  </div>
                }
                value={-(summary?.expenses_total || 0)}
                isLoading={loading}
              />
            </div>

            <hr className='border-(--border-divider)' />
            <PLRow
              label={t.intelligence.financials.profitLoss.estimatedNetProfit}
              value={
                summary?.net_profit !== undefined ? summary.net_profit : summary?.gross_profit || 0
              }
              isBold
              isFinal
              isLoading={loading}
            />
          </div>
        </div>

        {/* Category Table */}
        <div className={`lg:col-span-2 ${CARD_BASE} rounded-2xl p-6`}>
          <h3 className='text-lg font-bold mb-4'>
            {t.intelligence.financials.profitLoss.profitabilityByCategory}
          </h3>
          <div className='h-full min-h-[300px]'>
            <TanStackTable
              data={categories}
              columns={categoryColumns}
              lite={true}
              tableId='pl-category-table'
              pageSize={5}
              isLoading={loading}
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <ChartWidget
        title={t.intelligence.financials.profitLoss.dailyPerformance}
        icon='monitoring'
        data={aggregatedChartData}
        dataKeys={{
          primary: 'revenue',
          secondary: [
            {
              key: 'refund',
              name: t.intelligence.financials.profitLoss.refunds,
              color: '#ef4444',
              isDashed: true,
            },
          ],
        }}
        color='#10b981'
        language={language}
        unit={summary?.currency || 'ج.م'}
        primaryLabel={t.intelligence.financials.profitLoss.sales}
        isLoading={loading}
        xAxisKey='day'
        xAxisFormatter={(val) => {
          const locale = language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
          if (period === 'this_year') {
            const date = new Date(val);
            return date.toLocaleDateString(locale, { month: 'short' });
          }
          if (period === 'last_3_months') {
            const [yyyy, mm, w] = val.split('-');
            const monthName = new Date(parseInt(yyyy), parseInt(mm) - 1, 1).toLocaleDateString(
              locale,
              { month: 'short' }
            );
            return `${monthName} ${w.replace('W', language === 'ar' ? 'أسبوع ' : 'W')}`;
          }
          const date = new Date(val);
          return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
        }}
        tooltipLabelFormatter={(val) => {
          const locale = language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
          if (period === 'this_year') {
            const date = new Date(val);
            return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
          }
          if (period === 'last_3_months') {
            const [yyyy, mm, w] = val.split('-');
            const monthName = new Date(parseInt(yyyy), parseInt(mm) - 1, 1).toLocaleDateString(
              locale,
              { month: 'long', year: 'numeric' }
            );
            return `${language === 'ar' ? 'الأسبوع' : 'Week'} ${w.replace('W', '')} - ${monthName}`;
          }
          const date = new Date(val);
          return date.toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }}
        className='mb-0 h-[400px]'
        chartClassName='h-[300px]'
      />
    </div>
  );
};

const PLRow: React.FC<{
  label: React.ReactNode;
  value: number;
  isBold?: boolean;
  isNegative?: boolean;
  isFinal?: boolean;
  isLoading?: boolean;
}> = ({ label, value, isBold, isNegative, isFinal, isLoading }) => (
  <div
    className={`flex items-center justify-between py-1 ${isBold ? 'font-bold py-2' : 'text-sm'} ${isFinal ? 'text-lg mt-2' : ''}`}
  >
    <span
      className={`${isBold ? 'text-gray-900 dark:text-white' : 'text-gray-500'} ${isFinal ? 'text-primary-600' : ''}`}
    >
      {label}
    </span>
    <span
      className={`
      ${isBold ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}
      ${isFinal ? 'text-2xl font-black' : ''}
    `}
    >
      {isLoading ? (
        <div
          className={`h-4 ${isFinal ? 'h-8 w-32' : 'w-20'} bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse`}
        />
      ) : (
        <CurrencyDisplay value={value} />
      )}
    </span>
  </div>
);
