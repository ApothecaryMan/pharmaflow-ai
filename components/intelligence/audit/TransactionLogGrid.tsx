import React, { useMemo, useState } from 'react';
import { 
  createColumnHelper, 
  getCoreRowModel, 
  useReactTable, 
  getSortedRowModel,
  SortingState,
  RowData
} from '@tanstack/react-table';
import { AuditTransaction } from '../../../types/intelligence';

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        align?: 'left' | 'right' | 'center' | 'start' | 'end';
        width?: number;
        flex?: boolean; // Column absorbs remaining space
        dir?: 'ltr' | 'rtl';
    }
}

interface TransactionLogGridProps {
  data: AuditTransaction[];
  onRowClick?: (transaction: AuditTransaction) => void;
}

export const TransactionLogGrid: React.FC<TransactionLogGridProps> = ({ data, onRowClick }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Detect RTL direction
  const isRtl = typeof document !== 'undefined' && document.dir === 'rtl';

  const columnHelper = createColumnHelper<AuditTransaction>();

  const columns = useMemo(() => [
    columnHelper.accessor('timestamp', {
      header: 'التوقيت',
      meta: {
        align: 'start',
      },
      cell: info => <span dir="ltr">{new Date(info.getValue()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit' })}</span>,
    }),
     columnHelper.accessor('type', {
      header: 'نوع العملية',
      meta: {
        align: 'center',
      },
      cell: info => (
          <span className={`px-2 py-1 rounded text-xs font-bold ${
              info.getValue() === 'SALE' ? 'bg-emerald-100 text-emerald-700' :
              info.getValue() === 'RETURN' ? 'bg-red-100 text-red-700' :
              info.getValue() === 'VOID' ? 'bg-gray-100 text-gray-700' :
              'bg-amber-100 text-amber-700'
          }`}>
              {info.getValue() === 'SALE' ? 'بيع' : 
               info.getValue() === 'RETURN' ? 'إرجاع' : 
               info.getValue() === 'VOID' ? 'إلغاء' : 
               'تعديل'}
          </span>
      ),
    }),
    columnHelper.accessor('product_name', {
      header: 'المنتج',
      meta: {
        align: 'left',
        flex: true // This column absorbs remaining space
      },
    }),
    columnHelper.accessor('quantity', {
      header: 'الكمية',
      meta: {
        align: 'center',
      },
      cell: info => <span dir="ltr">{info.getValue()}</span>,
    }),
    columnHelper.accessor('amount', {
      header: 'القيمة',
      meta: {
        align: 'end',
      },
        cell: info => <span dir="ltr">{Math.abs(info.getValue()).toFixed(2)}</span>,
    }),
    columnHelper.accessor('cashier_name', {
        header: 'الموظف',
        meta: {
            align: 'start',
        },
    }),
    columnHelper.accessor('has_anomaly', {
        header: 'ملاحظات',
        meta: {
            align: 'center',
        },
        cell: info => info.getValue() ? (
            <span className="text-red-500 flex items-center gap-1 text-xs" title={info.row.original.anomaly_reason}>
                <span className="material-symbols-rounded text-sm">warning</span>
                تنبيه
            </span>
        ) : '-'
    })
  ], [columnHelper]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="material-symbols-rounded text-4xl mb-2 block">receipt_long</span>
        <p>لا توجد عمليات مسجلة</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-sm relative">
                <thead className="text-gray-500 sticky top-0 z-20">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th 
                                    key={header.id} 
                                    className={`px-4 py-3 font-medium cursor-pointer bg-gray-200 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-700 group 
                                        ${header.column.columnDef.meta?.align === 'center' ? 'text-center' : 
                                          header.column.columnDef.meta?.align === 'end' ? 'text-end' : 
                                          header.column.columnDef.meta?.align === 'left' ? 'text-left' :
                                          header.column.columnDef.meta?.align === 'right' ? 'text-right' :
                                          'text-start'}
                                        ${header.column.columnDef.meta?.flex ? '' : 'w-[1%] whitespace-nowrap'}`}
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    <div className={`relative inline-flex items-center gap-1 ${
                                        header.column.columnDef.meta?.align === 'center' ? 'mx-auto' : ''
                                    }`}>
                                        {typeof header.column.columnDef.header === 'function' ? header.column.columnDef.header(header.getContext()) : header.column.columnDef.header}
                                        <span className={`absolute top-1/2 -translate-y-1/2 flex items-center
                                            ${header.column.columnDef.meta?.align === 'left' ? 'left-full pl-1' :
                                              header.column.columnDef.meta?.align === 'right' ? 'right-full pr-1 opacity-100' :
                                              isRtl && header.column.columnDef.meta?.align === 'start' ? 'right-full pr-1' :
                                              !isRtl && header.column.columnDef.meta?.align === 'start' ? 'left-full pl-1' :
                                              'left-full pl-1'}
                                        `}>
                                            {{
                                                asc: <span className="material-symbols-rounded text-xl leading-none text-current opacity-70">arrow_drop_up</span>,
                                                desc: <span className="material-symbols-rounded text-xl leading-none text-current opacity-70">arrow_drop_down</span>,
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {table.getRowModel().rows.map(row => (
                        <tr 
                          key={row.id} 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                          onClick={() => onRowClick?.(row.original)}
                        >
                            {row.getVisibleCells().map(cell => (
                                <td 
                                    key={cell.id} 
                                    className={`px-4 py-3 text-gray-700 dark:text-gray-300
                                        ${cell.column.columnDef.meta?.align === 'center' ? 'text-center' : 
                                          cell.column.columnDef.meta?.align === 'end' ? 'text-end' : 
                                          cell.column.columnDef.meta?.align === 'left' ? 'text-left' :
                                          cell.column.columnDef.meta?.align === 'right' ? 'text-right' :
                                          'text-start'}
                                        ${cell.column.columnDef.meta?.flex ? '' : 'whitespace-nowrap'}`}
                                    dir={cell.column.columnDef.meta?.dir}
                                >
                                    {typeof cell.column.columnDef.cell === 'function' ? cell.column.columnDef.cell(cell.getContext()) : cell.getValue() as React.ReactNode}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
