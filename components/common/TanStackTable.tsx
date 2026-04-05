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
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef, useState } from 'react';
import { storage } from '../../utils/storage';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'start' | 'center' | 'end';
    headerAlign?: 'start' | 'center' | 'end';
    width?: number;
    minWidth?: number;
    flex?: boolean;
    isId?: boolean;
    dir?: 'ltr' | 'rtl' | 'auto';
    disableAlignment?: boolean;
    smartDate?: boolean;
    hideFromSettings?: boolean;
  }
}

import { useSettings } from '../../context/SettingsContext';
import { useLongPress } from '../../hooks/useLongPress';
import { TRANSLATIONS } from '../../i18n/translations';
import { formatCurrencyParts } from '../../utils/currency';
import { getSmartDirection } from './SmartInputs';
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

let _cachedTerm = '';
let _cachedRegex: RegExp = /.*/;
const getCachedSearchRegex = (term: string) => {
  if (term !== _cachedTerm) {
    _cachedTerm = term;
    _cachedRegex = createSearchRegex(term);
  }
  return _cachedRegex;
};

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

  const regex = getCachedSearchRegex(term);
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
  pageSize?: number | 'auto';
  enableVirtualization?: boolean;

  // New Filter Props
  filterableColumns?: FilterConfig[]; // Definitions for the pills
  initialFilters?: Record<string, any[]>;
  onFilterChange?: (filters: Record<string, any[]>) => void;
  enableGlobalSearchFocus?: boolean; // New: capture global keydown for search
  leftCustomControls?: React.ReactNode;
  rightCustomControls?: React.ReactNode;
  enableTopToolbar?: boolean;
  enableShowAll?: boolean;
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

  // Status / Actions / Selection -> Center
  if (['status', 'active', 'is_', 'has_', 'action', 'check', 'customer', 'total', 'driver', 'man'].some((key) => id.includes(key))) {
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
  color = 'primary',
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
  enableVirtualization = false,

  filterableColumns = [],
  initialFilters = {},
  onFilterChange,
  enableGlobalSearchFocus = true,
  leftCustomControls,
  rightCustomControls,
}: TanStackTableProps<TData, TValue>) {
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
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const firstRowRef = useRef<HTMLTableRowElement>(null);

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
  const [isJumping, setIsJumping] = useState(false);
  const [jumpValue, setJumpValue] = useState('');

  const globalFilter =
    externalGlobalFilter !== undefined ? externalGlobalFilter : internalGlobalFilter;
    
  const globalFilterRef = useRef(globalFilter);
  globalFilterRef.current = globalFilter;

  const setGlobalFilter = React.useCallback((updaterOrValue: string | ((prev: string) => string)) => {
    const newValue = typeof updaterOrValue === 'function' ? updaterOrValue(globalFilterRef.current) : updaterOrValue;
    
    if (onSearchChange) {
      onSearchChange(newValue);
    }
    if (externalGlobalFilter === undefined) {
      setInternalGlobalFilter(newValue);
    }
  }, [onSearchChange, externalGlobalFilter]);

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
    pageSize: storedSettings?.pagination?.pageSize === 'auto' ? 20 : (storedSettings?.pagination?.pageSize ?? (pageSize === 'auto' ? 20 : pageSize)),
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
            <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase py-2 px-3 border-b border-gray-100 dark:border-(--border-divider) mb-1'>
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
                <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2.5 flex items-center gap-2'>
                  <span className='material-symbols-rounded opacity-60' style={{ fontSize: 'var(--icon-sm)' }}>format_align_left</span>
                  {t?.global?.table?.alignment || 'Alignment'}
                </div>
                {/* Unified Alignment */}
                <div className='bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-(--border-divider) flex items-center justify-between gap-1'>
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

  const onContextMenuOpen = React.useCallback((x: number, y: number, columnId?: string) => {
    menuPosRef.current = { x, y, columnId };
    showMenu(x, y, getMenuContent(columnId));
  }, [showMenu, getMenuContent]);

  // --- Fix: Auto Page Size Calculation (Accurate) ---
  React.useEffect(() => {
    if (pageSize === 'auto' && tableContainerRef.current && !isShowAll) {
      const observer = new ResizeObserver(() => {
        if (!tableContainerRef.current) return;
        
        const containerHeight = tableContainerRef.current.clientHeight;
        const headHeight = headerRef.current?.offsetHeight || 45;
        const rowHeight = firstRowRef.current?.offsetHeight || (dense ? 36 : 48);
        
        const availableHeight = containerHeight - headHeight;
        const calculated = Math.max(1, Math.floor(availableHeight / rowHeight));
        
        if (calculated !== pagination.pageSize) {
          table.setPageSize(calculated);
        }
      });
      
      observer.observe(tableContainerRef.current);
      return () => observer.disconnect();
    }
  }, [pageSize, dense, isShowAll, pagination.pageSize, table]);

  const handleColumnContextMenu = React.useCallback((e: React.MouseEvent, columnId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenuOpen(e.clientX, e.clientY, columnId);
  }, [onContextMenuOpen]);
  
  const { rows } = table.getRowModel();

  // --- Fix 5: Pre-compute Date Constants ---
  const { todayTs, yesterdayTs } = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { todayTs: today.getTime(), yesterdayTs: yesterday.getTime() };
  }, []);

  // --- Fix 3: Pre-compute Column Metadata ---
  const columnMetaMap = React.useMemo(() => {
    const map = new Map<string, any>();
    table.getVisibleLeafColumns().forEach((col) => {
      const colId = col.id.toLowerCase();
      const align =
        (col.columnDef.meta?.disableAlignment ? null : columnAlignment[col.id]) ||
        col.columnDef.meta?.align ||
        (lite ? getSmartAlignment(col.id) : null) ||
        'start';
      const isNameColumn = colId.includes('name');
      const isIdColumn = col.columnDef.meta?.isId ?? (colId.includes('id') || colId.includes('code'));
      const isActionColumn = colId.includes('action');
      const isDateColumn = (['date', 'time', 'timestamp', 'visit'].some((key) => colId.includes(key)) ||
            (colId.includes('at') && !colId.includes('csat') && !colId.includes('cat'))) && !colId.includes('expiry');
      const isFlex = col.columnDef.meta?.flex ?? isNameColumn;

      map.set(col.id, {
        isIdColumn,
        isNameColumn,
        isActionColumn,
        isDateColumn,
        isFlex,
        align,
        justifyClass: `${getHeaderJustifyClass(align)} ${getTextAlignClass(align)}`,
        itemsAlignClass: getItemsAlignClass(align),
        width: col.columnDef.meta?.width || col.getSize(),
        minWidth: col.columnDef.meta?.minWidth,
        cellDirMeta: col.columnDef.meta?.dir,
        smartDateVisible: col.columnDef.meta?.smartDate !== false,
      });
    });
    return map;
  }, [table, columnAlignment, lite]);

  // Virtualizer Setup
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => (dense ? 36 : 48), // Default estimate based on row density
    overscan: 10,
  });

  const virtualItems = enableVirtualization ? rowVirtualizer.getVirtualItems() : null;

  const paddingTop = virtualItems && virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems && virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0;

  const itemsToRender = enableVirtualization ? virtualItems! : rows;

  return (
    <div className='flex flex-col h-full w-full'>
      {/* Header Controls */}
      {enableTopToolbar && (
        <div className={`flex flex-wrap items-center gap-4 justify-between ${enableSearch || leftCustomControls || rightCustomControls ? 'mb-4' : ''}`}>
          <div className='flex items-center gap-3 flex-1 min-w-0'>
            {leftCustomControls && (
              <div className='flex items-center gap-2'>
                {leftCustomControls}
              </div>
            )}
            
            {enableSearch && (
              <div className='w-full max-w-xl'>
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
              </div>
            )}
          </div>

          {rightCustomControls && (
            <div className='flex items-center gap-2'>
              {rightCustomControls}
            </div>
          )}
        </div>
      )}

      {/* Unified Card Wrapper */}
      <div
        className={`flex flex-col flex-1 min-h-0 ${
          lite
            ? 'bg-transparent'
            : 'rounded-2xl border-2 dark:border border-(--border-divider) bg-(--bg-card) overflow-hidden'
        }`}
      >
        {/* Table Scroll Area */}
        <div ref={tableContainerRef} className='flex-1 overflow-y-scroll custom-scrollbar relative'>
          {table.getVisibleLeafColumns().length === 0 ? (
            <ContextMenuTrigger
              className='h-full w-full'
              onOpen={(x, y) => onContextMenuOpen(x, y)}
            >
              <div className='h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-3 select-none'>
                <span className='material-symbols-rounded opacity-50' style={{ fontSize: 'var(--icon-3xl)' }}>view_column</span>
                <div className='text-center'>
                  <p className='text-lg font-medium mb-1'>{t.global.table.noColumnsVisible}</p>
                  <p className='text-sm opacity-70'>{t.global.table.manageColumnsHint}</p>
                </div>
              </div>
            </ContextMenuTrigger>
          ) : (
            <table className='w-full text-left border-separate border-spacing-0'>
              <thead ref={headerRef} className='sticky top-0 z-10 bg-(--bg-card)'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      // ... inside TanStackTable ...

                      const align =
                        header.column.columnDef.meta?.headerAlign ||
                        (header.column.columnDef.meta?.disableAlignment ? null : columnAlignment[header.column.id]) ||
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
                          className={`p-0 text-xs font-bold text-(--text-tertiary) uppercase tracking-wider select-none relative group border-b border-(--border-divider)
                        ${textAlignClass}
                        ${isFlex ? '' : 'w-[1%] whitespace-nowrap'}`}
                          style={{
                            width: isFlex ? 'auto' : (header.column.columnDef.meta?.width || header.column.getSize()),
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
                                        <span className='material-symbols-rounded leading-none text-current opacity-70' style={{ fontSize: 'var(--icon-lg)' }}>
                                          arrow_drop_up
                                        </span>
                                      ),
                                      desc: (
                                        <span className='material-symbols-rounded leading-none text-current opacity-70' style={{ fontSize: 'var(--icon-lg)' }}>
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
              {/* Enforce var(--icon-sm) on all material-symbols-rounded icons inside table cells using arbitrary variants, except action columns */}
              <tbody className='[&_td:not(.action-col)_.material-symbols-rounded]:!text-[length:var(--icon-sm)] [&_td:not(.action-col)_.material-symbols-rounded]:!text-sm'>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className='h-32 text-center'>
                      <div className='flex flex-col items-center justify-center p-4'>
                        <div
                          className={`w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-2`}
                        ></div>
                        <span className='text-sm text-gray-500'>{t.global.table.loadingData}</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  <>
                    {enableVirtualization && paddingTop > 0 && (
                      <tr className="padding-row">
                        <td style={{ height: paddingTop }} colSpan={columns.length} />
                      </tr>
                    )}
                    {itemsToRender.map((item, index) => {
                      const isVirtual = enableVirtualization;
                      const row = isVirtual ? rows[(item as any).index] : (item as any);
                      const virtualRow = isVirtual ? (item as any) : null;
                      const rowIndex = isVirtual ? virtualRow.index : index;
                      
                      return (
                        <tr
                          key={row.id}
                          ref={(el) => {
                            if (isVirtual) rowVirtualizer.measureElement(el);
                            if (rowIndex === 0) (firstRowRef.current as any) = el;
                          }}
                          data-index={rowIndex}
                          id={`drug-row-${rowIndex}`}
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
                      className={`transition-colors overflow-visible group/row ${onRowClick ? 'cursor-pointer' : ''} ${
                        activeIndex !== undefined && rowIndex === activeIndex
                          ? `bg-primary-50 dark:bg-primary-900/20`
                          : 'hover:bg-(--bg-hover)'
                      }`}
                    >
                      {row.getVisibleCells().map((cell: any) => {
                        const meta = columnMetaMap.get(cell.column.id) || {
                          isIdColumn: false, isNameColumn: false, isActionColumn: false, isDateColumn: false,
                          isFlex: false, align: 'start', justifyClass: 'justify-start text-start', itemsAlignClass: 'items-start',
                          smartDateVisible: true, width: undefined, minWidth: undefined, cellDirMeta: undefined
                        };

                        const cellValue = cell.getValue();
                        let cellDir = meta.cellDirMeta;
                        if (cellDir === 'auto' || (!cellDir && meta.isNameColumn && typeof cellValue === 'string')) {
                          cellDir = getSmartDirection(String(cellValue || ''));
                        }

                        // --- Fix 4: Inline renderCellContent ---
                        let content = null;
                        if (
                          meta.smartDateVisible &&
                          meta.isDateColumn &&
                          cellValue &&
                          (typeof cellValue === 'string' || typeof cellValue === 'number' || cellValue instanceof Date)
                        ) {
                          const date = new Date(cellValue);
                          if (!isNaN(date.getTime())) {
                            const targetTs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                            
                            let dateLabel = date.toLocaleDateString();
                            let isToday = false;
                            if (targetTs === todayTs) {
                              dateLabel = isRtl ? 'اليوم' : 'Today';
                              isToday = true;
                            } else if (targetTs === yesterdayTs) {
                              dateLabel = isRtl ? 'أمس' : 'Yesterday';
                            }

                            const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const formattedTime = isRtl ? timeLabel.replace('AM', 'ص').replace('PM', 'م') : timeLabel;

                            if (isToday) {
                              content = (
                                <div className={`flex flex-col ${meta.itemsAlignClass}`}>
                                  <span className='font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight'>
                                    {formattedTime}
                                  </span>
                                </div>
                              );
                            } else {
                              content = (
                                <div className={`flex flex-col ${meta.itemsAlignClass}`}>
                                  <span className='font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight'>
                                    {dateLabel}
                                  </span>
                                  <span className='text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap -mt-0.5 tracking-tight'>
                                    {formattedTime}
                                  </span>
                                </div>
                              );
                            }
                          }
                        }
                        
                        // Fallback to default render if no format applied
                        if (!content) {
                          content = flexRender(cell.column.columnDef.cell, cell.getContext());
                        }

                        return (
                          <td
                            key={cell.id}
                            className={`${dense ? 'py-1.5' : 'py-3'} px-4 text-sm font-medium text-(--text-primary) align-middle border-b border-(--border-divider) group-last/row:border-b-0
                            ${meta.isFlex ? '' : 'whitespace-nowrap'} ${meta.isActionColumn ? 'action-col' : ''}`}
                            style={{
                              width: meta.isFlex ? 'auto' : (cell.column.columnDef.meta?.width || cell.column.getSize()),
                              minWidth: cell.column.columnDef.meta?.minWidth,
                            }}
                            dir={cellDir}
                          >
                            <div
                              className={`flex items-center gap-1.5 w-full ${meta.justifyClass} ${meta.isIdColumn && meta.align === 'start' ? '-ms-3' : ''} ${meta.isIdColumn && meta.align === 'end' ? '-me-3' : ''}`}
                            >
                              {meta.isIdColumn && (
                                <span className='material-symbols-rounded text-gray-400 shrink-0' style={{ fontSize: 'var(--icon-md)' }}>
                                  tag
                                </span>
                              )}
                              <span dir={meta.isIdColumn ? 'ltr' : undefined}>
                                {content}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {enableVirtualization && paddingBottom > 0 && (
                  <tr className="padding-row">
                    <td style={{ height: paddingBottom }} colSpan={columns.length} />
                  </tr>
                )}
              </>
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
                          <span className='material-symbols-rounded mb-2 opacity-30' style={{ fontSize: 'var(--icon-xl)' }}>
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

        {/* StatusBar-Style Pagination & Tools Toolbar */}
        {enablePagination && (table.getPageCount() > 1 || isShowAll) && (
          <div
            dir='ltr'
            className={`flex items-center justify-between h-10 border-t shrink-0 select-none bg-(--bg-card) border-(--border-divider)`}
          >
            {/* Left Zone: Data Summary (Fixed width to prevent jitter) */}
            <div className='w-56 flex items-center h-full'>
              <div className='flex items-center gap-1 px-2.5 h-full text-[11px] uppercase font-bold tracking-wide text-(--text-secondary) tabular-nums'>
                {isShowAll ? (
                  <span className='whitespace-nowrap font-bold'>{t.global?.table?.showingAll || 'Showing All Items'}</span>
                ) : language === 'AR' ? (
                  <>
                    <span className='text-(--text-primary) inline-block min-w-[24px] text-center text-[12px]'>
                      {table.getFilteredRowModel().rows.length}
                    </span>
                    <span className='shrink-0 px-1'>{t.global?.table?.of || 'of'}</span>
                    <span className='text-(--text-primary) inline-block min-w-[20px] text-center text-[12px]'>
                      {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )}
                    </span>
                    <span className='opacity-50 px-0.5'>-</span>
                    <span className='text-(--text-primary) inline-block min-w-[20px] text-center text-[12px]'>
                      {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                    </span>
                    <span className='shrink-0'>{t.global?.table?.showing || 'Showing'}</span>
                  </>
                ) : (
                  <>
                    <span className='shrink-0'>{t.global?.table?.showing || 'Showing'}</span>
                    <span className='text-(--text-primary) inline-block min-w-[20px] text-center text-[12px]'>
                      {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                    </span>
                    <span className='opacity-50 px-0.5'>-</span>
                    <span className='text-(--text-primary) inline-block min-w-[20px] text-center text-[12px]'>
                      {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )}
                    </span>
                    <span className='shrink-0 px-1'>{t.global?.table?.of || 'of'}</span>
                    <span className='text-(--text-primary) inline-block min-w-[24px] text-center text-[12px]'>
                      {table.getFilteredRowModel().rows.length}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Center Zone: Navigation Controls (StatusBarItem Style) */}
            {!isShowAll && (
              <div className='flex-1 flex justify-center h-full'>
                <div className='flex items-center h-full'>
                  <button
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className='px-2.5 h-full flex items-center justify-center transition-colors text-(--text-secondary) hover:enabled:text-(--text-primary) hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 disabled:opacity-10'
                    title='First Page'
                  >
                    <span className='material-symbols-rounded leading-none' style={{ fontSize: '18px' }}>
                      first_page
                    </span>
                  </button>
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className='px-2.5 h-full flex items-center justify-center transition-colors text-(--text-secondary) hover:enabled:text-(--text-primary) hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 disabled:opacity-10'
                    title='Previous Page'
                  >
                    <span className='material-symbols-rounded leading-none' style={{ fontSize: '18px' }}>
                      chevron_left
                    </span>
                  </button>

                  <div
                    onClick={() => {
                      if (!isJumping) {
                        setIsJumping(true);
                        setJumpValue((table.getState().pagination.pageIndex + 1).toString());
                      }
                    }}
                    className={`px-4 flex items-center h-full text-[12px] font-bold text-(--text-secondary) tabular-nums transition-colors group ${
                      !isJumping ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/10' : ''
                    }`}
                  >
                    {isJumping ? (
                      <div className='flex items-center gap-1'>
                        <input
                          autoFocus
                          type='text'
                          value={jumpValue}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val === '') {
                              setJumpValue('');
                              return;
                            }
                            const num = parseInt(val);
                            if (num >= 1 && num <= table.getPageCount()) {
                              setJumpValue(val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && jumpValue) {
                              table.setPageIndex(parseInt(jumpValue) - 1);
                              setIsJumping(false);
                            } else if (e.key === 'Escape') {
                              setIsJumping(false);
                            }
                          }}
                          onBlur={() => {
                            // Delay slightly to allow click on Enter if needed, but blur is usually enough
                            setTimeout(() => setIsJumping(false), 150);
                          }}
                          className='w-8 h-4 bg-transparent border-b border-(--border-primary)/50 focus:border-primary-500 text-center outline-none text-(--text-primary) rounded-none'
                        />
                        <span className='opacity-50 mx-0.5'>/</span>
                        <span className='opacity-70 inline-block min-w-[24px] text-center'>{table.getPageCount()}</span>
                      </div>
                    ) : (
                      <>
                        <span className='group-hover:text-(--text-primary) inline-block min-w-[24px] text-center'>
                          {table.getState().pagination.pageIndex + 1}
                        </span>
                        <span className='opacity-50 mx-1'>/</span>
                        <span className='opacity-70 inline-block min-w-[24px] text-center'>{table.getPageCount()}</span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className='px-2.5 h-full flex items-center justify-center transition-colors text-(--text-secondary) hover:enabled:text-(--text-primary) hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 disabled:opacity-10'
                    title='Next Page'
                  >
                    <span className='material-symbols-rounded leading-none' style={{ fontSize: '18px' }}>
                      chevron_right
                    </span>
                  </button>
                  <button
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className='px-2.5 h-full flex items-center justify-center transition-colors text-(--text-secondary) hover:enabled:text-(--text-primary) hover:enabled:bg-black/5 dark:hover:enabled:bg-white/10 disabled:opacity-10'
                    title='Last Page'
                  >
                    <span className='material-symbols-rounded leading-none' style={{ fontSize: '18px' }}>
                      last_page
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Right Zone: Utility Tools (Fixed width for balance) */}
            <div className='w-56 flex items-center justify-end h-full'>
              <button
                onClick={() => tableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className='px-2.5 h-full flex items-center justify-center transition-colors text-(--text-secondary) hover:text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10'
                title='Jump to Top'
              >
                <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                  vertical_align_top
                </span>
              </button>

              {enableShowAll && (
                <button
                  onClick={() => setIsShowAll(!isShowAll)}
                  className={`px-2.5 h-full flex items-center justify-center transition-colors ${
                    isShowAll
                      ? `text-primary-600 bg-primary-500/10 dark:text-primary-400 dark:bg-primary-400/10`
                      : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  title={isShowAll ? 'Paginated View' : t.global?.table?.showAll || 'Show All'}
                >
                  <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                    {isShowAll ? 'splitscreen' : 'view_day'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
