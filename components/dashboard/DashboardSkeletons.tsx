import React from 'react';

/**
 * Loading Skeletons for the Main Dashboard
 * Mirrors the layout of Dashboard.tsx
 */

// Mirrors the 4 stats cards at the top
export const StatsRowSkeleton = () => (
  <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className='h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse' />
    ))}
  </div>
);

// Mirrors the Chart (2/3) and Top Selling (1/3) row
export const ChartRowSkeleton = () => (
  <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
    {/* Chart Area Skeleton */}
    <div className='lg:col-span-2 h-80 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse' />

    {/* Top Selling List Skeleton */}
    <div className='h-80 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse p-5 space-y-4'>
      <div className='h-6 w-1/2 bg-gray-300 dark:bg-gray-700 rounded mb-4' />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className='flex justify-between items-center'>
          <div className='h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700' />
          <div className='h-4 w-2/3 bg-gray-300 dark:bg-gray-700 rounded' />
          <div className='h-4 w-10 bg-gray-300 dark:bg-gray-700 rounded' />
        </div>
      ))}
    </div>
  </div>
);

// Mirrors the Bottom Row: Alerts (Stack of 2) & Recent Sales
export const BottomRowSkeleton = () => (
  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
    {/* Alerts Column (Low Stock + Expiring) */}
    <div className='flex flex-col gap-4'>
      {/* Low Stock Skeleton */}
      <div className='h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse p-5'>
        <div className='h-6 w-1/3 bg-gray-300 dark:bg-gray-700 rounded mb-4' />
        <div className='space-y-3'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='h-12 bg-gray-300 dark:bg-gray-700 rounded-xl w-full' />
          ))}
        </div>
      </div>
      {/* Expiring Skeleton */}
      <div className='h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse p-5'>
        <div className='h-6 w-1/3 bg-gray-300 dark:bg-gray-700 rounded mb-4' />
        <div className='space-y-3'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='h-12 bg-gray-300 dark:bg-gray-700 rounded-xl w-full' />
          ))}
        </div>
      </div>
    </div>

    {/* Recent Transactions Skeleton */}
    <div className='h-[530px] bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse p-5'>
      <div className='h-6 w-1/3 bg-gray-300 dark:bg-gray-700 rounded mb-6' />
      <div className='space-y-4'>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className='flex justify-between items-center'>
            <div className='flex gap-3 w-full'>
              <div className='h-10 w-10 rounded-xl bg-gray-300 dark:bg-gray-700 shrink-0' />
              <div className='space-y-2 w-full'>
                <div className='h-4 w-1/2 bg-gray-300 dark:bg-gray-700 rounded' />
                <div className='h-3 w-1/3 bg-gray-300 dark:bg-gray-700 rounded' />
              </div>
            </div>
            <div className='h-4 w-16 bg-gray-300 dark:bg-gray-700 rounded shrink-0' />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const DashboardSkeleton = () => {
  return (
    <div className='space-y-4 animate-fade-in h-full overflow-hidden pb-10'>
      {/* Title Skeleton */}
      <div className='h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-4' />

      <StatsRowSkeleton />
      <ChartRowSkeleton />
      <BottomRowSkeleton />
    </div>
  );
};
