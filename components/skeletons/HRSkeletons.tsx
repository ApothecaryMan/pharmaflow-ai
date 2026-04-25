import React from 'react';

/**
 * Skeleton for a single metric card in Staff Overview
 */
export const StaffMetricSkeleton = () => (
  <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="space-y-2 flex-1">
        <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
        <div className="h-6 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for an employee row in the list
 */
export const EmployeeRowSkeleton = () => (
  <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="space-y-2">
        <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-20 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
      </div>
    </div>
    <div className="hidden md:flex flex-col gap-2 items-center">
      <div className="h-4 w-24 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
    </div>
    <div className="h-6 w-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    </div>
  </div>
);

/**
 * Skeleton for the Employee Profile page
 */
export const EmployeeProfileSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex flex-col md:flex-row gap-6 p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
      <div className="w-32 h-32 rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 shrink-0" />
      <div className="flex-1 space-y-4 py-2">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-32 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-6 w-24 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
          <div className="h-6 w-24 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800" />
      ))}
    </div>
  </div>
);
