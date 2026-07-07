import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StorageKeys } from '../../config/storageKeys';
import { useAlert } from '../../context';
import { useAuthStore } from '../../stores/authStore';
import { intelligenceService } from '../../services/intelligence/intelligenceService';
import type { ViewState } from '../../types';
import type { ProcurementItem } from '../../types/intelligence';
import type { Drug } from '../../types/inventory';
import { getDisplayName } from '../../utils/drugDisplayName';
import { money } from '../../utils/money';
import { storage } from '../../utils/storage';
import { CARD_BASE } from '../../utils/themeStyles';
import { SearchEngineInput } from '../common/SearchEngineInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { TanStackTable } from '../common/TanStackTable';
import { useInventoryHeader } from './InventoryHeaderContext';

interface ShortagesPageProps {
  t: Record<string, string>; // Mapped to t.shortages
  language: 'AR' | 'EN';
  inventory: Drug[];
  onViewChange?: (view: ViewState, params?: Record<string, unknown>) => void;
  navigationParams?: Record<string, unknown>;
}

interface EnrichedShortageItem {
  id: string; // Satisfy TanStackTable id requirement
  drug: Drug;
  pItem?: ProcurementItem;
  stock: number;
  minStock: number;
  avgDailySales: number;
  stockDays: number | null;
  alertType:
    | 'OUT_OF_STOCK_SOLD'
    | 'MANUAL_MINIMUM_REACHED'
    | 'PREDICTIVE_SHORTAGE'
    | 'OUT_OF_STOCK_DEFAULT'
    | 'NORMAL';
  suggestedQty: number;
  weeklyLostSales: number;
  abcClass: 'A' | 'B' | 'C';
}

type FilterAlertType =
  | 'ALL'
  | 'OUT_OF_STOCK_SOLD'
  | 'MANUAL_MINIMUM_REACHED'
  | 'PREDICTIVE_SHORTAGE'
  | 'OUT_OF_STOCK_DEFAULT';

