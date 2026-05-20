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
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef, useState } from 'react';

import { useSettings } from '../../context/SettingsContext';
import { useLongPress } from '../../hooks/common/useLongPress';
import { TRANSLATIONS } from '../../i18n/translations';
import { CARD_BASE } from '../../utils/themeStyles';
import { storage } from '../../utils/storage';
import {
  ContextMenuItem,
  ContextMenuTrigger,
  useContextMenu,
} from './ContextMenu';
import type { FilterConfig } from './FilterPill';
import { SearchInput } from './SearchInput';
import { getHeaderJustifyClass, getTextAlignClass } from './TableAlignment';

// Modular Table Imports
import { type TanStackTableProps } from './table/types';
import {
  unifiedFilterFn,
  globalFilterFnStable,
  getStoredSettings,
  copyTextToClipboard,
  getColumnWidth,
  computeColumnMeta,
  getHeaderAlignment,
  getSmartAlignment,
} from './table/helpers';
import { PriceDisplay } from './table/PriceDisplay';
import { MemoizedCell } from './table/MemoizedCell';
import { MemoizedRow } from './table/MemoizedRow';
import { PageButton } from './table/PageButton';
import { TableContextMenu } from './table/TableContextMenu';
export { PriceDisplay };

const EMPTY_ALIGNMENT = {};

// ─── Hook: Row Change Animation ───
// Tracks newly added and updated rows for animation purposes.
function useRowChangeAnimation(
  data: { id: string | number; status?: string; updated_at?: string; quantity?: number; price?: number }[],
  enableNewRowAnimation: boolean,
  pendingRowIds: Set<string | number>
) {
  const [updatedRowIds, setUpdatedRowIds] = React.useState<Set<string | number>>(new Set());
  const [newRowIds, setNewRowIds] = React.useState<Set<string | number>>(new Set());
  const prevDataRef = React.useRef(data);
  const isFirstRun = React.useRef(true);

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
      const oldDataMap = new Map<string | number, any>(prevDataRef.current.map((r) => [r.id, r]));

      for (const row of data) {
        const oldRow = oldDataMap.get(row.id);
        if (!oldRow) {
          if (enableNewRowAnimation) addedIds.add(row.id);
        } else if (pendingRowIds.has(row.id)) {
          // Efficient shallow comparison on common sync fields
          const changed =
            oldRow.status !== row.status ||
            oldRow.updated_at !== row.updated_at ||
            oldRow.quantity !== row.quantity ||
            oldRow.price !== row.price;
          if (changed) changedIds.add(row.id);
        }
      }

      if (addedIds.size > 0) {
        setNewRowIds((prev) => new Set([...prev, ...addedIds]));
        setTimeout(() => {
          setNewRowIds((prev) => {
            const next = new Set(prev);
            addedIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 1500);
      }

      if (changedIds.size > 0) {
        setUpdatedRowIds(changedIds);
        setTimeout(() => setUpdatedRowIds(new Set()), 1500);
      }
    }
    prevDataRef.current = data;
  }, [data, enableNewRowAnimation, pendingRowIds]);

  return { newRowIds, updatedRowIds };
}

// ─── Component: Table Pagination Bar ───
// StatusBar-style pagination with page navigation, jump-to-page, and show-all toggle.
interface TablePaginationBarProps {
  table: import('@tanstack/react-table').Table<any>;
  isShowAll: boolean;
  setIsShowAll: (v: boolean) => void;
  isRtl: boolean;
  translations: {
    showingAll?: string;
    showing?: string;
    of?: string;
    showAll?: string;
  };
  enableShowAll: boolean;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
}

