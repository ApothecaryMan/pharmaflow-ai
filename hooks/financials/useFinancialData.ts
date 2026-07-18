import { useCallback, useEffect, useRef, useState } from 'react';
import { permissionsService } from '../../services/auth/permissionsService';
import { dateRangeService, type FinancialPeriod } from '../../services/financials/dateRangeService';
import {
  type FinancialSummary,
  financialService,
} from '../../services/financials/financialService';
import { useAuthStore } from '../../stores/authStore';
import type {
  CategoryFinancialReport,
  DailyFinancialData,
  FinancialKPIs,
  ProductFinancialItem,
} from '../../types/intelligence';

interface UseFinancialDataResult {
  summary: FinancialSummary | null;
  kpis: FinancialKPIs | null;
  daily: DailyFinancialData[];
  topProducts: ProductFinancialItem[];
  categories: CategoryFinancialReport[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFinancialData(period: FinancialPeriod = 'this_month'): UseFinancialDataResult {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const branches = useAuthStore((s) => s.branches);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [daily, setDaily] = useState<DailyFinancialData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductFinancialItem[]>([]);
  const [categories, setCategories] = useState<CategoryFinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string | undefined>(undefined);
  const canView =
    permissionsService.can('reports.view_intelligence') ||
    permissionsService.can('reports.view_financial');

  const fetchData = useCallback(
    async (isRefresh = false) => {
      const hasAuthorizedBranch =
        Boolean(activeBranchId) && branches.some((branch) => branch.id === activeBranchId);

      if (isAuthLoading || !hasAuthorizedBranch) {
        setLoading(isAuthLoading);
        return;
      }

      const fetchKey = `${activeBranchId}-${period}`;

      // Prevent duplicate fetches for the same branch and period unless it's a manual refresh
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

      const range = dateRangeService.getDateRange(period);

      try {
        const [summaryData, kpisData, dailyData, topProductsData, categoriesData] =
          await Promise.all([
            financialService.getFinancialSummary(period, activeBranchId),
            financialService.getFinancialKPIs(period, activeBranchId),
            financialService.getDailyBreakdown(range.start, range.end, activeBranchId),
            financialService.getTopProducts(period, activeBranchId, 10),
            financialService.getCategoryBreakdown(period, activeBranchId),
          ]);

        if (!controller.signal.aborted) {
          setSummary(summaryData);
          setKpis(kpisData);
          setDaily(dailyData);
          setTopProducts(topProductsData);
          setCategories(categoriesData);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        console.error('[useFinancialData] Error fetching data:', err);
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load financial data');
          setLoading(false);
        }
      }
    },
    [period, activeBranchId, branches, isAuthLoading]
  );

  useEffect(() => {
    if (canView && !isAuthLoading && activeBranchId) {
      fetchData();
    } else if (!isAuthLoading) {
      setLoading(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      lastFetchKeyRef.current = undefined;
    };
  }, [fetchData, canView, isAuthLoading, activeBranchId]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    summary,
    kpis,
    daily,
    topProducts,
    categories,
    loading,
    error,
    refresh,
  };
}
