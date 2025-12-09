import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useContextMenu } from '../utils/ContextMenu';
import { useColumnReorder } from '../hooks/useColumnReorder';
import { useLongPress } from '../hooks/useLongPress';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  defaultWidth?: number;
  headerDir?: 'ltr' | 'rtl' | 'auto';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void; // Legacy external sort support
  onRowClick?: (item: T) => void;
  onRowContextMenu?: (e: React.MouseEvent, item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  color?: string;
  t: any;
  storageKey: string;
  defaultHiddenColumns?: string[];
}

export const DataTable = <T extends { id: string }>({
  data,
  columns: definedColumns,
  onSort,
  onRowClick,
  onRowContextMenu,
  isLoading,
  emptyMessage,
  color = 'blue',
  t,
  storageKey,
  defaultHiddenColumns
}: DataTableProps<T>) => {
  const { showMenu } = useContextMenu();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Column Reorder Logic (Custom hook preserved for Drag & Drop)
  const defaultColumnKeys = useMemo(() => definedColumns.map(c => c.key), [definedColumns]);

  const {
    columnOrder,
    hiddenColumns,
    draggedColumn,
    dragOverColumn,
    toggleColumnVisibility,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnTouchMove,
    handleColumnDrop,
    handleColumnTouchEnd,
    handleColumnDragEnd,
  } = useColumnReorder({
    defaultColumns: defaultColumnKeys,
    storageKey: storageKey,
    defaultHidden: defaultHiddenColumns
  });

  // Convert legacy Column<T> to TanStack ColumnDef<T>
  const tanstackColumns = useMemo<ColumnDef<T>[]>(() => {
    return definedColumns.map(col => ({
        accessorKey: col.key,
        id: col.key,
        header: () => col.label, // Translation handled by caller passing label
        cell: (info) => col.render ? col.render(info.row.original) : (info.getValue() as React.ReactNode),
        size: col.defaultWidth || 150,
        enableSorting: col.sortable,
        meta: {
            align: col.align,
            headerDir: col.headerDir
        }
    }));
  }, [definedColumns]);

  // Map columns for easy access to legacy props (align, etc)
  const columnsMap = useMemo(() => {
    const map: Record<string, Column<T>> = {};
    definedColumns.forEach(col => map[col.key] = col);
    return map;
  }, [definedColumns]);

   // Column Resize Logic (Custom persistence)
   const [columnWidths, setColumnWidths] = useState<Record<string, number | undefined>>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`${storageKey}_column_widths`);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse column widths', e); }
        }
    }
    const defaults: Record<string, number> = {};
    definedColumns.forEach(col => {
        if (col.defaultWidth) defaults[col.key] = col.defaultWidth;
    });
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem(`${storageKey}_column_widths`, JSON.stringify(columnWidths));
  }, [columnWidths, storageKey]);

  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const startColumnResize = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsColumnResizing(true);
    resizingColumn.current = columnId;
    startX.current = e.pageX;
    startWidth.current = columnWidths[columnId] || columnsMap[columnId]?.defaultWidth || 150;
    
    document.addEventListener('mousemove', handleColumnResizeMove);
    document.addEventListener('mouseup', endColumnResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleColumnResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.pageX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff);
    setColumnWidths(prev => ({ ...prev, [resizingColumn.current!]: newWidth }));
  }, [columnWidths]);

  const endColumnResize = useCallback(() => {
    setIsColumnResizing(false);
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', endColumnResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleColumnResizeMove]);

  // Sync TanStack visibility with our custom hook
  const columnVisibility = useMemo<VisibilityState>(() => {
      const visibility: VisibilityState = {};
      defaultColumnKeys.forEach(key => {
          visibility[key] = !hiddenColumns.has(key);
      });
      return visibility;
  }, [hiddenColumns, defaultColumnKeys]);

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      columnOrder, // Order is managed by TanStack if we pass it, but better handled manually in render for dnd-kit compat?
      // actually if we pass columnOrder state to TanStack, getHeaderGroups returns ordered headers!
      // But we are using a custom manual render loop for dnd-kit.
      // Let's stick to our custom loop using `columnOrder` and just use TanStack for data processing.
    },
    onSortingChange: (updater) => {
        setSorting(updater);
        // If legacy onSort is present, we might need to bridge it, but TanStack handles internal sort well.
        // For now, let's use TanStack's internal sorting.
        if (typeof updater !== 'function' && onSort && updater.length > 0) {
             // onSort(updater[0].id, updater[0].desc ? 'desc' : 'asc'); 
             // We can disable internal sorting if we want server-side, but assumed client-side here.
        }
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Context Menu for Headers
  const {
      onTouchStart: onHeaderTouchStart,
      onTouchEnd: onHeaderTouchEnd,
      onTouchMove: onHeaderTouchMove,
      isLongPress: isHeaderLongPress
    } = useLongPress({
        onLongPress: (e) => {
          const touch = e.touches[0];
          showMenu(touch.clientX, touch.clientY, [
              { 
                label: 'Show/Hide Columns', 
                icon: 'visibility', 
                action: () => {} 
              },
              { separator: true },
              ...definedColumns.map(col => ({
                label: col.label,
                icon: hiddenColumns.has(col.key) ? 'visibility_off' : 'visibility',
                action: () => toggleColumnVisibility(col.key)
              }))
          ]);
        }
    });

    const handleHeaderContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY, [
            { 
              label: 'Show/Hide Columns', 
              icon: 'visibility', 
              action: () => {} 
            },
            { separator: true },
            ...definedColumns.map(col => ({
              label: col.label, // Use raw label as translation is handled in render
              icon: hiddenColumns.has(col.key) ? 'visibility_off' : 'visibility',
              action: () => toggleColumnVisibility(col.key)
            }))
        ]);
    };

    // Body Long Press (Delegated)
    const {
        onTouchStart: onBodyTouchStart,
        onTouchEnd: onBodyTouchEnd,
        onTouchMove: onBodyTouchMove
    } = useLongPress({
        onLongPress: (e) => {
             const target = e.target as HTMLElement;
             const row = target.closest('[data-row-index]');
             if (row && onRowContextMenu) {
                 const indexStr = row.getAttribute('data-row-index');
                 if (indexStr !== null) {
                     const index = parseInt(indexStr);
                     // Note: We need the ACTUAL item from the current page/view, not raw data index if possible.
                     // But here we'll use table.getRowModel().rows[index].original
                     const rowModel = table.getRowModel().rows;
                     const tableRow = rowModel[index];
                     
                     if (tableRow) {
                         const touch = e.touches[0];
                         const mockEvent = {
                             ...e,
                             clientX: touch.clientX,
                             clientY: touch.clientY,
                             preventDefault: () => {},
                             stopPropagation: () => {},
                             target: row
                         } as unknown as React.MouseEvent;
                         
                         onRowContextMenu(mockEvent, tableRow.original);
                     }
                 }
             }
        }
    });

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Table Container */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      {/* We use our custom dnd loop over table.getHeaderGroups() unfortunately because dnd needs flat array of keys. */}
      {/* However, we can map columnOrder to table options. */}
      <div 
        className={`flex items-center bg-${color}-50 dark:bg-${color}-900 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider sticky top-0 z-10 shadow-sm`}
        style={{ minWidth: 'min-content' }}
        onTouchStart={onHeaderTouchStart}
        onTouchEnd={onHeaderTouchEnd}
        onTouchMove={(e) => {
            onHeaderTouchMove(e);
            handleColumnTouchMove(e);
        }}
        onContextMenu={handleHeaderContextMenu}
      >
        {columnOrder.map((colKey, index) => {
            if (hiddenColumns.has(colKey)) return null;
            const col = columnsMap[colKey];
            if (!col) return null; // Should not happen

            // Find TanStack header (optional, mainly for sorting props)
            // Ideally we'd iterate over table.getHeaderGroups() flat headers, but we want to ENFORCE `columnOrder` from our hook.
            const tanstackColumn = table.getColumn(colKey);

            return (
                <div
                    key={colKey}
                    data-column-id={colKey}
                    className={`
                        relative flex items-center px-3 py-3 h-full
                        ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}
                        ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
                        ${draggedColumn === colKey ? 'opacity-50 bg-gray-200 dark:bg-gray-700' : ''}
                        ${dragOverColumn === colKey ? `border-${draggedColumn ? 'l' : 'r'}-2 border-blue-500` : ''}
                        transition-colors
                    `}
                    dir={col.headerDir}
                    style={{ width: columnWidths[colKey] || col.defaultWidth || 150, flexShrink: 0 }}
                    draggable={!isColumnResizing}
                    onDragStart={(e) => handleColumnDragStart(e, colKey)}
                    onDragOver={(e) => handleColumnDragOver(e, colKey)}
                    onDrop={(e) => handleColumnDrop(e, colKey)}
                    onDragEnd={handleColumnDragEnd}
                    onClick={tanstackColumn?.getToggleSortingHandler()}
                >
                    <div className="truncate flex items-center gap-1">
                        {t.headers?.[col.key] || t.modal?.[col.key] || col.label}
                        {col.sortable && tanstackColumn && (
                        <span className={`material-symbols-rounded text-[14px] transition-opacity ${tanstackColumn.getIsSorted() ? 'opacity-100' : 'opacity-0'}`}>
                            {{
                                asc: 'arrow_upward',
                                desc: 'arrow_downward',
                            }[tanstackColumn.getIsSorted() as string] ?? 'arrow_upward'}
                        </span>
                        )}
                    </div>

                    {/* Resize Handle */}
                    <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-20 group"
                        onMouseDown={(e) => startColumnResize(e, colKey)}
                        onClick={(e) => e.stopPropagation()}
                    >
                         <div className="absolute right-0 top-0 bottom-0 w-4 -translate-x-1/2 opacity-0 group-hover:opacity-100" />
                    </div>
                </div>
            );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative"
          onTouchStart={onBodyTouchStart}
          onTouchEnd={onBodyTouchEnd}
          onTouchMove={onBodyTouchMove}
      >
         {/* Loading State */}
        {isLoading && (
            <div className="absolute inset-0 z-20 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
                 <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-rounded text-4xl animate-spin text-blue-500">progress_activity</span>
                    <p className="text-gray-500 font-medium">Loading...</p>
                 </div>
            </div>
        )}

        {/* Empty State */}
        {!isLoading && table.getRowModel().rows.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <span className="material-symbols-rounded text-6xl mb-4 opacity-30">group_off</span>
                <p className="text-lg font-medium">{emptyMessage || t.noResults}</p>
             </div>
        )}

         {/* Rows */}
        {!isLoading && table.getRowModel().rows.length > 0 && (
            <div className="min-w-min">
                 {table.getRowModel().rows.map((row, index) => (
                    <div 
                        key={row.id}
                        data-row-index={index}
                        className={`
                            flex items-center border-b border-gray-100 dark:border-gray-800 
                            hover:bg-${color}-50 dark:hover:bg-${color}-950/20 transition-colors 
                            ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''}
                            cursor-pointer user-select-none touch-manipulation
                        `}
                        onClick={() => onRowClick && onRowClick(row.original)}
                        onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, row.original)}
                    >
                        {columnOrder.map(colKey => {
                             if (hiddenColumns.has(colKey)) return null;
                             const col = columnsMap[colKey];
                             if (!col) return null;
                             
                             // Find relevant cell from TanStack row
                             // We are manually iterating columns to preserve order.
                             const cell = row.getVisibleCells().find(c => c.column.id === colKey);
                             
                             return (
                                <div 
                                    key={colKey}
                                    className={`px-3 py-3 flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}
                                    style={{ width: columnWidths[colKey] || col.defaultWidth || 150, flexShrink: 0 }}
                                    dir={col.headerDir}
                                >
                                     {cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : (row.original as any)[colKey]}
                                </div>
                             );
                        })}
                    </div>
                 ))}
            </div>
        )}
      </div>
      
      {/* Pagination Controls (Footer) */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
               Rows per page:
            </span>
            <select
                value={table.getState().pagination.pageSize}
                onChange={e => {
                    table.setPageSize(Number(e.target.value));
                }}
                className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-300 border-none focus:ring-0 cursor-pointer"
            >
                {[10, 20, 30, 40, 50, 100].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                        {pageSize}
                    </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>

            <button
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-300"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
            >
                <span className="material-symbols-rounded">first_page</span>
            </button>
            <button
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-300"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                <span className="material-symbols-rounded">chevron_left</span>
            </button>
            <button
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-300"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                <span className="material-symbols-rounded">chevron_right</span>
            </button>
            <button
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-300"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
            >
                <span className="material-symbols-rounded">last_page</span>
            </button>
          </div>
      </div>
    </div>
    </div>
  );
};
