import type React from 'react';
import { CARD_BASE } from '../../utils/themeStyles';

const CARD_HOVER = ''; // No animations for now

interface CompactProgressCardProps {
  title: string;
  value: any; // number or string
  max: number;
  progressColor: string;
  icon: string;
  onClick?: () => void;
}

export const CompactProgressCard: React.FC<CompactProgressCardProps> = ({
  title,
  value,
  max,
  progressColor,
  icon,
  onClick,
}) => {
  // Ensure value is numeric for calculation
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  const percentage = Math.min(100, Math.max(0, (numValue / max) * 100));

  return (
    <div
      onClick={onClick}
      // h-[68px] is calculated to match h-36 (144px) when two are stacked with gap-2 (8px).
      // 68 + 68 + 8 = 144.
      className={`px-4 py-3 rounded-3xl ${CARD_BASE} ${CARD_HOVER} h-[68px] flex flex-col justify-center cursor-pointer transition-transform active:scale-[0.98]`}
    >
      <div className='flex items-center justify-between w-full'>
        <div className='flex items-center gap-3 w-full'>
          <span
            className={`material-symbols-rounded text-2xl text-${progressColor}-500 dark:text-${progressColor}-400 shrink-0`}
          >
            {icon}
          </span>

          <div className='flex-1 min-w-0'>
            <div className='flex justify-between items-center mb-1'>
              <p className='text-xs text-gray-500 dark:text-gray-400 font-medium truncate pr-2'>
                {title}
              </p>
              <div className='flex items-baseline gap-1'>
                <h4 className='text-sm font-bold text-gray-900 dark:text-white leading-none'>
                  {value}
                </h4>
                <span className='text-[10px] text-gray-400 font-medium'>
                  ({percentage.toFixed(0)}%)
                </span>
              </div>
            </div>

            <div className='relative w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden'>
              <div
                className={`absolute left-0 top-0 h-full rounded-full bg-${progressColor}-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
