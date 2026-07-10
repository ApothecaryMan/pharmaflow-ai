import type React from 'react';
import { CARD_BASE } from '../../utils/themeStyles';

export interface MicroProgressCardProps {
  /** Current progress value */
  value: number;
  /** Target (max) value */
  max: number;

  /** Display text for the current value */
  formattedValue: string;
  /** Display text for the target value (optional) */
  formattedTarget?: string;

  /** Icon to display (Material Symbols Rounded) */
  icon?: string;

  /** Color customization */
  colors?: {
    low?: string;
    medium?: string;
    high?: string;
    overfill?: string;
    iconBase?: string;
    iconOverfill?: string;
    valueText?: string;
    targetText?: string;
  };

  /** Percentage thresholds (0-100) for color changes */
  thresholds?: {
    low?: number; // default: 33
    high?: number; // default: 66
  };

  /** How much extra capacity beyond 100% is allowed (e.g., 0.1 for 10%) */
  overfillCapacity?: number;
}

export const MicroProgressCard: React.FC<MicroProgressCardProps> = ({
  value,
  max,
  formattedValue,
  formattedTarget,
  icon = 'target',
  colors,
  thresholds,
  overfillCapacity = 0.1,
}) => {
  // Config defaults
  const tLow = thresholds?.low ?? 50;
  const tHigh = thresholds?.high ?? 80;

  const cLow = colors?.low ?? 'bg-red-500';
  const cMedium = colors?.medium ?? 'bg-amber-500';
  const cHigh = colors?.high ?? 'bg-emerald-500';
  const cOverfill = colors?.overfill ?? 'bg-yellow-400';

  const iconBase = colors?.iconBase ?? 'text-red-500';
  const iconOverfill = colors?.iconOverfill ?? 'text-yellow-500';

  const valueText = 'text-gray-900 dark:text-white';
  const targetText = colors?.targetText ?? 'text-gray-500 dark:text-gray-400';

  // Math
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const overfillAmount = Math.max(0, value - max);
  // overfillPercentage calculation based on overfillCapacity
  const maxOverfillAllowed = max * overfillCapacity;
  const overfillPercentage =
    maxOverfillAllowed > 0 ? Math.min(100, (overfillAmount / maxOverfillAllowed) * 100) : 0;

  let colorClass = cLow;
  if (percentage >= tHigh) colorClass = cHigh;
  else if (percentage >= tLow) colorClass = cMedium;

  const renderWithFadedCurrency = (text: string, baseClass: string, isTarget: boolean = false) => {
    const match = text.match(/^([^\d]*)?([\d.,]+)\s*(.*)$/);
    if (match) {
      const prefix = match[1] || '';
      const number = match[2];
      const suffix = match[3] || '';
      const symbolClass = isTarget
        ? 'text-[9px] opacity-50 font-medium mx-0.5'
        : 'text-[10px] opacity-60 font-medium mx-0.5';

      return (
        <span className={baseClass}>
          {prefix && <span className={symbolClass}>{prefix}</span>}
          {number}
          {suffix && <span className={symbolClass}>{suffix}</span>}
        </span>
      );
    }
    return <span className={baseClass}>{text}</span>;
  };

  return (
    <div className={`flex items-center ${CARD_BASE} rounded-full px-3 h-[40px] gap-0 w-full`}>
      {/* Side Stat */}
      <div className='flex items-center justify-center gap-1.5 ltr:pr-4 rtl:pl-4 h-5 whitespace-nowrap'>
        <span
          className={`material-symbols-rounded text-[18px] ${
            overfillPercentage > 0 ? iconOverfill : iconBase
          }`}
        >
          {icon}
        </span>
        <div className='flex items-baseline gap-1'>
          {renderWithFadedCurrency(
            formattedValue,
            `text-[15px] leading-none font-bold tracking-tight ${valueText}`
          )}
          {formattedTarget && (
            <div
              className={`flex items-baseline gap-0.5 text-[11px] font-medium leading-none ${targetText}`}
            >
              <span>/</span>
              {renderWithFadedCurrency(formattedTarget, '', true)}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className='flex items-center flex-1'>
        <div className='relative flex h-4 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-(--border-divider)'>
          {/* Base progress */}
          <div
            style={{ width: `${percentage}%` }}
            className={`${colorClass} absolute ltr:left-0 rtl:right-0 top-0 h-full transition-all duration-300 ease-out`}
          />
          {/* Overfill progress */}
          {overfillPercentage > 0 && (
            <div
              style={{ width: `${overfillPercentage}%` }}
              className={`${cOverfill} absolute ltr:left-0 rtl:right-0 top-0 h-full transition-all duration-300 ease-out shadow-[inset_0_0_8px_rgba(255,255,255,0.4)]`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
