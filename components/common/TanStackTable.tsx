
import React, { useState, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  FilterFn,
  VisibilityState,
  ColumnSizingState,
  RowData
} from '@tanstack/react-table';

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        align?: 'left' | 'right' | 'center' | 'start' | 'end';
        width?: number;
        minWidth?: number;
        flex?: boolean;
        dir?: 'ltr' | 'rtl';
    }
}
import { SearchInput } from './SearchInput';
import { useContextMenu, ContextMenuTrigger } from './ContextMenu';
import { useLongPress } from '../../hooks/useLongPress';
import { AlignButton, getHeaderJustifyClass, getTextAlignClass } from './TableAlignment';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';

// Define a fuzzy filter function
const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemValue = row.getValue(columnId);
  if (itemValue == null) return false;
  
  const itemString = String(itemValue).toLowerCase();
  const searchString = String(value).toLowerCase();
  
  return itemString.includes(searchString);
};

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
  defaultColumnAlignment?: Record<string, 'left' | 'center' | 'right'>;
  globalFilter?: string; // External global filter value
  onSearchChange?: (value: string) => void;
  manualFiltering?: boolean; // If true, disables client-side filtering (useful when passing pre-filtered data)
  enableSearch?: boolean; // Whether to show the internal search input
  customEmptyState?: React.ReactNode;
  /**
   * If true, renders a simplified version of the table:
   * - No outer border/shadow
   * - Transparent background
   * - No top toolbar by default
   */
  lite?: boolean;
}

