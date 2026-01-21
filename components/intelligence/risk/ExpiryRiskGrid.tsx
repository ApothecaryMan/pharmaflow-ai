import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../../../utils/currency';
// Force refresh
import { 
  createColumnHelper, 
  getCoreRowModel, 
  useReactTable, 
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';
import { ExpiryRiskItem } from '../../../types/intelligence';
import { StatusBadge } from '../common/StatusBadge';

interface ExpiryRiskGridProps {
  data: ExpiryRiskItem[];
  t?: any;
}

export const ExpiryRiskGrid: React.FC<ExpiryRiskGridProps> = ({ data, t }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columnHelper = createColumnHelper<ExpiryRiskItem>();

  const columns = useMemo(() => [
    columnHelper.accessor('product_name', {
      header: t?.intelligence?.risk?.grid?.columns?.product || 'Product / Batch',
      cell: info => (
        <div>
          <div className="font-medium">{info.getValue()}</div>
          <div className="text-xs text-gray-500 font-mono">{info.row.original.batch_number}</div>
        </div>
      ),
    }),
    columnHelper.accessor('days_until_expiry', {
      header: t?.intelligence?.risk?.grid?.columns?.daysLeft || 'Days Left',
      cell: info => {
        const val = info.getValue();
        return (
            <span className={`font-bold ${val < 30 ? 'text-red-600' : val < 60 ? 'text-amber-500' : 'text-blue-500'}`}>
                {val} {t?.intelligence?.risk?.grid?.day || 'day'}
            </span>
        );
      },
    }),
    columnHelper.accessor('current_quantity', {
        header: t?.intelligence?.risk?.grid?.columns?.quantity || 'Quantity',
        cell: info => info.getValue()
    }),
    columnHelper.accessor('value_at_risk', {
        header: t?.intelligence?.risk?.grid?.columns?.valueAtRisk || 'Value at Risk',
        cell: info => formatCurrency(info.getValue())
    }),
    columnHelper.accessor('risk_category', {
      header: t?.intelligence?.risk?.grid?.columns?.riskCategory || 'Risk Category',
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('expected_recovery_value', {
        header: t?.intelligence?.risk?.grid?.columns?.recovery || 'Est. Recovery',
        cell: info => (
            <span className="text-emerald-600 font-medium">
                {formatCurrency(info.getValue() ?? 0)}
            </span>
        )
    }),
    columnHelper.display({
        id: 'actions',
        header: t?.intelligence?.risk?.grid?.columns?.action || 'Action',
        cell: info => {
           const action = info.row.original.recommended_action;
           return (
               <button className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors">
                   {action === 'DISCOUNT_AGGRESSIVE' ? (t?.intelligence?.risk?.grid?.actions?.discount50 || '50% Off') : 
                    action === 'DISCOUNT_MODERATE' ? (t?.intelligence?.risk?.grid?.actions?.discount25 || '25% Off') :
                    action === 'RETURN' ? (t?.intelligence?.risk?.grid?.actions?.return || 'Return') : (t?.intelligence?.risk?.grid?.actions?.action || 'Action')}
               </button>
           );
        }
    })
  ], [columnHelper, t]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-right">
                <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} className="px-4 py-3 font-medium cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                                    {typeof header.column.columnDef.header === 'function' ? header.column.columnDef.header(header.getContext()) : header.column.columnDef.header}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id} className="px-4 py-3 text-gray-700 dark:text-gray-300">
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
