import React from 'react';

/**
 * specialized skeleton for pages without a specific design.
 * Renders a header and a generic content area.
 */
export const GenericSkeleton = () => {
  return (
    <div className="h-full flex flex-col space-y-6 animate-pulse p-6">
      {/* Header Area */}
      <div className="flex justify-between items-center">
        <div className="space-y-3">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-900 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
        <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-800 rounded mb-8" />
        
        {[1, 2, 3, 4, 5].map((i) => (
           <div key={i} className="flex gap-4">
             <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
             <div className="h-4 w-1/3 bg-gray-100 dark:bg-gray-900 rounded" />
           </div>
        ))}
      </div>
    </div>
  );
};
