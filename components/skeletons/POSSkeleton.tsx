import React from 'react';

/**
 * Skeleton for POS Screen
 * Mirrors the 3-column layout
 */
export const POSSkeleton = () => {
  return (
    <div className="h-full flex flex-col gap-2 p-2 animate-fade-in overflow-hidden">
      {/* Top Bar Skeleton */}
      <div className="flex items-center gap-4 px-2 animate-pulse shrink-0">
        <div className="h-7 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-8 w-36 bg-gray-100 dark:bg-gray-800/50 rounded-lg" />
        <div className="flex-1 flex gap-2 overflow-hidden">
          {[1, 2].map(i => (
            <div key={i} className="h-9 w-24 bg-gray-200 dark:bg-gray-800 rounded-t-xl" />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden">
        
        {/* Left Side: Product List & Search */}
        <div className="flex-1 flex flex-col gap-2 h-full overflow-hidden animate-pulse">
            {/* Customer Info Card */}
            <div className="h-16 bg-gray-100 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800" />
            
            {/* Search & Filters Row */}
            <div className="flex gap-1 shrink-0">
                <div className="flex-[4] h-11 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="flex-1 h-11 bg-gray-100 dark:bg-gray-800/50 rounded-xl" />
                <div className="flex-1 h-11 bg-gray-100 dark:bg-gray-800/50 rounded-xl" />
            </div>

            {/* Product Table Skeleton */}
            <div className="flex-1 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Table Header */}
                <div className="h-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-3 flex-1 bg-gray-200 dark:bg-gray-800 rounded" />
                    ))}
                </div>
                {/* Table Rows */}
                <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-4 flex-1 bg-gray-100 dark:bg-gray-900 rounded" />
                            <div className="h-4 flex-[2] bg-gray-200 dark:bg-gray-800 rounded" />
                            <div className="h-4 flex-1 bg-gray-100 dark:bg-gray-900 rounded" />
                            <div className="h-4 flex-1 bg-gray-100 dark:bg-gray-900 rounded" />
                            <div className="h-4 flex-1 bg-gray-100 dark:bg-gray-900 rounded" />
                            <div className="h-4 flex-1 bg-gray-200 dark:bg-gray-800 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Side: Cart Sidebar */}
        <div className="w-full lg:w-[350px] bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-pulse">
            {/* Cart Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-5 w-8 bg-gray-100 dark:bg-gray-900 rounded-full" />
            </div>

            {/* Cart Items */}
            <div className="flex-1 p-3 space-y-3">
                {[1, 2].map(i => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-2">
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="flex justify-between items-center mt-2">
                            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Cart Totals & Button */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex justify-between items-center px-2">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
                <div className="h-11 w-full bg-gray-200 dark:bg-gray-800 rounded-xl" />
            </div>
        </div>

      </div>
    </div>
  );
};
