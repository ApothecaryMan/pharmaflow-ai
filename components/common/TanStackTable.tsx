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
 *      - Example: `<span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider bg-transparent"><span className="material-symbols-rounded text-sm">check_circle</span>APPROVED</span>`
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
import { formatCurrencyParts, formatCompactCurrencyParts } from '../../utils/currency';
import { normalizeDigits } from '../../utils/localization';
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
import { CARD_BASE } from '../../utils/themeStyles';

export const PriceDisplay: React.FC<{
  value: number;
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  compact?: boolean;
}> = ({ value, size = 'base', compact = false }) => {
  const { amount, symbol } = compact
    ? formatCompactCurrencyParts(value, 'EGP', undefined, 2)
    : formatCurrencyParts(value, 'EGP');

  // Scale symbol based on text size approximately
  const SYMBOL_SCALES = {
    sm: 'text-[0.75em]',
    base: 'text-[0.75em]',
    lg: 'text-[0.75em]',
    xl: 'text-[0.6em]',
    '2xl': 'text-[0.5em]'
  } as const;

  const symbolClass = SYMBOL_SCALES[size] || SYMBOL_SCALES.base;

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

// Define a unified filter function that handles both strings (search) and arrays (pills)
const unifiedFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true;

  const value = row.getValue(columnId);

  // Handle Array-based filters (Pills)
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0 || filterValue.includes('all')) return true;
    
    // Cell value might be an array or a scalar
    if (Array.isArray(value)) {
      return value.some(v => filterValue.includes(v));
    }
    return filterValue.includes(value);
  }

  // Handle String-based filters (Search)
  const search = normalizeDigits(String(filterValue).toLowerCase().trim());
  if (!search) return true;

  const strValue = normalizeDigits(String(value || '').toLowerCase());
  return strValue.includes(search);
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

export interface TanStackTableProps<TData extends { id: string | number }, TValue> {
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
  pendingRowIds?: Set<string | number>;
  enableNewRowAnimation?: boolean;
}

// Helper to get stored settings
const getStoredSettings = (tableId: string) => {
  return storage.get(`table-settings-${tableId}`, null);
};

const getSmartAlignment = (columnId: string, meta?: any): 'start' | 'end' | 'center' => {
  if (meta?.align) return meta.align === 'left' ? 'start' : meta.align === 'right' ? 'end' : meta.align;
  
  const id = columnId.toLowerCase();
  if (['price', 'cost', 'revenue', 'profit', 'qty', 'quantity', 'amount', 'total', 'balance'].some(key => id.includes(key))) return 'end';
  if (['status', 'active', 'is_', 'action', 'driver', 'man'].some(key => id.includes(key))) return 'center';
  return 'start';
};

