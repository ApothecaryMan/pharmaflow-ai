/**
 * Expiry Date Utilities
 * Format: MMYY (4 digits)
 * - MM: Month (01-12)
 * - YY: Year (00-99)
 */

/**
 * Standardizes the display of expiry dates as MM/YY.
 * Handles Date objects, ISO strings (YYYY-MM-DD), YYYY-MM strings, and MM/YYYY strings.
 */
export const formatExpiryDate = (expiryDate: any): string => {
  if (!expiryDate) return '-';

  // Handle YYYY-MM strings directly for efficiency
  if (typeof expiryDate === 'string' && /^\d{4}-\d{2}$/.test(expiryDate)) {
    const [year, month] = expiryDate.split('-');
    return `${month}/${year.slice(-2)}`;
  }

  // Handle YYYY-MM-DD strings directly
  if (typeof expiryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    const [year, month] = expiryDate.split('-');
    return `${month}/${year.slice(-2)}`;
  }

  // Fallback for Date objects or ISO strings
  const dateObj = new Date(expiryDate);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleDateString('en-US', {
      month: '2-digit',
      year: '2-digit',
    });
  }

  // Fallback for MM/YYYY or MM/YY strings
  if (typeof expiryDate === 'string' && expiryDate.includes('/')) {
    const parts = expiryDate.split('/');
    if (parts.length === 2) {
      const month = parts[0].padStart(2, '0');
      const year = parts[1].length === 4 ? parts[1].slice(-2) : parts[1];
      return `${month}/${year}`;
    }
  }

  return expiryDate;
};

export type ExpiryStatus = 'valid' | 'invalid' | 'near-expiry' | 'incomplete';

/**
 * Validate and sanitize expiry input as user types
 * @param input - Raw user input
 * @param previousValue - Previous value (for comparison)
 * @returns Sanitized value or null if invalid
 */
export const sanitizeExpiryInput = (input: string, previousValue: string = ''): string | null => {
  // Allow empty
  if (!input) return '';

  // Only allow digits
  if (!/^\d*$/.test(input)) return null;

  // Max 4 digits
  if (input.length > 4) return null;

  // Validate month (first 2 digits)
  if (input.length >= 1) {
    const firstDigit = parseInt(input[0]);
    // First digit can only be 0 or 1
    if (firstDigit > 1 && input.length === 1) {
      // Auto-prepend 0 for months 2-9
      return '0' + input[0];
    }
  }

  if (input.length >= 2) {
    const month = parseInt(input.slice(0, 2));
    // Month must be 01-12
    if (month === 0 || month > 12) return null;
  }

  return input;
};

/**
 * Format expiry for display (MMYY -> MM/20YY)
 * @param date - Expiry date in MMYY format
 * @returns Formatted string or original value
 */
export const formatExpiryDisplay = (date: string): string => {
  if (!date) return '';

  // Only format complete MMYY
  if (date.length === 4 && !date.includes('/')) {
    return `${date.slice(0, 2)}/20${date.slice(2)}`;
  }

  return date;
};

/**
 * Parse display format back to MMYY
 * @param display - Formatted date (MM/20YY or MM/YYYY)
 * @returns MMYY format
 */
export const parseExpiryDisplay = (display: string): string => {
  if (!display) return '';

  // MM/20YY or MM/YYYY -> MMYY
  if (/^\d{2}\/20\d{2}$/.test(display)) {
    return display.substring(0, 2) + display.substring(5, 7);
  }

  return display;
};

/**
 * Check expiry status for validation and styling
 * @param date - Expiry date in MMYY or MM/YYYY format
 * @param options - { checkIncomplete: boolean } - Whether to check for incomplete (use false while typing)
 * @returns ExpiryStatus
 */
