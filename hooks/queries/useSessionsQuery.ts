import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { sessionRepository } from '../../services/auth/repositories/sessionRepository';
import type { UserActiveSession } from '../../services/auth/repositories/sessionRepository';

export function useActiveSessions(userId?: string) {
  return useQuery({
    queryKey: queryKeys.sessions.active(userId),
    queryFn: () => sessionRepository.getActiveSessions(userId) as Promise<UserActiveSession[]>,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
