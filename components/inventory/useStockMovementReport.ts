import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../context';
import { useInventory } from '../../hooks/queries/useInventoryQuery';
import { TRANSLATIONS } from '../../i18n/translations';
import { stockMovementService } from '../../services/inventory/stockMovement/stockMovementService';
import { DrugSearchEngine } from '../../services/search/drugSearchService';
import { useAuthStore } from '../../stores/authStore';
import type { Drug, StockMovement, StockMovementFilters, StockMovementSummary } from '../../types';
import { getFullDisplayName } from '../../utils/drugDisplayName';
import { useSearchKeyboardNavigation } from '../common/SearchDropdown';

interface UseStockMovementReportProps {
  onViewChange: (view: string, params?: any) => void;
}

export const useStockMovementReport = ({
  onViewChange: _onViewChange,
}: UseStockMovementReportProps) => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isDataLoading = useAuthStore((s) => s.isLoading);
  const { data: inventory = [] } = useInventory(activeBranchId);
  const { language, theme, textTransform } = useSettings();
  const themeColor = theme.primary;
  const t = TRANSLATIONS[language];
  const isRTL = language === 'AR';

  // --- State ---
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  });
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<StockMovementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewType, setViewType] = useState<'summary' | 'timeline'>('summary');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});

  // Track last loaded branch to prevent redundant refreshes
  const _lastLoadedBranchId = useRef<string>('');

  // --- Column Configuration ---
  const columns = useMemo(() => {
    const cols = [
      { id: 'date', label: isRTL ? 'التاريخ' : 'DATE', width: showAll ? '10%' : '12%' },
    ];

    if (showAll) {
      cols.push({ id: 'drug', label: isRTL ? 'الصنف' : 'PRODUCT', width: '20%' });
    }

    cols.push(
      { id: 'type', label: isRTL ? 'النوع' : 'TYPE', width: '11%' },
      { id: 'quantity', label: isRTL ? 'الكمية' : 'QUANTITY', width: '14%' },
      { id: 'batch', label: isRTL ? 'الصلاحية' : 'EXPIRY', width: showAll ? '15%' : '21%' },
      { id: 'value', label: isRTL ? 'القيمة' : 'VALUE', width: '10%' },
      { id: 'stock', label: isRTL ? 'المخزون' : 'STOCK', width: '10%' },
      { id: 'user', label: isRTL ? 'بواسطة' : 'USER', width: '17%' },
      { id: 'actions', label: '', width: '5%' }
    );

    return cols;
  }, [isRTL, showAll]);

  // --- Data Filtering & Processing ---
  const filteredHistory = useMemo(() => {
    return history.filter((m) => {
      if (!m.timestamp || typeof m.timestamp !== 'string' || m.timestamp === 'DATE') return false;
      const date = new Date(m.timestamp);
      return !Number.isNaN(date.getTime()) && (m.type as string) !== 'TYPE';
    });
  }, [history]);

  // --- Search Logic ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const engine = new DrugSearchEngine(inventory);
    return engine.search(searchQuery).slice(0, 8);
  }, [searchQuery, inventory]);

  const suggestions = useMemo(() => {
    return inventory.map((d) => getFullDisplayName(d, textTransform));
  }, [inventory, textTransform]);

  const handleSelectDrug = useCallback(
    (drug: Drug) => {
      setSelectedDrug(drug);
      setSearchQuery(getFullDisplayName(drug, textTransform));
      setShowSearch(false);
    },
    [textTransform]
  );

  const { highlightedIndex, onKeyDown } = useSearchKeyboardNavigation({
    results: searchResults,
    onSelect: handleSelectDrug,
    isOpen: showSearch,
  });

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    // If neither drug is selected nor showAll is active, we don't fetch
    if (!selectedDrug && !showAll) return;

    setIsLoading(true);
    try {
      const filters: StockMovementFilters = {
        branchId: activeBranchId,
        startDate: dateRange.start,
        endDate: dateRange.end,
        type: activeFilters.type?.[0] as any,
        status: activeFilters.status?.[0] as any,
      };

      // Only add drugId if we are not in "Show All" (All Products) mode
      if (!showAll && selectedDrug) {
        filters.drugId = selectedDrug.id;
      }

      const moveHistory = (await stockMovementService.getHistory(filters)) as StockMovement[];

      // Only fetch summary if a specific drug is selected
      let moveSummary = null;
      if (selectedDrug) {
        moveSummary = await stockMovementService.getSummaryByDrug(selectedDrug.id, filters);
      }

      setHistory(moveHistory);
      setSummary(moveSummary);
    } catch (error) {
      console.error('Error fetching stock movement data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDrug, dateRange, showAll, activeFilters, activeBranchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Helpers ---
  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exportCSV = useCallback(() => {
    if (history.length === 0 || !selectedDrug) return;
    const headers = ['Date', 'Type', 'Quantity', 'Previous', 'New', 'Reason', 'Performed By'];
    const rows = history.map((m) => [
      new Date(m.timestamp).toLocaleString(),
      m.type,
      m.quantity,
      m.previousStock,
      m.newStock,
      m.reason || '',
      m.performedByName || m.performedBy,
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `stock_movement_${getFullDisplayName(selectedDrug, textTransform) || 'report'}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [history, selectedDrug, textTransform]);

  const handleUpdateFilter = useCallback((id: string, vals: any[]) => {
    setActiveFilters((prev) => ({ ...prev, [id]: vals }));
  }, []);

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    setShowSearch(true);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedDrug(null);
  }, []);

  // Toggle between showing all history or date-filtered history
  const toggleShowAll = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  // When date range changes manually, exit showAll mode
  const handleSetDateRange = useCallback(
    (updater: React.SetStateAction<{ start: string; end: string }>) => {
      setShowAll(false);
      setDateRange(updater);
    },
    []
  );

    const inventoryMap = useMemo(() => {
      return new Map(inventory.map((d) => [d.id, d]));
    }, [inventory]);

    return {
      // State
      selectedDrug,
      searchQuery,
      showSearch,
      showAll,
      dateRange,
      history,
      summary,
      isLoading,
      isDataLoading,
      viewType,
      expandedRows,
      activeFilters,
      filteredHistory,
      searchResults,
      suggestions,
      highlightedIndex,
      columns,
      isRTL,
      t,
      themeColor,
      textTransform,
      inventoryMap,

    // Handlers
    setSelectedDrug,
    setSearchQuery,
    setShowSearch,
    setDateRange: handleSetDateRange,
    setViewType,
    setActiveFilters,
    handleSelectDrug,
    onKeyDown,
    toggleRow,
    exportCSV,
    handleUpdateFilter,
    handleSearchChange,
    handleClearSearch,
    toggleShowAll,
  };
};
