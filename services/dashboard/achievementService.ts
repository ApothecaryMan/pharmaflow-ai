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
import { getCurrencySymbol } from '../../utils/currency';

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

// ─── Service ──────────────────────────────────────────────────────────────

class AchievementService {
  /**
   * Fetch pre-computed daily achievements for a branch + month.
   * This is the ONLY method that needs rewriting for ClickHouse migration.
   */
  async getMonthAchievements(
    branchId: string,
    year: number,
    month: number,
    language = 'EN'
  ): Promise<MonthAchievements> {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currency = getCurrencySymbol();

    // ── STEP 1: Query pre-computed table ──────────────────────────────
    // FUTURE: Replace this block with a ClickHouse REST API call
    const { data: rows, error } = await supabase
      .from('daily_target_achievements')
      .select('date, revenue, target, achievement_pct, is_future')
      .eq('branch_id', branchId)
      .gte('date', `${monthStr}-01`)
      .lte('date', `${monthStr}-${String(daysInMonth).padStart(2, '0')}`)
      .order('date', { ascending: true });

    if (error) throw error;

    // ── STEP 2: Build day map ─────────────────────────────────────────
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

    // ── STEP 4: Get monthly target from branch ─────────────────────────
    const { data: branch } = await supabase
      .from('branches')
      .select('monthly_sales_target')
      .eq('id', branchId)
      .single();

    const monthlyTarget = Number(branch?.monthly_sales_target ?? 0);
    const overallPct =
      monthlyTarget > 0 ? Math.round((monthlyRevenue / monthlyTarget) * 100) : 0;

    return {
      year,
      month,
      monthName: getMonthName(month, language),
      daysInMonth,
      days,
      monthlyTarget,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      overallPct,
      monthlyTargetFormatted: `${currency}${monthlyTarget.toLocaleString()}`,
      monthlyRevenueFormatted: `${currency}${Math.round(monthlyRevenue).toLocaleString()}`,
    };
  }
}

export const achievementService = new AchievementService();
