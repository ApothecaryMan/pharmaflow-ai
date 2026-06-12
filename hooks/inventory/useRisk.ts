/**
 * useRisk - Hook for fetching risk/expiry intelligence data
 *
 * Provides risk summary and expiring batch items from real data
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { intelligenceService } from '../../services/intelligence/intelligenceService';
import { useData } from '../../context/DataContext';
import { permissionsService } from '../../services/auth/permissionsService';
import type { ExpiryRiskItem, RiskSummary } from '../../types/intelligence';

interface UseRiskResult {
  summary: RiskSummary | null;
  items: ExpiryRiskItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRisk(): UseRiskResult {
  const { activeBranchId } = useData();
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [items, setItems] = useState<ExpiryRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastBranchIdRef = useRef<string | undefined>(undefined);

  const fetchData = useCallback(async (isRefresh = false) => {
    // Prevent duplicate fetches for the same branch unless it's a manual refresh
    if (!isRefresh && lastBranchIdRef.current === activeBranchId) {
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastBranchIdRef.current = activeBranchId;

    setLoading(true);
    setError(null);

    try {
      const [summaryData, itemsData] = await Promise.all([
        intelligenceService.getRiskSummary(activeBranchId, { signal: controller.signal }),
        intelligenceService.getExpiryRiskItems(activeBranchId, { signal: controller.signal }),
      ]);

      if (!controller.signal.aborted) {
        setSummary(summaryData);
        setItems(itemsData);
        setLoading(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      console.error('[useRisk] Error fetching data:', err);
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to load risk data');
        setLoading(false);
      }
    }
  }, [activeBranchId]);

  useEffect(() => {
    const canView = permissionsService.can('reports.view_intelligence') || permissionsService.can('reports.view_inventory');
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
    summary,
    items,
    loading,
    error,
    refresh: () => fetchData(true),
  };
}