export function TanStackTable<TData extends { id: string | number }, TValue>({
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
  pendingRowIds = new Set(),
  enableNewRowAnimation = true,
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

  const { language, numeralLocale, textLocale } = useSettings();
  const isAR = language === 'AR';
  const languageLocale = textLocale;
  const t = TRANSLATIONS[language];

  // Load initial state from localStorage
  const [storedSettings, setStoredSettings] = useState(() => getStoredSettings(tableId));

  // Build default visibility from defaultHiddenColumns
  const defaultVisibility = React.useMemo(() => {
    const visibility: VisibilityState = {};
    defaultHiddenColumns.forEach(id => { visibility[id] = false; });
    columns.forEach(col => {
      const id = (col as any).id || (col as any).accessorKey;
      if (id && (col as any).meta?.hideFromSettings) visibility[id] = false;
    });
    return visibility;
  }, [defaultHiddenColumns, columns]);

  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  // We manage "Active Pills" as Column Filters
  const [columnFilters, setColumnFilters] = useState<{ id: string; value: any }[]>(() =>
    Object.entries(initialFilters).map(([id, value]) => ({ id, value }))
  );

  // Sync internal filters with props only when props actually change
  React.useEffect(() => {
    const propFilters = Object.entries(initialFilters).map(([id, value]) => ({ id, value }));
    const currentStr = JSON.stringify(columnFilters);
    const propStr = JSON.stringify(propFilters);
    
    if (propStr !== currentStr) {
      setColumnFilters(propFilters);
    }
  }, [initialFilters]);

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

    columns.forEach((col) => {
      const id = (col as any).id || (col as any).accessorKey;
      if (id) {
        alignment[id] = alignment[id] || getSmartAlignment(id, (col as any).meta);
      }
    });

    return { ...alignment, ...(storedSettings?.columnAlignment || {}) };
  }, [columns, defaultColumnAlignment, storedSettings]);

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
      setStoredSettings(settings);
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
  // But preserve user overrides by checking if the alignment has actually changed
  // between the new memoized defaults and the current state.
  React.useEffect(() => {
    setColumnAlignment((current) => {
      // If we already have alignments, and they are essentially the same as 
      // the memoized ones (which include latest stored settings), we don't need to force update
      // this helps avoid jitter during re-renders.
      const hasChanged = Object.keys(memoizedInitialAlignment).some(
        (key) => current[key] !== memoizedInitialAlignment[key]
      );
      
      return hasChanged ? memoizedInitialAlignment : current;
    });
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

  const [localLoading, setLocalLoading] = React.useState(data.length > 0);
  const [updatedRowIds, setUpdatedRowIds] = React.useState<Set<string | number>>(new Set());
  const [newRowIds, setNewRowIds] = React.useState<Set<string | number>>(new Set());
  const prevDataRef = React.useRef<any[]>(data);
  const isFirstRun = React.useRef(true);
  
  React.useEffect(() => {
    // Smooth transition: Show skeleton for at least 100ms on mount
    const timer = setTimeout(() => setLocalLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Row-level Change Detection (Live Sync Feel)
  React.useEffect(() => {
    if (prevDataRef.current !== data && data.length > 0) {
      // Baseline Capture: Don't animate initial load
      if (isFirstRun.current) {
        isFirstRun.current = false;
        prevDataRef.current = data;
        return;
      }

      const addedIds = new Set<string | number>();
      const changedIds = new Set<string | number>();
      
      const oldDataMap = new Map(prevDataRef.current.map(r => [r.id, r]));
      
      for (const row of data) {
        const oldRow = oldDataMap.get(row.id);
        if (!oldRow) {
          if (enableNewRowAnimation) addedIds.add(row.id);
        } else if (pendingRowIds.has(row.id) && JSON.stringify(oldRow) !== JSON.stringify(row)) {
          changedIds.add(row.id);
        }
      }

      if (addedIds.size > 0) {
        setNewRowIds(prev => new Set([...prev, ...addedIds]));
        setTimeout(() => {
          setNewRowIds(prev => {
            const next = new Set(prev);
            addedIds.forEach(id => next.delete(id));
            return next;
          });
        }, 1500); // Shorter duration for snappier feel
      }

      if (changedIds.size > 0) {
        setUpdatedRowIds(changedIds);
        setTimeout(() => setUpdatedRowIds(new Set()), 2000);
      }
    }
    prevDataRef.current = data;
  }, [data, enableNewRowAnimation, pendingRowIds]);

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
    // Use default global filter to avoid overhead of unifiedFilterFn if it's just a string
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      if (value == null) return false;
      const search = String(filterValue).toLowerCase().trim();
      return String(value).toLowerCase().includes(search);
    },
    enableSorting: true,
    manualFiltering,
    filterFns: {
      arrIncludesSome: (row, columnId, value) => unifiedFilterFn(row, columnId, value, null as any),
    },
    // DEFAULT FILTER FN: Use arrIncludesSome for all columns by default 
    // This allows our Pill filters (which send arrays) to work seamlessly
    defaultColumn: {
      filterFn: 'arrIncludesSome',
    },
  });

  // Convert columnFilters array back to Record for SearchInput prop
  const activeFiltersRecord = React.useMemo(() => {
    const rec: Record<string, any[]> = {};
    columnFilters.forEach((f) => {
      rec[f.id] = f.value;
    });
    return rec;
  }, [columnFilters]);

  // Helper to update our unifying "SearchInput" state
  const handleFilterUpdate = React.useCallback((groupId: string, newValues: any[]) => {
    // Notify parent immediately if controlled
    if (onFilterChange) {
      const nextFilters = { ...activeFiltersRecord };
      if (newValues.length === 0) {
        delete nextFilters[groupId];
      } else {
        nextFilters[groupId] = newValues;
      }
      onFilterChange(nextFilters);
    }

    // Always update internal state to keep useReactTable sync
    setColumnFilters((prev) => {
      const other = prev.filter((f) => f.id !== groupId);
      return newValues.length === 0 ? other : [...other, { id: groupId, value: newValues }];
    });
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
      const calculatePageSize = () => {
        if (!tableContainerRef.current) return;
        
        const containerHeight = tableContainerRef.current.clientHeight;
        const headHeight = headerRef.current?.offsetHeight || 45;
        const rowHeight = firstRowRef.current?.offsetHeight || (dense ? 36 : 48);
        
        const availableHeight = containerHeight - headHeight;
        // Use a more realistic minimum to avoid 1-row tables on glitchy initial renders
        const calculated = Math.max(10, Math.floor(availableHeight / rowHeight));
        
        if (calculated !== pagination.pageSize && calculated > 0) {
          table.setPageSize(calculated);
        }
      };

      // Initial calculation
      calculatePageSize();

      const observer = new ResizeObserver(() => {
        calculatePageSize();
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

  // --- Unified Column Metadata ---
  const columnMetaMap = React.useMemo(() => {
    const map = new Map<string, any>();
    
    // Flatten columns to get leaf columns without depending on the table instance
    const getLeafColumns = (cols: ColumnDef<any, any>[]): any[] => {
      let leaf: any[] = [];
      cols.forEach(c => {
        if ((c as any).columns) {
          leaf = [...leaf, ...getLeafColumns((c as any).columns)];
        } else {
          leaf.push(c);
        }
      });
      return leaf;
    };

    const leafColumns = getLeafColumns(columns);

    leafColumns.forEach((col) => {
      const colId = (col.id || col.accessorKey || '').toString().toLowerCase();
      const meta = col.meta as any;
      const id = (col.id || col.accessorKey || '').toString();
      
      const align = (meta?.disableAlignment ? null : columnAlignment[id]) || getSmartAlignment(id, meta);
      
      const isId = meta?.isId ?? (colId.includes('id') || colId.includes('code'));
      const isDate = (['date', 'time', 'timestamp', 'visit'].some(k => colId.includes(k)) || 
                     (colId.includes('at') && !colId.includes('csat'))) && !colId.includes('expiry');
      
      map.set(id, {
        align,
        isId,
        isDate,
        isAction: colId.includes('action'),
        isFlex: meta?.flex ?? colId.includes('name'),
        justifyClass: getHeaderJustifyClass(align),
        textAlignClass: getTextAlignClass(align),
        itemsAlignClass: getItemsAlignClass(align),
        width: meta?.width,
        minWidth: meta?.minWidth,
        smartDate: meta?.smartDate !== false,
      });
    });
    return map;
  }, [columns, columnAlignment]);

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
                  resultsCount={table.getFilteredRowModel().rows.length}
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
            : `${CARD_BASE} rounded-2xl overflow-hidden`
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
                <span className='material-symbols-rounded opacity-40' style={{ fontSize: 'var(--icon-5xl)' }}>view_column</span>
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
                      const meta = columnMetaMap.get(header.column.id);
                      const headerAlign = header.column.columnDef.meta?.headerAlign;
                      const align = headerAlign || meta?.align || 'start';
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
              <tbody className='[&_td:not(.action-col):not(.empty-state)_.material-symbols-rounded]:!text-[length:var(--icon-sm)] [&_td:not(.action-col):not(.empty-state)_.material-symbols-rounded]:!text-sm'>
                {isLoading || (localLoading && rows.length === 0) ? (
                  <>
                    {[...Array(Math.max(5, typeof pageSize === 'number' ? pageSize : 10))].map((_, i) => (
                      <tr key={`skeleton-row-${i}`} className='animate-pulse border-b border-(--border-divider)'>
                        {table.getVisibleLeafColumns().map((col) => (
                          <td key={`skeleton-cell-${col.id}-${i}`} className={`${dense ? 'py-2' : 'py-4'} px-4`}>
                            <div className="flex flex-col gap-2 [direction:ltr] items-start">
                              <div className='h-3 bg-gray-100 dark:bg-neutral-800/60 rounded-md w-24' />
                              {/* Sub-line for some columns to look more natural */}
                              {col.id.toLowerCase().includes('name') && (
                                <div className='h-2 bg-gray-50 dark:bg-neutral-800/30 rounded-md w-16' />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
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
                          className={`transition-all duration-300 overflow-visible group/row ${onRowClick ? 'cursor-pointer' : ''} ${
                        newRowIds.has(row.original.id)
                          ? 'new-transaction'
                          : pendingRowIds.has(row.original.id)
                            ? 'bg-orange-50/50 dark:bg-orange-900/20 animate-pulse'
                            : updatedRowIds.has(row.original.id)
                              ? 'bg-emerald-50/50 dark:bg-emerald-900/20 animate-pulse'
                              : activeIndex !== undefined && rowIndex === activeIndex
                                ? `bg-primary-50 dark:bg-primary-900/20`
                                : 'hover:bg-(--bg-hover)'
                      }`}
                    >
                      {row.getVisibleCells().map((cell: any) => {
                        const meta = columnMetaMap.get(cell.column.id);
                        if (!meta) return null;

                        const cellValue = cell.getValue();
                        const cellDir = (cell.column.columnDef.meta as any)?.dir === 'auto' || (! (cell.column.columnDef.meta as any)?.dir && meta.isFlex && typeof cellValue === 'string')
                          ? getSmartDirection(String(cellValue || ''))
                          : (cell.column.columnDef.meta as any)?.dir;

                        // --- Smart Date Formatting ---
                        let content = null;
                        if (meta.smartDate && meta.isDate && cellValue) {
                          const date = new Date(cellValue);
                          if (!isNaN(date.getTime())) {
                            const targetTs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                            const isToday = targetTs === todayTs;
                            const isYesterday = targetTs === yesterdayTs;
                            const dateLabel = isToday ? (isRtl ? 'اليوم' : 'Today') : isYesterday ? (isRtl ? 'أمس' : 'Yesterday') : date.toLocaleDateString();
                            
                            // Manual AM/PM to ensure "ص" and "م"
                            const hourRaw = date.getHours();
                            const ampm = isRtl ? (hourRaw >= 12 ? 'م' : 'ص') : (hourRaw >= 12 ? 'PM' : 'AM');
                            const displayHour = (hourRaw % 12 || 12).toLocaleString(undefined, { useGrouping: false });
                            const displayMinute = date.getMinutes().toLocaleString(undefined, { minimumIntegerDigits: 2, useGrouping: false });
                            const formattedTime = isAR ? `${displayHour}:${displayMinute} ${ampm}` : `${displayHour}:${displayMinute} ${ampm}`;

                            content = (
                              <div className={`flex flex-col ${meta.itemsAlignClass}`}>
                                <span className='font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight'>
                                  {isToday ? formattedTime : dateLabel}
                                </span>
                                {!isToday && (
                                  <span className='text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap -mt-0.5 tracking-tight'>
                                    {formattedTime}
                                  </span>
                                )}
                              </div>
                            );
                          }
                        }
                        
                        // Fallback to default render if no format applied
                        if (!content) {
                          content = flexRender(cell.column.columnDef.cell, cell.getContext());
                        }

                        // TIER 3: Inline loading skeleton for existing data (background refresh)
                        // SURGICAL: Only show skeletons for rows explicitly pending to avoid "coloring" the whole table
                        const isRowPending = pendingRowIds.has(row.original.id);
                        if ((isRowPending || localLoading) && rows.length > 0) {
                          const isActionColumn = cell.column.id === 'actions' || cell.column.id === 'status' || cell.column.id.includes('select');
                          if (!isActionColumn) {
                            content = (
                              <div className="animate-pulse">
                                <div className="h-3 w-3/4 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                                <div className="h-2 w-1/2 bg-zinc-50 dark:bg-zinc-800/30 rounded mt-1" />
                              </div>
                            );
                          } else {
                            content = (
                              <div className="animate-pulse opacity-50">
                                {content}
                              </div>
                            );
                          }
                        }

                        const columnId = cell.column.id.toLowerCase();
                        const header = String(cell.column.columnDef.header || '').toLowerCase();
                        const isTechnical = 
                          columnId.includes('id') || columnId.includes('sku') || columnId.includes('barcode') || 
                          columnId.includes('batch') || columnId.includes('serial') || 
                          columnId.includes('email') || columnId.includes('address') ||
                          columnId.includes('phone') || columnId.includes('mobile') ||
                          columnId.includes('invoice') || columnId.includes('receipt') ||
                          columnId.includes('code') ||
                          header.includes('id') || header.includes('sku') || header.includes('barcode') || 
                          header.includes('batch') || header.includes('serial') ||
                          header.includes('email') || header.includes('address') ||
                          header.includes('phone') || header.includes('mobile') ||
                          header.includes('invoice') || header.includes('receipt') ||
                          header.includes('code') ||
                          meta.isId || meta.noConvert;

                        return (
                          <td
                            key={cell.id}
                            data-no-convert={isTechnical ? 'true' : undefined}
                            className={`${dense ? 'py-1 text-xs' : 'py-3 text-sm'} px-4 font-medium text-(--text-primary) align-middle border-b border-(--border-divider) group-last/row:border-b-0
                            ${meta.isFlex ? '' : 'whitespace-nowrap'} ${meta.isAction ? 'action-col' : ''}`}
                            style={{
                              width: meta.isFlex ? 'auto' : (cell.column.columnDef.meta?.width || cell.column.getSize()),
                              minWidth: meta.minWidth,
                            }}
                            dir={cellDir}
                          >
                            <div className={`flex items-center gap-1.5 w-full ${meta.justifyClass} ${meta.isId && meta.align === 'start' ? '-ms-3' : ''} ${meta.isId && meta.align === 'end' ? '-me-3' : ''}`}>
                              {meta.isId && (
                                <span className='material-symbols-rounded text-gray-400 shrink-0' style={{ fontSize: 'var(--icon-md)' }}>
                                  tag
                                </span>
                              )}
                              <span dir={meta.isId ? 'ltr' : undefined}>
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
                      className='py-12 text-center text-gray-500 dark:text-gray-400 empty-state'
                    >
                      {customEmptyState ? (
                        customEmptyState
                      ) : (
                        <div className='flex flex-col items-center justify-center'>
                          <span className='material-symbols-rounded mb-4 opacity-20' style={{ fontSize: 'var(--icon-5xl)' }}>
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
                ) : (
                  <div className='flex items-center gap-1'>
                    <span className='shrink-0'>{t.global?.table?.showing || 'Showing'}</span>
                    <span className='text-(--text-primary) inline-block min-w-[20px] text-center text-[12px]'>
                      {(isAR 
                        ? Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)
                        : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
                      ).toLocaleString()}
                    </span>
                    <span className='opacity-50 px-0.5'>-</span>
                    <span className='text-(--text-primary) inline-block min-w-[20px] text-center text-[12px]'>
                      {(isAR
                        ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
                        : Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)
                      ).toLocaleString()}
                    </span>
                    <span className='shrink-0 px-1'>{t.global?.table?.of || 'of'}</span>
                    <span className='text-(--text-primary) inline-block min-w-[24px] text-center text-[12px]'>
                      {table.getFilteredRowModel().rows.length.toLocaleString()}
                    </span>
                  </div>
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
                            setTimeout(() => setIsJumping(false), 150);
                          }}
                          className='w-8 h-4 bg-transparent border-b border-(--border-primary)/50 focus:border-primary-500 text-center outline-none text-(--text-primary) rounded-none'
                        />
                        <span className='opacity-50 mx-0.5'>/</span>
                        <span className='opacity-70 inline-block min-w-[24px] text-center'>
                          {table.getPageCount().toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className='group-hover:text-(--text-primary) inline-block min-w-[24px] text-center'>
                          {(table.getState().pagination.pageIndex + 1).toLocaleString()}
                        </span>
                        <span className='opacity-50 mx-1'>/</span>
                        <span className='opacity-70 inline-block min-w-[24px] text-center'>
                          {table.getPageCount().toLocaleString()}
                        </span>
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
