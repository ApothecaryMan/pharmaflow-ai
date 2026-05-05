import React from 'react';
import { SegmentedControl } from '../common/SegmentedControl';

interface DashboardHeaderProps {
  title?: string;
  switcher?: {
    options: { label: string; value: string; icon?: string }[];
    value: string;
    onChange: (value: any) => void;
  };
  segmented?: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: any) => void;
  };
  extra?: React.ReactNode;
  children?: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  switcher,
  segmented,
  extra,
  children
}) => {
  return (
    <div className="sticky top-0 z-40 w-full bg-(--bg-page-surface)/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/50 mb-0 transition-all duration-300">
      <div className="px-page py-4 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
        {/* Left Section: Title / Extra */}
        <div className="flex items-center gap-4 justify-start">
          {title && !switcher && (
            <h1 className="text-2xl font-bold tracking-tight page-title">{title}</h1>
          )}
          {extra}
        </div>
        
        {/* Center Section: Switcher */}
        <div className="flex justify-center">
          {switcher && (
            <SegmentedControl
              options={switcher.options}
              value={switcher.value}
              onChange={switcher.onChange}
              size="md"
              shape="pill"
              className="w-auto shadow-sm border border-gray-100 dark:border-gray-800"
            />
          )}
        </div>

        {/* Right Section: Segmented / Children */}
        <div className="flex items-center gap-3 justify-end">
          {segmented && (
            <SegmentedControl
              options={segmented.options}
              value={segmented.value}
              onChange={segmented.onChange}
              size="sm"
              className="w-full sm:w-auto min-w-[150px]"
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
};
