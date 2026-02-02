import React from 'react';
import { formatCompactCurrencyParts } from '../../utils/currency';

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
export const CurrencyValue: React.FC<{ val: any, language?: string, isHeader?: boolean, isCurrency?: boolean }> = ({ val, language, isHeader, isCurrency = true }) => {
  if (typeof val !== 'number') return <>{val}</>;
  if (!isCurrency) return <>{val}</>;
  
  const { amount, symbol } = formatCompactCurrencyParts(val, 'EGP', language === 'AR' ? 'ar-EG' : 'en-US');
  
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="leading-none">{amount}</span>
      <span className={`${isHeader ? 'text-[0.55em]' : 'text-[0.7em]'} opacity-50 font-medium whitespace-nowrap leading-none`}>
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
    <div className="space-y-4 py-2 min-w-[240px] max-w-[320px] animate-in fade-in zoom-in duration-200">
      {/* TIER 1: PRIMARY RESULT (EXECUTIVE SUMMARY) */}
      <div className="px-1.5 border-b border-black/10 dark:border-white/10 pb-3">
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className={`material-symbols-rounded text-[14px] ${iconColorClass}`}>{icon}</span>
            {title}
          </p>
          <div className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
              <CurrencyValue val={value} language={language} isHeader isCurrency={isCurrency} />
              {valueLabel && <span className="text-sm text-gray-400 dark:text-zinc-500 font-medium">{valueLabel}</span>}
          </div>
      </div>

      {/* TIER 2: CALCULATION LOGIC (TRANSPARENCY) */}
      <div className="bg-zinc-100/80 dark:bg-white/5 p-2.5 rounded-2xl space-y-3 border border-black/5 dark:border-white/5 shadow-sm">
        {calculations.map((calc, idx) => (
            <div key={idx} className={`space-y-1.5 ${idx > 0 ? 'border-t border-black/5 dark:border-white/5 pt-3' : ''}`}>
                <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-tighter opacity-80">
                    <span>{calc.label}</span>
                </div>
                <div className="text-[13px] font-mono font-bold text-zinc-800 dark:text-white flex justify-between items-center gap-2 whitespace-nowrap tabular-nums">
                  {typeof calc.math === 'number' ? <CurrencyValue val={calc.math} language={language} isCurrency={calc.isCurrency} /> : calc.math}
                </div>
            </div>
        ))}
      </div>

      {/* TIER 3: OPERATIONAL INSIGHTS (STRATEGIC ACTION) */}
      <div className="space-y-3 px-1.5 pt-1">
        {details.map((detail, idx) => (
            <div key={idx} className="group">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2.5 font-medium">
                    <span className="material-symbols-rounded text-[18px] opacity-70 group-hover:opacity-100 transition-opacity">{detail.icon}</span>
                    {detail.label}
                  </span>
                  <span className={`font-black tracking-tight ${detail.colorClass || 'text-zinc-900 dark:text-white'}`}>
                    <CurrencyValue val={detail.value} language={language} isCurrency={detail.isCurrency} />
                  </span>
                </div>
                {detail.subLabel && <div className="text-[10px] text-zinc-400 dark:text-zinc-500 px-2 mt-0.5 font-medium">{detail.subLabel}</div>}
            </div>
        ))}
      </div>

      {footer && (
          <div className="px-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-black/10 dark:border-white/10 pt-3 italic font-medium opacity-80">
              "{footer}"
          </div>
      )}
    </div>
  );
};

