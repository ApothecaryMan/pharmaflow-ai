import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';

interface TanStackTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  color?: string;
  t: any; // Translations
}

export function TanStackTable<T>({
  data,
  columns,
  color = 'blue',
  t
}: TanStackTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search Input */}
      <div className="relative w-full md:w-96">
        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
          search
        </span>
        <input
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-shadow"
          style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
          placeholder={`${t.searchPlaceholder || 'Search...'} (${table.getRowModel().rows.length})`}
        />
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={`bg-${color}-50 dark:bg-${color}-900/20 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider`}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-4 whitespace-nowrap cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ 
                        width: header.column.getSize() !== 150 ? header.column.getSize() : undefined,
                        minWidth: header.column.getSize() !== 150 ? header.column.getSize() : undefined 
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="material-symbols-rounded text-[16px] opacity-70">
                          {{
                            asc: 'arrow_upward',
                            desc: 'arrow_downward',
                          }[header.column.getIsSorted() as string] ?? 'unfold_more'}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400">
                    <span className="material-symbols-rounded text-4xl mb-2 opacity-50">search_off</span>
                    <p>{t.noResults || 'No results found'}</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <button
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="material-symbols-rounded">first_page</span>
          </button>
          <button
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
          
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
             Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>

          <button
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
          <button
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="material-symbols-rounded">last_page</span>
          </button>
        </div>

        <select
          value={table.getState().pagination.pageSize}
          onChange={e => {
            table.setPageSize(Number(e.target.value));
          }}
          className="bg-transparent text-sm font-bold text-gray-500 border-none focus:ring-0 cursor-pointer"
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
