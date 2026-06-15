import type React from 'react';
import { useMemo, useState } from 'react';
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
import { calculateSalePoints } from '../../services/customers/loyaltyUtils';
import type { Customer, Sale } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { CARD_BASE } from '../../utils/themeStyles';
import { PageHeader } from '../common/PageHeader';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';

interface CustomerLoyaltyOverviewProps {
  customers: Customer[];
  sales: Sale[];
  color: string;
  t: Translations;
  language: 'EN' | 'AR';
  onViewChange?: (view: string) => void;
}

export const CustomerLoyaltyOverview: React.FC<CustomerLoyaltyOverviewProps> = ({
  customers,
  sales,
  color,
  t,
  language,
  onViewChange,
}) => {
  const [timeRange, setTimeRange] = useState('30');
  const isRTL = language === 'AR';

  // Calculate loyalty statistics
  const loyaltyStats = useMemo(() => {
    const activeCustomers = customers.filter((c) => c.status === 'active');
    const totalPoints = activeCustomers.reduce((sum, c) => sum + (c.points || 0), 0);
    const avgPoints = activeCustomers.length > 0 ? totalPoints / activeCustomers.length : 0;
    const topTierCount = activeCustomers.filter((c) => (c.points || 0) > 1000).length;

    // Points distribution
    const distribution = [
      { range: '0-100', count: activeCustomers.filter((c) => (c.points || 0) <= 100).length },
      {
        range: '101-500',
        count: activeCustomers.filter((c) => (c.points || 0) > 100 && (c.points || 0) <= 500)
          .length,
      },
      {
        range: '501-1000',
        count: activeCustomers.filter((c) => (c.points || 0) > 500 && (c.points || 0) <= 1000)
          .length,
      },
      { range: '1000+', count: activeCustomers.filter((c) => (c.points || 0) > 1000).length },
    ];

    return {
      activeCustomers: activeCustomers.length,
      totalPoints,
      avgPoints,
      topTierCount,
      distribution,
    };
  }, [customers]);

  // Recent points activity (last 10 sales with points)
  const recentPointsActivity = useMemo(() => {
    return [...sales]
      .filter((s) => s.customerName !== 'Guest Customer')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((sale) => {
        const points = calculateSalePoints(sale);

        return {
          ...sale,
          pointsEarned: points.totalEarned,
        };
      });
  }, [sales]);

  // Top loyalty customers
  const topLoyaltyCustomers = useMemo(() => {
    return [...customers]
      .filter((c) => c.status === 'active')
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10);
  }, [customers]);

  // Points trend over selected time range
  const pointsTrend = useMemo(() => {
    let days = 30;
    if (timeRange === '1') days = 1;
    else if (timeRange === '7') days = 7;
    else if (timeRange === 'ALL') days = 90; // Limit 'All' to 90 days for performance/readability

    const history = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        points: 0,
      };
    });

    sales.forEach((sale) => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      const dayData = history.find((d) => d.date === saleDate);

      if (dayData && sale.customerName !== 'Guest Customer') {
        const points = calculateSalePoints(sale);
        dayData.points += points.totalEarned;
      }
    });

    return history.map((d) => ({
      name:
        days === 1
          ? new Date(d.date).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date(d.date).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
              month: 'short',
              day: 'numeric',
            }),
      points: parseFloat(d.points.toFixed(1)),
    }));
  }, [sales, language, timeRange]);

  const getTierInfo = (points: number) => {
    if (points > 2000)
      return {
        tier: 'Platinum',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
      };
    if (points > 1000)
      return {
        tier: 'Gold',
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      };
    if (points > 500)
      return {
        tier: 'Silver',
        color: 'text-gray-500 dark:text-gray-400',
        bg: 'bg-gray-100 dark:bg-gray-800',
      };
    return {
      tier: 'Bronze',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    };
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`bg-white dark:bg-gray-800 p-3 rounded-xl ${CARD_BASE} text-left rtl:text-right`}
        >
          <p className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {payload[0].payload.name}
          </p>
          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
            {payload[0].value.toFixed(1)} {t.loyalty?.pts || 'pts'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className='h-full overflow-y-auto px-page space-y-4 animate-fade-in pb-10'
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <PageHeader
        mb='mb-0'
        centerContent={
          <SegmentedControl
            options={[
              {
                label: language === 'AR' ? 'نظرة عامة على العملاء' : 'Customer Overview',
                value: 'customer-overview',
              },
              {
                label: language === 'AR' ? 'نظرة عامة على الولاء' : 'Loyalty Overview',
                value: 'loyalty-overview',
              },
              {
                label: language === 'AR' ? 'ولاء العملاء' : 'Customer Loyalty',
                value: 'loyalty-lookup',
              },
            ]}
            value='loyalty-overview'
            onChange={(val) => onViewChange?.(String(val))}
            size='md'
            shape='pill'
          />
        }
        rightContent={
          <SegmentedControl
            options={[
              { label: language === 'AR' ? 'اليوم' : 'Today', value: '1' },
              { label: language === 'AR' ? '٧ أيام' : '7 Days', value: '7' },
              { label: language === 'AR' ? 'شهر' : 'Month', value: '30' },
              { label: language === 'AR' ? 'الكل' : 'All', value: 'ALL' },
            ]}
            value={timeRange}
            onChange={(val) => setTimeRange(String(val))}
            size='sm'
          />
        }
      />

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'>
        {/* Total Active Customers */}
        <SmallCard
          icon='group'
          title={t.loyalty?.activeCustomers || 'Active Customers'}
          value={loyaltyStats.activeCustomers}
          iconColor='primary'
        />

        {/* Total Points Issued */}
        <SmallCard
          icon='stars'
          title={t.loyalty?.totalPoints || 'Total Points Issued'}
          value={loyaltyStats.totalPoints.toFixed(1)}
          iconColor='amber'
        />

        {/* Average Points */}
        <SmallCard
          icon='trending_up'
          title={t.loyalty?.avgPoints || 'Avg Points/Customer'}
          value={loyaltyStats.avgPoints.toFixed(1)}
          iconColor='emerald'
        />

        {/* Top Tier Customers */}
        <SmallCard
          icon='workspace_premium'
          title={t.loyalty?.topTier || 'Top Tier (>1000)'}
          value={loyaltyStats.topTierCount}
          iconColor='purple'
        />
      </div>

      {/* Charts Row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Points Distribution */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-80`}>
          <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 mb-3'>
            {t.loyalty?.distribution || 'Points Distribution'}
          </h3>
          <ResponsiveContainer width='100%' height='90%'>
            <BarChart
              data={loyaltyStats.distribution}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke='var(--border-divider)'
              />
              <XAxis
                dataKey='range'
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                orientation={isRTL ? 'right' : 'left'}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
              <Bar dataKey='count' fill='var(--primary-500)' radius={[20, 20, 20, 20]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Points Trend */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-80`}>
          <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 mb-3'>
            {t.loyalty?.trend || 'Points Issued'} (
            {timeRange === '1'
              ? language === 'AR'
                ? 'اليوم'
                : 'Today'
              : timeRange === '7'
                ? language === 'AR'
                  ? '٧ أيام'
                  : '7 Days'
                : timeRange === '30'
                  ? language === 'AR'
                    ? '٣٠ يوم'
                    : '30 Days'
                  : language === 'AR'
                    ? '٩٠ يوم'
                    : '90 Days'}
            )
          </h3>
          <ResponsiveContainer width='100%' height='90%'>
            <AreaChart data={pointsTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id='pointsTrendGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='var(--primary-500)' stopOpacity={0.3} />
                  <stop offset='95%' stopColor='var(--primary-500)' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke='var(--border-divider)'
              />
              <XAxis
                dataKey='name'
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                orientation={isRTL ? 'right' : 'left'}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type='monotone'
                dataKey='points'
                stroke='var(--primary-500)'
                strokeWidth={3}
                fill='url(#pointsTrendGrad)'
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Recent Points Activity */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-96 flex flex-col`}>
          <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-primary-500 text-[20px]'>history</span>
            {t.loyalty?.recentActivity || 'Recent Points Activity'}
          </h3>
          <div className='flex-1 overflow-y-auto space-y-2 pe-1'>
            {recentPointsActivity.length === 0 ? (
              <div className='h-full flex items-center justify-center text-gray-400 text-sm'>
                {t.noResults || 'No activity yet'}
              </div>
            ) : (
              recentPointsActivity.map((sale) => (
                <div
                  key={sale.id}
                  className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                >
                  <div className='flex justify-between items-start mb-1'>
                    <div>
                      <p className='font-medium text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                        {sale.customerName}
                        <span className='text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded'>
                          {sale.customerCode}
                        </span>
                      </p>
                      <p className='text-xs text-gray-500'>
                        {new Date(sale.date).toLocaleDateString(
                          language === 'AR' ? 'ar-EG' : 'en-US'
                        )}{' '}
                        • #{sale.serialId}
                      </p>
                    </div>
                    <span className='px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'>
                      +{sale.pointsEarned} {t.loyalty?.pts || 'pts'}
                    </span>
                  </div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>
                    {t.loyalty?.order || 'Order'}:{' '}
                    {formatCurrency(sale.total, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Loyalty Customers */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-96 flex flex-col`}>
          <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-yellow-500 text-[20px]'>
              hotel_class
            </span>
            {t.loyalty?.topCustomers || 'Top Loyalty Customers'}
          </h3>
          <div className='flex-1 overflow-y-auto space-y-2 pe-1'>
            {topLoyaltyCustomers.length === 0 ? (
              <div className='h-full flex items-center justify-center text-gray-400 text-sm'>
                {t.noResults || 'No customers yet'}
              </div>
            ) : (
              topLoyaltyCustomers.map((customer, index) => {
                const tierInfo = getTierInfo(customer.points || 0);
                return (
                  <div
                    key={customer.id}
                    className='flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                  >
                    <div className='flex items-center gap-3 overflow-hidden flex-1'>
                      <div
                        className={`w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 font-bold text-xs flex items-center justify-center shrink-0`}
                      >
                        {index + 1}
                      </div>
                      <div className='overflow-hidden'>
                        <p className='text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex items-center gap-2'>
                          {customer.name}
                          <span className='text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-1.5 py-0.5 rounded shrink-0'>
                            {customer.code}
                          </span>
                        </p>
                        <p className='text-xs text-gray-500'>
                          {formatCurrency(
                            customer.totalPurchases,
                            'EGP',
                            language === 'AR' ? 'ar-EG' : 'en-US'
                          )}{' '}
                          {t.loyalty?.totalSuffix || 'total'}
                        </p>
                      </div>
                    </div>
                    <div className='flex flex-col items-end gap-1'>
                      <span className='text-sm font-bold text-gray-900 dark:text-gray-100'>
                        {(customer.points || 0).toFixed(1)} {t.loyalty?.pts || 'pts'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierInfo.bg} ${tierInfo.color}`}
                      >
                        {tierInfo.tier}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
