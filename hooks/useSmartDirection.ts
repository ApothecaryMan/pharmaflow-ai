
import { useMemo } from 'react';

/**
 * Returns 'rtl' if the text contains Arabic characters, otherwise 'ltr'.
 * @param text The input text to analyze
 * @returns 'rtl' | 'ltr'
 */
export const useSmartDirection = (text: string | undefined | null): 'rtl' | 'ltr' => {
  return useMemo(() => {
    if (!text) return 'ltr';
    return /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
  }, [text]);
};
