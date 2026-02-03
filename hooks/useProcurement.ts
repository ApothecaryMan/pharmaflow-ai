/**
 * useProcurement - Hook for fetching procurement intelligence data
 *
 * Provides procurement summary and items from real inventory/sales data
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { intelligenceService } from '../services/intelligence/intelligenceService';
import type { ProcurementItem, ProcurementSummary } from '../types/intelligence';

interface UseProcurementFilters {
  supplierId?: string;
  categoryId?: string;
}

interface UseProcurementResult {
  summary: ProcurementSummary | null;
  items: ProcurementItem[];
  filteredItems: ProcurementItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  // For filter dropdowns
  suppliers: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export function useProcurement(filters: UseProcurementFilters = {}): UseProcurementResult {
  const [summary, setSummary] = useState<ProcurementSummary | null>(null);
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, itemsData] = await Promise.all([
        intelligenceService.getProcurementSummary(),
        intelligenceService.getProcurementItems(),
      ]);

      setSummary(summaryData);
      setItems(itemsData);
    } catch (err) {
      console.error('[useProcurement] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load procurement data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique suppliers and categories
  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => map.set(item.supplier_id, item.supplier_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => map.set(item.category_id, item.category_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let result = items;

    if (filters.supplierId && filters.supplierId !== 'all') {
      result = result.filter((i) => i.supplier_id === filters.supplierId);
    }

    if (filters.categoryId && filters.categoryId !== 'all') {
      result = result.filter((i) => i.category_id === filters.categoryId);
    }

    return result;
  }, [items, filters.supplierId, filters.categoryId]);

  return {
    summary,
    items,
    filteredItems,
    loading,
    error,
    refresh: fetchData,
    suppliers,
    categories,
  };
}
