import { formatCompactCurrencyParts } from '../../utils/currency';

/**
 * @fileoverview InsightTooltip Component
 * 
 * A specialized tooltip used for presenting complex analytical insights in a 
 * 3-tier structured format: Primary Result, Calculation Logic, and Detailed Metrics.
 * 
 * Updated: 
 * - Uses compact formatting for large numbers.
 * - Uses normal font (non-monospace) for numbers for better readability.
 * - Displays small size L.E or ج.م according to language.
 */

export interface CalculationBlock {
  /** Brief description of the law or formula (e.g., "Gross - Returns") */
  label: string;
  /** The mathematical breakdown. Can be a number (formatted automatically) or custom JSX */
  math: React.ReactNode | number;
  /** Whether to format a numeric math value as currency (defaults to true) */
  isCurrency?: boolean;
}

export interface DetailMetric {
  /** Material Symbol name */
  icon: string;
  /** Descriptive label (e.g., "Return Rate") */
  label: string;
  /** Metric value. Numbers are formatted automatically. */
  value: React.ReactNode | number;
  /** Optional tailwind color class for the value (e.g., 'text-emerald-400') */
  colorClass?: string;
  /** Optional secondary explanation or sub-formula */
  subLabel?: string;
  /** Whether to format a numeric value as currency (defaults to true) */
  isCurrency?: boolean;
}

interface InsightTooltipProps {
  /** The name of the primary metric (e.g., "Net Revenue") */
  title: string;
  /** The main result value. Formatted as compact currency. */
  value: React.ReactNode | number;
  /** Whether to format the main value as currency (defaults to true) */
  isCurrency?: boolean;
  /** Optional secondary label for the main value (e.g., "EGP") */
  valueLabel?: string;
  /** Material Symbol name for the primary metric */
  icon: string;
  /** Tailwind color class for the primary icon (e.g., 'text-blue-400') */
  iconColorClass: string;
  /** Array of formula/logic blocks */
  calculations: CalculationBlock[];
  /** Array of granular operational metrics */
  details: DetailMetric[];
  /** Optional bottom-aligned guidance or warning text */
  footer?: string;
  /** System language for currency symbol display */
  language?: string;
}

/**
 * Formats values based on type and context, splitting the symbol for small sizing.
 * Exported for use in custom math JSX blocks (e.g. in Dashboard.tsx)
 */
export const CurrencyValue: React.FC<{ val: any, language?: string, isHeader?: boolean, isCurrency?: boolean }> = ({ val, language, isHeader, isCurrency = true }) => {
  if (typeof val !== 'number') return <>{val}</>;
  if (!isCurrency) return <>{val}</>;
  
  // Use formatCompactCurrencyParts to support compact everywhere + small symbol
  const { amount, symbol } = formatCompactCurrencyParts(val, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US');
  
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="leading-none">{amount}</span>
      <span className={`${isHeader ? 'text-[10px]' : 'text-[9px]'} opacity-50 font-medium whitespace-nowrap leading-none`}>
        {symbol}
      </span>
    </span>
  );
};

export const InsightTooltip: React.FC<InsightTooltipProps> = ({
  title,
  value,
  isCurrency = true,
  valueLabel,
  icon,
  iconColorClass,
  calculations,
  details,
  footer,
  language
}) => {
  return (
    <div className="space-y-3 py-1.5 min-w-[210px]">
      {/* 1. Primary Result (Theme-Aware) */}
      <div className="px-1 border-b border-black/5 dark:border-white/10 pb-2">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-0.5">{title}</p>
          <div className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className={`material-symbols-rounded ${iconColorClass} text-[22px]`}>{icon}</span>
              <CurrencyValue val={value} language={language} isHeader isCurrency={isCurrency} />
              {valueLabel && <span className="text-sm text-gray-500 dark:text-gray-400 font-medium ms-1">{valueLabel}</span>}
          </div>
      </div>

      {/* 2. The Law & Calculation (Theme-Aware) */}
      <div className="bg-gray-100/50 dark:bg-white/5 p-2 rounded-xl space-y-2.5 border border-black/5 dark:border-white/5">
        {calculations.map((calc, idx) => (
            <div key={idx} className={`space-y-1 ${idx > 0 ? 'border-t border-black/5 dark:border-white/10 pt-2' : ''}`}>
                <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tight">
                    <span>{calc.label}</span>
                </div>
                <div className="text-xs font-bold text-gray-800 dark:text-white flex justify-between items-center gap-2 whitespace-nowrap">
                  {typeof calc.math === 'number' ? <CurrencyValue val={calc.math} language={language} isCurrency={calc.isCurrency} /> : calc.math}
                </div>
            </div>
        ))}
      </div>

      {/* 3. Detailed Insights (Theme-Aware) */}
      <div className="space-y-2 px-1 pt-1">
        {details.map((detail, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[16px]">{detail.icon}</span>
                    {detail.label}
                  </span>
                  <span className={`font-bold ${detail.colorClass || 'text-gray-900 dark:text-white'}`}>
                    <CurrencyValue val={detail.value} language={language} isCurrency={detail.isCurrency} />
                  </span>
                </div>
                {detail.subLabel && <div className="text-[10px] text-gray-400 dark:text-gray-500 px-1">{detail.subLabel}</div>}
            </div>
        ))}
      </div>

      {footer && (
          <div className="px-1 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed border-t border-black/5 dark:border-white/10 pt-2">
              "{footer}"
          </div>
      )}
    </div>
  );
};
