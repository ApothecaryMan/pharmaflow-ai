import type React from 'react';
import { useMemo } from 'react';
import { Customer, Employee, Sale, ThemeColor } from '../../types';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { TanStackTable } from '../common/TanStackTable';
import { useStaffAnalytics } from './hooks/useStaffAnalytics';
import { StaffSpotlightTicker } from './StaffSpotlightTicker';
import type { StaffOverviewProps } from './types/staffOverview.types';

/**
 * Staff Overview - Dedicated dashboard for employee performance analytics
 * Features: Staff Spotlight Ticker, Performance Leaderboard
 */
const StaffOverviewContent: React.FC<StaffOverviewProps> = ({
  sales,
  employees,
  customers,
  color,
  t,
  language,
  getVerifiedDate,
}) => {
  const isRTL = language === 'AR';

  // Helper for initials
  const getInitials = (name: string) => {
    if (!name || !name.trim()) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      const first = parts[0][0];
      const last = parts[parts.length - 1][0];
      if (first && last) return (first + last).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Filter to today's sales
  const todaysSales = useMemo(() => {
    const today = getVerifiedDate();
    today.setHours(0, 0, 0, 0);

    return sales.filter((s) => {
      const d = new Date(s.date);
      return d >= today && d < new Date(today.getTime() + 86400000);
    });
  }, [sales, getVerifiedDate]);

  // Staff Performance Analysis (extracted to hook)
  const staffAnalysis = useStaffAnalytics({
    todaysSales,
    employees,
    customers,
    language,
    color,
    getInitials,
    getVerifiedDate,
  });

  const sortedStaffStats = useMemo(
    () => [...staffAnalysis.staffStats].sort((a, b) => b.revenue - a.revenue),
    [staffAnalysis.staffStats]
  );

  return (
    <div className='p-6 space-y-6' dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 type-expressive'>
            {language === 'AR' ? 'نظرة عامة على البائعين' : 'Sellers Overview'}
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            {language === 'AR' ? 'أداء الفريق اليوم' : "Today's Team Performance"}
          </p>
        </div>
      </div>

      <div className='space-y-6'>
        {/* Staff Spotlight Ticker */}
        <StaffSpotlightTicker
          achievements={staffAnalysis.achievements}
          language={language}
          color={color}
        />

        {/* Performance Leaderboard */}
        <div className='bg-white dark:bg-gray-900 rounded-2xl card-shadow overflow-hidden'>
          <div className='p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
              <span className='material-symbols-rounded text-blue-500'>leaderboard</span>
              {language === 'AR' ? 'لوحة المتصدرين' : 'Performance Leaderboard'}
            </h2>
          </div>
          <div className='overflow-x-auto'>
            <TanStackTable
              data={sortedStaffStats}
              columns={staffAnalysis.performanceColumns}
              lite={true}
              enableSearch={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const StaffOverview: React.FC<StaffOverviewProps> = (props) => (
  <ErrorBoundary>
    <StaffOverviewContent {...props} />
  </ErrorBoundary>
);
