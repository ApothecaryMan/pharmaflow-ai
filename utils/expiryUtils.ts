/**
 * Expiry Date Utilities
 * Format: MMYY (4 digits)
 * - MM: Month (01-12)
 * - YY: Year (00-99)
 */

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
export const getExpiryStatusStyle = (status: ExpiryStatus, type: 'input' | 'badge' = 'input'): string => {
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
