/**
 * Localization Utilities
 * 
 * Handles digit normalization and locale-aware parsing to ensure 
 * consistency between UI display and data processing.
 */

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Normalizes a string by converting all Arabic digits to standard Latin (English) digits.
 * Useful for parsing inputs or searching.
 */
export const normalizeDigits = (str: string | number | null | undefined): string => {
  if (str === null || str === undefined) return '';
  
  let result = String(str);
  
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(ARABIC_DIGITS[i], 'g'), ENGLISH_DIGITS[i]);
  }
  
  return result;
};

/**
 * Converts English digits to Arabic digits.
 * Useful for manual string manipulation where Intl.NumberFormat isn't applicable.
 */
export const toArabicDigits = (str: string | number | null | undefined): string => {
  if (str === null || str === undefined) return '';
  
  let result = String(str);
  
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(ENGLISH_DIGITS[i], 'g'), ARABIC_DIGITS[i]);
  }
  
  return result;
};

/**
 * Intelligent numeric parser that handles both Arabic and English digits.
 */
export const parseLocalizedNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  
  const normalized = normalizeDigits(value);
  const parsed = parseFloat(normalized.replace(/[^\d.-]/g, ''));
  
  return isNaN(parsed) ? 0 : parsed;
};
