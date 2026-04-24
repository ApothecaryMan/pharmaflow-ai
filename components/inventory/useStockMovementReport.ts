import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useData } from '../../services';
import { useSettings } from '../../context';
import { stockMovementService } from '../../services/inventory/stockMovement/stockMovementService';
import { StockMovement, StockMovementSummary, Drug } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { useSearchKeyboardNavigation } from '../common/SearchDropdown';
import { TRANSLATIONS } from '../../i18n/translations';

interface UseStockMovementReportProps {
  onViewChange: (view: string, params?: any) => void;
}

export const useStockMovementReport = ({ onViewChange }: UseStockMovementReportProps) => {
  const { inventory, isLoading: isDataLoading, activeBranchId } = useData();
  const { language, theme, textTransform } = useSettings();
  const themeColor = theme.primary;
  const t = TRANSLATIONS[language];
  const isRTL = language === 'AR';

  // --- State ---
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: now.toISOString()
    };
  });
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<StockMovementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewType, setViewType] = useState<'summary' | 'timeline'>('summary');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});

  // Track last loaded branch to prevent redundant refreshes
  const lastLoadedBranchId = useRef<string>('');

  // --- Column Configuration ---
  const columns = useMemo(() => [
    { id: 'date', label: isRTL ? 'التاريخ' : 'DATE', width: '12%' },
    { id: 'type', label: isRTL ? 'النوع' : 'TYPE', width: '11%' },
    { id: 'quantity', label: isRTL ? 'الكمية' : 'QUANTITY', width: '14%' },
    { id: 'batch', label: isRTL ? 'التشغيلة / الصلاحية' : 'BATCH / EXPIRY', width: '21%' },
    { id: 'value', label: isRTL ? 'القيمة' : 'VALUE', width: '10%' },
    { id: 'stock', label: isRTL ? 'المخزون' : 'STOCK', width: '10%' },
    { id: 'user', label: isRTL ? 'بواسطة' : 'USER', width: '17%' },
    { id: 'actions', label: '', width: '5%' }
  ], [isRTL]);

  // --- Data Filtering & Processing ---
  const filteredHistory = useMemo(() => {
    return history.filter(m => {
      if (!m.timestamp || typeof m.timestamp !== 'string' || m.timestamp === 'DATE') return false;
      const date = new Date(m.timestamp);
      return !isNaN(date.getTime()) && (m.type as string) !== 'TYPE';
    });
  }, [history]);

  // --- Search Logic ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return inventory.filter(d => {
      if (!d) return false;
      const query = searchQuery.toLowerCase();
      const displayName = getDisplayName(d, textTransform).toLowerCase();
      const nameMatch = d.name?.toLowerCase().includes(query) || displayName.includes(query);
      const arabicMatch = d.nameArabic?.includes(searchQuery);
      const idMatch = d.id?.toLowerCase().includes(query);
      const barcodeMatch = d.barcode?.includes(searchQuery);
      return nameMatch || arabicMatch || idMatch || barcodeMatch;
    }).slice(0, 8);
  }, [searchQuery, inventory, textTransform]);

  const suggestions = useMemo(() => {
    return inventory.map(d => getDisplayName(d, textTransform));
  }, [inventory, textTransform]);

  const handleSelectDrug = (drug: Drug) => {
    setSelectedDrug(drug);
    setSearchQuery(getDisplayName(drug, textTransform));
    setShowSearch(false);
  };

  const { highlightedIndex, onKeyDown } = useSearchKeyboardNavigation({
    results: searchResults,
    onSelect: handleSelectDrug,
    isOpen: showSearch
  });

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!selectedDrug) return;
    setIsLoading(true);
    try {
      const filters = {
        drugId: selectedDrug.id,
        branchId: activeBranchId,
        startDate: dateRange.start,
        endDate: dateRange.end,
        type: activeFilters.type?.[0] as any,
        status: activeFilters.status?.[0] as any,
      };
      
      const moveHistory = await stockMovementService.getHistory(filters) as StockMovement[];
      const moveSummary = await stockMovementService.getSummaryByDrug(selectedDrug.id, filters);
      
      setHistory(moveHistory);
      setSummary(moveSummary);
    } catch (error) {
      console.error('Error fetching stock movement data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDrug, dateRange, activeFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Helpers ---
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const exportCSV = () => {
    if (history.length === 0 || !selectedDrug) return;
    const headers = ["Date", "Type", "Quantity", "Previous", "New", "Reason", "Performed By"];
    const rows = history.map(m => [
      new Date(m.timestamp).toLocaleString(),
      m.type,
      m.quantity,
      m.previousStock,
      m.newStock,
      m.reason || "",
      m.performedByName || m.performedBy
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_movement_${getDisplayName(selectedDrug, textTransform) || 'report'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateFilter = (id: string, vals: any[]) => {
    setActiveFilters(prev => ({ ...prev, [id]: vals }));
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setShowSearch(true);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedDrug(null);
  };

  return {
    // State
    selectedDrug,
    searchQuery,
    showSearch,
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

    // Handlers
    setSelectedDrug,
    setSearchQuery,
    setShowSearch,
    setDateRange,
    setViewType,
    setActiveFilters,
    handleSelectDrug,
    onKeyDown,
    toggleRow,
    exportCSV,
    handleUpdateFilter,
    handleSearchChange,
    handleClearSearch,
  };
};
