import React from 'react';
import { TrendIndicator } from './TrendIndicator';

interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'unchanged';
    label?: string; // e.g., "vs last month"
  };
  icon?: string; // Material symbol name
  color?: 'emerald' | 'blue' | 'amber' | 'red' | 'gray';
  onClick?: () => void;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subValue,
  trend,
  icon,
  color = 'blue',
  onClick,
  className = ''
}) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    gray: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  };

  return (
    <div 
      onClick={onClick}
      className={`relative p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-gray-200 dark:hover:border-gray-700' : ''} ${className}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        {icon && (
          <div className={`p-1.5 rounded-lg ${colorMap[color]}`}>
            <span className="material-symbols-rounded text-lg">{icon}</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        {subValue && (
          <span className="text-sm text-gray-400 dark:text-gray-500">{subValue}</span>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <TrendIndicator 
            direction={trend.direction} 
            value={trend.value} 
            showValue 
          />
          {trend.label && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
};