// Helper to get stored settings
const getStoredSettings = (tableId: string) => {
  try {
    const stored = localStorage.getItem(`table-settings-${tableId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Heuristic for smart alignment
const getSmartAlignment = (columnId: string): 'left' | 'right' | 'center' => {
    const id = columnId.toLowerCase();
    
    // Numeric / Financial fields -> Right
    if (['price', 'cost', 'revenue', 'profit', 'margin', 'qty', 'quantity', 'count', 'amount', 'total', 'balance', 'distribution'].some(key => id.includes(key))) {
        return 'right';
    }
    
    // Status / Actions -> Center
    if (['status', 'active', 'is_', 'has_', 'action', 'check'].some(key => id.includes(key))) {
        return 'center';
    }
    
    // Default -> Left
    return 'left';
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
  enableTopToolbar = !lite,
  defaultColumnAlignment = EMPTY_ALIGNMENT,
  globalFilter: externalGlobalFilter,
  onSearchChange,
  manualFiltering = false,
  enableSearch = true,
  customEmptyState,
}: TanStackTableProps<TData, TValue> & { enableTopToolbar?: boolean }) {
  
  // Long-press support for rows
  const currentTouchRow = useRef<TData | null>(null);
  const {
    onTouchStart: onRowTouchStart,
    onTouchEnd: onRowTouchEnd,
    onTouchMove: onRowTouchMove
  } = useLongPress({
    onLongPress: (e) => {
      if (onRowLongPress && currentTouchRow.current) {
        onRowLongPress(e, currentTouchRow.current);
      }
    }
  });

  const { language } = useSettings();
  const t = TRANSLATIONS[language];
  
  // Load initial state from localStorage
  const storedSettings = React.useMemo(() => getStoredSettings(tableId), [tableId]);
  
  // Build default visibility from defaultHiddenColumns
  const defaultVisibility = React.useMemo(() => {
    const visibility: VisibilityState = {};
    defaultHiddenColumns.forEach(colId => {
      visibility[colId] = false;
    });
    return visibility;
  }, [defaultHiddenColumns]);
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  
  const globalFilter = externalGlobalFilter !== undefined ? externalGlobalFilter : internalGlobalFilter;
  const setGlobalFilter = (val: string) => {
      if (onSearchChange) {
          onSearchChange(val);
      }
      if (externalGlobalFilter === undefined) {
          setInternalGlobalFilter(val);
      }
  };

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(storedSettings?.columnVisibility || defaultVisibility);
  
  // Initialize alignment with defaults merged with stored settings
  const [columnAlignment, setColumnAlignment] = useState<Record<string, 'left' | 'center' | 'right'>>({
    ...defaultColumnAlignment,
    ...(storedSettings?.columnAlignment || {})
  });
  
  // Helper to extract only the overrides (values different from defaults)
  const getDiff = React.useCallback((
    current: Record<string, 'left' | 'center' | 'right'>, 
    defaults: Record<string, 'left' | 'center' | 'right'>
  ) => {
    const diff: Record<string, 'left' | 'center' | 'right'> = {};
    Object.keys(current).forEach(key => {
      if (current[key] !== defaults[key]) {
        diff[key] = current[key];
      }
    });
    return diff;
  }, []);

  const persistSettings = React.useCallback((
    newColVis: VisibilityState,
    newAlign: Record<string, 'left' | 'center' | 'right'>
  ) => {
    const settings = {
      columnVisibility: newColVis,
      columnAlignment: getDiff(newAlign, defaultColumnAlignment),
    };
    localStorage.setItem(`table-settings-${tableId}`, JSON.stringify(settings));
  }, [tableId, defaultColumnAlignment, getDiff]);

  // React to default prop changes (e.g. Language switch)
  React.useEffect(() => {
     const stored = getStoredSettings(tableId);
     
      // Re-initialize state by merging new defaults with stored overrides
      setColumnAlignment({
          ...defaultColumnAlignment,
          ...(stored?.columnAlignment || {})
      });
  }, [defaultColumnAlignment, tableId]);
  
  const { showMenu } = useContextMenu();
  
  // Detect RTL direction
  const isRtl = typeof document !== 'undefined' && document.dir === 'rtl';

  const handleColumnVisibilityChange = React.useCallback((updaterOrValue: any) => {
     setColumnVisibility(old => {
        const newVal = typeof updaterOrValue === 'function' ? updaterOrValue(old) : updaterOrValue;
        persistSettings(newVal, columnAlignment);
        return newVal;
     });
  }, [persistSettings, columnAlignment]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: fuzzyFilter,
    enableSorting: true,
    manualFiltering, // Enable manual filtering if prop is true
  });

  /* State specific for Context Menu tracking to enable live updates */
  const menuPosRef = React.useRef<{x: number, y: number, columnId?: string} | null>(null);

  const getMenuContent = (
    columnId?: string,
    overrideAlign?: Record<string, 'left' | 'center' | 'right'>
  ) => {
      const column = columnId ? table.getColumn(columnId) : null;
      
      // Use override values if provided, otherwise fall back to state
      const effectiveAlign = overrideAlign ?? columnAlignment;
      
      const currentAlign = columnId ? (effectiveAlign[columnId] || 'left') : 'left';

      // Handlers (re-create handlers that use the state/props)
      const handleAlign = (align: 'left' | 'center' | 'right') => {
        if (!columnId) return;
        const newAlign = { ...columnAlignment, [columnId]: align };
        setColumnAlignment(newAlign);
        persistSettings(columnVisibility, newAlign);
        
        if (menuPosRef.current) {
          showMenu(
            menuPosRef.current.x,
            menuPosRef.current.y,
            getMenuContent(columnId, newAlign)
          );
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
                showMenu(
                    menuPosRef.current!.x,
                    menuPosRef.current!.y,
                    getMenuContent(columnId)
                );
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
                showMenu(
                    menuPosRef.current!.x,
                    menuPosRef.current!.y,
                    getMenuContent(columnId)
                );
            }, 0);
        }
      };

      const isSorted = column?.getIsSorted();

      return (
        <div className="w-[220px] p-1 font-sans">
          
          {/* Sorting Controls - Only show for specific column */}



          {/* All Columns Visibility */}
          <div className="space-y-1 mb-3 px-1">
             <div className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2 px-1">
                Columns
             </div>
             {table.getAllLeafColumns().map(col => {
                // Only exclude 'actions' column from visibility menu
                if (col.id === 'actions') return null;
                
                const headerValue = typeof col.columnDef.header === 'function' 
                  ? col.id 
                  : col.columnDef.header;

                return (
                 <div 
                   key={col.id}
                   className="flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors group"
                   onClick={(e) => {
                     e.stopPropagation(); 
                     col.toggleVisibility();
                     
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
                 >
                    <span className={`text-sm font-medium transition-colors ${!col.getIsVisible() ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white'}`}>
                      {headerValue as React.ReactNode}
                    </span>
                    <span className={`material-symbols-rounded text-[16px] transition-colors ${!col.getIsVisible() ? 'text-gray-300 dark:text-gray-600' : 'text-emerald-500'}`}>
                      {col.getIsVisible() ? 'check_circle' : 'circle'}
                    </span>
                 </div>
                );
             })}
          </div>

          {column && (
          <>
          <div className="h-px bg-gray-100 dark:bg-[#333] mb-3 mx-1" />

          {/* Alignment Controls Container */}
          <div className="space-y-3 px-1">
            
            {/* Unified Alignment */}
            <div className="flex items-center justify-between">
              <div 
                className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700"
                dir="ltr"
              >
                <AlignButton align="left" isActive={currentAlign === 'left'} onClick={() => handleAlign('left')} />
                <AlignButton align="center" isActive={currentAlign === 'center'} onClick={() => handleAlign('center')} />
                <AlignButton align="right" isActive={currentAlign === 'right'} onClick={() => handleAlign('right')} />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase ml-3">Alignment</span>
            </div>

          </div>
          </>
          )}
          
        </div>
      );
  };

  const onContextMenuOpen = (x: number, y: number, columnId?: string) => {
      menuPosRef.current = { x, y, columnId };
      showMenu(x, y, getMenuContent(columnId));
  };

  const handleColumnContextMenu = (e: React.MouseEvent, columnId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenuOpen(e.clientX, e.clientY, columnId);
  };
  const rows = table.getRowModel().rows.slice(0, 20);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header Controls */}
      {enableTopToolbar && (
      <div className="flex items-center justify-between mb-4">
        <div className="w-full max-w-sm">
           {enableSearch && (
           <SearchInput
             value={globalFilter ?? ''}
             onSearchChange={(val) => setGlobalFilter(val)}
             onClear={() => setGlobalFilter('')}
             placeholder={searchPlaceholder}
           />
           )}
        </div>
        

      </div>
      )}

      {/* Table Container - Modified to support context menu on empty state */}
      {/* Table Container - Modified to support context menu on empty state */}
      <div 
         className={`flex-1 overflow-auto custom-scrollbar relative
            ${lite 
                ? 'bg-transparent' 
                : 'rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900'
            }`}
      >
        {table.getVisibleLeafColumns().length === 0 ? (
           <ContextMenuTrigger className="h-full w-full" onOpen={(x, y) => onContextMenuOpen(x, y)}>
           <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-3 select-none">
              <span className="material-symbols-rounded text-6xl opacity-50">view_column</span>
              <div className="text-center">
                  <p className="text-lg font-medium mb-1">No columns visible</p>
                  <p className="text-sm opacity-70">Right-click anywhere to manage columns</p>
              </div>
           </div>
           </ContextMenuTrigger>
        ) : (
        <table className="w-full text-left border-separate border-spacing-0">
          <thead 
            className="sticky top-0 z-10 bg-white dark:bg-gray-900"
          >
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {

// ... inside TanStackTable ...

                  const align = 
                      header.column.columnDef.meta?.align || 
                      columnAlignment[header.column.id] || 
                      (lite ? getSmartAlignment(header.column.id) : null) ||
                      'left';

                  const justifyClass = align === 'center' ? 'justify-center' :
                                       align === 'right' ? (isRtl ? 'justify-start' : 'justify-end') :
                                       align === 'left' ? (isRtl ? 'justify-end' : 'justify-start') :
                                       align === 'end' ? 'justify-end' :
                                       'justify-start';

                  const textAlignClass = align === 'center' ? 'text-center' :
                                       align === 'end' ? 'text-end' :
                                       align === 'start' ? 'text-start' :
                                       align === 'right' ? 'text-right' :
                                       align === 'left' ? 'text-left' :
                                       'text-start';
                  
                  return (
                  <th
                    key={header.id}
                    className={`p-0 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none relative group border-b ${lite ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-800'}
                        ${textAlignClass}
                        ${header.column.columnDef.meta?.flex ? '' : 'w-[1%] whitespace-nowrap'}`}
                    style={{
                         width: header.column.columnDef.meta?.flex ? 'auto' : header.column.columnDef.meta?.width,
                         minWidth: header.column.columnDef.meta?.minWidth
                    }}
                  >
                    <ContextMenuTrigger 
                        className="py-3 px-4 w-full h-full block"
                        onOpen={(x, y) => onContextMenuOpen(x, y, header.column.id)}
                    >
                    {header.isPlaceholder ? null : (
                      <div className={`flex items-center w-full ${justifyClass}`}>
                          <div
                            className={`relative inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                             {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                             )}
                             
                             {/* Absolute Sort Indicators */}
                             <span className={`absolute top-1/2 -translate-y-1/2 flex items-center
                                ${align === 'left' ? 'left-full pl-1' :
                                  align === 'right' ? 'right-full pr-1 opacity-100' :
                                  isRtl && align === 'start' ? 'right-full pr-1' :
                                  !isRtl && align === 'start' ? 'left-full pl-1' :
                                  'left-full pl-1'}
                             `}>
                                {{
                                    asc: <span className="material-symbols-rounded text-xl leading-none text-current opacity-70">arrow_drop_up</span>,
                                    desc: <span className="material-symbols-rounded text-xl leading-none text-current opacity-70">arrow_drop_down</span>,
                                }[header.column.getIsSorted() as string] ?? null}
                             </span>
                          </div>
                      </div>
                    )}
                    </ContextMenuTrigger>
                  </th>
                )})}
              </tr>
            ))}
          </thead>
          <tbody className="">
            {isLoading ? (
               <tr>
                 <td colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center p-4">
                        <div className={`w-6 h-6 border-2 border-${color}-500 border-t-transparent rounded-full animate-spin mb-2`}></div>
                        <span className="text-sm text-gray-500">Loading data...</span>
                    </div>
                 </td>
               </tr>
            ) : rows.length > 0 ? (
                rows.map(row => (
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
                    {row.getVisibleCells().map(cell => {
                      const align = 
                          cell.column.columnDef.meta?.align || 
                          columnAlignment[cell.column.id] || 
                          (lite ? getSmartAlignment(cell.column.id) : null) ||
                          'left';
                      const justifyClass = align === 'center' ? 'justify-center text-center' :
                                           align === 'right' ? (isRtl ? 'justify-start text-right' : 'justify-end text-right') :
                                           align === 'left' ? (isRtl ? 'justify-end text-left' : 'justify-start text-left') :
                                           align === 'end' ? 'justify-end text-end' :
                                           'justify-start text-start';
                      
                      return (
                        <td 
                          key={cell.id} 
                          className={`py-2 px-4 text-sm text-gray-700 dark:text-gray-300 align-middle border-b border-gray-100 dark:border-gray-800
                            ${cell.column.columnDef.meta?.flex ? '' : 'whitespace-nowrap'}`}
                          style={{
                                width: cell.column.columnDef.meta?.flex ? 'auto' : cell.column.columnDef.meta?.width,
                                minWidth: cell.column.columnDef.meta?.minWidth
                           }}
                           dir={cell.column.columnDef.meta?.dir}
                        >
                          <div className={`flex items-center w-full ${justifyClass}`}>
                             {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-gray-500 dark:text-gray-400">
                         {customEmptyState ? (
                             customEmptyState
                         ) : (
                             <div className="flex flex-col items-center justify-center">
                                <span className="material-symbols-rounded text-4xl mb-2 opacity-30">inbox</span>
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
    </div>
  );
}
