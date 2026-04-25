import React from 'react';

/**
 * Skeleton for a single branch row in the Branch Monitor list
 */
export const BranchRowSkeleton = () => (
  <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="space-y-2">
        <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      </div>
    </div>
    <div className="flex items-center gap-6">
      <div className="h-4 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
      <div className="h-4 w-12 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
    </div>
  </div>
);

/**
 * Skeleton for a progress bar item in the Quota Monitor
 */
export const ProgressBarSkeleton = () => (
  <div className="flex flex-col gap-3 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-4 w-12 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
    </div>
    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full" />
  </div>
);

/**
 * Skeleton for a branch card in the Branch Settings grid
 */
export const BranchCardSkeleton = () => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm min-h-[220px] animate-pulse">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      </div>
      <div className="h-4 w-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
    </div>
    <div className="flex -space-x-2">
      {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900" />)}
    </div>
    <div className="space-y-2 mt-auto">
      <div className="h-3 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      <div className="h-3 w-2/3 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
    </div>
    <div className="flex gap-2 pt-2">
      <div className="h-8 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
      <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
    </div>
  </div>
);
