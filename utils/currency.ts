export const formatCurrency = (amount: number, currency: string = 'EGP', locale?: string): string => {
  // 1. Detect language from DOM if not provided
  const currentLang = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  const isArabic = locale ? locale.startsWith('ar') : currentLang.startsWith('ar');
  const targetLocale = locale || (isArabic ? 'ar-EG' : 'en-US');

  // 2. Handle EGP specific formatting (L.E vs ج.م)
  
  if (currency === 'EGP') {
      // Force English numerals by using 'en-US' for the number formatting
      const formatter = new Intl.NumberFormat('en-US', {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
      });
      
      return isArabic 
        ? `\u200E${formatter.format(amount)} ج.م`
        : `${formatter.format(amount)} L.E`;
  }

  return new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const getCurrencySymbol = (currency: string = 'EGP', locale?: string): string => {
  const currentLang = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  const isArabic = locale ? locale.startsWith('ar') : currentLang.startsWith('ar');
  
  if (currency === 'EGP') {
    return isArabic ? 'ج.م' : 'L.E';
  }
  
  return new Intl.NumberFormat(locale || (isArabic ? 'ar-EG' : 'en-US'), { 
    style: 'currency', 
    currency 
  }).formatToParts(0).find(p => p.type === 'currency')?.value || currency;
};
