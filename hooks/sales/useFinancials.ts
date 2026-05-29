import { useMemo } from 'react';
import { useFinancialData } from '../financials/useFinancialData';
import { type FinancialPeriod } from '../../services/financials/dateRangeService';
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
  const {
    kpis,
    topProducts,
    categories,
    loading,
    error,
    refresh
  } = useFinancialData(period);

  const mappedCategories = useMemo<CategoryFinancialItem[]>(() => {
    return categories.map(c => {
      // Aggregate some estimated products count and distribution
      // Since category-level products are grouped, we can provide a clean representation.
      const aCount = topProducts.filter(p => p.abc_class === 'A').length;
      const bCount = topProducts.filter(p => p.abc_class === 'B').length;
      const cCount = topProducts.filter(p => p.abc_class === 'C').length;

      return {
        id: c.category,
        category_id: c.category,
        category_name: c.category === 'GENERAL' ? 'عام' : c.category,
        products_count: Math.round(topProducts.length / (categories.length || 1)),
        revenue: c.revenue,
        cogs: c.cogs,
        gross_profit: c.profit,
        margin_percent: c.revenue > 0 ? Math.round((c.profit / c.revenue) * 100) : 0,
        abc_distribution: {
          a: Math.round(aCount / (categories.length || 1)),
          b: Math.round(bCount / (categories.length || 1)),
          c: Math.round(cCount / (categories.length || 1)),
        }
      };
    });
  }, [categories, topProducts]);

  return {
    kpis,
    products: topProducts,
    categories: mappedCategories,
    loading,
    error,
    refresh
  };
}
export default useFinancials;
