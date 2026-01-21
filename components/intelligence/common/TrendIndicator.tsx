import React from 'react';

interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'unchanged';
  value?: number;
  showValue?: boolean; // If true, shows the percentage
  className?: string;
  reverseColor?: boolean; // If true, 'up' is bad (red) and 'down' is good (green) - e.g. for expenses/losses
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  direction,
  value,
  showValue = false,
  className = '',
  reverseColor = false
}) => {
  let colorClass = 'text-gray-500';
  let Icon = 'remove';

  if (direction === 'up') {
    colorClass = reverseColor ? 'text-red-500' : 'text-emerald-500';
    Icon = 'trending_up';
  } else if (direction === 'down') {
    colorClass = reverseColor ? 'text-emerald-500' : 'text-red-500';
    Icon = 'trending_down';
  } else {
    colorClass = 'text-gray-400';
    Icon = 'remove'; // flat line
  }

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${colorClass} ${className}`}>
      <span className="material-symbols-rounded text-base">{Icon}</span>
      {showValue && value !== undefined && (
        <span className="text-xs">{Math.abs(value)}%</span>
      )}
    </span>
  );
};
