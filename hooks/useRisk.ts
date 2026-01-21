/**
 * useRisk - Hook for fetching risk/expiry intelligence data
 * 
 * Provides risk summary and expiring batch items from real data
 */

import { useState, useEffect, useCallback } from 'react';
import { RiskSummary, ExpiryRiskItem } from '../types/intelligence';
import { intelligenceService } from '../services/intelligence/intelligenceService';

interface UseRiskResult {
  summary: RiskSummary | null;
  items: ExpiryRiskItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRisk(): UseRiskResult {
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [items, setItems] = useState<ExpiryRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [summaryData, itemsData] = await Promise.all([
        intelligenceService.getRiskSummary(),
        intelligenceService.getExpiryRiskItems()
      ]);
      
      setSummary(summaryData);
      setItems(itemsData);
    } catch (err) {
      console.error('[useRisk] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load risk data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    summary,
    items,
    loading,
    error,
    refresh: fetchData
  };
}
