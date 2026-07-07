import { useQuery } from '@tanstack/react-query';
import type { Organization } from '../../types';

export function useActiveOrg(orgId: string) {
  return useQuery({
    queryKey: ['org', orgId],
    queryFn: () =>
      import('../../services/org/orgService').then((m) =>
        m.orgService.getById(orgId)
      ) as Promise<Organization | null>,
    enabled: !!orgId,
    staleTime: 60 * 60 * 1000,
  });
}
