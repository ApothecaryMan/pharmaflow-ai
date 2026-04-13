// Performance: Cache formatters to avoid costly re-allocation 
const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (options: Intl.NumberFormatOptions, locale: string) => {
  const key = `${locale}-${JSON.stringify(options)}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.NumberFormat(locale, options));
  }
  return formatterCache.get(key)!;
};

export const formatCurrency = (
  amount: number,
  currency: string = 'EGP',
  locale?: string,
  decimals: number = 2
): string => {
  // 1. Detect language from DOM if not provided
  const currentLang = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  const isArabic = locale ? locale.startsWith('ar') : currentLang.startsWith('ar');
  const targetLocale = locale || (isArabic ? 'ar-EG' : 'en-US');

  // 2. Handle EGP specific formatting (L.E vs ج.م)

  if (currency === 'EGP') {
    const formatter = getFormatter({
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }, 'en-US');

    const formattedAmount = formatter.format(amount);
    
    // Use Unicode BiDi controls to ensure correct visual order [Number] [Space] [Symbol]
    // \u200E is LRM (Left-to-Right Mark) to isolate the number and space
    // \u00A0 is NBSP (Non-breaking space)
    return isArabic 
      ? `\u200E${formattedAmount}\u00A0ج.م\u200E` 
      : `\u200E${formattedAmount}\u00A0L.E\u200E`;
  }

  const formatter = getFormatter({
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }, targetLocale);

  return formatter.format(amount);
};

export const formatCurrencyParts = (
  amount: number,
  currency: string = 'EGP',
  locale?: string,
  decimals: number = 2
) => {
  // 1. Detect language from DOM if not provided
  const currentLang = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  const isArabic = locale ? locale.startsWith('ar') : currentLang.startsWith('ar');
  const targetLocale = locale || (isArabic ? 'ar-EG' : 'en-US');

  // 2. Handle EGP specific formatting (L.E vs ج.م)
  if (currency === 'EGP') {
    const formatter = getFormatter({
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }, 'en-US');

    return {
      amount: formatter.format(amount),
      symbol: isArabic ? 'ج.م' : 'L.E',
    };
  }

  const formatter = getFormatter({
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }, targetLocale);

  const parts = formatter.formatToParts(amount);

  const amountPart = parts
    .filter((p) => p.type !== 'currency' && p.type !== 'literal')
    .map((p) => p.value)
    .join('');
  const symbolPart = parts.find((p) => p.type === 'currency')?.value || currency;

  return {
    amount: amountPart,
    symbol: symbolPart,
  };
};

export const getCurrencySymbol = (currency: string = 'EGP', locale?: string): string => {
  const currentLang = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  const isArabic = locale ? locale.startsWith('ar') : currentLang.startsWith('ar');

  if (currency === 'EGP') {
    return isArabic ? 'ج.م' : 'L.E';
  }

  const formatter = getFormatter({
    style: 'currency',
    currency,
  }, locale || (isArabic ? 'ar-EG' : 'en-US'));

  return (
    formatter.formatToParts(0)
      .find((p) => p.type === 'currency')?.value || currency
  );
};
export const formatCompactCurrency = (
  amount: number,
  currency: string = 'EGP',
  locale?: string,
  decimals: number = 1
): string => {
  const currentLang = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  const isArabic = locale ? locale.startsWith('ar') : currentLang.startsWith('ar');

  const formatter = getFormatter({
    notation: 'compact',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }, 'en-US');

  if (currency === 'EGP') {
    const formattedAmount = formatter.format(amount);
    return isArabic 
      ? `\u200E${formattedAmount}\u00A0ج.م\u200E` 
      : `\u200E${formattedAmount}\u00A0L.E\u200E`;
  }

  const currencyFormatter = getFormatter({
    notation: 'compact',
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }, locale || (isArabic ? 'ar-EG' : 'en-US'));

  return currencyFormatter.format(amount);
};
export const formatCompactCurrencyParts = (
  amount: number,
  currency: string = 'EGP',
  locale?: string,
  decimals: number = 1
) => {
  const currentLang = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  const isArabic = locale ? locale.startsWith('ar') : currentLang.startsWith('ar');

  const formatter = getFormatter({
    notation: 'compact',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }, 'en-US');

  if (currency === 'EGP') {
    return {
      amount: formatter.format(amount),
      symbol: isArabic ? 'ج.م' : 'L.E',
    };
  }

  const currencyFormatter = getFormatter({
    notation: 'compact',
    style: 'currency',
    currency: currency,
    maximumFractionDigits: decimals,
  }, locale || (isArabic ? 'ar-EG' : 'en-US'));

  const parts = currencyFormatter.formatToParts(amount);

  const amountPart = parts
    .filter((p) => p.type !== 'currency' && p.type !== 'literal')
    .map((p) => p.value)
    .join('');
  const symbolPart = parts.find((p) => p.type === 'currency')?.value || currency;

  return {
    amount: amountPart,
    symbol: symbolPart,
  };
};
