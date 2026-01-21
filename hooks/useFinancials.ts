/**
 * useFinancials - Hook for fetching financial intelligence data
 * 
 * Provides KPIs and product financials from real sales data
 */

import { useState, useEffect, useCallback } from 'react';
import { FinancialKPIs, ProductFinancialItem } from '../types/intelligence';
import { intelligenceService, FinancialPeriod } from '../services/intelligence/intelligenceService';

interface UseFinancialsResult {
  kpis: FinancialKPIs | null;
  products: ProductFinancialItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFinancials(period: FinancialPeriod = 'this_month'): UseFinancialsResult {
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [products, setProducts] = useState<ProductFinancialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [kpisData, productsData] = await Promise.all([
        intelligenceService.getFinancialKPIs(period),
        intelligenceService.getProductFinancials(period)
      ]);
      
      setKpis(kpisData);
      setProducts(productsData);
    } catch (err) {
      console.error('[useFinancials] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    kpis,
    products,
    loading,
    error,
    refresh: fetchData
  };
}
