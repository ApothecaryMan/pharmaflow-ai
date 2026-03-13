import React from 'react';

/**
 * Skeleton for POS Screen
 * Mirrors the 3-column layout
 */
export const POSSkeleton = () => {
  return (
    <div className='h-full flex flex-col gap-2 animate-fade-in overflow-hidden'>
      {/* Top Bar Skeleton */}
      <div className='flex items-center gap-4 px-2 min-h-12 shrink-0 py-1 animate-pulse'>
        <div className='h-7 w-40 bg-gray-200 dark:bg-neutral-800/50 rounded-lg' />
        <div className='h-8 w-36 bg-gray-100 dark:bg-neutral-800/30 rounded-lg' />
        <div className='flex-1 flex gap-2 overflow-hidden'>
          {[1, 2].map((i) => (
            <div key={i} className='h-9 w-24 bg-gray-200 dark:bg-neutral-800/50 rounded-t-xl' />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className='flex-1 flex flex-col lg:flex-row gap-3 animate-fade-in relative overflow-hidden'>
        {/* Left Side: Product List & Search */}
        <div className='flex-1 flex flex-col gap-2 h-full overflow-hidden animate-pulse'>
          {/* Customer Info Card */}
          <div className='h-16 bg-gray-100 dark:bg-neutral-900/30 rounded-2xl border border-gray-200 dark:border-(--border-divider) shrink-0' />

          {/* Search & Filters Row */}
          <div className='flex gap-1 shrink-0'>
            <div className='flex-6 h-11 bg-gray-200 dark:bg-neutral-800/50 rounded-xl' />
          </div>

          {/* Product Table Skeleton */}
          <div className='flex-1 bg-white dark:bg-(--bg-card) rounded-2xl border border-gray-200 dark:border-(--border-divider) overflow-hidden flex flex-col'>
            {/* Table Header */}
            <div className='h-10 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-(--border-divider) flex items-center px-4 gap-4 shrink-0'>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className='h-3 flex-1 bg-gray-200 dark:bg-neutral-800/50 rounded-sm' />
              ))}
            </div>
            {/* Table Rows */}
            <div className='p-4 space-y-4 flex-1 overflow-hidden'>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div key={i} className='flex items-center gap-4'>
                  <div className='h-4 flex-1 bg-gray-100 dark:bg-neutral-900 rounded-sm' />
                  <div className='h-4 flex-2 bg-gray-200 dark:bg-neutral-800/50 rounded-sm' />
                  <div className='h-4 flex-1 bg-gray-100 dark:bg-neutral-900 rounded-sm' />
                  <div className='h-4 flex-1 bg-gray-100 dark:bg-neutral-900 rounded-sm' />
                  <div className='h-4 flex-1 bg-gray-100 dark:bg-neutral-900 rounded-sm' />
                  <div className='h-4 flex-1 bg-gray-200 dark:bg-neutral-800/50 rounded-sm' />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Cart Sidebar */}
        <div className='w-full lg:w-[380px] h-full bg-white dark:bg-(--bg-card) rounded-2xl border border-gray-200 dark:border-(--border-divider) flex flex-col overflow-hidden animate-pulse'>
          {/* Cart Header */}
          <div className='p-4 border-b border-gray-100 dark:border-(--border-divider) flex items-center justify-between shrink-0'>
            <div className='h-5 w-32 bg-gray-200 dark:bg-neutral-800/50 rounded-sm' />
            <div className='h-5 w-8 bg-gray-100 dark:bg-neutral-900 rounded-full' />
          </div>

          {/* Cart Items */}
          <div className='flex-1 p-3 space-y-3 overflow-hidden'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='p-3 bg-gray-50 dark:bg-neutral-900/40 rounded-xl space-y-2'>
                <div className='h-4 w-3/4 bg-gray-200 dark:bg-neutral-800/50 rounded-sm' />
                <div className='flex justify-between items-center mt-2'>
                  <div className='h-6 w-20 bg-gray-200 dark:bg-neutral-800/50 rounded-lg' />
                  <div className='h-4 w-12 bg-gray-200 dark:bg-neutral-800/50 rounded-sm' />
                </div>
              </div>
            ))}
          </div>

          {/* Cart Totals & Button */}
          <div className='p-4 border-t border-gray-100 dark:border-(--border-divider) space-y-3 shrink-0'>
            <div className='flex justify-between items-center px-2'>
              <div className='h-4 w-16 bg-gray-200 dark:bg-neutral-800/50 rounded-sm' />
              <div className='h-8 w-24 bg-gray-200 dark:bg-neutral-800/50 rounded-sm' />
            </div>
            <div className='h-11 w-full bg-gray-200 dark:bg-neutral-800/50 rounded-xl' />
          </div>
        </div>
      </div>
    </div>
  );
};
