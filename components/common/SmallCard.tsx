import React, { useMemo } from 'react';
import { CARD_BASE } from '../../utils/themeStyles';
import { AnimatedCounter } from './AnimatedCounter';
import { Tooltip } from './Tooltip';

const CARD_HOVER = ""; // No animations

export interface SmallCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  trend?: 'up' | 'down' | 'neutral' | 'unchanged';
  trendValue?: string;
  trendLabel?: string;
  subValue?: string;
  type?: string; 
  currencyLabel?: string;
  fractionDigits?: number;
  iconOverlay?: React.ReactNode;
  valueSuffix?: React.ReactNode;
  iconTooltip?: React.ReactNode;
}


/**
 * Formats a number with K/M suffixes
 * e.g. 1500 -> 1.5k, 1500000 -> 1.5M
 */
const formatCompactNumber = (number: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact", 
    maximumFractionDigits: 1
  }).format(number);
};

export const SmallCard = ({ title, value, icon, iconColor, trend, trendValue, trendLabel, subValue, type, currencyLabel, fractionDigits, iconOverlay, valueSuffix, iconTooltip }: SmallCardProps) => { // Render value logic
  const formattedValue = useMemo(() => {
    if (typeof value !== 'number') return value;
    
    // For specific small number formatting preference (optional)
    // If it's a currency type, let's prioritize compact notation for readability of large sums
    if (type === 'currency' || value > 10000) {
       return formatCompactNumber(value);
    }
    
    // Fallback/Default for smaller numbers or non-currency numbers if needed
    // But since the user specifically asked for k/m for large prices, the above covers it.
    // If we want to keep AnimatedCounter for small numbers we can.
    return value; 
  }, [value, type]);
  
  const iconContent = (
    <div className={`flex-shrink-0 text-${iconColor}-600 dark:text-${iconColor}-400 relative`}>
      <span className="material-symbols-rounded text-[38px] leading-none">{icon}</span>
      {iconOverlay}
    </div>
  );

  return (
  // Compact design: h-[84px], p-3
  <div className={`p-3 rounded-2xl ${CARD_BASE} ${CARD_HOVER} h-[84px] flex items-center gap-3`}>
    
    {/* Icon - Left Side */}
    {iconTooltip ? (
      <Tooltip content={iconTooltip} position="top" triggerClassName="flex-shrink-0">
        {iconContent}
      </Tooltip>
    ) : (
      iconContent
    )}

    {/* Content - Right Side */}
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">{title}</p>
      
      <div className="flex items-center gap-2">
        <h4 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-baseline leading-none">
          {typeof value === 'number' && type !== 'currency' && value <= 10000 ? ( 
              <AnimatedCounter value={value} fractionDigits={fractionDigits ?? 0} />
          ) : (
             formattedValue
          )}
          {type === 'currency' && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ms-1">{currencyLabel || 'L.E'}</span>
          )}
          {valueSuffix && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ms-1">{valueSuffix}</span>
          )}
        </h4>

        {/* Badge Next to Number (Includes Trend Value + Label/SubValue) */}
        {(trend || subValue) && (
          <Tooltip 
            content={subValue || trendLabel} 
            className="min-w-0 shrink max-w-full"
            tooltipClassName="font-bold uppercase tracking-wider"
          >
            <span className={`flex items-center gap-1.5 px-1.5 rounded-lg border bg-transparent text-[10px] font-bold uppercase tracking-wider leading-none h-[22px] min-w-0 max-w-full ${
              trend === 'up' 
                ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400' 
                : trend === 'down' 
                ? 'border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400'
                : 'border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500' // Neutral/SubValue
            }`}>
              {trend && trend !== 'unchanged' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="material-symbols-rounded text-sm">{trend === 'up' ? 'trending_up' : 'trending_down'}</span>
                    <span>{trendValue}</span>
                </div>
              )}
              
              {/* Small Text Inside Badge */}
              {(trendLabel || subValue) && (
                <span className={`truncate min-w-0 ${trend && trend !== 'unchanged' ? 'opacity-80 ltr:border-l rtl:border-r border-current ltr:pl-1.5 rtl:pr-1.5' : ''}`}>
                    {subValue || trendLabel}
                </span>
              )}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  </div>
)};
