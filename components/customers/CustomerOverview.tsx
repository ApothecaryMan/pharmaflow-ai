import type React from 'react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getLocationName } from '../../data/locations';
import type { Customer, Sale } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { ExpandedModal } from '../common/ExpandedModal';

interface CustomerOverviewProps {
  customers: Customer[];
  sales: Sale[];
  color: string;
  t: any;
  language: 'EN' | 'AR';
}

type ExpandedView =
  | 'total'
  | 'lifetimeValue'
  | 'newCustomers'
  | 'location'
  | 'topCustomers'
  | 'loyaltyPoints'
  | 'healthInsights'
  | 'recentActivity'
  | 'engagement'
  | 'contactPreferences'
  | 'segmentation'
  | 'satisfaction'
  | null;

const COLORS = [
  '#06b6d4',
  '#8b5cf6',
  '#10b981',
  '#f43f5e',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
];

export const CustomerOverview: React.FC<CustomerOverviewProps> = ({
  customers,
  sales,
  color,
  t,
  language,
}) => {
  const [expandedView, setExpandedView] = useState<ExpandedView>(null);

  // --- STATS CALCULATIONS ---

  // Total Customers
  const totalCustomers = customers.length;
  const activeCustomers = useMemo(
    () => customers.filter((c) => c.status === 'active').length,
    [customers]
  );
  const inactiveCustomers = totalCustomers - activeCustomers;

  // Customer Lifetime Value
  const customerLifetimeValue = useMemo(() => {
    if (customers.length === 0) return 0;
    const totalPurchases = customers.reduce((sum, c) => sum + c.totalPurchases, 0);
    return totalPurchases / customers.length;
  }, [customers]);

  // New Customers (This Week/Month)
  const newCustomersThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return customers.filter((c) => new Date(c.lastVisit) >= weekAgo).length;
  }, [customers]);

  const newCustomersThisMonth = useMemo(() => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return customers.filter((c) => new Date(c.lastVisit) >= monthAgo).length;
  }, [customers]);

  // Location Distribution
  const locationDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    customers.forEach((c) => {
      const location = c.governorate || 'Unknown';
      const locationName = c.governorate
        ? getLocationName(c.governorate, 'gov', language)
        : language === 'AR'
          ? 'غير محدد'
          : 'Unknown';
      distribution[locationName] = (distribution[locationName] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [customers, language]);

  // Top Customers by Purchases
  const topCustomers = useMemo(() => {
    return [...customers].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 10);
  }, [customers]);

  // Loyalty Points Statistics
  const totalLoyaltyPoints = useMemo(
    () => customers.reduce((sum, c) => sum + c.points, 0),
    [customers]
  );
  const avgPointsPerCustomer = customers.length > 0 ? totalLoyaltyPoints / customers.length : 0;

  // Health Insights
  const healthInsights = useMemo(() => {
    const conditions: Record<string, number> = {};
    const withInsurance = customers.filter((c) => c.insuranceProvider).length;

    customers.forEach((c) => {
      (c.chronicConditions || []).forEach((condition) => {
        conditions[condition] = (conditions[condition] || 0) + 1;
      });
    });

    return {
      conditions: Object.entries(conditions)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      withInsurance,
      withoutInsurance: customers.length - withInsurance,
      insuranceRate: customers.length > 0 ? (withInsurance / customers.length) * 100 : 0,
    };
  }, [customers]);

  // Recent Activity
  const recentCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime())
      .slice(0, 10);
  }, [customers]);

  // Engagement Metrics
  const engagementMetrics = useMemo(() => {
    const now = new Date();
    const daysSinceLastVisit = customers.map((c) => {
      const lastVisit = new Date(c.lastVisit);
      return Math.ceil((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    });

    const avgDays =
      daysSinceLastVisit.length > 0
        ? daysSinceLastVisit.reduce((a, b) => a + b, 0) / daysSinceLastVisit.length
        : 0;

    const inactiveCount = daysSinceLastVisit.filter((d) => d > 90).length;

    return {
      avgDaysSinceVisit: Math.round(avgDays),
      inactiveCustomers: inactiveCount,
      activeRate:
        customers.length > 0 ? ((customers.length - inactiveCount) / customers.length) * 100 : 0,
    };
  }, [customers]);

  // Contact Preferences
  const contactPreferences = useMemo(() => {
    const prefs: Record<string, number> = { phone: 0, email: 0, sms: 0 };
    customers.forEach((c) => {
      const pref = c.preferredContact || 'phone';
      prefs[pref] = (prefs[pref] || 0) + 1;
    });
    return Object.entries(prefs).map(([name, count]) => ({ name, count }));
  }, [customers]);

  // Customer Segmentation
  const segmentation = useMemo(() => {
    const vipThreshold = 1000;
    const regularThreshold = 100;

    const vip = customers.filter((c) => c.totalPurchases >= vipThreshold);
    const regular = customers.filter(
      (c) => c.totalPurchases >= regularThreshold && c.totalPurchases < vipThreshold
    );
    const basic = customers.filter((c) => c.totalPurchases < regularThreshold);

    // At-risk: haven't visited in 60+ days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const atRisk = customers.filter((c) => new Date(c.lastVisit) < sixtyDaysAgo);

    return { vip, regular, basic, atRisk };
  }, [customers]);

  // Satisfaction Metrics (based on return data from sales)
  const satisfactionMetrics = useMemo(() => {
    const salesWithReturns = sales.filter((s) => s.hasReturns);
    const returnRate = sales.length > 0 ? (salesWithReturns.length / sales.length) * 100 : 0;

    const totalSalesValue = sales.reduce((sum, s) => sum + s.total, 0);
    const avgOrderValue = sales.length > 0 ? totalSalesValue / sales.length : 0;

    // Repeat customers
    const customerPurchaseCounts: Record<string, number> = {};
    sales.forEach((s) => {
      if (s.customerCode) {
        customerPurchaseCounts[s.customerCode] = (customerPurchaseCounts[s.customerCode] || 0) + 1;
      }
    });
    const repeatCustomers = Object.values(customerPurchaseCounts).filter(
      (count) => count > 1
    ).length;
    const repeatRate =
      Object.keys(customerPurchaseCounts).length > 0
        ? (repeatCustomers / Object.keys(customerPurchaseCounts).length) * 100
        : 0;

    return { returnRate, avgOrderValue, repeatRate };
  }, [sales]);

  // Export function
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

  // Expand Button Component
  const ExpandButton = ({
    onClick,
    title,
  }: {
    onClick: (e: React.MouseEvent) => void;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      className='opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800'
      title={title || t?.expand || 'Expand'}
    >
      <span className='material-symbols-rounded text-[18px]'>open_in_full</span>
    </button>
  );

  // Stat Card Component
  const StatCard = ({
    icon,
    title,
    value,
    subtitle,
    trend,
    trendUp,
    onClick,
    colorClass = '',
  }: {
    icon: string;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: string;
    trendUp?: boolean;
    onClick?: () => void;
    colorClass?: string;
  }) => (
    <div
      className={`p-5 rounded-3xl flex flex-col justify-between min-h-[140px] group relative cursor-pointer ${colorClass || CARD_BASE}`}
      onClick={onClick}
    >
      <div className='absolute top-3 right-3 rtl:right-auto rtl:left-3'>
        <ExpandButton
          onClick={(e) => {
            e?.stopPropagation?.();
            onClick?.();
          }}
        />
      </div>
      <div className={`text-${color}-500 mb-2`}>
        <span className='material-symbols-rounded text-3xl'>{icon}</span>
      </div>
      <div>
        <p className='text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1'>{title}</p>
        <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{value}</p>
        {subtitle && <p className='text-xs text-gray-400 mt-1'>{subtitle}</p>}
        {trend && (
          <div
            className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}
          >
            <span className='material-symbols-rounded text-[14px]'>
              {trendUp ? 'trending_up' : 'trending_down'}
            </span>
            {trend}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className='h-full overflow-y-auto pe-2 space-y-4 pb-10'>
      <h2 className='text-2xl font-medium tracking-tight mb-4'>
        {t?.title || 'Customer Overview'}
      </h2>

      {/* Row 1: Key Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'>
        {/* Total Customers */}
        <StatCard
          icon='group'
          title={t?.totalCustomers || 'Total Customers'}
          value={totalCustomers}
          subtitle={`${activeCustomers} ${t?.active || 'Active'} • ${inactiveCustomers} ${t?.inactive || 'Inactive'}`}
          onClick={() => setExpandedView('total')}
          colorClass={`bg-${color}-50 dark:bg-${color}-950/20 border border-${color}-100 dark:border-${color}-900`}
        />

        {/* Customer Lifetime Value */}
        <StatCard
          icon='attach_money'
          title={t?.lifetimeValue || 'Avg. Lifetime Value'}
          value={`$${customerLifetimeValue.toFixed(2)}`}
          subtitle={t?.perCustomer || 'Per Customer'}
          onClick={() => setExpandedView('lifetimeValue')}
        />

        {/* New Customers */}
        <StatCard
          icon='person_add'
          title={t?.newCustomers || 'New Customers'}
          value={newCustomersThisWeek}
          subtitle={`${t?.thisWeek || 'This Week'}`}
          trend={`${newCustomersThisMonth} ${t?.thisMonth || 'This Month'}`}
          trendUp={newCustomersThisMonth > 0}
          onClick={() => setExpandedView('newCustomers')}
        />

        {/* Loyalty Points */}
        <StatCard
          icon='loyalty'
          title={t?.loyaltyPoints || 'Loyalty Points'}
          value={totalLoyaltyPoints.toLocaleString()}
          subtitle={`${t?.avgPoints || 'Avg'}: ${avgPointsPerCustomer.toFixed(0)} pts`}
          onClick={() => setExpandedView('loyaltyPoints')}
        />
      </div>

      {/* Row 2: Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Location Distribution */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} h-80 relative group`}>
          <div className='flex justify-between items-center mb-3'>
            <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
              <span className='material-symbols-rounded text-blue-500 text-[20px]'>
                location_on
              </span>
              {t?.locationDistribution || 'Location Distribution'}
            </h3>
            <ExpandButton onClick={() => setExpandedView('location')} />
          </div>
          {locationDistribution.length > 0 ? (
            <ResponsiveContainer
              width='100%'
              height='85%'
              className='mx-auto'
              style={{ direction: 'ltr' }}
            >
              <PieChart>
                <Pie
                  data={locationDistribution.slice(0, 6)}
                  cx='50%'
                  cy='50%'
                  outerRadius={80}
                  dataKey='count'
                  nameKey='name'
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {locationDistribution.slice(0, 6).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className='bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700'>
                          <p className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'>
                            {payload[0].name}
                          </p>
                          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                            {payload[0].value}
                            <span className='text-xs font-normal text-gray-500 ms-1'>
                              (
                              {(((payload[0].value as number) / customers.length) * 100).toFixed(0)}
                              %)
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className='h-full flex items-center justify-center text-gray-400'>
              {t?.noData || 'No location data'}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className={`lg:col-span-2 p-5 rounded-3xl ${CARD_BASE} h-80 flex flex-col group`}>
          <div className='flex justify-between items-center mb-3'>
            <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
              <span className='material-symbols-rounded text-yellow-500 text-[20px]'>
                workspace_premium
              </span>
              {t?.topCustomers || 'Top Customers'}
            </h3>
            <ExpandButton onClick={() => setExpandedView('topCustomers')} />
          </div>
          <div className='flex-1 overflow-y-auto space-y-2 pe-1'>
            {topCustomers.length === 0 ? (
              <div className='h-full flex items-center justify-center text-gray-400 text-sm'>
                {t?.noCustomers || 'No customer data'}
              </div>
            ) : (
              topCustomers.slice(0, 5).map((customer, index) => (
                <div
                  key={customer.id}
                  className='flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <div className='flex items-center gap-3 overflow-hidden'>
                    <div
                      className={`w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 font-bold text-sm flex items-center justify-center shrink-0`}
                    >
                      {index + 1}
                    </div>
                    <div className='min-w-0'>
                      <span className='text-sm font-medium text-gray-700 dark:text-gray-200 truncate block'>
                        {customer.name}
                      </span>
                      <span className='text-xs text-gray-400'>{customer.code}</span>
                    </div>
                  </div>
                  <div className='text-end'>
                    <span className='text-sm font-bold text-gray-900 dark:text-gray-100'>
                      ${customer.totalPurchases.toFixed(2)}
                    </span>
                    <span className='text-xs text-gray-400 block'>{customer.points} pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Health & Engagement */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Health Insights */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} flex flex-col group`}>
          <div className='flex justify-between items-center mb-3'>
            <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
              <span className='material-symbols-rounded text-rose-500 text-[20px]'>
                health_and_safety
              </span>
              {t?.healthInsights || 'Health Insights'}
            </h3>
            <ExpandButton onClick={() => setExpandedView('healthInsights')} />
          </div>

          <div className='grid grid-cols-2 gap-4 mb-4'>
            <div className='p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20'>
              <p className='text-xs font-bold text-blue-600 dark:text-blue-400 uppercase'>
                {t?.withInsurance || 'With Insurance'}
              </p>
              <p className='text-xl font-bold text-blue-900 dark:text-blue-100'>
                {healthInsights.withInsurance}
              </p>
              <p className='text-xs text-blue-600 dark:text-blue-400'>
                {healthInsights.insuranceRate.toFixed(1)}%
              </p>
            </div>
            <div className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50'>
              <p className='text-xs font-bold text-gray-500 uppercase'>
                {t?.chronicConditions || 'Chronic Conditions'}
              </p>
              <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                {healthInsights.conditions.length}
              </p>
              <p className='text-xs text-gray-400'>{t?.tracked || 'Types Tracked'}</p>
            </div>
          </div>

          <div className='space-y-2 overflow-y-auto max-h-32'>
            {healthInsights.conditions.slice(0, 4).map((condition) => (
              <div
                key={condition.name}
                className='flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/30'
              >
                <span className='text-sm text-gray-700 dark:text-gray-300'>{condition.name}</span>
                <span className='text-xs font-bold text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded-md'>
                  {condition.count} {t?.patients || 'patients'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Engagement */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} flex flex-col group`}>
          <div className='flex justify-between items-center mb-3'>
            <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
              <span className='material-symbols-rounded text-emerald-500 text-[20px]'>
                trending_up
              </span>
              {t?.engagement || 'Customer Engagement'}
            </h3>
            <ExpandButton onClick={() => setExpandedView('engagement')} />
          </div>

          <div className='grid grid-cols-3 gap-3'>
            <div className='p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center'>
              <p className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                {engagementMetrics.activeRate.toFixed(0)}%
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t?.activeRate || 'Active Rate'}
              </p>
            </div>
            <div className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center'>
              <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                {engagementMetrics.avgDaysSinceVisit}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>{t?.avgDays || 'Avg Days'}</p>
            </div>
            <div className='p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-center'>
              <p className='text-2xl font-bold text-orange-600 dark:text-orange-400'>
                {engagementMetrics.inactiveCustomers}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t?.inactive90 || 'Inactive 90d+'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Segmentation & Contact Preferences */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Customer Segmentation */}
        <div className={`lg:col-span-2 p-5 rounded-3xl ${CARD_BASE} group`}>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
              <span className='material-symbols-rounded text-purple-500 text-[20px]'>category</span>
              {t?.segmentation || 'Customer Segmentation'}
            </h3>
            <ExpandButton onClick={() => setExpandedView('segmentation')} />
          </div>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            <div className='p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/50'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='material-symbols-rounded text-amber-500'>star</span>
                <span className='text-xs font-bold text-amber-700 dark:text-amber-400 uppercase'>
                  {t?.vip || 'VIP'}
                </span>
              </div>
              <p className='text-2xl font-bold text-amber-900 dark:text-amber-100'>
                {segmentation.vip.length}
              </p>
              <p className='text-xs text-amber-600 dark:text-amber-400'>$1000+</p>
            </div>

            <div className='p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800/50'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='material-symbols-rounded text-blue-500'>verified</span>
                <span className='text-xs font-bold text-blue-700 dark:text-blue-400 uppercase'>
                  {t?.regular || 'Regular'}
                </span>
              </div>
              <p className='text-2xl font-bold text-blue-900 dark:text-blue-100'>
                {segmentation.regular.length}
              </p>
              <p className='text-xs text-blue-600 dark:text-blue-400'>$100-$1000</p>
            </div>

            <div className='p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-700/20 border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='material-symbols-rounded text-gray-500'>person</span>
                <span className='text-xs font-bold text-gray-600 dark:text-gray-400 uppercase'>
                  {t?.basic || 'Basic'}
                </span>
              </div>
              <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                {segmentation.basic.length}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>&lt;$100</p>
            </div>

            <div className='p-4 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20 border border-red-200 dark:border-red-800/50'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='material-symbols-rounded text-red-500'>warning</span>
                <span className='text-xs font-bold text-red-700 dark:text-red-400 uppercase'>
                  {t?.atRisk || 'At Risk'}
                </span>
              </div>
              <p className='text-2xl font-bold text-red-900 dark:text-red-100'>
                {segmentation.atRisk.length}
              </p>
              <p className='text-xs text-red-600 dark:text-red-400'>
                60+ {t?.daysInactive || 'days inactive'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Preferences */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} group`}>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
              <span className='material-symbols-rounded text-teal-500 text-[20px]'>
                contact_phone
              </span>
              {t?.contactPrefs || 'Contact Preferences'}
            </h3>
            <ExpandButton onClick={() => setExpandedView('contactPreferences')} />
          </div>

          <div className='space-y-3'>
            {contactPreferences.map((pref) => {
              const percentage = customers.length > 0 ? (pref.count / customers.length) * 100 : 0;
              const icons: Record<string, string> = { phone: 'call', email: 'mail', sms: 'sms' };
              const labels: Record<string, string> = {
                phone: t?.phone || 'Phone',
                email: t?.email || 'Email',
                sms: t?.sms || 'SMS/WhatsApp',
              };

              return (
                <div key={pref.name} className='space-y-1'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='material-symbols-rounded text-[16px] text-gray-400'>
                        {icons[pref.name] || 'contact_page'}
                      </span>
                      <span className='text-sm text-gray-700 dark:text-gray-300'>
                        {labels[pref.name] || pref.name}
                      </span>
                    </div>
                    <span className='text-sm font-bold text-gray-900 dark:text-gray-100'>
                      {pref.count}
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                    <div
                      className={`bg-${color}-500 h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 5: Recent Activity & Satisfaction */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Recent Activity */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} flex flex-col group max-h-80`}>
          <div className='flex justify-between items-center mb-3'>
            <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
              <span className='material-symbols-rounded text-indigo-500 text-[20px]'>history</span>
              {t?.recentActivity || 'Recent Customer Activity'}
            </h3>
            <ExpandButton onClick={() => setExpandedView('recentActivity')} />
          </div>
          <div className='flex-1 overflow-y-auto space-y-2 pe-1'>
            {recentCustomers.slice(0, 5).map((customer) => (
              <div
                key={customer.id}
                className='flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 dark:text-${color}-400 font-bold text-xs`}
                  >
                    {customer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {customer.name}
                    </p>
                    <p className='text-xs text-gray-500'>{customer.code}</p>
                  </div>
                </div>
                <div className='text-end'>
                  <p className='text-xs text-gray-400'>
                    {new Date(customer.lastVisit).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Satisfaction Metrics */}
        <div className={`p-5 rounded-3xl ${CARD_BASE} group`}>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
              <span className='material-symbols-rounded text-pink-500 text-[20px]'>
                sentiment_satisfied
              </span>
              {t?.satisfaction || 'Satisfaction Metrics'}
            </h3>
            <ExpandButton onClick={() => setExpandedView('satisfaction')} />
          </div>

          <div className='grid grid-cols-3 gap-4'>
            <div className='text-center'>
              <div
                className={`w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2`}
              >
                <p className='text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                  {satisfactionMetrics.repeatRate.toFixed(0)}%
                </p>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t?.repeatRate || 'Repeat Rate'}
              </p>
            </div>

            <div className='text-center'>
              <div
                className={`w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2`}
              >
                <p className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                  ${satisfactionMetrics.avgOrderValue.toFixed(0)}
                </p>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t?.avgOrder || 'Avg Order'}
              </p>
            </div>

            <div className='text-center'>
              <div
                className={`w-16 h-16 mx-auto rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-2`}
              >
                <p className='text-xl font-bold text-orange-600 dark:text-orange-400'>
                  {satisfactionMetrics.returnRate.toFixed(1)}%
                </p>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t?.returnRate || 'Return Rate'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Modals */}

      {/* Total Customers Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'total'}
        onClose={() => setExpandedView(null)}
        title={t?.totalCustomers || 'Total Customers'}
        color={color}
        actions={
          <button
            onClick={() =>
              exportToCSV(
                customers.map((c) => ({
                  code: c.code,
                  name: c.name,
                  phone: c.phone,
                  email: c.email || '',
                  status: c.status,
                  totalPurchases: c.totalPurchases,
                  points: c.points,
                })),
                'all_customers'
              )
            }
            className='px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2'
          >
            <span className='material-symbols-rounded text-[18px]'>download</span>
            {t?.exportCSV || 'Export'}
          </button>
        }
        t={t}
      >
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div
              className={`p-6 rounded-2xl bg-${color}-50 dark:bg-${color}-950/20 border border-${color}-100 dark:border-${color}-900`}
            >
              <p
                className={`text-sm font-bold text-${color}-800 dark:text-${color}-300 uppercase mb-2`}
              >
                {t?.totalCustomers || 'Total'}
              </p>
              <p className={`text-4xl font-bold text-${color}-900 dark:text-${color}-100`}>
                {totalCustomers}
              </p>
            </div>
            <div className='p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900'>
              <p className='text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase mb-2'>
                {t?.active || 'Active'}
              </p>
              <p className='text-4xl font-bold text-emerald-900 dark:text-emerald-100'>
                {activeCustomers}
              </p>
            </div>
            <div className='p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'>
              <p className='text-sm font-bold text-gray-500 uppercase mb-2'>
                {t?.inactive || 'Inactive'}
              </p>
              <p className='text-4xl font-bold text-gray-900 dark:text-gray-100'>
                {inactiveCustomers}
              </p>
            </div>
          </div>

          <div className='space-y-2 max-h-96 overflow-y-auto'>
            {customers.slice(0, 20).map((customer) => (
              <div
                key={customer.id}
                className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center'
              >
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-10 h-10 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 dark:text-${color}-400 font-bold text-sm`}
                  >
                    {customer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className='font-medium text-gray-900 dark:text-gray-100'>{customer.name}</p>
                    <p className='text-xs text-gray-500'>
                      {customer.code} • {customer.phone}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {customer.status === 'active' ? t?.active || 'Active' : t?.inactive || 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ExpandedModal>

      {/* Top Customers Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'topCustomers'}
        onClose={() => setExpandedView(null)}
        title={t?.topCustomers || 'Top Customers'}
        color={color}
        actions={
          <button
            onClick={() =>
              exportToCSV(
                topCustomers.map((c, i) => ({
                  rank: i + 1,
                  code: c.code,
                  name: c.name,
                  totalPurchases: c.totalPurchases,
                  points: c.points,
                  lastVisit: c.lastVisit,
                })),
                'top_customers'
              )
            }
            className='px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2'
          >
            <span className='material-symbols-rounded text-[18px]'>download</span>
            {t?.exportCSV || 'Export'}
          </button>
        }
        t={t}
      >
        <div className='space-y-3'>
          {topCustomers.map((customer, index) => (
            <div
              key={customer.id}
              className='p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'
            >
              <div className='flex items-center gap-4 flex-1'>
                <div
                  className={`w-10 h-10 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 font-bold flex items-center justify-center shrink-0`}
                >
                  {index + 1}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-medium text-gray-900 dark:text-gray-100 truncate'>
                    {customer.name}
                  </p>
                  <p className='text-sm text-gray-500'>
                    {customer.code} • {customer.points} pts
                  </p>
                </div>
              </div>
              <div className='text-end'>
                <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                  ${customer.totalPurchases.toFixed(2)}
                </p>
                <p className='text-xs text-gray-400'>
                  {t?.lastVisit || 'Last'}: {new Date(customer.lastVisit).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ExpandedModal>

      {/* Segmentation Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'segmentation'}
        onClose={() => setExpandedView(null)}
        title={t?.segmentation || 'Customer Segmentation'}
        color={color}
        t={t}
      >
        <div className='space-y-6'>
          {/* VIP Customers */}
          <div>
            <h4 className='text-sm font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-2 mb-3'>
              <span className='material-symbols-rounded'>star</span>
              {t?.vip || 'VIP'} ({segmentation.vip.length})
            </h4>
            <div className='space-y-2 max-h-40 overflow-y-auto'>
              {segmentation.vip.slice(0, 10).map((c) => (
                <div
                  key={c.id}
                  className='p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex justify-between items-center'
                >
                  <span className='text-sm text-gray-900 dark:text-gray-100'>{c.name}</span>
                  <span className='text-sm font-bold text-amber-600'>
                    ${c.totalPurchases.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* At Risk Customers */}
          <div>
            <h4 className='text-sm font-bold text-red-600 dark:text-red-400 uppercase flex items-center gap-2 mb-3'>
              <span className='material-symbols-rounded'>warning</span>
              {t?.atRisk || 'At Risk'} ({segmentation.atRisk.length})
            </h4>
            <div className='space-y-2 max-h-40 overflow-y-auto'>
              {segmentation.atRisk.slice(0, 10).map((c) => (
                <div
                  key={c.id}
                  className='p-2 rounded-lg bg-red-50 dark:bg-red-950/20 flex justify-between items-center'
                >
                  <div>
                    <span className='text-sm text-gray-900 dark:text-gray-100'>{c.name}</span>
                    <p className='text-xs text-red-500'>
                      {t?.lastVisit || 'Last visit'}: {new Date(c.lastVisit).toLocaleDateString()}
                    </p>
                  </div>
                  <span className='text-sm font-medium text-gray-500'>
                    ${c.totalPurchases.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ExpandedModal>

      {/* Health Insights Expanded */}
      <ExpandedModal
        isOpen={expandedView === 'healthInsights'}
        onClose={() => setExpandedView(null)}
        title={t?.healthInsights || 'Health Insights'}
        color={color}
        t={t}
      >
        <div className='space-y-6'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20'>
              <p className='text-sm font-bold text-blue-600 dark:text-blue-400 uppercase'>
                {t?.withInsurance || 'With Insurance'}
              </p>
              <p className='text-3xl font-bold text-blue-900 dark:text-blue-100'>
                {healthInsights.withInsurance}
              </p>
              <p className='text-sm text-blue-600'>
                {healthInsights.insuranceRate.toFixed(1)}% of customers
              </p>
            </div>
            <div className='p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50'>
              <p className='text-sm font-bold text-gray-500 uppercase'>
                {t?.withoutInsurance || 'Without Insurance'}
              </p>
              <p className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                {healthInsights.withoutInsurance}
              </p>
            </div>
          </div>

          <div>
            <h4 className='text-sm font-bold text-gray-700 dark:text-gray-300 mb-3'>
              {t?.chronicConditions || 'Chronic Conditions'}
            </h4>
            <div className='space-y-2'>
              {healthInsights.conditions.map((condition) => {
                const percentage =
                  customers.length > 0 ? (condition.count / customers.length) * 100 : 0;
                return (
                  <div
                    key={condition.name}
                    className='p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between'
                  >
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      {condition.name}
                    </span>
                    <div className='flex items-center gap-3'>
                      <div className='w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                        <div
                          className={`bg-${color}-500 h-2 rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className='text-sm font-bold text-gray-900 dark:text-gray-100 w-16 text-end'>
                        {condition.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ExpandedModal>
    </div>
  );
};