export const checkExpiryStatus = (
  date: string,
  options: { checkIncomplete?: boolean } = { checkIncomplete: true }
): ExpiryStatus => {
  if (!date) return 'valid';

  // Check for incomplete input (1-3 digits) - only if requested
  if (options.checkIncomplete && date.length > 0 && date.length < 4 && !date.includes('/')) {
    return 'incomplete';
  }

  // Skip validation for incomplete input when not checking
  if (date.length < 4 && !date.includes('/')) {
    return 'valid';
  }

  let month = 0;
  let year = 0;

  if (date.length === 4 && !date.includes('/')) {
    // MMYY format (exactly 4 digits)
    month = parseInt(date.slice(0, 2));
    year = parseInt(date.slice(2));
  } else if (date.length === 7 && date.includes('/')) {
    // MM/YYYY format
    month = parseInt(date.split('/')[0]);
    year = parseInt(date.split('/')[1]) % 100;
  } else if (/^\d{4}-\d{2}$/.test(date)) {
    // YYYY-MM format
    const parts = date.split('-');
    year = parseInt(parts[0].slice(-2));
    month = parseInt(parts[1]);
  } else if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(date)) {
    // YYYY-MM-DD or full ISO string
    const parts = date.split('T')[0].split('-');
    year = parseInt(parts[0].slice(-2));
    month = parseInt(parts[1]);
  } else if (date.length > 4 && !date.includes('/')) {
    return 'invalid';
  } else {
    return 'valid';
  }


  // Invalid month
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return 'invalid';

  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  const currentTotalMonths = currentYear * 12 + currentMonth;
  const expiryTotalMonths = year * 12 + month;

  // Already expired
  if (expiryTotalMonths < currentTotalMonths) return 'invalid';

  // Near expiry (within 3 months)
  if (expiryTotalMonths - currentTotalMonths <= 3) return 'near-expiry';

  return 'valid';
};

/**
 * Get styling class based on expiry status
 * @param status - ExpiryStatus
 * @param type - 'input' | 'badge'
 * @returns Tailwind CSS classes
 */
export const getExpiryStatusStyle = (
  status: ExpiryStatus,
  type: 'input' | 'badge' = 'input'
): string => {
  if (type === 'input') {
    switch (status) {
      case 'invalid':
      case 'incomplete':
        return 'text-red-500 dark:text-red-400 border-red-300 focus:border-red-500';
      case 'near-expiry':
        return 'text-yellow-600 dark:text-yellow-400 border-yellow-300 focus:border-yellow-500';
      default:
        return '';
    }
  } else {
    // Badge style
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-700';
      case 'near-expiry':
        return 'bg-yellow-100 text-yellow-700';
      case 'incomplete':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  }
};

/**
 * Parses an expiry date string (YYYY-MM-DD or YYYY-MM) and returns a Date object
 * representing the LAST second of the LAST day of that month.
 * This is used for logical calculations (isExpired, nearExpiry) so that
 * an item labeled 2024-03 expires on 2024-03-31 23:59:59.
 * 
 * @param dateStr - Expiry date string (YYYY-MM or YYYY-MM-DD)
 * @returns Date object at the end of the month
 */
export const parseExpiryEndOfMonth = (dateStr: string): Date => {
  if (!dateStr) return new Date(0);

  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);

  // Create date for the first day of the NEXT month, then subtract 1 millisecond
  // months in JS Date are 0-indexed (0=Jan, 11=Dec)
  // To get end of month M, we go to start of month M+1 (which is index M)
  const date = new Date(year, month, 1);
  date.setMilliseconds(-1);
  
  return date;
};

/**
 * Get the full configuration for an expiry status (color and icon)
 * @param status - ExpiryStatus
 * @returns Object with color and icon
 */
export const getExpiryStatusConfig = (status: ExpiryStatus): { color: string; icon: string } => {
  switch (status) {
    case 'valid':
      return { color: 'emerald', icon: 'check_circle' };
    case 'near-expiry':
      return { color: 'amber', icon: 'schedule' };
    case 'incomplete':
      return { color: 'orange', icon: 'pending' };
    case 'invalid':
    default:
      return { color: 'red', icon: 'error' };
  }
};

/**
 * Get the CSS color class based on an expiry date string.
 * @param expiryDate - Date string (YYYY-MM or YYYY-MM-DD)
 * @returns Tailwind CSS classes
 */
export const getExpiryColorClass = (expiryDate: string): string => {
  if (!expiryDate) return 'text-gray-400';
  const date = parseExpiryEndOfMonth(expiryDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Set threshold to 6 months
  const threshold = new Date(today);
  threshold.setMonth(today.getMonth() + 6);

  if (date <= today) {
    return 'text-red-500 font-bold';
  } else if (date <= threshold) {
    return 'text-amber-500 font-bold';
  }
  
  return 'text-gray-700 dark:text-gray-300';
};
