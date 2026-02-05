/**
 * TanStackTable Component Design & Usage Guidelines
 * =================================================
 *
 * 1. Usage:
 *    - Prefer this component over legacy `DataTable`.
 *    - Use `accessorKey` for columns to strictly type-check against data.
 *    - Search/Filtering: Delegate to this component via `globalFilter` prop rather than pre-filtering data.
 *    - Sorting: Handled internally. Do not implement manual sort logic in parent.
 *
 * 2. Styling Standards ("The Perfect Way"):
 *    - Badges/Status Indicators:
 *      - Container: `inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border bg-transparent`.
 *      - Typography: `text-xs font-bold uppercase tracking-wider`.
 *      - Icons: Always include a `material-symbols-rounded` icon (size `text-sm`).
 *      - Example: `<span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider bg-transparent"><span className="material-symbols-rounded text-sm">check_circle</span>APPROVED</span>`
 *
 * 3. Internationalization (i18n):
 *    - Headers: Pass translated strings (e.g., `t.headers.name`), NOT translation keys.
 *    - Direction: Use `meta: { dir: 'ltr' | 'rtl' }` for specific column alignment requirements.
 */

import {
  type ColumnDef,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowData,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import React, { useRef, useState } from 'react';
import { storage } from '../../utils/storage';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'start' | 'center' | 'end';
    width?: number;
    minWidth?: number;
    flex?: boolean;
    dir?: 'ltr' | 'rtl';
    disableAlignment?: boolean;
    smartDate?: boolean;
    hideFromSettings?: boolean;
  }
}

import { useSettings } from '../../context/SettingsContext';
import { useLongPress } from '../../hooks/useLongPress';
import { TRANSLATIONS } from '../../i18n/translations';
import { formatCurrencyParts } from '../../utils/currency';
import {
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  useContextMenu,
} from './ContextMenu';
import type { FilterConfig } from './FilterPill';
import { SearchInput } from './SearchInput';
import {
  AlignButton,
  getHeaderJustifyClass,
  getItemsAlignClass,
  getTextAlignClass,
} from './TableAlignment';

export const PriceDisplay: React.FC<{
  value: number;
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
}> = ({ value, size = 'base' }) => {
  const { amount, symbol } = formatCurrencyParts(value);

  // Scale symbol based on text size approximately
  const symbolClass =
    size === 'sm'
      ? 'text-[0.75em]'
      : size === 'base'
        ? 'text-[0.75em]'
        : size === 'lg'
          ? 'text-[0.75em]'
          : size === 'xl'
            ? 'text-[0.6em]'
            : // Smaller relative scale for larger text
              'text-[0.5em]';

  return (
    <span className='tabular-nums'>
      {amount} <span className={`${symbolClass} text-gray-400 font-normal`}>{symbol}</span>
    </span>
  );
};

import { createSearchRegex } from '../../utils/searchUtils';

// Define a unified filter function
const unifiedFilterFn: FilterFn<any> = (row, columnId, filterValue, addMeta) => {
  // filterValue is expected to be { term: string, filters: Record<string, any[]> }
  // OR just a string if legacy usage

  if (!filterValue) return true;

  let term = '';
  let activeFilters: Record<string, any[]> = {};

  if (typeof filterValue === 'string') {
    term = filterValue;
  } else if (typeof filterValue === 'object') {
    term = filterValue.term || '';
    activeFilters = filterValue.filters || {};
  }

  // 1. Check Active Filters (Structured)
  // Logic: ALL groups must match (AND). Within a group, ANY value must match (OR).
  // This requires the filterConfig to map IDs to columns, or we check against specific columns if configured?
  // Current design: Filter IDs should match Column IDs or we need a proper accessor.
  // Assumption: FilterConfig.id === ColumnId (accessorKey)

  for (const [filterId, selectedValues] of Object.entries(activeFilters)) {
    if (!selectedValues || selectedValues.length === 0) continue;

    // Skip filtering if 'all' is selected
    if (selectedValues.includes('all')) continue;

    const cellValue = row.getValue(filterId);
    // If cell value is array? (e.g. tags) -> check intersection
    // If scalar -> check inclusion

    // Complex value handling
    // If selectedValues contains "All", we skip? (Handled at UI/State level usually, but safeguard here)
    // Assuming UI sends only specific values.

    // Type coercion for loose matching
    const match = selectedValues.some((val) => {
      if (cellValue === val) return true;
      return String(cellValue) === String(val);
    });

    if (!match) return false;
  }

  // 2. Check Text Search (Fuzzy)
  if (!term) return true;

  // Standard Fuzzy Search on the specific column passed by react-table (usually all columns if global)
  // But wait, globalFilterFn is called against *each column*? No, only once per row if we implement it correctly?
  // Actually react-table calls globalFilterFn for the row. columnId might be undefined or specific?
  // The signature is (row, columnId, value).

  // Re-use existing fuzzy logic for the text part
  // We need to check if ANY visible column matches the term.
  // Actually, TanStack table handles the column iteration for global filtering if we use standard setup?
  // If we provide a custom globalFilter function, we typically iterate columns ourselves or rely on the default behavior?
  // The default `globalFilterFn` in useReactTable iterates columns.
  // BUT we are replacing the filter function on the table instance.

  // Wait! If we pass this as `globalFilterFn` to useReactTable, `columnId` is NOT passed?
  // Custom global filter function signature: (row, columnId, value, addMeta)
  // Usually it checks the specific columnId? No, global filters check the whole row.
  // Let's use the provided standard approach: check all columns for the term.

  // We will prioritize the Structured Filters (AND logic). If failed above, we returned false.
  // Now we return result of Fuzzy Search.

  const itemValue = row.getValue(columnId);
  if (itemValue == null) return false;

  const regex = createSearchRegex(term);
  return regex.test(String(itemValue));
};

