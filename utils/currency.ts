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
    // Force English numerals by using 'en-US' for the number formatting
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return isArabic ? `${formatter.format(amount)} ج.م` : `${formatter.format(amount)} L.E`;
  }

  return new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
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
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return {
      amount: formatter.format(amount),
      symbol: isArabic ? 'ج.م' : 'L.E',
    };
  }

  const parts = new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).formatToParts(amount);

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

  return (
    new Intl.NumberFormat(locale || (isArabic ? 'ar-EG' : 'en-US'), {
      style: 'currency',
      currency,
    })
      .formatToParts(0)
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

  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: decimals,
  });

  if (currency === 'EGP') {
    return isArabic ? `${formatter.format(amount)} ج.م` : `${formatter.format(amount)} L.E`;
  }

  return new Intl.NumberFormat(locale || (isArabic ? 'ar-EG' : 'en-US'), {
    notation: 'compact',
    style: 'currency',
    currency: currency,
    maximumFractionDigits: decimals,
  }).format(amount);
};
export const formatCompactCurrencyParts = (
  amount: number,
  currency: string = 'EGP',
  locale?: string,
  decimals: number = 1
) => {
  const currentLang = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  const isArabic = locale ? locale.startsWith('ar') : currentLang.startsWith('ar');

  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: decimals,
  });

  if (currency === 'EGP') {
    return {
      amount: formatter.format(amount),
      symbol: isArabic ? 'ج.م' : 'L.E',
    };
  }

  const parts = new Intl.NumberFormat(locale || (isArabic ? 'ar-EG' : 'en-US'), {
    notation: 'compact',
    style: 'currency',
    currency: currency,
    maximumFractionDigits: decimals,
  }).formatToParts(amount);

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
