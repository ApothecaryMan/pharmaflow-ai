/**
 * useAudit - Hook for fetching audit/transaction log data
 *
 * Provides transaction history from real sales and returns data
 */

import { useCallback, useEffect, useState } from 'react';
import { intelligenceService } from '../services/intelligence/intelligenceService';
import type { AuditTransaction } from '../types/intelligence';

interface UseAuditResult {
  transactions: AuditTransaction[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAudit(limit: number = 100): UseAuditResult {
  const [transactions, setTransactions] = useState<AuditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await intelligenceService.getAuditTransactions(limit);
      setTransactions(data);
    } catch (err) {
      console.error('[useAudit] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    transactions,
    loading,
    error,
    refresh: fetchData,
  };
}