export const ShortagesPage: React.FC<ShortagesPageProps> = ({
  t,
  language = 'AR',
  inventory = [],
  onViewChange,
  navigationParams: _navigationParams,
}) => {
  const isAR = language === 'AR';
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const { success, warning } = useAlert();

  // Async states for loading live intelligence calculations
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
  const [loadingProcurement, setLoadingProcurement] = useState<boolean>(true);

  // Filter and selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleRows, setVisibleRows] = useState<EnrichedShortageItem[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Auto-disable focus mode if no items are selected
  useEffect(() => {
    if (selectedIds.size === 0) {
      setIsFocusMode(false);
    }
  }, [selectedIds.size]);

  const { setLeftContent, setRightContent, setBottomContent, setShowStatsToggle } =
    useInventoryHeader();

  // Fetch live daily sales velocities and AI predicted reorders from intelligence service
  useEffect(() => {
    let isMounted = true;
    const fetchProcurementData = async () => {
      try {
        setLoadingProcurement(true);
        const data = await intelligenceService.getProcurementItems(activeBranchId);
        if (isMounted) {
          setProcurementItems(data);
        }
      } catch (err) {
        console.error('Failed to load procurement intelligence items:', err);
      } finally {
        if (isMounted) {
          setLoadingProcurement(false);
        }
      }
    };
    fetchProcurementData();
    return () => {
      isMounted = false;
    };
  }, [activeBranchId]);

  // Combine drug inventory data with sales velocities and AI predicted remaining days
  const enrichedData = useMemo((): EnrichedShortageItem[] => {
    const procMap = new Map<string, ProcurementItem>(
      procurementItems.map((item) => [item.product_id, item])
    );

    return inventory.map((drug): EnrichedShortageItem => {
      const pItem = procMap.get(drug.id);
      const stock = drug.stock ?? 0;
      const minStock = drug.minStock ?? 0;

      // 1. Calculate sales velocity and remaining stock days
      const avgDailySales = pItem?.avg_daily_sales ?? 0;
      const stockDays = pItem?.stock_days ?? (avgDailySales > 0 ? stock / avgDailySales : null);

      // 2. Classify the item based on our 4 shortages taxonomies:
      // - OUT_OF_STOCK_SOLD (stock === 0, velocity > 0)
      // - MANUAL_MINIMUM_REACHED (stock > 0, stock <= minStock)
      // - PREDICTIVE_SHORTAGE (stock > 0, stock_days < 14)
      // - OUT_OF_STOCK_DEFAULT (stock === 0, velocity === 0)
      let alertType: EnrichedShortageItem['alertType'] = 'NORMAL';
      const unitsPerPack = drug.unitsPerPack || 1;

      if (stock === 0) {
        if (avgDailySales > 0) {
          alertType = 'OUT_OF_STOCK_SOLD';
        } else {
          alertType = 'OUT_OF_STOCK_DEFAULT';
        }
      } else if (minStock > 0 && stock <= minStock * unitsPerPack) {
        alertType = 'MANUAL_MINIMUM_REACHED';
      } else if (stockDays !== null && stockDays < 14) {
        alertType = 'PREDICTIVE_SHORTAGE';
      }

      // Calculate estimated weekly lost sales if out of stock
      // weekly_lost_sales = avgDailySales * 7 * costPrice
      const weeklyLostPacks = (avgDailySales / unitsPerPack) * 7;
      const weeklyLostSales =
        stock === 0
          ? money.multiply(drug.costPrice ?? 0, Math.round(weeklyLostPacks * 10000), 4)
          : 0;

      // Suggested qty: use the procurement one if available, otherwise safety stock calculation
      const safetyStockPacks =
        avgDailySales > 0
          ? Math.max(0, Math.ceil((14 * avgDailySales * 1.5 - stock) / unitsPerPack))
          : 0;
      const minStockReplenishPacks =
        stock <= minStock * unitsPerPack && minStock > 0
          ? Math.max(0, minStock - Math.floor(stock / unitsPerPack))
          : 0;
      const suggestedQty =
        pItem?.suggested_order_qty ?? Math.max(safetyStockPacks, minStockReplenishPacks);

      return {
        id: drug.id,
        drug,
        pItem,
        stock,
        minStock,
        avgDailySales,
        stockDays,
        alertType,
        suggestedQty,
        weeklyLostSales,
        abcClass: pItem?.abc_class ?? 'C',
      };
    });
  }, [inventory, procurementItems]);

  // Extract list of all unique categories present in the branch
  const categories = useMemo(() => {
    const list = new Set<string>();
    inventory.forEach((drug) => {
      if (drug.category) {
        list.add(drug.category);
      }
    });
    return Array.from(list).sort();
  }, [inventory]);

  const filterConfigs = useMemo(
    () => [
      {
        id: 'category',
        label: t.filterCategory || (isAR ? 'التصنيف' : 'Category'),
        icon: 'category',
        mode: 'single' as const,
        defaultValue: 'ALL',
        options: [
          { value: 'ALL', label: t.filterCategory || (isAR ? 'الكل' : 'ALL') },
          ...categories.map((cat) => ({ value: cat, label: cat })),
        ],
      },
      {
        id: 'alertType',
        label: t.filterAlert || (isAR ? 'نوع التنبيه' : 'Alert Type'),
        icon: 'warning',
        mode: 'single' as const,
        defaultValue: 'ALL',
        options: [
          { value: 'ALL', label: t.filterAlert || (isAR ? 'الكل' : 'ALL') },
          { value: 'OUT_OF_STOCK_SOLD', label: t.statusOutOfStockSold },
          { value: 'MANUAL_MINIMUM_REACHED', label: t.statusManualMinimumReached },
          { value: 'PREDICTIVE_SHORTAGE', label: t.statusPredictiveShortage },
          { value: 'OUT_OF_STOCK_DEFAULT', label: t.statusOutOfStockDefault },
        ],
      },
    ],
    [categories, t, isAR]
  );

  const handleUpdateFilter = useCallback((groupId: string, newValues: any[]) => {
    setActiveFilters((prev) => ({
      ...prev,
      [groupId]: newValues,
    }));
  }, []);

  // Filter list to only contain products that are classified as shortages/alerts
  const shortagesData = useMemo(() => {
    return enrichedData.filter((item) => item.alertType !== 'NORMAL');
  }, [enrichedData]);

  // Dynamic counts for KPI Cards
  const stats = useMemo(() => {
    let outOfStockCount = 0;
    let predictiveCount = 0;
    let manualMinCount = 0;
    let totalLostWeeklySales = 0;

    shortagesData.forEach((item) => {
      if (item.alertType === 'OUT_OF_STOCK_SOLD' || item.alertType === 'OUT_OF_STOCK_DEFAULT') {
        outOfStockCount++;
        totalLostWeeklySales = money.add(totalLostWeeklySales, item.weeklyLostSales);
      } else if (item.alertType === 'PREDICTIVE_SHORTAGE') {
        predictiveCount++;
      } else if (item.alertType === 'MANUAL_MINIMUM_REACHED') {
        manualMinCount++;
      }
    });

    return {
      total: shortagesData.length,
      outOfStock: outOfStockCount,
      predictive: predictiveCount,
      manualMin: manualMinCount,
      lostSales: totalLostWeeklySales,
    };
  }, [shortagesData]);

  // Perform search and filter combinations on client side
  const filteredData = useMemo(() => {
    const selectedCategoryFilter = activeFilters.category?.[0] || 'ALL';
    const selectedAlertFilter = activeFilters.alertType?.[0] || 'ALL';

    return shortagesData.filter((item) => {
      // 0. Focus mode filter (must be one of the selected IDs)
      if (isFocusMode && !selectedIds.has(item.drug.id)) {
        return false;
      }

      // 1. Alert Type filter
      if (selectedAlertFilter !== 'ALL' && item.alertType !== selectedAlertFilter) {
        return false;
      }

      // 2. Category filter
      if (selectedCategoryFilter !== 'ALL' && item.drug.category !== selectedCategoryFilter) {
        return false;
      }

      // 3. Text Search (name, genericName, barcode)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const brandName = getDisplayName(item.drug).toLowerCase();
        const genericNames = (item.drug.genericName || []).map((g) => g.toLowerCase());
        const barcode = (item.drug.barcode || '').toLowerCase();
        const internalCode = (item.drug.internalCode || '').toLowerCase();

        const matchesBrand = brandName.includes(query);
        const matchesGeneric = genericNames.some((g) => g.includes(query));
        const matchesCode = barcode.includes(query) || internalCode.includes(query);

        return matchesBrand || matchesGeneric || matchesCode;
      }

      return true;
    });
  }, [shortagesData, activeFilters, searchTerm, isFocusMode, selectedIds]);

  // Toggle selection for a single row
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle selection for all currently visible rows in the table
  const handleSelectAll = useCallback((rows: EnrichedShortageItem[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = rows.length > 0 && rows.every((row) => prev.has(row.drug.id));
      rows.forEach((row) => {
        if (allSelected) {
          next.delete(row.drug.id);
        } else {
          next.add(row.drug.id);
        }
      });
      return next;
    });
  }, []);

  // Select all filtered items across all pages
  const handleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredData.forEach((row) => {
        next.add(row.drug.id);
      });
      return next;
    });
  }, [filteredData]);

  // Clear all selections
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Export selected shortages (or all shortages if none selected) to CSV with UTF-8 BOM
  const handleExportCSV = useCallback(() => {
    const itemsToExport =
      selectedIds.size > 0
        ? shortagesData.filter((item) => selectedIds.has(item.drug.id))
        : shortagesData;

    if (itemsToExport.length === 0) {
      warning(t.warningNoDataToExportTitle, t.warningNoDataToExportDesc);
      return;
    }

    const csvHeaders = [
      t.csvHeaderProduct,
      t.csvHeaderGeneric,
      t.csvHeaderCategory,
      t.tableStock,
      t.tableMinStock,
      t.tableVelocity,
      t.tableStockDays,
      t.tableAbcClass,
      t.tableAlertStatus,
      t.tableSuggestedQty,
    ];

    const getAlertStatusText = (alertType: string) => {
      switch (alertType) {
        case 'OUT_OF_STOCK_SOLD':
          return t.statusOutOfStockSold;
        case 'MANUAL_MINIMUM_REACHED':
          return t.statusManualMinimumReached;
        case 'PREDICTIVE_SHORTAGE':
          return t.statusPredictiveShortage;
        case 'OUT_OF_STOCK_DEFAULT':
          return t.statusOutOfStockDefault;
        default:
          return t.statusNormal;
      }
    };

    const csvRows = itemsToExport.map((item) => {
      const prodName = getDisplayName(item.drug);
      const genName = Array.isArray(item.drug.genericName)
        ? item.drug.genericName.join(' + ')
        : item.drug.genericName || '';
      const cat = item.drug.category || t.generalCategory;
      const stock = item.stock;
      const min = item.minStock || 0;
      const velocity = item.avgDailySales.toFixed(2);
      const days = item.stockDays === null ? 'Infinity' : item.stockDays;
      const abc = item.abcClass;
      const statusText = getAlertStatusText(item.alertType);
      const sugQty = item.suggestedQty;

      return [
        `"${prodName.replace(/"/g, '""')}"`,
        `"${genName.replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
        stock,
        min,
        velocity,
        days,
        abc,
        `"${statusText}"`,
        sugQty,
      ];
    });

    const csvContent = [csvHeaders.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `${t.exportCsvFilename || 'shortages_report'}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success(t.exportSuccess, t.exportSuccessDesc.replace('{count}', String(itemsToExport.length)));
  }, [selectedIds, shortagesData, warning, success, t]);

  // Define Table Columns inline to gain close access to selection states
  const columns = useMemo((): ColumnDef<EnrichedShortageItem>[] => {
    const isAllSelected =
      visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.drug.id));
    const isSomeSelected =
      visibleRows.some((row) => selectedIds.has(row.drug.id)) && !isAllSelected;

    return [
      {
        id: 'select',
        size: 40,
        header: () => (
          <div className='flex items-center justify-center'>
            <input
              type='checkbox'
              className='rounded border-zinc-300 dark:border-zinc-700 text-primary-600 focus:ring-primary-500 h-4.5 w-4.5 cursor-pointer bg-white dark:bg-zinc-900'
              ref={(input) => {
                if (input) {
                  input.indeterminate = isSomeSelected;
                }
              }}
              checked={isAllSelected}
              onChange={() => handleSelectAll(visibleRows)}
            />
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className='flex items-center justify-center'>
              <input
                type='checkbox'
                className='rounded border-zinc-300 dark:border-zinc-700 text-primary-600 focus:ring-primary-500 h-4.5 w-4.5 cursor-pointer bg-white dark:bg-zinc-900'
                checked={selectedIds.has(item.drug.id)}
                onChange={() => handleToggleSelect(item.drug.id)}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: {
          width: 40,
          align: 'center',
        },
      },
      {
        id: 'Name',
        size: 320,
        header: t.tableProduct,
        accessorFn: (row) => getDisplayName(row.drug),
        cell: ({ row }) => {
          const item = row.original;
          const prodName = getDisplayName(item.drug);

          return (
            <div className='flex flex-col gap-1 py-1 w-[320px] max-w-[320px]'>
              <span
                className='font-bold text-gray-900 dark:text-white text-sm tracking-tight leading-snug truncate'
                title={prodName}
              >
                {prodName}
              </span>
            </div>
          );
        },
        meta: {
          flex: false,
          width: 320,
          align: 'start',
        },
      },
      {
        id: 'alert_status',
        header: t.tableAlertStatus,
        accessorKey: 'alertType',
        cell: ({ row }) => {
          const item = row.original;
          let badgeClass = '';
          let icon = '';
          let label = '';

          switch (item.alertType) {
            case 'OUT_OF_STOCK_SOLD':
              badgeClass = 'badge-danger';
              icon = 'dangerous';
              label = t.statusOutOfStockSold;
              break;
            case 'MANUAL_MINIMUM_REACHED':
              badgeClass = 'badge-warning';
              icon = 'low_priority';
              label = t.statusManualMinimumReached;
              break;
            case 'PREDICTIVE_SHORTAGE':
              badgeClass = 'badge-purple';
              icon = 'psychology';
              label = t.statusPredictiveShortage;
              break;
            case 'OUT_OF_STOCK_DEFAULT':
              badgeClass = 'badge-neutral';
              icon = 'block';
              label = t.statusOutOfStockDefault;
              break;
            default:
              badgeClass = 'badge-success';
              icon = 'check_circle';
              label = t.statusNormal;
          }

          return (
            <span className={`${badgeClass} gap-1.5`}>
              <span className='material-symbols-rounded'>{icon}</span>
              {label}
            </span>
          );
        },
        meta: {
          align: 'center',
        },
      },
      {
        id: 'stock',
        header: t.tableStock,
        accessorKey: 'stock',
        cell: ({ row }) => {
          const item = row.original;
          const isOutOfStock = item.stock === 0;
          const unitsPerPack = item.drug.unitsPerPack || 1;
          const packs = Math.floor(item.stock / unitsPerPack);
          const remainingUnits = item.stock % unitsPerPack;

          return (
            <div className='flex flex-col items-center'>
              <span
                className={`text-sm font-black tabular-nums ${
                  isOutOfStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                }`}
              >
                {packs}
              </span>
              {remainingUnits > 0 && (
                <span className='text-[10px] text-gray-400'>
                  +{remainingUnits} {t.units}
                </span>
              )}
            </div>
          );
        },
        meta: {
          align: 'center',
        },
      },
      {
        id: 'min_stock',
        header: t.tableMinStock,
        accessorKey: 'minStock',
        cell: ({ row }) => {
          const item = row.original;
          const minPacks = Math.floor(item.minStock / (item.drug.unitsPerPack || 1));
          return (
            <span className='text-sm font-bold tabular-nums text-gray-600 dark:text-zinc-400'>
              {minPacks > 0 ? minPacks : '-'}
            </span>
          );
        },
        meta: {
          align: 'center',
        },
      },
      {
        id: 'velocity',
        header: t.tableVelocity,
        accessorKey: 'avgDailySales',
        cell: ({ row }) => {
          const item = row.original;
          const velocityPacks = item.avgDailySales / (item.drug.unitsPerPack || 1);
          return (
            <span className='text-sm font-bold tabular-nums text-gray-800 dark:text-zinc-300'>
              {velocityPacks.toFixed(1)}
            </span>
          );
        },
        meta: {
          align: 'center',
        },
      },
      {
        id: 'days_left',
        header: t.tableStockDays,
        accessorKey: 'stockDays',
        cell: ({ row }) => {
          const item = row.original;
          if (item.stockDays === null || item.stockDays === undefined) {
            return (
              <span className='text-base font-bold text-emerald-600 dark:text-emerald-400 select-none'>
                ∞
              </span>
            );
          }

          let colorClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
          if (item.stockDays < 7) {
            colorClass = 'text-red-600 dark:text-red-400 font-black';
          } else if (item.stockDays < 14) {
            colorClass = 'text-amber-600 dark:text-amber-400 font-bold';
          }

          return <span className={`text-sm tabular-nums ${colorClass}`}>{item.stockDays}</span>;
        },
        meta: {
          align: 'center',
        },
      },
      {
        id: 'abc_class',
        header: t.tableAbcClass,
        accessorKey: 'abcClass',
        cell: ({ row }) => {
          const item = row.original;
          let badgeClass = '';

          switch (item.abcClass) {
            case 'A':
              badgeClass = 'badge-purple';
              break;
            case 'B':
              badgeClass = 'badge-blue';
              break;
            case 'C':
              badgeClass = 'badge-neutral';
              break;
          }

          return (
            <span className={`${badgeClass} w-7 h-7 rounded-full p-0`} title={t.abcDescription}>
              {item.abcClass}
            </span>
          );
        },
        meta: {
          align: 'center',
        },
      },
      {
        id: 'suggested_qty',
        header: t.tableSuggestedQty,
        accessorKey: 'suggestedQty',
        cell: ({ row }) => {
          const item = row.original;
          const suggestedPacks = item.suggestedQty;
          return (
            <span
              className='text-sm font-black text-gray-900 dark:text-white tabular-nums'
              title={t.suggestedOrderTooltip}
            >
              {suggestedPacks}
            </span>
          );
        },
        meta: {
          align: 'center',
        },
      },
    ];
  }, [visibleRows, selectedIds, t, handleSelectAll, handleToggleSelect]);

  useEffect(() => {
    setLeftContent(
      <div className='relative flex-1 max-w-xl'>
        <SearchEngineInput
          value={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder={t.searchPlaceholder}
          onClear={() => setSearchTerm('')}
          color='primary'
          filterConfigs={filterConfigs}
          activeFilters={activeFilters}
          onUpdateFilter={handleUpdateFilter}
        />
      </div>
    );

    setRightContent(
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={handleExportCSV}
          className='flex items-center justify-center p-2 bg-black text-white dark:bg-white dark:text-black border border-zinc-950 dark:border-zinc-100 rounded-xl cursor-pointer'
          title={t.exportButtonLabel}
        >
          <span className='material-symbols-rounded text-lg'>download</span>
        </button>
      </div>
    );

    setShowStatsToggle(true);

    setBottomContent(
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 w-full'>
        <SmallCard
          title={t.statsTotal}
          value={stats.total}
          icon='inventory_2'
          iconColor='zinc'
          isLoading={loadingProcurement}
        />
        <SmallCard
          title={t.statsCritical}
          value={stats.outOfStock}
          icon='dangerous'
          iconColor='red'
          subValue={
            stats.lostSales > 0
              ? `-${Math.round(stats.lostSales)} EGP / ${t.weekAbbreviation}`
              : undefined
          }
          isLoading={loadingProcurement}
        />
        <SmallCard
          title={t.statusManualMinimumReached}
          value={stats.manualMin}
          icon='low_priority'
          iconColor='amber'
          isLoading={loadingProcurement}
        />
        <SmallCard
          title={t.statsPredictive}
          value={stats.predictive}
          icon='psychology'
          iconColor='purple'
          isLoading={loadingProcurement}
        />
      </div>
    );

    return () => {
      setLeftContent(null);
      setRightContent(null);
      setBottomContent(null);
      setShowStatsToggle(false);
    };
  }, [
    searchTerm,
    t,
    filterConfigs,
    activeFilters,
    handleUpdateFilter,
    handleExportCSV,
    stats,
    loadingProcurement,
    setLeftContent,
    setRightContent,
    setBottomContent,
    setShowStatsToggle,
  ]);

  return (
    <div
      className='h-full flex flex-col bg-(--bg-page-surface) selection:bg-primary-100 dark:selection:bg-primary-900/30'
      dir={isAR ? 'rtl' : 'ltr'}
    >
      {/* Main Content Area */}
      <div className='flex-1 px-page overflow-hidden flex flex-col'>
        <div className={`${CARD_BASE} rounded-3xl flex-1 overflow-hidden flex flex-col p-0`}>
          <div className='flex-1 overflow-hidden flex flex-col relative'>
            <TanStackTable
              data={filteredData}
              columns={columns}
              tableId='shortages-alerts-table'
              dense
              lite
              enablePagination={true}
              enableVirtualization={true}
              pageSize='auto'
              enableShowAll={true}
              onVisibleRowsChange={setVisibleRows}
              isLoading={loadingProcurement}
              customEmptyState={
                <div className='flex flex-col items-center justify-center py-24 text-center'>
                  <span className='material-symbols-rounded text-6xl text-zinc-300 dark:text-zinc-700 mb-4 block select-none'>
                    check_circle
                  </span>
                  <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>
                    {t.allGoodText}
                  </h3>
                  <p className='text-sm font-medium text-gray-400 dark:text-zinc-500 max-w-md'>
                    {t.noShortagesFound}
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* Floaty Action Dock Bar showing at the bottom when items are selected */}
      {selectedIds.size > 0 && (
        <div
          dir='ltr'
          className='fixed bottom-22 inset-x-0 mx-auto w-fit z-50 bg-zinc-900/95 dark:bg-zinc-950/95 text-white pl-2 py-2 pr-3.5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300 select-none'
        >
          {/* Quick Export selection (always on the left) */}
          <button
            type='button'
            onClick={handleExportCSV}
            className='flex items-center justify-center w-10 h-10 bg-white text-zinc-900 hover:bg-zinc-100 border border-zinc-200 rounded-xl cursor-pointer'
            title={t.exportSelectedButtonLabel}
          >
            <span className='material-symbols-rounded font-bold' style={{ fontSize: '20px' }}>
              download
            </span>
          </button>

          {/* Selection text and cancel close action */}
          <div className='flex items-center gap-3' dir={isAR ? 'rtl' : 'ltr'}>
            <div className='flex items-center gap-1.5'>
              <span className='text-lg font-black text-white tabular-nums leading-none'>
                {selectedIds.size}
              </span>
              <span className='text-xs font-medium text-zinc-400 whitespace-nowrap'>
                {t.itemsSelectedText.replace('{count}', '').trim()}
              </span>
            </div>

            {/* Focus Mode Toggle Button */}
            <button
              type='button'
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`transition-colors p-1 rounded-lg cursor-pointer flex items-center justify-center ${
                isFocusMode
                  ? 'text-primary-400 bg-primary-950/40 hover:bg-primary-950/60 hover:text-primary-300'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title={t.focusModeToggle}
            >
              <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                {isFocusMode ? 'visibility' : 'visibility_off'}
              </span>
            </button>

            <button
              onClick={handleClearSelection}
              className='text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800/60 rounded-lg cursor-pointer flex items-center justify-center'
              title={t.clearSelection}
            >
              <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                close
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortagesPage;
