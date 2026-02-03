import type React from 'react';

/**
 * Shared Loading Skeletons for Intelligence Pages
 * Ensures consistent loading states across Procurement, Risk, and Financials.
 */

export const KPIGridSkeleton = () => (
  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className='h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse' />
    ))}
  </div>
);

export const TopBarSkeleton = () => (
  <div className='h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse w-full' />
);

export const MainContentSkeleton = () => (
  <div className='h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse flex-1 w-full' />
);

interface DashboardPageSkeletonProps {
  withTopBar?: boolean;
}

export const DashboardPageSkeleton: React.FC<DashboardPageSkeletonProps> = ({
  withTopBar = false,
}) => {
  return (
    <div className='space-y-6 animate-fade-in h-full flex flex-col'>
      {withTopBar && <TopBarSkeleton />}
      <KPIGridSkeleton />
      <MainContentSkeleton />
    </div>
  );
};
