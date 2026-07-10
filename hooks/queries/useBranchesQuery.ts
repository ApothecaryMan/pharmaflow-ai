import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { branchService } from '../../services/org/branchService';
import type { Branch } from '../../types';

export function useBranches(orgId: string) {
  return useQuery({
    queryKey: queryKeys.branches.all(orgId),
    queryFn: () => branchService.getAll(orgId) as Promise<Branch[]>,
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000,
  });
}
