import { formatCompactCurrencyParts } from '../../utils/currency';
import { useSettings } from '../../context';

/**
 * @fileoverview InsightTooltip Component
 * ═══════════════════════════════════════════════════════════════════════════
 * DASHBOARD ANALYTICS - TOOLTIP ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This section implements a professional 3-tier tooltip system for senior-level
 * business intelligence. Each tooltip follows a strict information hierarchy.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * THE 3-TIER ARCHITECTURE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * TIER 1: PRIMARY RESULT (The "What")
 * ├─ Purpose: Instant executive summary
 * ├─ Format: Large, high-impact number (24-28px, bold)
 * ├─ Example: EGP 45,200 (Operating Profit)
 * └─ Rule: Answer "What is the current status?" in one glance
 *
 * TIER 2: CALCULATION LOGIC (The "How")
 * ├─ Purpose: Transparent calculation breakdown
 * ├─ Format: Monospace, structured math block with real numbers
 * ├─ Example: Revenue (60k) - COGS (35k) - Expenses (12k) = Profit (13k)
 * └─ Rule: Build trust by showing exact calculations with actual data
 *
 * TIER 3: OPERATIONAL INSIGHTS (The "So What")
 * ├─ Purpose: Actionable business intelligence
 * ├─ Format: Contextual metrics, trends, and performance grades
 * ├─ Example: Return Rate 2.3%, Revenue at Risk EGP 4,200, Grade: Excellent
 * └─ Rule: Convert raw data into strategic decisions
 *
 *  * Updated:
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
 */
export const CurrencyValue: React.FC<{
  val: any;
  language?: string;
  isHeader?: boolean;
  isCurrency?: boolean;
}> = ({ val, language: propLanguage, isHeader, isCurrency = true }) => {
  const { language: settingsLanguage } = useSettings();
  const currentLang = propLanguage || settingsLanguage;
  
  if (typeof val !== 'number') return <>{val}</>;
  if (!isCurrency) return <>{val}</>;

  const { amount, symbol } = formatCompactCurrencyParts(
    val,
    'EGP',
    currentLang === 'AR' ? 'ar-EG' : 'en-US'
  );

  return (
    <span className='inline-flex items-baseline gap-1'>
      <span className='leading-none'>{amount}</span>
      <span
        className={`${isHeader ? 'text-[0.55em]' : 'text-[0.7em]'} opacity-50 font-medium whitespace-nowrap leading-none`}
      >
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
  language,
}) => {
  return (
    <div className='space-y-3 py-1.5 min-w-[240px] max-w-[320px]'>
      {/* TIER 1: PRIMARY RESULT (EXECUTIVE SUMMARY) */}
      <div className='px-1 border-b border-black/10 dark:border-white/10 pb-2 flex justify-between items-end gap-3'>
        <div className='flex flex-col gap-0.5'>
          <p className='text-[10.5px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5'>
            <span className={`material-symbols-rounded text-[13px] ${iconColorClass}`}>{icon}</span>
            {title}
          </p>
          {valueLabel && (
            <span className='text-[12px] text-gray-400 dark:text-zinc-500 font-medium'>
              {valueLabel}
            </span>
          )}
        </div>
        <div className='text-2xl font-black text-gray-900 dark:text-white flex items-center gap-1.5 tracking-tight'>
          <CurrencyValue val={value} language={language} isHeader isCurrency={isCurrency} />
        </div>
      </div>

      {/* TIER 2: CALCULATION LOGIC (TRANSPARENCY) */}
      <div className='bg-zinc-100/80 dark:bg-white/5 p-2 rounded-xl space-y-2 border border-black/5 dark:border-white/5 shadow-xs'>
        {calculations.map((calc, idx) => (
          <div
            key={idx}
            className={`space-y-1 ${idx > 0 ? 'border-t border-black/5 dark:border-white/5 pt-2' : ''}`}
          >
            <div className='flex justify-between text-[9px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-tighter opacity-80'>
              <span>{calc.label}</span>
            </div>
            <div className='text-[12.5px] font-mono font-bold text-zinc-800 dark:text-white flex justify-between items-center gap-2 whitespace-nowrap tabular-nums'>
              {typeof calc.math === 'number' ? (
                <CurrencyValue val={calc.math} language={language} isCurrency={calc.isCurrency} />
              ) : (
                calc.math
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TIER 3: OPERATIONAL INSIGHTS (STRATEGIC ACTION) */}
      <div className='space-y-2 px-1 pt-0.5'>
        {details.map((detail, idx) => (
          <div key={idx} className='group'>
            <div className='flex justify-between items-center text-[12.5px]'>
              <span className='text-zinc-600 dark:text-zinc-400 flex items-center gap-2 font-medium'>
                <span className='material-symbols-rounded text-[16px] opacity-70 group-hover:opacity-100 transition-opacity'>
                  {detail.icon}
                </span>
                {detail.label}
              </span>
              <span
                className={`font-black tracking-tight ${detail.colorClass || 'text-zinc-900 dark:text-white'}`}
              >
                <CurrencyValue
                  val={detail.value}
                  language={language}
                  isCurrency={detail.isCurrency}
                />
              </span>
            </div>
            {detail.subLabel && (
              <div className='text-[9px] text-zinc-400 dark:text-zinc-500 px-2 mt-0.5 font-medium'>
                {detail.subLabel}
              </div>
            )}
          </div>
        ))}
      </div>

      {footer && (
        <div className='px-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-black/10 dark:border-white/10 pt-3 italic font-medium opacity-80'>
          "{footer}"
        </div>
      )}
    </div>
  );
};
