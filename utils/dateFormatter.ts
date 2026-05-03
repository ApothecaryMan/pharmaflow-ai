/**
 * Date and Time Formatting Utilities with BiDi (RTL/LTR) Support.
 * 
 * These utilities ensure that dates and times are correctly formatted for
 * bilingual applications, specifically handling the "shuffling" of numbers
 * in RTL (Arabic) contexts by using Unicode direction marks.
 */

export const RLM = '\u200F'; // Right-to-Left Mark
export const LRM = '\u200E'; // Left-to-Right Mark

/**
 * Standard Date Formatting Options
 */
export const DATE_OPTS_SHORT: Intl.DateTimeFormatOptions = { 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric' 
};

/**
 * Standard Time Formatting Options
 * @param showSeconds Whether to include seconds
 * @param use24Hour Whether to use 24-hour format
 */
export const getTimeOpts = (showSeconds = false, use24Hour = false): Intl.DateTimeFormatOptions => ({
  hour: '2-digit', 
  minute: '2-digit',
  ...(showSeconds && { second: '2-digit' }),
  hour12: !use24Hour,
});

/**
 * Formats a date or time string with a Right-to-Left Mark (RLM) prefix.
 * This ensures that strings starting with numbers (like "3 مايو") 
 * are correctly anchored to the right in RTL layouts instead of being shuffled to the end.
 * 
 * @param date The Date object to format
 * @param locale The locale string (e.g., 'ar-EG' or 'ar-u-nu-latn')
 * @param options Intl.DateTimeFormatOptions
 * @param type 'date' | 'time' | 'datetime'
 * @returns RLM-prefixed localized string
 */
export const formatLocalizedDateTime = (
  date: Date | string | number,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  type: 'date' | 'time' | 'datetime' = 'datetime'
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';

  let result = '';
  
  try {
    if (type === 'date') {
      result = dateObj.toLocaleDateString(locale, options);
    } else if (type === 'time') {
      result = dateObj.toLocaleTimeString(locale, options);
    } else {
      result = dateObj.toLocaleString(locale, options);
    }
  } catch (error) {
    console.warn('Formatting failed, falling back to basic string', error);
    result = dateObj.toString();
  }
  
  // Prefix with RLM to fix BiDi ordering for RTL contexts
  // This is critical for Arabic where leading numbers in strings can get pushed to the wrong end.
  return `${RLM}${result}`;
};

/**
 * Helper to get both date and time options merged
 */
export const getCombinedDateTimeOpts = (showSeconds = false, use24Hour = false): Intl.DateTimeFormatOptions => ({
  ...DATE_OPTS_SHORT,
  ...getTimeOpts(showSeconds, use24Hour),
});