// We need a wrapper because TanStack calls this PER COLUMN for global filtering?
// Actually, `globalFilterFn` is called for every column if configured, OR we define it to check all?
// "If a column has a `enableGlobalFilter: false`, it is ignored."
// "The default global filter function `auto`..."
// We want to combine explicit column structured filters with global text search.
// Better approach: Use `state.columnFilters` for the structured ones (Pills) and `state.globalFilter` for text.
// This leverages the native architecture correctly!
// Structured Filters -> Column Filters.
// Search Text -> Global Filter.
//
// So `SearchInput` updates TWO states: `globalFilter` (string) and `columnFilters` (array).

const EMPTY_ALIGNMENT = {};

interface TanStackTableProps<TData, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  tableId?: string; // Unique ID for localStorage persistence
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  onRowLongPress?: (e: React.TouchEvent, row: TData) => void;
  onRowContextMenu?: (e: React.MouseEvent, row: TData) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  color?: string; // e.g., 'blue', 'emerald'
  defaultHiddenColumns?: string[]; // Column IDs to hide by default
  activeIndex?: number; // For keyboard navigation highlight
  /**
   * Default alignment for specific columns (Header & Content).
   *
   * IMPORTANT:
   * 1. Physical Directions: 'left' and 'right' are absolute (regardless of RTL).
   * 2. Flex Alignment Rule: If your custom `cell` uses `flex`, it will ignore `text-align`.
   *    You MUST add `w-full` and `justify-[start|center|end]` to the flex container.
   *
   * @example
   * // Inside columns definition:
   * cell: info => <div className="flex w-full justify-end">...</div>
   */
  defaultColumnAlignment?: Record<string, 'start' | 'center' | 'end'>;
  globalFilter?: string; // External global filter value
  onSearchChange?: (value: string) => void;
  manualFiltering?: boolean; // If true, disables client-side filtering (useful when passing pre-filtered data)
  enableSearch?: boolean; // Whether to show the internal search input
  customEmptyState?: React.ReactNode;
  initialSorting?: SortingState;
  /**
   * If true, renders a simplified version of the table:
   * - No outer border/shadow
   * - Transparent background
   * - No top toolbar by default
   */
  lite?: boolean;
  dense?: boolean; // New: for compact rows
  enablePagination?: boolean;
  pageSize?: number;

  // New Filter Props
  filterableColumns?: FilterConfig[]; // Definitions for the pills
  initialFilters?: Record<string, any[]>;
  onFilterChange?: (filters: Record<string, any[]>) => void;
  enableGlobalSearchFocus?: boolean; // New: capture global keydown for search
}

// Helper to get stored settings
const getStoredSettings = (tableId: string) => {
  return storage.get(`table-settings-${tableId}`, null);
};

