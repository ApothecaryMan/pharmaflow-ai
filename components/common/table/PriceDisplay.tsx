import React from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { formatCompactCurrencyParts, formatCurrencyParts } from '../../../utils/currency';

export const PriceDisplay: React.FC<{
  value: number;
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  compact?: boolean;
}> = ({ value, size = 'base', compact = false }) => {
  const { language } = useSettings();
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';
  const { amount, symbol } = compact
    ? formatCompactCurrencyParts(value, 'EGP', locale, 2)
    : formatCurrencyParts(value, 'EGP', locale);

  // Scale symbol based on text size approximately
  const SYMBOL_SCALES = {
    sm: 'text-[0.75em]',
    base: 'text-[0.75em]',
    lg: 'text-[0.75em]',
    xl: 'text-[0.6em]',
    '2xl': 'text-[0.5em]',
  } as const;

  const symbolClass = SYMBOL_SCALES[size] || SYMBOL_SCALES.base;

  return (
    <span className='tabular-nums inline-block' dir='ltr' style={{ unicodeBidi: 'isolate' }}>
      {amount} <span className={`${symbolClass} text-gray-400 font-normal`}>{symbol}</span>
    </span>
  );
};
