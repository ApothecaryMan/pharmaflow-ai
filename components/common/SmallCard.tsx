import type React from 'react';
import { useMemo } from 'react';
import { CARD_BASE } from '../../utils/themeStyles';
import { AnimatedCounter } from './AnimatedCounter';
import { Tooltip } from './Tooltip';
import { useSettings } from '../../context';
import { formatCurrencyParts, formatCompactCurrencyParts, getCurrencySymbol } from '../../utils/currency';

const CARD_HOVER = ''; // No animations

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
  isLoading?: boolean;
  className?: string;
}

/**
 * Formats a number with K/M suffixes
 * e.g. 1500 -> 1.5k, 1500000 -> 1.5M
 */
/**
 * Formats a number with K/M suffixes using specified locale
 */
const formatCompactNumber = (number: number, locale: string = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
};

export const SmallCard = ({
  title,
  value,
  icon,
  iconColor,
  trend,
  trendValue,
  trendLabel,
  subValue,
  type,
  currencyLabel,
  fractionDigits,
  iconOverlay,
  valueSuffix,
  iconTooltip,
  isLoading,
  className = '',
}: SmallCardProps) => {
  const { language } = useSettings();
  const isAR = language === 'AR';

  // 1. Data Formatting Logic
  const { displayValue, displaySymbol } = useMemo(() => {
    if (typeof value !== 'number') return { displayValue: value, displaySymbol: '' };

    if (type === 'currency') {
      const parts = value > 10000 
        ? formatCompactCurrencyParts(value, 'EGP') 
        : formatCurrencyParts(value, 'EGP');
      return { displayValue: parts.amount, displaySymbol: currencyLabel || parts.symbol };
    }
    
    if (value > 10000) {
      return { displayValue: formatCompactNumber(value), displaySymbol: '' };
    }

    return { displayValue: value, displaySymbol: '' };
  }, [value, type, currencyLabel]);

  // 2. Rich Tooltip Memoization
  const richTooltipContent = useMemo(() => {
    if (!trend && !subValue) return null;
    
    return (
      <div className="p-2 min-w-[150px] space-y-3" dir={isAR ? 'rtl' : 'ltr'}>
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-(--text-tertiary) border-b border-(--border-divider) pb-1.5 mb-1">
          {isAR ? 'تحليل المؤشر' : 'Metric Insights'}
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${
            trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 
            trend === 'down' ? 'bg-rose-500/10 text-rose-500' : 
            'bg-zinc-500/10 text-zinc-400'
          }`}>
            <span className="material-symbols-rounded block" style={{ fontSize: '22px' }}>
              {trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className={`text-base font-bold leading-tight ${
              trend === 'up' ? 'text-emerald-500' : 
              trend === 'down' ? 'text-rose-500' : 
              'text-zinc-400'
            }`}>
              {trendValue || (isAR ? 'مستقر' : 'Stable')}
            </span>
            <span className="text-[10px] text-(--text-tertiary) font-medium">
              {trend ? (isAR ? 'التغير النسبي' : 'Relative Change') : (isAR ? 'لا توجد بيانات' : 'No Trend Data')}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          {trendLabel && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-(--text-tertiary)">{isAR ? 'الفترة:' : 'Period:'}</span>
              <span className="text-[10px] text-(--text-secondary) font-semibold">{trendLabel}</span>
            </div>
          )}
          {subValue && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-(--text-tertiary)">{isAR ? 'السياق:' : 'Context:'}</span>
              <span className="text-[10px] text-(--text-secondary) font-semibold truncate max-w-[80px]">{subValue}</span>
            </div>
          )}
        </div>
      </div>
    );
  }, [trend, trendValue, trendLabel, subValue, isAR]);

  // 3. Icon Sub-component
  const iconSection = (
    <div className="relative shrink-0 w-14 h-16 flex items-center justify-center ms-2">
      <div className="absolute inset-0 bg-zinc-200/60 dark:bg-zinc-800/40 rounded-lg rotate-[-3deg] translate-x-1 translate-y-1" />
      <div 
        className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800/60 border border-(--border-divider) rounded-lg shadow-[4px_6px_12px_rgba(0,0,0,0.06)] rotate-[2deg] ltr:-translate-x-3 rtl:translate-x-3 -translate-y-0.5 flex items-center justify-center z-10"
      >
        {!isLoading && (
          <span 
            className="material-symbols-rounded text-zinc-600 dark:text-zinc-400 select-none" 
            style={{ fontSize: '36px', lineHeight: 1 }}
          >
            {icon}
          </span>
        )}
      </div>
      {!isLoading && iconOverlay && (
        <div className="absolute -top-2 ltr:-left-4 rtl:-right-4 z-20 scale-90 drop-shadow-sm">
          {iconOverlay}
        </div>
      )}
    </div>
  );

  return (
    <div className={`p-3 rounded-2xl ${CARD_BASE} ${CARD_HOVER} h-[84px] flex items-center gap-3 overflow-visible ${className}`}>
      {iconTooltip ? (
        <Tooltip content={iconTooltip} position="top" triggerClassName="shrink-0">
          {iconSection}
        </Tooltip>
      ) : iconSection}

      <div className="flex-1 min-w-0 flex flex-col justify-center h-full py-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--text-tertiary) mb-1 opacity-80">
          {title}
        </p>

        <div className="flex flex-col">
          {isLoading ? (
            <div className="h-8 w-20 bg-(--bg-input) rounded-lg animate-pulse" />
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-2 group/val">
                <h4 className="text-2xl font-bold text-(--text-primary) flex items-baseline leading-none">
                  {typeof value === 'number' ? (
                    <AnimatedCounter 
                      value={value} 
                      fractionDigits={fractionDigits ?? (type === 'currency' ? 2 : 0)} 
                      notation={value > 10000 ? 'compact' : 'standard'}
                    />
                  ) : displayValue}
                  {displaySymbol && (
                    <span className="text-xs font-semibold text-(--text-tertiary) ms-1">
                      {displaySymbol}
                    </span>
                  )}
                </h4>
              </div>

              {!isLoading && (subValue || trendLabel) && (
                <Tooltip content={richTooltipContent} position="top" triggerClassName="w-fit">
                  <div className="flex items-center gap-1.5 mt-1 group/footer cursor-help">
                    <p className="text-[10px] text-(--text-tertiary) truncate max-w-[140px] font-medium transition-colors group-hover:text-(--text-secondary)">
                      {subValue || trendLabel}
                    </p>
                    <span className="material-symbols-rounded text-zinc-400 select-none" style={{ fontSize: '14px' }}>
                      help
                    </span>
                  </div>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
