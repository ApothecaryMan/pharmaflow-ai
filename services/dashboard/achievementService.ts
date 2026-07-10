/**
 * Achievement Service — ABSTRACTION LAYER for daily target achievement data.
 *
 * The widget and hook never touch the database directly. To migrate from
 * PostgreSQL (Supabase) to ClickHouse in the future, rewrite only this file.
 *
 * Swap plan:
 *   1. Change the query to call a ClickHouse REST API instead of supabase
 *   2. Map the response to `MonthAchievements`
 *   3. Zero changes to the widget, hook, or Dashboard
 */

import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/currency';

// ─── Types ────────────────────────────────────────────────────────────────

export interface DayAchievement {
  day: number;
  date: string;
  revenue: number;
  target: number;
  achievementPct: number;
  isFuture: boolean;
}

export interface MonthAchievements {
  year: number;
  month: number;
  monthName: string;
  daysInMonth: number;
  days: DayAchievement[];
  monthlyTarget: number;
  monthlyRevenue: number;
  overallPct: number;
  monthlyTargetFormatted: string;
  monthlyRevenueFormatted: string;
}

// ─── Color Map (mirrors MicroProgressCard colors from RealTimeSalesMonitor) ─

const COLOR_MAP = {
  overfill: 'bg-yellow-400',
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-red-500',
  future: 'bg-gray-200 dark:bg-gray-600',
  noData: 'bg-gray-100 dark:bg-gray-700',
};

/** Returns the Tailwind color class for a given achievement percentage. */
export function getColorForPct(pct: number, isFuture: boolean): string {
  if (isFuture) return COLOR_MAP.future;
  if (pct >= 100) return COLOR_MAP.overfill;
  if (pct >= 80) return COLOR_MAP.high;
  if (pct >= 50) return COLOR_MAP.medium;
  if (pct > 0) return COLOR_MAP.low;
  return COLOR_MAP.noData;
}

export const ACHIEVEMENT_COLORS = COLOR_MAP;

// ─── Month name helpers ───────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string[]> = {
  EN: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  AR: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const MONTH_SHORT: Record<string, string[]> = {
  EN: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  AR: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

export function getMonthName(month: number, language: string, short = false): string {
  const map = short ? MONTH_SHORT : MONTH_NAMES;
  return (map[language] || map.EN)[month] || '';
}

// ─── Cache Configuration ──────────────────────────────────────────────────

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Max retry attempts for transient failures */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY_MS = 300;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// ─── Retry Helper ─────────────────────────────────────────────────────────

/**
 * Executes an async function with exponential backoff on failure.
 * Only retries on transient/network errors — throws immediately on auth/validation errors.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLastAttempt = attempt === retries;

      // Don't retry on non-transient errors (auth, validation, etc.)
      const code = (err as { code?: string })?.code;
      const isNonTransient =
        code === 'PGRST116' || // Not found (single row expected)
        code === '42501' ||    // Insufficient privilege
        code === '42P01';      // Undefined table
      if (isNonTransient || isLastAttempt) throw err;

      // Exponential backoff: 300ms, 600ms, 1200ms...
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // TypeScript: unreachable but satisfies the compiler
  throw new Error('withRetry: exhausted all attempts');
}

// ─── Service ──────────────────────────────────────────────────────────────

class AchievementService {
  /**
   * In-memory cache keyed by "branchId:year:month".
   * Complements React Query's component-level cache with a service-level cache
   * that survives component unmounts and prevents redundant DB hits across
   * multiple consumers of the same data.
   */
  private cache = new Map<string, CacheEntry<MonthAchievements>>();

  /** Generates a stable cache key for a given branch + month. */
  private cacheKey(branchId: string, year: number, month: number, language: string): string {
    return `${branchId}:${year}:${month}:${language}`;
  }

  /** Invalidates all cached entries (useful after data refresh or branch switch). */
  clearCache(): void {
    this.cache.clear();
  }

  /** Invalidates a specific branch+month entry. */
  invalidate(branchId: string, year: number, month: number, language: string): void {
    this.cache.delete(this.cacheKey(branchId, year, month, language));
  }

  /**
   * Fetch pre-computed daily achievements for a branch + month.
   * This is the ONLY method that needs rewriting for ClickHouse migration.
   *
   * Scalability features:
   *   - Parallel queries (Promise.all) — cuts latency ~50%
   *   - In-memory TTL cache — eliminates redundant DB hits
   *   - Retry with exponential backoff — resilient to transient failures
   */
  async getMonthAchievements(
    branchId: string,
    year: number,
    month: number,
    language = 'EN'
  ): Promise<MonthAchievements> {
    // ── CHECK CACHE ───────────────────────────────────────────────────
    const key = this.cacheKey(branchId, year, month, language);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // ── STEP 1: Fetch achievements + branch target IN PARALLEL ────────
    // FUTURE: Replace the first query with a ClickHouse REST API call
    const [achievementsResult, branchResult] = await withRetry(() =>
      Promise.all([
        supabase
          .from('daily_target_achievements')
          .select('date, revenue, target, achievement_pct, is_future')
          .eq('branch_id', branchId)
          .gte('date', `${monthStr}-01`)
          .lte('date', `${monthStr}-${String(daysInMonth).padStart(2, '0')}`)
          .order('date', { ascending: true }),
        supabase
          .from('branches')
          .select('monthly_sales_target')
          .eq('id', branchId)
          .single(),
      ])
    );

    if (achievementsResult.error) throw achievementsResult.error;

    // ── STEP 2: Build day map ─────────────────────────────────────────
    const rows = achievementsResult.data;
    const dayMap = new Map<string, (typeof rows)[0]>();
    for (const row of rows ?? []) {
      dayMap.set(row.date, row);
    }

    // ── STEP 3: Assemble all days of the month ────────────────────────
    const todayStr = new Date().toISOString().slice(0, 10);
    const days: DayAchievement[] = [];
    let monthlyRevenue = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
      const row = dayMap.get(dateStr);
      const isFuture = dateStr > todayStr;

      if (row) {
        monthlyRevenue += Number(row.revenue);
        days.push({
          day: d,
          date: dateStr,
          revenue: Number(row.revenue),
          target: Number(row.target),
          achievementPct: Number(row.achievement_pct),
          isFuture: row.is_future || isFuture,
        });
      } else {
        days.push({
          day: d,
          date: dateStr,
          revenue: 0,
          target: 0,
          achievementPct: 0,
          isFuture,
        });
      }
    }

    // ── STEP 4: Compute monthly totals ─────────────────────────────────
    const monthlyTarget = Number(branchResult.data?.monthly_sales_target ?? 0);
    const overallPct =
      monthlyTarget > 0 ? Math.round((monthlyRevenue / monthlyTarget) * 100) : 0;

    const result: MonthAchievements = {
      year,
      month,
      monthName: getMonthName(month, language),
      daysInMonth,
      days,
      monthlyTarget,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      overallPct,
      monthlyTargetFormatted: formatCurrency(monthlyTarget, undefined, language, 0),
      monthlyRevenueFormatted: formatCurrency(Math.round(monthlyRevenue), undefined, language, 0),
    };

    // ── STORE IN CACHE ────────────────────────────────────────────────
    this.cache.set(key, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  }
}

export const achievementService = new AchievementService();
