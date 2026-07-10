import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { Organization } from '../../types';

export function useActiveOrg(orgId: string) {
  return useQuery({
    queryKey: queryKeys.org.detail(orgId),
    queryFn: () =>
      import('../../services/org/orgService').then((m) =>
        m.orgService.getById(orgId)
      ) as Promise<Organization | null>,
    enabled: !!orgId,
    staleTime: 60 * 60 * 1000,
  });
}
