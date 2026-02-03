import type React from 'react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Customer, Sale } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';

interface CustomerLoyaltyOverviewProps {
  customers: Customer[];
  sales: Sale[];
  color: string;
  t: any;
  language: 'EN' | 'AR';
}

export const CustomerLoyaltyOverview: React.FC<CustomerLoyaltyOverviewProps> = ({
  customers,
  sales,
  color,
  t,
  language,
}) => {
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
        // Calculate points for this sale
        let totalRate = 0;
        if (sale.total > 20000) totalRate = 0.05;
        else if (sale.total > 10000) totalRate = 0.04;
        else if (sale.total > 5000) totalRate = 0.03;
        else if (sale.total > 1000) totalRate = 0.02;
        else if (sale.total > 100) totalRate = 0.01;

        const totalPoints = sale.total * totalRate;

        let itemPoints = 0;
        sale.items.forEach((item) => {
          let itemRate = 0;
          let price = item.price;
          if (item.isUnit && item.unitsPerPack) {
            price = item.price / item.unitsPerPack;
          }

          if (price > 20000) itemRate = 0.15;
          else if (price > 10000) itemRate = 0.12;
          else if (price > 5000) itemRate = 0.1;
          else if (price > 1000) itemRate = 0.05;
          else if (price > 500) itemRate = 0.03;
          else if (price > 100) itemRate = 0.02;

          if (itemRate > 0) {
            itemPoints += price * item.quantity * itemRate;
          }
        });

        const pointsEarned = parseFloat((totalPoints + itemPoints).toFixed(1));

        return {
          ...sale,
          pointsEarned,
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

  // Points trend over last 30 days
  const pointsTrend = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        points: 0,
      };
    });

    sales.forEach((sale) => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      const dayData = last30Days.find((d) => d.date === saleDate);

      if (dayData && sale.customerName !== 'Guest Customer') {
        // Calculate points
        let totalRate = 0;
        if (sale.total > 20000) totalRate = 0.05;
        else if (sale.total > 10000) totalRate = 0.04;
        else if (sale.total > 5000) totalRate = 0.03;
        else if (sale.total > 1000) totalRate = 0.02;
        else if (sale.total > 100) totalRate = 0.01;

        const totalPoints = sale.total * totalRate;

        let itemPoints = 0;
        sale.items.forEach((item) => {
          let itemRate = 0;
          let price = item.price;
          if (item.isUnit && item.unitsPerPack) {
            price = item.price / item.unitsPerPack;
          }

          if (price > 20000) itemRate = 0.15;
          else if (price > 10000) itemRate = 0.12;
          else if (price > 5000) itemRate = 0.1;
          else if (price > 1000) itemRate = 0.05;
          else if (price > 500) itemRate = 0.03;
          else if (price > 100) itemRate = 0.02;

          if (itemRate > 0) {
            itemPoints += price * item.quantity * itemRate;
          }
        });

        dayData.points += parseFloat((totalPoints + itemPoints).toFixed(1));
      }
    });

    return last30Days.map((d) => ({
      name: new Date(d.date).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }),
      points: parseFloat(d.points.toFixed(1)),
    }));
  }, [sales, language]);

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
      className='h-full overflow-y-auto pe-2 space-y-4 animate-fade-in pb-10'
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <h2 className='text-2xl font-medium tracking-tight mb-4 flex items-center gap-2'>
        <span className='material-symbols-rounded text-amber-500'>stars</span>
        {t.loyalty?.overview || 'Loyalty Program Overview'}
      </h2>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'>
        {/* Total Active Customers */}
        <div
          className={`p-5 rounded-3xl bg-${color}-50 dark:bg-${color}-900/20 ${CARD_BASE} flex flex-col justify-between min-h-[120px]`}
        >
          <div className={`text-${color}-600 dark:text-${color}-400 mb-1`}>
            <span className='material-symbols-rounded text-3xl'>group</span>
          </div>
          <div>
            <p
              className={`text-xs font-bold text-${color}-800 dark:text-${color}-300 uppercase opacity-70`}
            >
              {t.loyalty?.activeCustomers || 'Active Customers'}
            </p>
            <p className={`text-2xl font-bold text-${color}-900 dark:text-${color}-100`}>
              {loyaltyStats.activeCustomers}
            </p>
          </div>
        </div>

        {/* Total Points Issued */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} flex flex-col justify-between min-h-[120px]`}>
          <div className='text-amber-500 mb-1'>
            <span className='material-symbols-rounded text-3xl'>stars</span>
          </div>
          <div>
            <p className='text-xs font-bold text-gray-500 uppercase'>
              {t.loyalty?.totalPoints || 'Total Points Issued'}
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {loyaltyStats.totalPoints.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Average Points */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} flex flex-col justify-between min-h-[120px]`}>
          <div className='text-emerald-500 mb-1'>
            <span className='material-symbols-rounded text-3xl'>trending_up</span>
          </div>
          <div>
            <p className='text-xs font-bold text-gray-500 uppercase'>
              {t.loyalty?.avgPoints || 'Avg Points/Customer'}
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {loyaltyStats.avgPoints.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Top Tier Customers */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} flex flex-col justify-between min-h-[120px]`}>
          <div className='text-purple-500 mb-1'>
            <span className='material-symbols-rounded text-3xl'>workspace_premium</span>
          </div>
          <div>
            <p className='text-xs font-bold text-gray-500 uppercase'>
              {t.loyalty?.topTier || 'Top Tier (>1000)'}
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {loyaltyStats.topTierCount}
            </p>
          </div>
        </div>
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
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
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
              <Bar dataKey='count' fill='var(--primary-500)' radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Points Trend */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-80`}>
          <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 mb-3'>
            {t.loyalty?.trend || 'Points Issued (30 Days)'}
          </h3>
          <ResponsiveContainer width='100%' height='90%'>
            <LineChart data={pointsTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
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
              <Line
                type='monotone'
                dataKey='points'
                stroke='var(--primary-500)'
                strokeWidth={3}
                dot={{ fill: 'var(--primary-500)', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Recent Points Activity */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-96 flex flex-col`}>
          <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-500 text-[20px]'>history</span>
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
                      <p className='font-medium text-sm text-gray-900 dark:text-gray-100'>
                        {sale.customerName}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {new Date(sale.date).toLocaleDateString()} • #{sale.id}
                      </p>
                    </div>
                    <span className='px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'>
                      +{sale.pointsEarned} {t.loyalty?.pts || 'pts'}
                    </span>
                  </div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>
                    {t.loyalty?.order || 'Order'}: ${sale.total.toFixed(2)}
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
                        className={`w-7 h-7 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 font-bold text-xs flex items-center justify-center shrink-0`}
                      >
                        {index + 1}
                      </div>
                      <div className='overflow-hidden'>
                        <p className='text-sm font-medium text-gray-700 dark:text-gray-200 truncate'>
                          {customer.name}
                        </p>
                        <p className='text-xs text-gray-500'>
                          ${customer.totalPurchases.toFixed(2)} {t.loyalty?.totalSuffix || 'total'}
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
