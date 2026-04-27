/**
 * useRisk - Hook for fetching risk/expiry intelligence data
 *
 * Provides risk summary and expiring batch items from real data
 */

import { useCallback, useEffect, useState } from 'react';
import { intelligenceService } from '../services/intelligence/intelligenceService';
import { useData } from '../services/DataContext';
import { permissionsService } from '../services/auth/permissions';
import type { ExpiryRiskItem, RiskSummary } from '../types/intelligence';

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, itemsData] = await Promise.all([
        intelligenceService.getRiskSummary(activeBranchId),
        intelligenceService.getExpiryRiskItems(activeBranchId),
      ]);

      setSummary(summaryData);
      setItems(itemsData);
    } catch (err) {
      console.error('[useRisk] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load risk data');
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    const canView = permissionsService.can('reports.view_intelligence') || permissionsService.can('reports.view_inventory');
    if (canView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  return {
    summary,
    items,
    loading,
    error,
    refresh: fetchData,
  };
}
