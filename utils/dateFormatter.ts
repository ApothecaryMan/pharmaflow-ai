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
  day: 'numeric',
};

/**
 * Standard Time Formatting Options
 * @param showSeconds Whether to include seconds
 * @param use24Hour Whether to use 24-hour format
 */
export const getTimeOpts = (
  showSeconds = false,
  use24Hour = false
): Intl.DateTimeFormatOptions => ({
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

  if (Number.isNaN(dateObj.getTime())) return '';

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
export const getCombinedDateTimeOpts = (
  showSeconds = false,
  use24Hour = false
): Intl.DateTimeFormatOptions => ({
  ...DATE_OPTS_SHORT,
  ...getTimeOpts(showSeconds, use24Hour),
});

/**
 * Cairo timezone constant used across the app as default.
 */
export const CAIRO_TZ = 'Africa/Cairo';

/**
 * Builds an Arabic time-word for a given count, handling 1/2/3-10/11+ rules.
 * Nominative forms (standalone: "دقيقتان", "يومان").
 */
export function arTimeWord(count: number, singular: string, dual: string, plural: string): string {
  if (count === 1) return singular;
  if (count === 2) return dual;
  if (count <= 10) return `${count} ${plural}`;
  return `${count} ${singular}`;
}

/**
 * Formats a date string into a { label, time } pair with optional timezone.
 * Shows "Today" / "اليوم" or "Yesterday" / "أمس" when applicable,
 * otherwise falls back to a localized date string.
 *
 * @param dateStr - ISO date string to format
 * @param language - 'EN' or 'AR'
 * @param timeZone - IANA timezone (defaults to Africa/Cairo)
 */
export function formatDateWithRelativeLabel(
  dateStr: string,
  language: string,
  timeZone?: string
): { label: string; time: string } {
  const tz = timeZone || CAIRO_TZ;
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };
  const d = new Date(dateStr).toLocaleDateString('en-CA', opts);
  const today = new Date().toLocaleDateString('en-CA', opts);
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', opts);
  let label: string;
  const locale = language === 'AR' ? 'ar-SA' : 'en-US';
  if (d === today) label = language === 'AR' ? 'اليوم' : 'Today';
  else if (d === yesterday) label = language === 'AR' ? 'أمس' : 'Yesterday';
  else label = new Date(dateStr).toLocaleDateString(locale, { timeZone: tz });
  const time = new Date(dateStr).toLocaleTimeString(locale, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  });
  return { label, time };
}

/**
 * Returns the duration between two ISO dates in milliseconds.
 */
export function getDurationMs(startIso: string, endIso: string): number {
  return Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
}

/**
 * Returns a human-readable duration string (e.g. "2h 15m", "ساعتان 15دقيقة").
 *
 * @param startIso - start ISO date string
 * @param endIso - end ISO date string
 * @param language - 'EN' or 'AR'
 */
export function getDurationStr(startIso: string, endIso: string, language: string): string {
  const diffMs = getDurationMs(startIso, endIso);
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return language === 'AR' ? 'أقل من دقيقة' : '<1m';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const parts: string[] = [];

  if (days > 0) {
    if (language === 'AR') parts.push(arTimeWord(days, 'يوم', 'يومان', 'أيام'));
    else parts.push(`${days}d`);
  }
  if (remainingHours > 0) {
    if (language === 'AR') parts.push(arTimeWord(remainingHours, 'ساعة', 'ساعتان', 'ساعات'));
    else parts.push(`${remainingHours}h`);
  }
  if (minutes > 0) {
    if (language === 'AR') parts.push(arTimeWord(minutes, 'دقيقة', 'دقيقتان', 'دقائق'));
    else parts.push(`${minutes}m`);
  }

  return parts.join(' ') || (language === 'AR' ? 'الآن' : 'Just now');
}

/**
 * Returns a relative time string (e.g. "5m ago", "منذ 5 دقائق") for dates
 * within the last 24 hours. Returns empty string for older dates.
 */
export function getRelativeTime(dateStr: string, language: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return language === 'AR' ? 'الآن' : 'Just now';

  if (minutes < 60) {
    if (language === 'AR') {
      if (minutes === 1) return 'منذ دقيقة';
      if (minutes === 2) return 'منذ دقيقتين';
      if (minutes <= 10) return `منذ ${minutes} دقائق`;
      return `منذ ${minutes} دقيقة`;
    }
    return minutes === 1 ? '1m ago' : `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (language === 'AR') {
      if (hours === 1) return 'منذ ساعة';
      if (hours === 2) return 'منذ ساعتين';
      if (hours <= 10) return `منذ ${hours} ساعات`;
      return `منذ ${hours} ساعة`;
    }
    return hours === 1 ? '1h ago' : `${hours}h ago`;
  }

  return '';
}
