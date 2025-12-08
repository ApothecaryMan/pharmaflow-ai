import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useContextMenu } from '../components/ContextMenu';
import { useColumnReorder } from '../hooks/useColumnReorder';
import { useLongPress } from '../hooks/useLongPress';

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
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const { showMenu } = useContextMenu();

  // Map columns for easy access
  const columnsMap = React.useMemo(() => {
    const map: Record<string, Column<T>> = {};
    definedColumns.forEach(col => map[col.key] = col);
    return map;
  }, [definedColumns]);

  // Column Reorder Logic
  const defaultColumnKeys = React.useMemo(() => definedColumns.map(c => c.key), [definedColumns]);

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

   // Column Resize Logic
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
  }, []);

  const endColumnResize = useCallback(() => {
    setIsColumnResizing(false);
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', endColumnResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleColumnResizeMove]);

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

  const handleSort = (key: string) => {
    if (!onSort) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    onSort(key, direction);
  };

  return (
    <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
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
            if (!col) return null;

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
                    onDoubleClick={() => col.sortable && handleSort(colKey)}
                >
                    <div className="truncate flex items-center gap-1">
                        {t.headers?.[col.key] || t.modal?.[col.key] || col.label}
                        {col.sortable && (
                        <span className={`material-symbols-rounded text-[14px] transition-opacity ${sortConfig?.key === col.key ? 'opacity-100' : 'opacity-0'}`}>
                            {sortConfig?.key === col.key && sortConfig.direction === 'desc' ? 'arrow_downward' : 'arrow_upward'}
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
      <div className="flex-1 overflow-y-auto overflow-x-auto relative">
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
        {!isLoading && data.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <span className="material-symbols-rounded text-6xl mb-4 opacity-30">group_off</span>
                <p className="text-lg font-medium">{emptyMessage || t.noResults}</p>
             </div>
        )}

         {/* Rows */}
        {!isLoading && data.length > 0 && (
            <div className="min-w-min">
                 {data.map((item, index) => (
                    <div 
                        key={item.id}
                        className={`
                            flex items-center border-b border-gray-100 dark:border-gray-800 
                            hover:bg-${color}-50 dark:hover:bg-${color}-950/20 transition-colors 
                            ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''}
                            cursor-pointer
                        `}
                        onClick={() => onRowClick && onRowClick(item)}
                        onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, item)}
                    >
                        {columnOrder.map(colKey => {
                             if (hiddenColumns.has(colKey)) return null;
                             const col = columnsMap[colKey];
                             if (!col) return null;
                             
                             return (
                                <div 
                                    key={colKey}
                                    className={`px-3 py-3 flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}
                                    style={{ width: columnWidths[colKey] || col.defaultWidth || 150, flexShrink: 0 }}
                                    dir={col.headerDir}
                                >
                                     {col.render ? col.render(item) : (item as any)[col.key]}
                                </div>
                             );
                        })}
                    </div>
                 ))}
            </div>
        )}
      </div>
    </div>
  );
};
