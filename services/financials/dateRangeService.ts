import timeService from '../timeService';

export type FinancialPeriod =
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year';

export const dateRangeService = {
  getDateRange(period: FinancialPeriod): { start: string; end: string } {
    const now = timeService.getVerifiedDate();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'last_7_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
        break;
      case 'last_30_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'last_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  },

  getPreviousPeriodRange(period: FinancialPeriod): { start: string; end: string } {
    const now = timeService.getVerifiedDate();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      case 'last_7_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999);
        break;
      case 'last_30_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 23, 59, 59, 999);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
        break;
      case 'last_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59, 999);
        break;
      case 'this_year':
        start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  },

  /**
   * Returns a list of fully closed months in format YYYY-MM between two dates.
   * A month is closed if the current date is past that month's end.
   */
  getClosedMonths(start: string, end: string): string[] {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = timeService.getVerifiedDate();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const closedMonths: string[] = [];
    const tempDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (tempDate <= endDate) {
      const monthEnd = new Date(
        tempDate.getFullYear(),
        tempDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      // The month must be fully contained within [start, end]
      // And the end of this month must be in the past (before the start of the current month)
      if (tempDate >= startDate && monthEnd <= endDate && monthEnd < currentMonthStart) {
        const year = tempDate.getFullYear();
        const month = String(tempDate.getMonth() + 1).padStart(2, '0');
        closedMonths.push(`${year}-${month}`);
      }

      // Move to next month
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    return closedMonths;
  },

  getDaysInRange(start: string, end: string): string[] {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days: string[] = [];
    const tempDate = new Date(startDate.getTime());

    while (tempDate <= endDate) {
      const yyyy = tempDate.getFullYear();
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempDate.getDate()).padStart(2, '0');
      days.push(`${yyyy}-${mm}-${dd}`);
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return days;
  },

  getCurrentMonthStart(): string {
    const now = timeService.getVerifiedDate();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return start.toISOString();
  },

  /**
   * Returns today's date as a local YYYY-MM-DD string using verified time.
   * Use this instead of `new Date().toISOString().split('T')[0]` which shifts
   * to UTC and can return yesterday's date when local time is UTC+N and it's
   * before N hours past midnight.
   */
  getLocalDateString(): string {
    const now = timeService.getVerifiedDate();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * Converts a UTC ISO timestamp (e.g. from Supabase) to a local YYYY-MM-DD string.
   * Supabase stores timestamps in UTC, so `"2026-05-30T23:00:00Z".split('T')[0]`
   * gives "2026-05-30", but in Cairo (UTC+3) the local date is "2026-05-31".
   * This method correctly returns the local date.
   */
  toLocalDateString(isoTimestamp: string): string {
    const d = new Date(isoTimestamp);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },
};
