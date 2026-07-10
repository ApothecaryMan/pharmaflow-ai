import type React from 'react';
import { useMemo } from 'react';
import {
  type DayAchievement,
  getColorForPct,
  getMonthName,
} from '../../services/dashboard/achievementService';
import { formatCurrency } from '../../utils/currency';
import { CARD_BASE } from '../../utils/themeStyles';

interface MonthlyHeatmapProps {
  days: DayAchievement[];
  year: number;
  month: number;
  monthlyRevenue: number;
  monthlyTarget: number;
  overallPct: number;
  monthlyRevenueFormatted?: string;
  monthlyTargetFormatted?: string;
  onExpand?: () => void;
  language: string;
  isLoading?: boolean;
  compact?: boolean;
}

export const MonthlyHeatmap: React.FC<MonthlyHeatmapProps> = ({
  days,
  year,
  month,
  monthlyRevenue,
  monthlyTarget,
  overallPct,
  monthlyRevenueFormatted,
  monthlyTargetFormatted,
  onExpand,
  language,
  isLoading,
  compact = false,
}) => {
  const isAR = language === 'AR';
  const monthName = getMonthName(month, language, compact);
  const isRTL = isAR;

  const achieveColor = useMemo(() => {
    if (overallPct >= 100) return 'text-yellow-500';
    if (overallPct >= 80) return 'text-emerald-500';
    if (overallPct >= 50) return 'text-amber-500';
    return 'text-red-500';
  }, [overallPct]);

  const revFormatted = monthlyRevenueFormatted || formatCurrency(monthlyRevenue);
  const tgtFormatted = monthlyTargetFormatted || formatCurrency(monthlyTarget);

  if (isLoading) {
    return (
      <div
        className={`${CARD_BASE} ${compact ? 'p-4' : 'p-5'} rounded-3xl ${compact ? 'h-48' : 'h-64'} flex flex-col animate-pulse`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className='h-5 w-36 bg-gray-100 dark:bg-gray-800 rounded mb-4' />
        <div className='grid grid-cols-7 gap-2'>
          {Array.from({ length: 35 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton layout
            <div key={i} className='w-5 h-5 rounded-[5px] bg-gray-100 dark:bg-gray-800' />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${CARD_BASE} ${compact ? 'p-4' : 'p-5'} rounded-3xl flex flex-col group`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <span
            className='material-symbols-rounded text-(--text-tertiary)'
            style={{ fontSize: 'var(--icon-md)' }}
          >
            calendar_month
          </span>
          <h3 className={`font-semibold text-(--text-primary) ${compact ? 'text-sm' : 'text-base'}`}>
            {monthName} {year}
          </h3>
          <span className={`text-sm font-bold ${achieveColor} ms-1`}>
            {overallPct}%
          </span>
          <span className='text-xs text-(--text-tertiary) flex items-center gap-2'>
            <span>{isAR ? 'الإيرادات' : 'Revenue'}: <strong className='text-(--text-primary)'>{revFormatted}</strong></span>
            <span className='opacity-30'>|</span>
            <span>{isAR ? 'الهدف' : 'Target'}: <strong className='text-(--text-primary)'>{tgtFormatted}</strong></span>
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {onExpand && (
            <button
              type='button'
              onClick={onExpand}
              className='w-8 h-8 flex items-center justify-center text-(--text-tertiary) hover:text-(--text-primary) transition-all rounded-xl hover:bg-(--bg-menu-hover) active:scale-95 opacity-0 group-hover:opacity-100'
            >
              <span
                className='material-symbols-rounded'
                style={{ fontSize: 'var(--icon-md)' }}
              >
                open_in_full
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Dot grid — one dot per day of the month, color fills by achievement */}
      <div className='grid grid-cols-7 gap-2'>
        {days.map((cell) => (
          <div key={cell.day} className='relative group/dot flex items-center justify-center'>
            <div
              className={`w-5 h-5 rounded-[5px] cursor-pointer transition-all hover:scale-150 ${getColorForPct(cell.achievementPct, cell.isFuture)}`}
              title={`${monthName} ${cell.day}: ${cell.achievementPct}%`}
            />
            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/dot:block z-30 pointer-events-none'>
              <div className='bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap'>
                <p className='font-bold'>
                  {monthName} {cell.day}
                </p>
                {!cell.isFuture ? (
                  <>
                    <p>
                      {isAR ? 'الإيرادات' : 'Revenue'}: {cell.revenue.toLocaleString()}
                    </p>
                    <p>
                      {isAR ? 'الهدف' : 'Target'}: {cell.target.toLocaleString()}
                    </p>
                    <p className='font-bold'>{cell.achievementPct}%</p>
                  </>
                ) : (
                  <p className='opacity-60'>{isAR ? 'لم يأت بعد' : 'Upcoming'}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      {!compact && (
        <div className='flex items-center gap-3 mt-4 flex-wrap'>
          <span className='text-[11px] text-(--text-tertiary) font-medium'>
            {isAR ? 'الهدف اليومي' : 'Daily target'}:
          </span>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-[3px] bg-yellow-400' />
            <span className='text-[10px] text-(--text-tertiary)'>
              {isAR ? 'تجاوز' : 'Over'}
            </span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-[3px] bg-emerald-500' />
            <span className='text-[10px] text-(--text-tertiary)'>≥80%</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-[3px] bg-amber-500' />
            <span className='text-[10px] text-(--text-tertiary)'>≥50%</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-[3px] bg-red-500' />
            <span className='text-[10px] text-(--text-tertiary)'>
              {isAR ? '<50%' : '<50%'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
