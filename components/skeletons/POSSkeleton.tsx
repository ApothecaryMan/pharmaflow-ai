import React from 'react';

/**
 * Skeleton for POS Screen
 * Mirrors the 3-column layout
 */
export const POSSkeleton = () => {
  return (
    <div className="h-full flex gap-4 p-4 animate-fade-in overflow-hidden">
      
      {/* Left: Cart Section (Skeleton) */}
      <div className="w-[380px] flex flex-col gap-4 shrink-0 animate-pulse">
         {/* Cart Header */}
         <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
         
         {/* Cart Items */}
         <div className="flex-1 bg-white dark:bg-gray-950 rounded-3xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
             {[1, 2, 3, 4].map(i => (
                 <div key={i} className="flex gap-3">
                     <div className="h-12 w-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                     <div className="flex-1 space-y-2">
                         <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                         <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-900 rounded" />
                     </div>
                 </div>
             ))}
         </div>

         {/* Cart Totals */}
         <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
      </div>

      {/* Middle: Product Grid (Skeleton) */}
      <div className="flex-1 flex flex-col gap-4 animate-pulse">
          {/* Search Bar */}
          <div className="h-14 bg-gray-200 dark:bg-gray-800 rounded-2xl" />

          {/* Categories */}
          <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-full shrink-0" />
              ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                  <div key={i} className="aspect-[4/5] bg-gray-100 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-3">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                      <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
                      <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};