const TablePaginationBar: React.FC<TablePaginationBarProps> = ({
  table,
  isShowAll,
  setIsShowAll,
  isRtl,
  translations: t,
  enableShowAll,
  tableContainerRef,
}) => {
  // Jump-to-page state lives here — only pagination needs it
  const [isJumping, setIsJumping] = React.useState(false);
  const [jumpValue, setJumpValue] = React.useState('');

  return (
    <div
      dir='ltr'
      className='flex items-center justify-between h-10 border-t shrink-0 select-none bg-(--bg-card) border-(--border-divider)'
    >
      {/* Left Zone: Data Summary (Fixed width to prevent jitter) */}
      <div
        dir='auto'
        className={`w-56 flex items-center h-full ${isRtl ? 'justify-end' : ''}`}
      >
        <div className='flex items-center gap-1 px-2.5 h-full text-[11px] uppercase font-bold tracking-wide text-(--text-secondary) tabular-nums'>
          {isShowAll ? (
            <span className='whitespace-nowrap font-bold'>
              {t.showingAll || 'Showing All Items'}
            </span>
          ) : (
            <div className='flex items-center gap-1'>
              <span className='shrink-0'>{t.showing || 'Showing'}</span>
              <span className='text-(--text-primary) inline-block min-w-[20px] text-center text-[12px]'>
                {(
                  table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1
                ).toLocaleString()}
              </span>
              <span className='text-(--text-primary) px-0.5'>-</span>
              <span className='text-(--text-primary) inline-block min-w-[20px] text-center text-[12px]'>
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                ).toLocaleString()}
              </span>
              <span className='shrink-0 px-1'>{t.of || 'of'}</span>
              <span className='text-(--text-primary) inline-block min-w-[24px] text-center text-[12px]'>
                {table.getFilteredRowModel().rows.length.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center Zone: Navigation Controls */}
      {!isShowAll && (
        <div className='flex-1 flex justify-center h-full'>
          <div className='flex items-center h-full'>
            <PageButton
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              icon='first_page'
              title='First Page'
            />
            <PageButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              icon='chevron_left'
              title='Previous Page'
            />

            <div
              onClick={() => {
                if (!isJumping) {
                  setIsJumping(true);
                  setJumpValue((table.getState().pagination.pageIndex + 1).toString());
                }
              }}
              className={`px-4 flex items-center h-full text-[12px] font-bold text-(--text-secondary) tabular-nums transition-colors group ${!isJumping ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/10' : ''
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

            <PageButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              icon='chevron_right'
              title='Next Page'
            />
            <PageButton
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              icon='last_page'
              title='Last Page'
            />
          </div>
        </div>
      )}

      {/* Right Zone: Utility Tools (Fixed width for balance) */}
      <div className='w-56 flex items-center justify-end h-full'>
        <PageButton
          onClick={() => tableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          disabled={false}
          icon='vertical_align_top'
          title='Jump to Top'
        />

        {enableShowAll && (
          <button
            onClick={() => setIsShowAll(!isShowAll)}
            className={`px-2.5 h-full flex items-center justify-center transition-colors ${isShowAll
                ? `text-primary-600 bg-primary-500/10 dark:text-primary-400 dark:bg-primary-400/10`
                : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            title={isShowAll ? 'Paginated View' : t.showAll || 'Show All'}
          >
            <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
              {isShowAll ? 'splitscreen' : 'view_day'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
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
  onVisibleRowsChange,
}: TanStackTableProps<TData, TValue>) {

  const { language, numeralLocale, textLocale } = useSettings();
  const isAR = language === 'AR';
  const isRtl = isAR; // Source of truth from state, not DOM, to prevent sync lag
  const languageLocale = textLocale;
  const t = TRANSLATIONS[language];

  // Long-press support for rows
  const currentTouchRow = useRef<TData | null>(null);
  const onRowLongPressRef = useRef(onRowLongPress);
  onRowLongPressRef.current = onRowLongPress;

  const handleLongPress = React.useCallback(
    (e: React.TouchEvent) => {
      if (onRowLongPressRef.current && currentTouchRow.current) {
        onRowLongPressRef.current(e, currentTouchRow.current);
      }
    },
    []
  );

  const {
    onTouchStart: onRowTouchStart,
    onTouchEnd: onRowTouchEnd,
    onTouchMove: onRowTouchMove,
  } = useLongPress({
    onLongPress: handleLongPress,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const firstRowRef = useRef<HTMLTableRowElement>(null);

  // Load initial settings from localStorage once on mount/tableId change
  const initialSettings = React.useMemo(() => getStoredSettings(tableId), [tableId]);

  // Build default visibility from defaultHiddenColumns
  const defaultVisibility = React.useMemo(() => {
    const visibility: VisibilityState = {};
    defaultHiddenColumns.forEach((id) => (visibility[id] = false));
    columns.forEach((col) => {
      const id = (col as any).id || (col as any).accessorKey;
      if (id && (col as any).meta?.hideFromSettings) {
        visibility[id] = false;
      }
    });
    return visibility;
  }, [defaultHiddenColumns, columns]);

  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  const [copied, setCopied] = useState(false);
  // We manage "Active Pills" as Column Filters
  const [columnFilters, setColumnFilters] = useState<{ id: string; value: any }[]>(() => {
    const propFilters = Object.entries(initialFilters).map(([id, value]) => ({ id, value }));
    return propFilters;
  });

  // ─── Optimization: stringify once per effect for stable comparison ───
  const initialFiltersJson = JSON.stringify(initialFilters);
  React.useEffect(() => {
    const propFilters = Object.entries(initialFilters).map(([id, value]) => ({ id, value }));
    setColumnFilters((prev) =>
      JSON.stringify(prev) === JSON.stringify(propFilters) ? prev : propFilters
    );
  }, [initialFiltersJson]);

  const [isShowAll, setIsShowAll] = useState(false);

  const globalFilter =
    externalGlobalFilter !== undefined ? externalGlobalFilter : internalGlobalFilter;

  const globalFilterRef = useRef(globalFilter);
  globalFilterRef.current = globalFilter;

  const setGlobalFilter = React.useCallback(
    (updaterOrValue: string | ((prev: string) => string)) => {
      const newValue =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(globalFilterRef.current)
          : updaterOrValue;

      if (onSearchChange) {
        onSearchChange(newValue);
      }
      if (externalGlobalFilter === undefined) {
        setInternalGlobalFilter(newValue);
      }
    },
    [onSearchChange, externalGlobalFilter]
  );

  const [debouncedGlobalFilter, setDebouncedGlobalFilter] = useState(globalFilter);

  React.useEffect(() => {
    if (!globalFilter) {
      setDebouncedGlobalFilter('');
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedGlobalFilter(globalFilter);
    }, 150);
    return () => clearTimeout(handler);
  }, [globalFilter]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialSettings?.columnVisibility || defaultVisibility
  );

  // Initialize alignment: Priority = Stored > Prop > Meta > Smart Default
  const memoizedInitialAlignment = React.useMemo(() => {
    const alignment: Record<string, 'start' | 'center' | 'end'> = { ...defaultColumnAlignment };

    for (const col of columns as any[]) {
      const id = col.id || col.accessorKey;
      if (id) {
        alignment[id] ||= getSmartAlignment(id, col.meta);
      }
    }

    return { ...alignment, ...initialSettings?.columnAlignment };
  }, [columns, defaultColumnAlignment, initialSettings]);

  const [columnAlignment, setColumnAlignment] =
    useState<Record<string, 'start' | 'center' | 'end'>>(memoizedInitialAlignment);

  // Helper to extract only the overrides (values different from defaults)
  const getDiff = React.useCallback(
    (
      current: Record<string, 'start' | 'center' | 'end'>,
      defaults: Record<string, 'start' | 'center' | 'end'>
    ) => {
      return Object.fromEntries(
        Object.entries(current).filter(([key, val]) => val !== defaults[key])
      ) as Record<string, 'start' | 'center' | 'end'>;
    },
    []
  );

  const [pagination, setPagination] = React.useState({
    pageIndex: initialSettings?.pagination?.pageIndex ?? 0,
    pageSize:
      initialSettings?.pagination?.pageSize === 'auto'
        ? 20
        : (initialSettings?.pagination?.pageSize ?? (pageSize === 'auto' ? 20 : pageSize)),
  });

  // Persist settings to localStorage on change
  React.useEffect(() => {
    const settings = {
      columnVisibility,
      columnAlignment: getDiff(columnAlignment, defaultColumnAlignment),
      pagination,
    };
    storage.set(`table-settings-${tableId}`, settings);
  }, [tableId, columnVisibility, columnAlignment, pagination, defaultColumnAlignment, getDiff]);

  // ─── Optimization: stable global keydown handler via refs ───
  const enableGlobalSearchFocusRef = useRef(enableGlobalSearchFocus);
  const enableSearchRef = useRef(enableSearch);
  enableGlobalSearchFocusRef.current = enableGlobalSearchFocus;
  enableSearchRef.current = enableSearch;

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!enableGlobalSearchFocusRef.current || !enableSearchRef.current) return;
      // Don't intercept if user is already in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Capture simple alphanumeric for search focus
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setGlobalFilter((prev: any) => (prev ? prev + e.key : e.key));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setGlobalFilter]);

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



  const [localLoading, setLocalLoading] = React.useState(data.length > 0);
  const { newRowIds, updatedRowIds } = useRowChangeAnimation(data as any, enableNewRowAnimation, pendingRowIds);

  // Stable refs for callbacks to prevent MemoizedRow re-renders
  const onRowClickRef = useRef(onRowClick);
  onRowClickRef.current = onRowClick;
  const onRowContextMenuRef = useRef(onRowContextMenu);
  onRowContextMenuRef.current = onRowContextMenu;

  const handleRowClick = React.useCallback((rowData: TData) => {
    onRowClickRef.current?.(rowData);
  }, []);

  const handleRowContextMenu = React.useCallback((e: React.MouseEvent, rowData: TData) => {
    e.preventDefault();
    onRowContextMenuRef.current?.(e, rowData);
  }, []);

  React.useEffect(() => {
    // Smooth transition: Show skeleton for at least 100ms on mount
    const timer = setTimeout(() => setLocalLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const [columnSizing, setColumnSizing] = React.useState({});
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: debouncedGlobalFilter,
      columnFilters,
      columnVisibility,
      columnSizing,
      pagination: isShowAll ? { pageIndex: 0, pageSize: data.length || 1 } : pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    columnResizeDirection: isRtl ? 'rtl' : 'ltr',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    // ─── Optimization: use module-level stable reference ───
    globalFilterFn: globalFilterFnStable,
    enableSorting: true,
    manualFiltering,
    filterFns: {
      arrIncludesSome: unifiedFilterFn,
    },
    // DEFAULT FILTER FN: Use our unified logic for all columns
    defaultColumn: {
      filterFn: unifiedFilterFn,
    },
  });

  const handleCopyTableConfig = React.useCallback(() => {
    // Measure actual rendered widths from the DOM
    const domWidths: Record<string, number> = {};
    headerRef.current?.querySelectorAll('th').forEach((th) => {
      const colId = th.getAttribute('data-column-id');
      const w = th.getBoundingClientRect().width;
      if (colId && w > 0) {
        domWidths[colId] = Math.round(w);
      }
    });

    const columnConfigs = table.getAllLeafColumns().map((col) => {
      const id = col.id;
      const meta = col.columnDef.meta as any;
      const align = columnAlignment[id] || getSmartAlignment(id, meta);
      const size = domWidths[id] ?? col.getSize();
      return {
        id,
        size,
        align,
      };
    });

    copyTextToClipboard(JSON.stringify(columnConfigs, null, 2)).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [table, columnAlignment]);

  // Convert columnFilters array back to Record for SearchInput prop
  const activeFiltersRecord = React.useMemo(() => {
    return Object.fromEntries(columnFilters.map((f) => [f.id, f.value]));
  }, [columnFilters]);

  // Helper to update our unifying "SearchInput" state
  const handleFilterUpdate = React.useCallback(
    (groupId: string, newValues: any[]) => {
      // Notify parent immediately if controlled
      if (onFilterChange) {
        const nextFilters = { ...activeFiltersRecord };
        if (newValues.length > 0) {
          nextFilters[groupId] = newValues;
        } else {
          delete nextFilters[groupId];
        }
        onFilterChange(nextFilters);
      }

      // Always update internal state to keep useReactTable sync
      setColumnFilters((prev) => {
        const next = prev.filter((f) => f.id !== groupId);
        if (newValues.length > 0) {
          next.push({ id: groupId, value: newValues });
        }
        return next;
      });
    },
    [activeFiltersRecord, onFilterChange]
  );

  /* State specific for Context Menu tracking to enable live updates */
  const menuPosRef = React.useRef<{ x: number; y: number; columnId?: string } | null>(null);

  const onContextMenuOpen = React.useCallback(
    (x: number, y: number, columnId?: string) => {
      menuPosRef.current = { x, y, columnId };

      const renderMenu = (currentAlign: Record<string, 'start' | 'center' | 'end'>) => {
        const currentT = t.global.table;
        const translations = {
          columns: currentT?.columns || t.global.table.columns,
          alignment: currentT?.alignment || t.global.table.alignment,
        };

        const handleRefresh = (updatedAlign?: Record<string, 'start' | 'center' | 'end'>) => {
          if (menuPosRef.current) {
            renderMenu(updatedAlign ?? currentAlign);
          }
        };

        showMenu(
          menuPosRef.current?.x ?? x,
          menuPosRef.current?.y ?? y,
          <TableContextMenu
            table={table}
            columnId={menuPosRef.current?.columnId ?? columnId}
            columnAlignment={currentAlign}
            setColumnAlignment={setColumnAlignment}
            language={language}
            translations={translations}
            onRefresh={handleRefresh}
          />
        );
      };

      renderMenu(columnAlignment);
    },
    [table, showMenu, language, columnAlignment, t.global.table]
  );

  React.useEffect(() => {
    if (pageSize !== 'auto' || isShowAll || !tableContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      const el = tableContainerRef.current;
      if (!el) return;
      const headHeight = headerRef.current?.offsetHeight || 45;
      const rowHeight = firstRowRef.current?.offsetHeight || (dense ? 36 : 48);
      const calculated = Math.max(10, Math.floor((el.clientHeight - headHeight) / rowHeight));
      table.setPageSize(calculated);
    });

    observer.observe(tableContainerRef.current);
    return () => observer.disconnect();
  }, [pageSize, dense, isShowAll, table]);

  const handleColumnContextMenu = React.useCallback(
    (e: React.MouseEvent, columnId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenuOpen(e.clientX, e.clientY, columnId);
    },
    [onContextMenuOpen]
  );

  const { rows } = table.getRowModel();

  const onVisibleRowsChangeRef = React.useRef(onVisibleRowsChange);
  onVisibleRowsChangeRef.current = onVisibleRowsChange;

  React.useEffect(() => {
    onVisibleRowsChangeRef.current?.(rows.map((r) => r.original));
  }, [rows]);

  // --- Fix 5: Pre-compute Date Constants ---
  const { todayTs, yesterdayTs } = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayTs = today.getTime() - 86400000; // 24 * 60 * 60 * 1000
    return { todayTs: today.getTime(), yesterdayTs };
  }, []);

  // --- Optimization: Pre-calculate visible columns for performance ---
  const { visibleColumns, visibleColumnsCount } = React.useMemo(() => {
    const cols = table.getVisibleLeafColumns();
    return { visibleColumns: cols, visibleColumnsCount: cols.length };
  }, [columns, columnVisibility]);

  // --- Unified Column Metadata ---
  const columnMetaMap = React.useMemo(
    () => new Map(table.getAllLeafColumns().map((column) => [column.id, computeColumnMeta(column, columnAlignment)])),
    [columns, columnAlignment]
  );

  // Virtualizer Setup
  const getScrollElement = React.useCallback(() => tableContainerRef.current, []);
  const estimateSize = React.useCallback(() => (dense ? 36 : 48), [dense]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement,
    estimateSize,
    overscan: 10,
  });

  const measureRow = React.useCallback(
    (el: HTMLTableRowElement | null) => {
      if (!el) return;
      if (enableVirtualization) {
        rowVirtualizer.measureElement(el);
      }
      const indexAttr = el.getAttribute('data-index');
      if (indexAttr === '0') {
        firstRowRef.current = el;
      }
    },
    [enableVirtualization, rowVirtualizer]
  );

  const virtualItems = enableVirtualization ? rowVirtualizer.getVirtualItems() : null;

  const paddingTop = virtualItems && virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems && virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  const itemsToRender = enableVirtualization ? virtualItems! : rows;

  return (
    <div className='flex flex-col h-full w-full relative group/table-root'>
      {/* Header Controls */}
      {enableTopToolbar && (
        <div
          className={`flex flex-wrap items-center gap-4 justify-between ${enableSearch || leftCustomControls || rightCustomControls ? 'mb-4' : ''}`}
        >
          <div className='flex items-center gap-3 flex-1 min-w-0'>
            {leftCustomControls && (
              <div className='flex items-center gap-2'>{leftCustomControls}</div>
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
            <div className='flex items-center gap-2'>{rightCustomControls}</div>
          )}
        </div>
      )}

      {/* Unified Card Wrapper */}
      <div
        className={`flex flex-col flex-1 min-h-0 ${lite ? 'bg-transparent' : `${CARD_BASE} rounded-2xl overflow-hidden`
          }`}
      >
        {/* Table Scroll Area */}
        <div ref={tableContainerRef} className='flex-1 overflow-y-scroll  custom-scrollbar relative'>
          {visibleColumnsCount === 0 ? (
            <ContextMenuTrigger
              className='h-full w-full'
              onOpen={(x, y) => onContextMenuOpen(x, y)}
            >
              <div className='h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-3 select-none'>
                <span
                  className='material-symbols-rounded opacity-40'
                  style={{ fontSize: 'var(--icon-5xl)' }}
                >
                  view_column
                </span>
                <div className='text-center'>
                  <p className='text-lg font-medium mb-1'>{t.global.table.noColumnsVisible}</p>
                  <p className='text-sm opacity-70'>{t.global.table.manageColumnsHint}</p>
                </div>
              </div>
            </ContextMenuTrigger>
          ) : (
            <table className='w-full text-left border-separate border-spacing-0 table-fixed'>
              <thead ref={headerRef} className='sticky top-0 z-10 bg-(--bg-card)'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = columnMetaMap.get(header.column.id);
                      const align = getHeaderAlignment(header.column, meta, isRtl);
                      const justifyClass = getHeaderJustifyClass(align);
                      const textAlignClass = getTextAlignClass(align);
                      const isFlex = meta?.isFlex;

                      return (
                        <th
                          key={header.id}
                          data-column-id={header.column.id}
                          className={`p-0 text-xs font-bold text-(--text-tertiary) uppercase tracking-wider select-none relative group border-b border-(--border-divider)
                        ${textAlignClass}
                        ${isFlex ? '' : 'w-[1%] whitespace-nowrap'}`}
                          style={{
                            width: getColumnWidth(header.column, isFlex, columnSizing),
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
                                      ${align === 'end'
                                        ? 'ltr:right-full ltr:pr-1 rtl:left-full rtl:pl-1 opacity-100'
                                        : 'ltr:left-full ltr:pl-1 rtl:right-full rtl:pr-1'
                                      }
                                    `}
                                  >
                                    {header.column.getIsSorted() && (
                                      <span
                                        className='material-symbols-rounded leading-none text-current opacity-70'
                                        style={{ fontSize: 'var(--icon-lg)' }}
                                      >
                                        {header.column.getIsSorted() === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </ContextMenuTrigger>
                          {/* Resizer Handle */}
                          {header.column.getCanResize() && (
                            <div
                              {...{
                                onMouseDown: header.getResizeHandler(),
                                onTouchStart: header.getResizeHandler(),
                                className: `resizer absolute top-0 z-20 h-full w-1 cursor-col-resize select-none touch-none hover:bg-primary/30 transition-colors
                                  ${isRtl ? 'left-0' : 'right-0'} 
                                  ${header.column.getIsResizing() ? 'bg-primary w-1 opacity-100' : 'opacity-0'}`,
                              }}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              {/* Enforce var(--icon-sm) on all material-symbols-rounded icons inside table cells using arbitrary variants, except action columns */}
              <tbody className='[&_td:not(.action-col):not(.empty-state)_.material-symbols-rounded]:!text-[length:var(--icon-sm)] [&_td:not(.action-col):not(.empty-state)_.material-symbols-rounded]:!text-sm'>
                {(isLoading || localLoading) && rows.length === 0 ? (
                  <>
                    {[...Array(Math.max(5, typeof pageSize === 'number' ? pageSize : 10))].map(
                      (_, i) => (
                        <tr
                          key={`skeleton-row-${i}`}
                          className='animate-pulse border-b border-(--border-divider)'
                        >
                          {visibleColumns.map((col) => (
                            <td
                              key={`skeleton-cell-${col.id}-${i}`}
                              className={`${dense ? 'py-2' : 'py-4'} px-4`}
                            >
                              <div className='flex flex-col gap-2 [direction:ltr] items-start'>
                                <div className='h-3 bg-zinc-200/60 dark:bg-zinc-800/40 rounded-md w-24' />
                                {/* Sub-line for some columns to look more natural */}
                                {col.id.toLowerCase().includes('name') && (
                                  <div className='h-2 bg-zinc-100/80 dark:bg-zinc-800/20 rounded-md w-16' />
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    )}
                  </>
                ) : rows.length > 0 ? (
                  <>
                    {enableVirtualization && paddingTop > 0 && (
                      <tr className='padding-row'>
                        <td style={{ height: paddingTop }} colSpan={visibleColumnsCount} />
                      </tr>
                    )}
                    {itemsToRender.map((item, index) => {
                      const isVirtual = enableVirtualization;
                      const row = isVirtual ? rows[(item as any).index] : (item as any);
                      const rowIndex = isVirtual ? (item as any).index : index;

                      if (!row) return null;

                      return (
                        <MemoizedRow
                          key={row.id}
                          ref={measureRow}
                          row={row}
                          dense={dense}
                          onRowClick={handleRowClick}
                          onRowTouchStart={onRowTouchStart}
                          onRowTouchEnd={onRowTouchEnd}
                          onRowTouchMove={onRowTouchMove}
                          onRowContextMenu={handleRowContextMenu}
                          pendingRowIds={pendingRowIds}
                          newRowIds={newRowIds}
                          updatedRowIds={updatedRowIds}
                          localLoading={localLoading}
                          isLoading={isLoading}
                          columnMetaMap={columnMetaMap}
                          rowsCount={rows.length}
                          rowIndex={rowIndex}
                          currentTouchRow={currentTouchRow}
                          todayTs={todayTs}
                          yesterdayTs={yesterdayTs}
                          isRtl={isRtl}
                          isAR={isAR}
                          columnSizing={table.getState().columnSizing}
                        />
                      );
                    })}
                    {enableVirtualization && paddingBottom > 0 && (
                      <tr className='padding-row'>
                        <td style={{ height: paddingBottom }} colSpan={visibleColumnsCount} />
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td
                      colSpan={visibleColumnsCount}
                      className='py-12 text-center text-gray-500 dark:text-gray-400 empty-state'
                    >
                      {customEmptyState ? (
                        customEmptyState
                      ) : (
                        <div className='flex flex-col items-center justify-center'>
                          <span
                            className='material-symbols-rounded mb-4 opacity-20'
                            style={{ fontSize: 'var(--icon-5xl)' }}
                          >
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
          <TablePaginationBar
            table={table}
            isShowAll={isShowAll}
            setIsShowAll={setIsShowAll}
            isRtl={isRtl}
            translations={{
              showingAll: t.global?.table?.showingAll,
              showing: t.global?.table?.showing,
              of: t.global?.table?.of,
              showAll: t.global?.table?.showAll,
            }}
            enableShowAll={enableShowAll}
            tableContainerRef={tableContainerRef}
          />
        )}
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={handleCopyTableConfig}
          className={`absolute z-40 p-2.5 rounded-xl border border-primary-500/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-lg hover:shadow-primary-500/10 hover:border-primary-500/50 hover:bg-white dark:hover:bg-zinc-900 text-primary-600 dark:text-primary-400 transition-all duration-300 active:scale-95 group/dev-btn flex items-center gap-1.5 right-4 ${enablePagination && (table.getPageCount() > 1 || isShowAll) ? 'bottom-16' : 'bottom-4'
            }`}
          title='Copy Column Layout & Alignment (Dev Only)'
        >
          <span className='material-symbols-rounded block text-lg transition-transform duration-300 group-hover/dev-btn:rotate-6'>
            {copied ? 'check' : 'grid_view'}
          </span>
          <span className='text-[10px] font-bold tracking-wider uppercase opacity-0 max-w-0 overflow-hidden transition-all duration-300 group-hover/dev-btn:opacity-100 group-hover/dev-btn:max-w-[150px] whitespace-nowrap'>
            {copied ? 'Copied!' : 'Copy Column Layout'}
          </span>
        </button>
      )}
    </div>
  );
}
