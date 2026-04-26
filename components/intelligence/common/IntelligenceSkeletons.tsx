import type React from 'react';

/**
 * Atomic skeleton for a single KPI card.
 * Mirroring the structure of SmallCard for zero layout shift.
 */
export const KPICardSkeleton = () => (
  <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse">
    <div className="flex items-center gap-4">
      {/* Icon Placeholder */}
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      
      {/* Content Placeholder */}
      <div className="space-y-2 flex-1">
        {/* Title */}
        <div className="h-3 w-24 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
        {/* Value */}
        <div className="h-6 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
        {/* Subvalue/Trend */}
        <div className="h-3 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      </div>
    </div>
  </div>
);

/**
 * Grid of KPI Card Skeletons.
 * Used at Tier 2 for progressive loading.
 */
export const KPIGridSkeleton = () => (
  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in'>
    {[1, 2, 3, 4].map((i) => <KPICardSkeleton key={i} />)}
  </div>
);

/**
 * Skeleton for a segment bar or progress card (e.g. Risk Page)
 */
export const SegmentedProgressSkeleton = () => (
  <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse space-y-4">
    <div className="flex justify-between items-center">
      <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
      <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
    </div>
    <div className="h-8 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-xl" />
    <div className="grid grid-cols-2 gap-4">
      <div className="h-10 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl" />
      <div className="h-10 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl" />
    </div>
  </div>
);

/**
 * Full page skeleton for intelligence dashboards (Tier 1).
 */
export const DashboardPageSkeleton: React.FC<{ withTopBar?: boolean }> = ({ withTopBar = false }) => (
  <div className='space-y-6 animate-fade-in h-full flex flex-col'>
    {withTopBar && (
      <div className='h-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl animate-pulse' />
    )}
    <KPIGridSkeleton />
    
    {/* Main Content Area (Graph/Table) */}
    <div className='flex-1 min-h-0 space-y-6'>
      <div className='h-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl animate-pulse' />
      <div className='h-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl animate-pulse' />
    </div>
  </div>
);
