import React, { useState } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
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
}

export const DataTable = <T extends { id: string }>({
  data,
  columns,
  onSort,
  onRowClick,
  onRowContextMenu,
  isLoading,
  emptyMessage,
  color = 'blue',
  t
}: DataTableProps<T>) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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
    <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-start border-collapse">
          <thead className={`bg-${color}-50 dark:bg-${color}-900 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider sticky top-0 z-10 shadow-sm`}>
            <tr>
              {columns.map((col) => (
                <th 
                  key={col.key}
                  className={`px-3 py-3 text-${col.align || 'left'} ${col.sortable ? 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800' : ''} transition-colors`}
                  onDoubleClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    {t.headers?.[col.key] || t.modal?.[col.key] || col.label}
                    {col.sortable && (
                      <span className={`material-symbols-rounded text-[14px] transition-opacity ${sortConfig?.key === col.key ? 'opacity-100' : 'opacity-0'}`}>
                        {sortConfig?.key === col.key && sortConfig.direction === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-rounded text-4xl animate-spin">progress_activity</span>
                    <p>Loading...</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  <span className="material-symbols-rounded text-4xl mb-2 opacity-50">group_off</span>
                  <p>{emptyMessage || t.noResults}</p>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`border-b border-slate-100 dark:border-slate-800 hover:bg-${color}-50 dark:hover:bg-${color}-950/20 transition-colors ${index % 2 === 0 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}`}
                  onClick={() => onRowClick && onRowClick(item)}
                  onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, item)}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`px-3 py-3 text-${col.align || 'left'}`}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
