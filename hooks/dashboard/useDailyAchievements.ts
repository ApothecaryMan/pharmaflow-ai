import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { achievementService } from '../../services/dashboard/achievementService';

interface UseDailyAchievementsOptions {
  language?: string;
  enabled?: boolean;
}

/**
 * React hook to fetch pre-computed daily target achievements for a branch + month.
 *
 * The hook returns cached data with a 5-minute staleness — the Edge Function
 * runs nightly (or on-demand), so near-real-time freshness is sufficient.
 *
 * To migrate from Supabase to ClickHouse:
 *   Rewrite achievementService.getMonthAchievements() — this hook stays the same.
 */
export function useDailyAchievements(
  branchId: string | undefined,
  year: number,
  month: number,
  options: UseDailyAchievementsOptions = {}
) {
  const { language = 'EN', enabled = true } = options;

  const bid = branchId ?? '';
  return useQuery({
    queryKey: [...queryKeys.achievements.month(bid, year, month), language],
    queryFn: () => achievementService.getMonthAchievements(bid, year, month, language),
    enabled: enabled && !!bid && year > 0 && month >= 0 && month <= 11,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