// Heuristic for smart alignment
// Heuristic for smart alignment
const getSmartAlignment = (columnId: string): 'start' | 'end' | 'center' => {
  const id = columnId.toLowerCase();

  // Numeric / Financial fields -> End
  if (
    [
      'price',
      'cost',
      'revenue',
      'profit',
      'margin',
      'qty',
      'quantity',
      'count',
      'amount',
      'total',
      'balance',
      'distribution',
    ].some((key) => id.includes(key))
  ) {
    return 'end';
  }

  // Status / Actions -> Center
  if (['status', 'active', 'is_', 'has_', 'action', 'check'].some((key) => id.includes(key))) {
    return 'center';
  }

  // Default -> Start
  return 'start';
};

export function TanStackTable<TData, TValue>({
  data,
  columns,
  tableId = 'default',
  searchPlaceholder = 'Search...',
  onRowClick,
  onRowLongPress,
  onRowContextMenu,
  isLoading = false,
  emptyMessage = 'No results found.',
  color = 'blue',
  defaultHiddenColumns = [],
  activeIndex,
  lite = false,
  dense = false,
  enableTopToolbar = !lite,
  defaultColumnAlignment = EMPTY_ALIGNMENT,
  globalFilter: externalGlobalFilter,
  onSearchChange,
  manualFiltering = false,
  enableSearch = true,
  customEmptyState,
  initialSorting = [],
  enablePagination = false,
  pageSize = 20,
  enableShowAll = false,

  filterableColumns = [],
  initialFilters = {},
  onFilterChange,
  enableGlobalSearchFocus = true,
}: TanStackTableProps<TData, TValue> & { enableTopToolbar?: boolean; enableShowAll?: boolean }) {
  // Detect RTL direction
  const isRtl = typeof document !== 'undefined' && document.dir === 'rtl';

  // Long-press support for rows
  const currentTouchRow = useRef<TData | null>(null);
  const {
    onTouchStart: onRowTouchStart,
    onTouchEnd: onRowTouchEnd,
    onTouchMove: onRowTouchMove,
  } = useLongPress({
    onLongPress: (e) => {
      if (onRowLongPress && currentTouchRow.current) {
        onRowLongPress(e, currentTouchRow.current);
      }
    },
  });
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { language } = useSettings();
  const t = TRANSLATIONS[language];

  // Load initial state from localStorage
  const storedSettings = React.useMemo(() => getStoredSettings(tableId), [tableId]);

  // Build default visibility from defaultHiddenColumns
  const defaultVisibility = React.useMemo(() => {
    const visibility: VisibilityState = {};

    // 1. Start with defaultHiddenColumns prop
    defaultHiddenColumns.forEach((colId) => {
      visibility[colId] = false;
    });

    // 2. Add columns marked with hideFromSettings meta
    columns.forEach((col) => {
      const colAny = col as any;
      const id = colAny.id || colAny.accessorKey;
      if (id && colAny.meta?.hideFromSettings) {
        visibility[id] = false;
      }
    });

    return visibility;
  }, [defaultHiddenColumns, columns]);

  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  // We manage "Active Pills" as Column Filters
  const [columnFilters, setColumnFilters] = useState<{ id: string; value: any }[]>([]);

  // Sync initialFilters to columnFilters on mount
  React.useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      const newFilters = Object.entries(initialFilters).map(([id, values]) => ({
        id,
        value: values,
      }));
      setColumnFilters(newFilters);

      // Notify parent initially if needed
      if (onFilterChange) {
        onFilterChange(initialFilters);
      }
    }
  }, [initialFilters, onFilterChange]);

  const [isShowAll, setIsShowAll] = useState(false);

  const globalFilter =
    externalGlobalFilter !== undefined ? externalGlobalFilter : internalGlobalFilter;
  const setGlobalFilter = (updaterOrValue: string | ((prev: string) => string)) => {
    const newValue = typeof updaterOrValue === 'function' ? updaterOrValue(globalFilter) : updaterOrValue;
    
    if (onSearchChange) {
      onSearchChange(newValue);
    }
    if (externalGlobalFilter === undefined) {
      setInternalGlobalFilter(newValue);
    }
  };

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    storedSettings?.columnVisibility || defaultVisibility
  );

  // Initialize alignment: Priority = Stored > Prop > Meta > Smart Default
  const memoizedInitialAlignment = React.useMemo(() => {
    const alignment: Record<string, 'start' | 'center' | 'end'> = { ...defaultColumnAlignment };

    // Add defaults from column metadata
    columns.forEach((col) => {
      const colAny = col as any;
      const id = colAny.id || colAny.accessorKey;
      if (id) {
        let align = colAny.meta?.align;

        // Custom default rules
        if (!align && id.toLowerCase().includes('code')) {
          align = 'start';
        }

        if (align) {
          // Map legacy physical alignments to logical ones
          if (align === 'left') align = 'start';
          if (align === 'right') align = 'end';
          alignment[id] = align;
        } else if (lite && !alignment[id]) {
          alignment[id] = getSmartAlignment(id);
        }
      }
    });

    // Merge with stored overrides
    return { ...alignment, ...(storedSettings?.columnAlignment || {}) };
  }, [columns, defaultColumnAlignment, lite, storedSettings]);

  const [columnAlignment, setColumnAlignment] =
    useState<Record<string, 'start' | 'center' | 'end'>>(memoizedInitialAlignment);

  // Helper to extract only the overrides (values different from defaults)
  const getDiff = React.useCallback(
    (
      current: Record<string, 'start' | 'center' | 'end'>,
      defaults: Record<string, 'start' | 'center' | 'end'>
    ) => {
      const diff: Record<string, 'start' | 'center' | 'end'> = {};
      Object.keys(current).forEach((key) => {
        if (current[key] !== defaults[key]) {
          diff[key] = current[key];
        }
      });
      return diff;
    },
    []
  );

  const [pagination, setPagination] = React.useState({
    pageIndex: storedSettings?.pagination?.pageIndex ?? 0,
    pageSize: storedSettings?.pagination?.pageSize ?? pageSize,
  });

  const persistSettings = React.useCallback(
    (
      newColVis: VisibilityState,
      newAlign: Record<string, 'start' | 'center' | 'end'>,
      newPagination?: { pageIndex: number; pageSize: number }
    ) => {
      const settings = {
        columnVisibility: newColVis,
        columnAlignment: getDiff(newAlign, defaultColumnAlignment),
        pagination: newPagination || pagination,
      };
      storage.set(`table-settings-${tableId}`, settings);
    },
    [tableId, defaultColumnAlignment, getDiff, pagination]
  );

  // Global Keydown Listener for Search Autofocus
  React.useEffect(() => {
    if (!enableGlobalSearchFocus || !enableSearch) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is already in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Capture simple alphanumeric for search focus
      // Also allow space if it's the first character
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If it's a space and current filter is empty, maybe don't start with it? 
        // But usually users want to start typing.
        e.preventDefault();
        searchInputRef.current?.focus();
        setGlobalFilter((prev: any) => (prev ? prev + e.key : e.key));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [enableGlobalSearchFocus, enableSearch]);

  // React to default prop changes (e.g. Language switch or prop updates)
  React.useEffect(() => {
    setColumnAlignment(memoizedInitialAlignment);
  }, [memoizedInitialAlignment]);

  const { showMenu } = useContextMenu();

  const handleColumnVisibilityChange = React.useCallback(
    (updaterOrValue: any) => {
      setColumnVisibility((old) => {
        const newVal = typeof updaterOrValue === 'function' ? updaterOrValue(old) : updaterOrValue;
        persistSettings(newVal, columnAlignment);
        return newVal;
      });
    },
    [persistSettings, columnAlignment]
  );

  const handlePaginationChange = React.useCallback(
    (updaterOrValue: any) => {
      setPagination((old) => {
        const newVal = typeof updaterOrValue === 'function' ? updaterOrValue(old) : updaterOrValue;
        persistSettings(columnVisibility, columnAlignment, newVal);
        return newVal;
      });
    },
    [persistSettings, columnVisibility, columnAlignment]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      pagination: isShowAll ? { pageIndex: 0, pageSize: data.length || 1 } : pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    globalFilterFn: unifiedFilterFn,
    enableSorting: true,
    manualFiltering,
    filterFns: {
      // Custom filter function for our Arrays (Multi-Select)
      // This function will be utilized if we set the column definition filterFn to 'arrIncludesSome' or custom
      arrIncludesSome: (row, columnId, value: any[]) => {
        if (!value || value.length === 0) return true;
        const cellValue = row.getValue(columnId);
        return value.includes(cellValue); // Simple check: Row Value exists in Selected Filter Values
      },
    },
  });

  // Helper to update our unifying "SearchInput" state
  const handleFilterUpdate = React.useCallback((groupId: string, newValues: any[]) => {
    setColumnFilters((prev) => {
      const other = prev.filter((f) => f.id !== groupId);
      return newValues.length === 0 ? other : [...other, { id: groupId, value: newValues }];
    });
  }, []);

  // Convert columnFilters array back to Record for SearchInput prop
  const activeFiltersRecord = React.useMemo(() => {
    const rec: Record<string, any[]> = {};
    columnFilters.forEach((f) => {
      rec[f.id] = f.value;
    });
    return rec;
  }, [columnFilters]);

  // Notify parent of filter changes in a stable way
  React.useEffect(() => {
    if (onFilterChange) {
      onFilterChange(activeFiltersRecord);
    }
  }, [activeFiltersRecord, onFilterChange]);

  /* State specific for Context Menu tracking to enable live updates */
  const menuPosRef = React.useRef<{ x: number; y: number; columnId?: string } | null>(null);

  const getMenuContent = React.useCallback(
    (columnId?: string, overrideAlign?: Record<string, 'start' | 'center' | 'end'>) => {
      const column = columnId ? table.getColumn(columnId) : null;

      // Use override values if provided, otherwise fall back to state
      const effectiveAlign = overrideAlign ?? columnAlignment;

      const currentAlign = columnId ? effectiveAlign[columnId] || 'start' : 'start';

      // Handlers (re-create handlers that use the state/props)
      const handleAlign = (align: 'start' | 'center' | 'end') => {
        if (!columnId) return;
        const newAlign = { ...columnAlignment, [columnId]: align };
        setColumnAlignment(newAlign);
        persistSettings(columnVisibility, newAlign);

        if (menuPosRef.current) {
          showMenu(menuPosRef.current.x, menuPosRef.current.y, getMenuContent(columnId, newAlign));
        }
      };

      // Sorting handlers
      const handleSortAsc = () => {
        if (!column) return;
        if (column.getIsSorted() === 'asc') {
          column.clearSorting();
        } else {
          column.toggleSorting(false); // false = ascending
        }
        // Refresh menu to show updated state
        if (menuPosRef.current) {
          setTimeout(() => {
            showMenu(menuPosRef.current!.x, menuPosRef.current!.y, getMenuContent(columnId));
          }, 0);
        }
      };

      const handleSortDesc = () => {
        if (!column) return;
        if (column.getIsSorted() === 'desc') {
          column.clearSorting();
        } else {
          column.toggleSorting(true); // true = descending
        }
        // Refresh menu to show updated state
        if (menuPosRef.current) {
          setTimeout(() => {
            showMenu(menuPosRef.current!.x, menuPosRef.current!.y, getMenuContent(columnId));
          }, 0);
        }
      };

      const isSorted = column?.getIsSorted();

      return (
        <div className='font-sans'>
          {/* All Columns Visibility */}
          <div className='space-y-1'>
            <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase py-2 px-3 border-b border-gray-100 dark:border-gray-800 mb-1'>
              {t?.global?.table?.columns || 'Columns'}
            </div>
            {table
              .getAllLeafColumns()
              .filter(
                (col) =>
                  col.id !== 'actions' && !(col.columnDef.meta as any)?.hideFromSettings
              )
              .map((col) => {
                const headerValue =
                  typeof col.columnDef.header === 'function' ? col.id : col.columnDef.header;

                return (
                  <ContextMenuCheckboxItem
                    key={col.id}
                    label={headerValue as React.ReactNode}
                    checked={col.getIsVisible()}
                    onCheckedChange={(val) => {
                      col.toggleVisibility(val);

                      // Force refresh menu state live
                      if (menuPosRef.current) {
                        setTimeout(() => {
                          showMenu(
                            menuPosRef.current!.x,
                            menuPosRef.current!.y,
                            getMenuContent(menuPosRef.current!.columnId)
                          );
                        }, 0);
                      }
                    }}
                  />
                );
              })}
          </div>

          {column && !column.columnDef.meta?.disableAlignment && column.id !== 'actions' && (
            <>
              <ContextMenuSeparator />

              {/* Alignment Controls Container */}
              <div className='px-3 py-3'>
                <div className='text-[10px] font-bold tracking-[0.1em] text-gray-400 dark:text-gray-500 uppercase mb-2.5 flex items-center gap-2'>
                  <span className='material-symbols-rounded text-sm opacity-60'>format_align_left</span>
                  {t?.global?.table?.alignment || 'Alignment'}
                </div>
                {/* Unified Alignment */}
                <div className='bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-gray-800/50 flex items-center justify-between gap-1'>
                  <AlignButton
                    align='start'
                    isActive={currentAlign === 'start'}
                    onClick={() => handleAlign('start')}
                    isRtl={language === 'AR'}
                  />
                  <AlignButton
                    align='center'
                    isActive={currentAlign === 'center'}
                    onClick={() => handleAlign('center')}
                    isRtl={language === 'AR'}
                  />
                  <AlignButton
                    align='end'
                    isActive={currentAlign === 'end'}
                    onClick={() => handleAlign('end')}
                    isRtl={language === 'AR'}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      );
    },
    [table, columnAlignment, showMenu, columnVisibility, persistSettings, t.global.table]
  );

  const onContextMenuOpen = (x: number, y: number, columnId?: string) => {
    menuPosRef.current = { x, y, columnId };
    showMenu(x, y, getMenuContent(columnId));
  };

  const handleColumnContextMenu = (e: React.MouseEvent, columnId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenuOpen(e.clientX, e.clientY, columnId);
  };
  const rows = table.getRowModel().rows;

  return (
    <div className='flex flex-col h-full w-full'>
      {/* Header Controls */}
      {enableTopToolbar && (
        <div className={`flex items-center justify-between ${enableSearch ? 'mb-4' : ''}`}>
          <div className='w-full max-w-xl'>
            {enableSearch && (
              <SearchInput
                ref={searchInputRef}
                value={globalFilter ?? ''}
                onSearchChange={(val) => setGlobalFilter(val)}
                onClear={() => setGlobalFilter('')}
                placeholder={searchPlaceholder}
                color={color}
                // New Integrated Props
                filterConfigs={filterableColumns}
                activeFilters={activeFiltersRecord}
                onUpdateFilter={handleFilterUpdate}
              />
            )}
          </div>
        </div>
      )}

      {/* Unified Card Wrapper */}
      <div
        className={`flex flex-col flex-1 min-h-0 ${
          lite
            ? 'bg-transparent'
            : 'rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 overflow-hidden'
        }`}
      >
        {/* Table Scroll Area */}
        <div className='flex-1 overflow-auto custom-scrollbar relative'>
          {table.getVisibleLeafColumns().length === 0 ? (
            <ContextMenuTrigger
              className='h-full w-full'
              onOpen={(x, y) => onContextMenuOpen(x, y)}
            >
              <div className='h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-3 select-none'>
                <span className='material-symbols-rounded text-6xl opacity-50'>view_column</span>
                <div className='text-center'>
                  <p className='text-lg font-medium mb-1'>{t.global.table.noColumnsVisible}</p>
                  <p className='text-sm opacity-70'>{t.global.table.manageColumnsHint}</p>
                </div>
              </div>
            </ContextMenuTrigger>
          ) : (
            <table className='w-full text-left border-separate border-spacing-0'>
              <thead className='sticky top-0 z-10 bg-white dark:bg-gray-900'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      // ... inside TanStackTable ...

                      const align =
                        columnAlignment[header.column.id] ||
                        header.column.columnDef.meta?.align ||
                        (lite ? getSmartAlignment(header.column.id) : null) ||
                        'start';

                      const justifyClass = getHeaderJustifyClass(align);
                      const textAlignClass = getTextAlignClass(align);

                      const isFlex =
                        header.column.columnDef.meta?.flex ??
                        header.column.id.toLowerCase().includes('name');

                      return (
                        <th
                          key={header.id}
                          className={`p-0 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none relative group border-b ${lite ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-800'}
                        ${textAlignClass}
                        ${isFlex ? '' : 'w-[1%] whitespace-nowrap'}`}
                          style={{
                            width: isFlex ? 'auto' : header.column.columnDef.meta?.width,
                            minWidth: header.column.columnDef.meta?.minWidth,
                          }}
                        >
                          <ContextMenuTrigger
                            className='py-3 px-4 w-full h-full block'
                            onOpen={(x, y) => onContextMenuOpen(x, y, header.column.id)}
                          >
                            {header.isPlaceholder ? null : (
                              <div className={`flex items-center w-full ${justifyClass}`}>
                                <div
                                  className='relative inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer'
                                  onClick={header.column.getToggleSortingHandler()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      header.column.getToggleSortingHandler()?.(e);
                                    }
                                  }}
                                  role='button'
                                  tabIndex={0}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}

                                  {/* Absolute Sort Indicators */}
                                  <span
                                    className={`absolute top-1/2 -translate-y-1/2 flex items-center
                                ${
                                  align === 'start'
                                    ? 'ltr:left-full ltr:pl-1 rtl:right-full rtl:pr-1'
                                    : align === 'end'
                                      ? 'ltr:right-full ltr:pr-1 rtl:left-full rtl:pl-1 opacity-100'
                                      : 'ltr:left-full ltr:pl-1 rtl:right-full rtl:pr-1'
                                }
                             `}
                                  >
                                    {{
                                      asc: (
                                        <span className='material-symbols-rounded text-xl leading-none text-current opacity-70'>
                                          arrow_drop_up
                                        </span>
                                      ),
                                      desc: (
                                        <span className='material-symbols-rounded text-xl leading-none text-current opacity-70'>
                                          arrow_drop_down
                                        </span>
                                      ),
                                    }[header.column.getIsSorted() as string] ?? null}
                                  </span>
                                </div>
                              </div>
                            )}
                          </ContextMenuTrigger>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className=''>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className='h-32 text-center'>
                      <div className='flex flex-col items-center justify-center p-4'>
                        <div
                          className={`w-6 h-6 border-2 border-${color}-500 border-t-transparent rounded-full animate-spin mb-2`}
                        ></div>
                        <span className='text-sm text-gray-500'>{t.global.table.loadingData}</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      id={`drug-row-${row.index}`}
                      onClick={() => onRowClick && onRowClick(row.original)}
                      onTouchStart={(e) => {
                        currentTouchRow.current = row.original;
                        onRowTouchStart(e);
                      }}
                      onTouchEnd={onRowTouchEnd}
                      onTouchMove={onRowTouchMove}
                      onContextMenu={(e) => {
                        if (onRowContextMenu) {
                          e.preventDefault();
                          onRowContextMenu(e, row.original);
                        }
                      }}
                      className={`transition-colors overflow-visible ${onRowClick ? 'cursor-pointer' : ''} ${
                        activeIndex !== undefined && row.index === activeIndex
                          ? `bg-${color}-50 dark:bg-${color}-900/20`
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const align =
                          columnAlignment[cell.column.id] ||
                          cell.column.columnDef.meta?.align ||
                          (lite ? getSmartAlignment(cell.column.id) : null) ||
                          'start';

                        const justifyClass = `${getHeaderJustifyClass(align)} ${getTextAlignClass(align)}`;

                        const isFlex =
                          cell.column.columnDef.meta?.flex ??
                          cell.column.id.toLowerCase().includes('name');

                        const colId = cell.column.id.toLowerCase();
                        const isIdColumn = colId.includes('id') || colId.includes('code');

                        // Date Detection & Formatting (Avoiding false positives like 'csat')
                        const isDateColumn =
                          ['date', 'time', 'timestamp'].some((key) => colId.includes(key)) ||
                          (colId.includes('at') &&
                            !colId.includes('csat') &&
                            !colId.includes('cat'));
                        const cellValue = cell.getValue();

                        const renderCellContent = () => {
                          // If it's a date column and we have a value and smart formatting is enabled (default)
                          const smartDateVisible = cell.column.columnDef.meta?.smartDate !== false;

                          if (
                            smartDateVisible &&
                            isDateColumn &&
                            cellValue &&
                            (typeof cellValue === 'string' ||
                              typeof cellValue === 'number' ||
                              cellValue instanceof Date)
                          ) {
                            const date = new Date(cellValue);
                            if (!isNaN(date.getTime())) {
                              const now = new Date();
                              const today = new Date(
                                now.getFullYear(),
                                now.getMonth(),
                                now.getDate()
                              );
                              const yesterday = new Date(today);
                              yesterday.setDate(yesterday.getDate() - 1);

                              const targetDate = new Date(
                                date.getFullYear(),
                                date.getMonth(),
                                date.getDate()
                              );

                              let dateLabel = date.toLocaleDateString();
                              if (targetDate.getTime() === today.getTime()) {
                                dateLabel = isRtl ? 'اليوم' : 'Today';
                              } else if (targetDate.getTime() === yesterday.getTime()) {
                                dateLabel = isRtl ? 'أمس' : 'Yesterday';
                              }

                              const timeLabel = date.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                              const formattedTime = isRtl
                                ? timeLabel.replace('AM', 'ص').replace('PM', 'م')
                                : timeLabel;

                              return (
                                <div className={`flex flex-col ${getItemsAlignClass(align)}`}>
                                  <span className='font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight'>
                                    {formattedTime}
                                  </span>
                                  <span className='text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap -mt-0.5'>
                                    {dateLabel}
                                  </span>
                                </div>
                              );
                            }
                          }

                          return flexRender(cell.column.columnDef.cell, cell.getContext());
                        };

                        return (
                          <td
                            key={cell.id}
                            className={`${dense ? 'py-1' : 'py-2'} px-4 text-sm text-gray-700 dark:text-gray-300 align-middle border-b border-gray-100 dark:border-gray-800
                            ${isFlex ? '' : 'whitespace-nowrap'}`}
                            style={{
                              width: isFlex ? 'auto' : cell.column.columnDef.meta?.width,
                              minWidth: cell.column.columnDef.meta?.minWidth,
                            }}
                            dir={cell.column.columnDef.meta?.dir}
                          >
                            <div
                              className={`flex items-center gap-1.5 w-full ${justifyClass} ${isIdColumn && align === 'start' ? '-ms-3' : ''} ${isIdColumn && align === 'end' ? '-me-3' : ''}`}
                            >
                              {isIdColumn && (
                                <span className='material-symbols-rounded text-base text-gray-400 shrink-0'>
                                  tag
                                </span>
                              )}
                              <span dir={isIdColumn ? 'ltr' : undefined}>
                                {renderCellContent()}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className='py-12 text-center text-gray-500 dark:text-gray-400'
                    >
                      {customEmptyState ? (
                        customEmptyState
                      ) : (
                        <div className='flex flex-col items-center justify-center'>
                          <span className='material-symbols-rounded text-4xl mb-2 opacity-30'>
                            inbox
                          </span>
                          <p>{emptyMessage}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {enablePagination && (table.getPageCount() > 1 || enableShowAll) && (
          <div
            dir='ltr'
            className='flex items-center justify-between h-8 border-t bg-[var(--bg-secondary)] border-[var(--border-primary)] px-2'
          >
            {/* Left: Info */}
            <div className='flex items-center gap-4 text-[10px] font-bold tracking-wide text-gray-500 uppercase h-full'>
              <div className='flex items-center'>
                {t.global?.table?.page || 'Page'}{' '}
                <span className='mx-1 text-gray-900 dark:text-gray-100'>
                  {table.getState().pagination.pageIndex + 1}
                </span>{' '}
                {t.global?.table?.of || 'of'}{' '}
                <span className='ml-1 text-gray-900 dark:text-gray-100'>
                  {table.getPageCount()}
                </span>
              </div>

              {enableShowAll && (
                <button
                  onClick={() => setIsShowAll(!isShowAll)}
                  className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all ${
                    isShowAll
                      ? `bg-${color}-50 border-${color}-200 text-${color}-700 dark:bg-${color}-900/20 dark:border-${color}-800 dark:text-${color}-400`
                      : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700'
                  }`}
                  title={isShowAll ? 'Show Less' : t.global?.table?.showAll || 'Show All'}
                >
                  <span className='material-symbols-rounded text-[18px]'>
                    {isShowAll ? 'keyboard_double_arrow_up' : 'keyboard_double_arrow_down'}
                  </span>
                </button>
              )}
            </div>

            {/* Right: Controls */}
            <div
              className={`flex items-center h-full ${isShowAll ? 'opacity-30 pointer-events-none' : ''}`}
            >
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className='h-full aspect-square flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 hover:enabled:text-gray-900 dark:hover:enabled:text-gray-100'
                title='First Page'
              >
                <span className='material-symbols-rounded text-[18px] leading-none'>
                  first_page
                </span>
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className='h-full aspect-square flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 hover:enabled:text-gray-900 dark:hover:enabled:text-gray-100'
                title='Previous Page'
              >
                <span className='material-symbols-rounded text-[18px] leading-none'>
                  chevron_left
                </span>
              </button>

              <div className='w-px h-3 bg-gray-300 dark:bg-gray-700 mx-1'></div>

              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className='h-full aspect-square flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 hover:enabled:text-gray-900 dark:hover:enabled:text-gray-100'
                title='Next Page'
              >
                <span className='material-symbols-rounded text-[18px] leading-none'>
                  chevron_right
                </span>
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className='h-full aspect-square flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 hover:enabled:text-gray-900 dark:hover:enabled:text-gray-100'
                title='Last Page'
              >
                <span className='material-symbols-rounded text-[18px] leading-none'>last_page</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
