
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
  ColumnSizingState
} from '@tanstack/react-table';
import { SearchInput } from './SearchInput';
import { useContextMenu, ContextMenuTrigger } from './ContextMenu';
import { useLongPress } from '../../hooks/useLongPress';

// Define a fuzzy filter function
const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemValue = row.getValue(columnId);
  if (itemValue == null) return false;
  
  const itemString = String(itemValue).toLowerCase();
  const searchString = String(value).toLowerCase();
  
  return itemString.includes(searchString);
};

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
  defaultColumnAlignment?: Record<string, 'left' | 'center' | 'right'>; // Default alignment for specific columns
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
  enableTopToolbar = true,
  defaultColumnAlignment = {},
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
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(storedSettings?.columnVisibility || defaultVisibility);
  
  // Initialize alignment with defaults merged with stored settings
  const [headerAlignment, setHeaderAlignment] = useState<Record<string, 'left' | 'center' | 'right'>>({
    ...defaultColumnAlignment,
    ...(storedSettings?.headerAlignment || {})
  });
  const [contentAlignment, setContentAlignment] = useState<Record<string, 'left' | 'center' | 'right'>>({
    ...defaultColumnAlignment,
    ...(storedSettings?.contentAlignment || {})
  });
  
  // Save settings to localStorage whenever they change
  React.useEffect(() => {
    const settings = {
      columnVisibility,
      headerAlignment,
      contentAlignment,
    };
    localStorage.setItem(`table-settings-${tableId}`, JSON.stringify(settings));
  }, [tableId, columnVisibility, headerAlignment, contentAlignment]);
  
  const { showMenu } = useContextMenu();
  
  // Detect RTL direction
  const isRtl = typeof document !== 'undefined' && document.dir === 'rtl';

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
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: fuzzyFilter,
    enableSorting: false,
  });

  /* State specific for Context Menu tracking to enable live updates */
  const menuPosRef = React.useRef<{x: number, y: number, columnId?: string} | null>(null);

  const AlignButton = ({ align, isHeader, isActive }: { align: 'left' | 'center' | 'right', isHeader: boolean, isActive: boolean }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        
        const currentColumnId = menuPosRef.current?.columnId;
        if (!currentColumnId) return;

        // Compute new alignment state and update
        if (isHeader) {
          const newHeaderAlign = { ...headerAlignment, [currentColumnId]: align };
          setHeaderAlignment(newHeaderAlign);
          // Pass new values directly to bypass stale closure
          if (menuPosRef.current) {
            showMenu(
              menuPosRef.current.x,
              menuPosRef.current.y,
              getMenuContent(currentColumnId, newHeaderAlign, undefined)
            );
          }
        } else {
          const newContentAlign = { ...contentAlignment, [currentColumnId]: align };
          setContentAlignment(newContentAlign);
          if (menuPosRef.current) {
            showMenu(
              menuPosRef.current.x,
              menuPosRef.current.y,
              getMenuContent(currentColumnId, undefined, newContentAlign)
            );
          }
        }
      }}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
        isActive 
          ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400' 
          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <span className="material-symbols-rounded text-[18px]">
        {align === 'left' ? 'format_align_left' : align === 'center' ? 'format_align_center' : 'format_align_right'}
      </span>
    </button>
  );

  const getMenuContent = (
    columnId?: string,
    overrideHeaderAlign?: Record<string, 'left' | 'center' | 'right'>,
    overrideContentAlign?: Record<string, 'left' | 'center' | 'right'>
  ) => {
      const column = columnId ? table.getColumn(columnId) : null;
      
      // Use override values if provided, otherwise fall back to state
      const effectiveHeaderAlign = overrideHeaderAlign ?? headerAlignment;
      const effectiveContentAlign = overrideContentAlign ?? contentAlignment;
      
      const currentHeaderAlign = columnId ? (effectiveHeaderAlign[columnId] || 'left') : 'left';
      const currentContentAlign = columnId ? (effectiveContentAlign[columnId] || 'left') : 'left';

      return (
        <div className="w-[220px] p-1 font-sans">
          


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
            
            {/* Header Alignment */}
            <div className="flex items-center justify-between">
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                <AlignButton align="left" isHeader={true} isActive={currentHeaderAlign === 'left'} />
                <AlignButton align="center" isHeader={true} isActive={currentHeaderAlign === 'center'} />
                <AlignButton align="right" isHeader={true} isActive={currentHeaderAlign === 'right'} />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase ml-3">Header</span>
            </div>

            {/* Content Alignment */}
            <div className="flex items-center justify-between">
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                <AlignButton align="left" isHeader={false} isActive={currentContentAlign === 'left'} />
                <AlignButton align="center" isHeader={false} isActive={currentContentAlign === 'center'} />
                <AlignButton align="right" isHeader={false} isActive={currentContentAlign === 'right'} />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase ml-3">Content</span>
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
           <SearchInput
             value={globalFilter ?? ''}
             onSearchChange={(val) => setGlobalFilter(val)}
             onClear={() => setGlobalFilter('')}
             placeholder={searchPlaceholder}
           />
        </div>
        
        {/* Results Info */}
        <div className="text-xs text-gray-500">
            Showing top {rows.length} results
        </div>
      </div>
      )}

      {/* Table Container - Modified to support context menu on empty state */}
      {/* Table Container - Modified to support context menu on empty state */}
      <div 
         className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 custom-scrollbar relative"
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
        <table className="w-full text-left border-collapse">
          <thead 
            className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10"
          >
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-800">
                {headerGroup.headers.map(header => {
                  const align = headerAlignment[header.column.id] || 'left';
                  const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
                  
                  return (
                  <th
                    key={header.id}
                    className="p-0 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none relative group"
                  >
                    <ContextMenuTrigger 
                        className="py-3 px-4 w-full h-full block"
                        onOpen={(x, y) => onContextMenuOpen(x, y, header.column.id)}
                    >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center hover:text-gray-700 dark:hover:text-gray-300 ${justifyClass}`}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {/* Sort Icon Removed */}
                      </div>
                    )}
                    </ContextMenuTrigger>
                  </th>
                )})}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
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
                      const align = contentAlignment[cell.column.id] || 'left';
                      const isRtl = document.dir === 'rtl';
                      const textAlignClass = align === 'center' 
                        ? 'text-center' 
                        : isRtl 
                          ? (align === 'left' ? 'text-right' : 'text-left')
                          : (align === 'left' ? 'text-left' : 'text-right');
                      return (
                        <td 
                          key={cell.id} 
                          className={`py-2 px-4 text-sm text-gray-700 dark:text-gray-300 whitespace-normal overflow-visible align-middle ${textAlignClass}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-gray-500 dark:text-gray-400">
                         <div className="flex flex-col items-center justify-center">
                            <span className="material-symbols-rounded text-4xl mb-2 opacity-30">inbox</span>
                            <p>{emptyMessage}</p>
                         </div>
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
