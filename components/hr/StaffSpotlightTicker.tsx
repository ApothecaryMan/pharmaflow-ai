import type React from 'react';
import { useSettings } from '../../context';
import { formatCurrency } from '../../utils/currency';
import { InsightTooltip } from '../common/InsightTooltip';
import { Tooltip } from '../common/Tooltip';
import type { StaffSpotlightTickerProps } from './types/staffOverview.types';

const AR_IMAGE_MAP: Record<string, string> = {
  revenue: 'ملك الايرادات',
  invoices: 'ملك الفواتير',
  speed: 'سيد السرعة',
  csat: 'بطل الرضا',
  loyalty: 'جامع الولاء',
};

/**
 * Staff Spotlight - Grid view of top performers
 * Displays champions across different metrics side-by-side
 */
export const StaffSpotlightTicker: React.FC<StaffSpotlightTickerProps> = ({
  achievements,
  language,
  color,
}) => {
  const { darkMode } = useSettings();
  // We want to show cards side-by-side (grid)
  // User requested "4 cards", so we use grid-cols-4 on large screens

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'>
      {achievements.map((item, idx) => (
        <div
          key={item.id}
          className={`
            relative p-4 rounded-2xl border bg-white dark:bg-gray-900 
            border-gray-100 dark:border-gray-800 card-shadow 
            flex flex-col group overflow-hidden
          `}
        >
          {/* Background Glow */}
          <div
            className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-10 bg-${item.color}-500 transition-opacity group-hover:opacity-20`}
          />

          {/* Header: Label & Icon */}
          <div className='flex items-center gap-2 mb-4 relative z-10 min-h-[40px]'>
            <span
              className={`
              inline-flex items-center
              text-${item.color}-600 dark:text-${item.color}-400
              shrink-0
            `}
            >
              <span className='material-symbols-rounded text-4xl'>{item.icon}</span>
            </span>

            {language === 'AR' && AR_IMAGE_MAP[item.type] ? (
              <img
                src={`/Sales_rate/${AR_IMAGE_MAP[item.type]} ${darkMode ? 'ابيض' : 'اسود'}.svg`}
                alt={item.label}
                className='h-10 w-auto object-contain'
              />
            ) : (
              <span
                className={`text-lg font-bold uppercase tracking-wider text-${item.color}-700 dark:text-${item.color}-400`}
              >
                {item.label}
              </span>
            )}
          </div>

          {/* Hero Content */}
          <div className='flex items-start relative z-10'>
            {/* Info */}
            <div className='flex-1 min-w-0'>
              <span className='text-[10px] text-gray-500 font-bold block mb-0.5'>
                {language === 'AR' ? 'الموظف' : 'Employee'}
              </span>
              <Tooltip
                content={<InsightTooltip {...item.tooltip} language={language} />}
                position='top'
                triggerClassName='w-full text-left'
                tooltipClassName='p-0 border-none bg-transparent shadow-none'
              >
                <h4 className='text-sm font-bold text-gray-900 dark:text-gray-100 truncate hover:text-blue-500 transition-colors cursor-help'>
                  {item.hero?.name || (language === 'AR' ? '—' : '—')}
                </h4>
              </Tooltip>

              {/* Primary Metric */}
              <div className='mt-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400'>
                {item.type === 'revenue' && (
                  <span className='material-symbols-rounded text-sm'>payments</span>
                )}
                {item.type === 'speed' && (
                  <span className='material-symbols-rounded text-sm'>timer</span>
                )}
                {item.type === 'invoices' && (
                  <span className='material-symbols-rounded text-sm'>receipt_long</span>
                )}
                {item.type === 'csat' && (
                  <span className='material-symbols-rounded text-sm'>star</span>
                )}
                {item.type === 'loyalty' && (
                  <span className='material-symbols-rounded text-sm'>group_add</span>
                )}

                <span>
                  {item.type === 'revenue'
                    ? formatCurrency(
                        item.hero?.revenue || 0,
                        'EGP',
                        language === 'AR' ? 'ar' : 'en',
                        0
                      )
                    : item.type === 'speed'
                      ? `${(item.hero?.avgTime || 0).toFixed(1)}m`
                      : item.type === 'csat'
                        ? (item.hero?.csat || 0).toFixed(1)
                        : item.type === 'loyalty'
                          ? `${((item.hero?.repeatRatio || 0) * 100).toFixed(0)}%`
                          : item.hero?.count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
