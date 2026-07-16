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

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: queryKeys.org.members(orgId),
    queryFn: () =>
      import('../../services/org/orgService').then((m) =>
        m.orgService.getMembers(orgId)
      ),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrgSubscription(orgId: string) {
  return useQuery({
    queryKey: queryKeys.org.subscription(orgId),
    queryFn: () =>
      import('../../services/org/orgService').then((m) =>
        m.orgService.getSubscription(orgId)
      ),
    enabled: !!orgId,
    staleTime: 60 * 60 * 1000,
  });
}

export function useOrgLogs(orgId: string, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.org.logs(orgId, limit),
    queryFn: () =>
      import('../../services/audit/auditService').then((m) =>
        m.auditService.getOrgLogs(orgId, limit)
      ),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}
