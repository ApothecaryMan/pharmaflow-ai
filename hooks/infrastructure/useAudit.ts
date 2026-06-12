/**
 * useAudit - Hook for fetching audit/transaction log data
 *
 * Provides transaction history from real sales and returns data
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { intelligenceService } from '../../services/intelligence/intelligenceService';
import { useData } from '../../context/DataContext';
import { permissionsService } from '../../services/auth/permissionsService';
import type { AuditTransaction } from '../../types/intelligence';

interface UseAuditResult {
  transactions: AuditTransaction[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAudit(limit: number = 100): UseAuditResult {
  const { activeBranchId } = useData();
  const [transactions, setTransactions] = useState<AuditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string | undefined>(undefined);

  const fetchData = useCallback(async (isRefresh = false) => {
    const fetchKey = `${activeBranchId}-${limit}`;

    // Prevent duplicate fetches for the same branch and limit unless it's a manual refresh
    if (!isRefresh && lastFetchKeyRef.current === fetchKey) {
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastFetchKeyRef.current = fetchKey;

    setLoading(true);
    setError(null);

    try {
      const data = await intelligenceService.getAuditTransactions(limit, activeBranchId, { signal: controller.signal });
      
      if (!controller.signal.aborted) {
        setTransactions(data);
        setLoading(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      console.error('[useAudit] Error fetching data:', err);
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to load audit data');
        setLoading(false);
      }
    }
  }, [limit, activeBranchId]);

  useEffect(() => {
    const canView = permissionsService.can('reports.view_intelligence') || permissionsService.can('reports.view_financial');
    if (canView) {
      fetchData();
    } else {
      setLoading(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    transactions,
    loading,
    error,
    refresh: () => fetchData(true),
  };
}
