import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { intelligenceService } from '../../services/intelligence/intelligenceService';
import type { AuditTransaction } from '../../types/intelligence';

export function useAuditTransactions(branchId: string, limit = 100) {
  return useQuery({
    queryKey: queryKeys.audit.transactions(branchId, limit),
    queryFn: ({ signal }) =>
      intelligenceService.getAuditTransactions(limit, branchId, { signal }) as Promise<AuditTransaction[]>,
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });
}
