/**
 * useFinancials - Hook for fetching financial intelligence data
 *
 * Provides KPIs and product financials from real sales data
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  type FinancialPeriod,
  intelligenceService,
} from '../../services/intelligence/intelligenceService';
import { useData } from '../../context/DataContext';
import { permissionsService } from '../../services/auth/permissionsService';
import type { FinancialKPIs, ProductFinancialItem, CategoryFinancialItem } from '../../types/intelligence';

interface UseFinancialsResult {
  kpis: FinancialKPIs | null;
  products: ProductFinancialItem[];
  categories: CategoryFinancialItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFinancials(period: FinancialPeriod = 'this_month'): UseFinancialsResult {
  const { activeBranchId } = useData();
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [products, setProducts] = useState<ProductFinancialItem[]>([]);
  const [categories, setCategories] = useState<CategoryFinancialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string | undefined>(undefined);

  const fetchData = useCallback(async (isRefresh = false) => {
    const fetchKey = `${activeBranchId}-${period}`;

    // Prevent duplicate fetches for the same branch and period unless it's a manual refresh
    if (!isRefresh && lastFetchKeyRef.current === fetchKey && (kpis || products.length > 0)) {
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
      const [kpisData, productsData, categoriesData] = await Promise.all([
        intelligenceService.getFinancialKPIs(period, activeBranchId, { signal: controller.signal }),
        intelligenceService.getProductFinancials(period, activeBranchId, { signal: controller.signal }),
        intelligenceService.getCategoryFinancials(period, activeBranchId, { signal: controller.signal }),
      ]);

      if (!controller.signal.aborted) {
        setKpis(kpisData);
        setProducts(productsData);
        setCategories(categoriesData);
        setLoading(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      console.error('[useFinancials] Error fetching data:', err);
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to load financial data');
        setLoading(false);
      }
    }
  }, [period, activeBranchId, kpis, products.length]);

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
    kpis,
    products,
    categories,
    loading,
    error,
    refresh: () => fetchData(true),
  };
}
