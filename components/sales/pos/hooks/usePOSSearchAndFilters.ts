import { useState, useCallback, useMemo } from 'react';
import type { TRANSLATIONS } from '../../../../i18n/translations';
import { type FilterConfig } from '../../../common/FilterPill';
import { TabContextType } from '../../../../hooks/usePOSTabs';

interface UsePOSSearchAndFiltersProps {
  t: typeof TRANSLATIONS.EN.pos;
  activeTab: any; // Type from usePOSTabs
  activeTabId: string;
  updateTab: (id: string, updates: any) => void;
}

export const usePOSSearchAndFilters = ({ t, activeTab, activeTabId, updateTab }: UsePOSSearchAndFiltersProps) => {
  // Use active tab's search query
  const search = activeTab?.searchQuery || '';
  const setSearch = useCallback(
    (query: string | ((prev: string) => string)) => {
      updateTab(activeTabId, (prevTab: any) => {
        const newQuery = typeof query === 'function' ? query(prevTab.searchQuery) : query;
        return { searchQuery: newQuery };
      });
    },
    [activeTabId, updateTab]
  );

  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('in_stock');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<'category' | 'stock' | null>(null);

  // Filter configurations for POS
  const posFilterConfigs = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'category',
        label: t.category,
        icon: 'category',
        options: [
          { id: 'Medicine', label: t.categories?.medicine || 'Medicine' },
          { id: 'Cosmetics', label: t.categories?.cosmetics || 'Cosmetics' },
          { id: 'General', label: t.categories?.general || 'General' },
          { id: 'All', label: t.categories?.all || 'All' },
        ].map((c) => ({ label: c.label, value: c.id })),
        mode: 'single',
        defaultValue: 'All',
      },
      {
        id: 'stock',
        label: t.stock,
        icon: 'inventory_2',
        options: [
          { label: t.allStock || 'All Stock', value: 'all' },
          { label: t.inStock || 'In Stock', value: 'in_stock' },
          { label: t.outOfStock || 'Out of Stock', value: 'out_of_stock' },
        ],
        mode: 'single',
        defaultValue: 'in_stock',
      },
    ],
    [t]
  );

  const posActiveFilters = useMemo(
    () => ({
      category: selectedCategory === 'All' ? [] : [selectedCategory],
      stock: stockFilter === 'in_stock' ? [] : [stockFilter],
    }),
    [selectedCategory, stockFilter]
  );

  const handlePosFilterUpdate = useCallback((groupId: string, newValues: any[]) => {
    if (groupId === 'category') {
      setSelectedCategory(newValues[0] || 'All');
    } else if (groupId === 'stock') {
      setStockFilter(newValues[0] || 'in_stock');
    }
  }, []);

  // Helper to map specific categories to broad groups
  const getBroadCategory = useCallback((category: string): string => {
    const cosmetics = ['Skin Care', 'Personal Care'];
    const general = ['Medical Equipment', 'Medical Supplies', 'Baby Care'];

    if (cosmetics.includes(category)) return 'Cosmetics';
    if (general.includes(category)) return 'General';
    return 'Medicine';
  }, []);

  return {
    search,
    setSearch,
    stockFilter,
    setStockFilter,
    selectedCategory,
    setSelectedCategory,
    activeFilterDropdown,
    setActiveFilterDropdown,
    posFilterConfigs,
    posActiveFilters,
    handlePosFilterUpdate,
    getBroadCategory,
  };
};
