/**
 * useFinancials - Hook for fetching financial intelligence data
 *
 * Provides KPIs and product financials from real sales data
 */

import { useCallback, useEffect, useState } from 'react';
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [kpisData, productsData, categoriesData] = await Promise.all([
        intelligenceService.getFinancialKPIs(period, activeBranchId),
        intelligenceService.getProductFinancials(period, activeBranchId),
        intelligenceService.getCategoryFinancials(period, activeBranchId),
      ]);

      setKpis(kpisData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('[useFinancials] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [period, activeBranchId]);

  useEffect(() => {
    const canView = permissionsService.can('reports.view_intelligence') || permissionsService.can('reports.view_financial');
    if (canView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  return {
    kpis,
    products,
    categories,
    loading,
    error,
    refresh: fetchData,
  };
}
