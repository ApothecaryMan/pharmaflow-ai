import React from 'react';

/**
 * Skeleton for Inventory Table View
 */
export const InventorySkeleton = () => {
  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in p-6">
      {/* Header with Title and Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
        <div className="space-y-2">
           <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
           <div className="h-4 w-48 bg-gray-100 dark:bg-gray-900 rounded" />
        </div>
        <div className="h-9 w-40 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Toolbar & Search */}
      <div className="flex justify-between items-center py-2 animate-pulse">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>

      {/* Table Card */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
        {/* Table Header */}
        <div className="h-12 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center px-4 gap-4">
             {[1, 2, 3, 4, 5, 6].map(i => (
                 <div key={i} className={`h-4 bg-gray-200 dark:bg-gray-800 rounded ${i === 2 ? 'flex-1' : 'w-24'}`} />
             ))}
        </div>

        {/* Table Rows */}
        <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="h-10 w-10 bg-gray-100 dark:bg-gray-900 rounded-lg" /> {/* Icon/Code */}
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-900 rounded" />
                    </div>
                    <div className="h-6 w-20 bg-gray-100 dark:bg-gray-900 rounded-full" /> {/* Badge */}
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded" /> {/* Price */}
                    <div className="h-8 w-8 bg-gray-100 dark:bg-gray-900 rounded-full" /> {/* Action */}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
