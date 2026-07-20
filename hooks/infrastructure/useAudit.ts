/**
 * useAudit - Hook for fetching audit/transaction log data
 *
 * Provides transaction history from real sales and returns data.
 * Backed by React Query with automatic caching and background refetching.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { permissionsService } from '../../services/auth/permissionsService';
import { useAuthStore } from '../../stores/authStore';
import { useAuditTransactions } from '../queries/useAuditQuery';

interface UseAuditResult {
  transactions: any[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAudit(limit: number = 100): UseAuditResult {
  const queryClient = useQueryClient();
  const activeBranchId = useAuthStore((s) => s.activeBranchId);

  const canView =
    permissionsService.can('reports.view_intelligence') ||
    permissionsService.can('reports.view_financial');

  const { data: transactions = [], isLoading, error: queryError } = useAuditTransactions(
    canView ? activeBranchId || '' : '',
    limit
  );

  const refresh = useCallback(() => {
    if (!activeBranchId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.audit.transactions(activeBranchId, limit) });
  }, [activeBranchId, limit, queryClient]);

  return {
    transactions,
    loading: isLoading,
    error: queryError?.message || null,
    refresh,
  };
}
