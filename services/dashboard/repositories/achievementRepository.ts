import { supabase } from '../../../lib/supabase';

interface AchievementDbRow {
  date: string;
  revenue: number;
  target: number;
  achievement_pct: number;
  is_future: boolean;
}

interface BranchTargetRow {
  monthly_sales_target: number;
}

export const achievementRepository = {
  async getDailyAchievements(
    branchId: string,
    monthStr: string,
    daysInMonth: number
  ): Promise<AchievementDbRow[]> {
    const { data, error } = await supabase
      .from('daily_target_achievements')
      .select('date, revenue, target, achievement_pct, is_future')
      .eq('branch_id', branchId)
      .gte('date', `${monthStr}-01`)
      .lte('date', `${monthStr}-${String(daysInMonth).padStart(2, '0')}`)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as AchievementDbRow[];
  },

  async getBranchMonthlyTarget(branchId: string): Promise<number> {
    const { data, error } = await supabase
      .from('branches')
      .select('monthly_sales_target')
      .eq('id', branchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as BranchTargetRow)?.monthly_sales_target ?? 0;
  },
};
