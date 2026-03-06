import { createColumnHelper, type RowData } from '@tanstack/react-table';
import type React from 'react';
import { useMemo } from 'react';
import type { AuditTransaction } from '../../../types/intelligence';
import { useSettings } from '../../../context';
import { getDisplayName } from '../../../utils/drugDisplayName';
import { TanStackTable } from '../../common/TanStackTable';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'start' | 'center' | 'end';
    width?: number;
    flex?: boolean; // Column absorbs remaining space
    dir?: 'ltr' | 'rtl' | 'auto';
  }
}

interface TransactionLogGridProps {
  data: AuditTransaction[];
  onRowClick?: (transaction: AuditTransaction) => void;
}

export const TransactionLogGrid: React.FC<TransactionLogGridProps> = ({ data, onRowClick }) => {
  const { textTransform } = useSettings();

  const columnHelper = createColumnHelper<AuditTransaction>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('timestamp', {
        header: 'التوقيت',
        meta: { align: 'start' },
        cell: (info) => (
          <span dir='ltr'>
            {new Date(info.getValue()).toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'نوع العملية',
        meta: { align: 'center' },
        cell: (info) => {
          const type = info.getValue() as string;
          let config = { color: 'gray', icon: 'edit', label: 'تعديل' };

          if (type === 'SALE') config = { color: 'emerald', icon: 'check_circle', label: 'بيع' };
          else if (type === 'RETURN')
            config = { color: 'red', icon: 'keyboard_return', label: 'إرجاع' };
          else if (type === 'VOID') config = { color: 'gray', icon: 'cancel', label: 'إلغاء' };

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-${config.color}-200 dark:border-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}
            >
              <span className='material-symbols-rounded text-sm'>{config.icon}</span>
              {config.label}
            </span>
          );
        },
      }),
      columnHelper.accessor('product_name', {
        header: 'المنتج',
        meta: { align: 'start', flex: true },
        cell: (info) => getDisplayName({ name: info.getValue() }, textTransform),
      }),
      columnHelper.accessor('quantity', {
        header: 'الكمية',
        meta: { align: 'center' },
        cell: (info) => <span dir='ltr'>{info.getValue()}</span>,
      }),
      columnHelper.accessor('amount', {
        header: 'القيمة',
        meta: { align: 'end' },
        cell: (info) => <span dir='ltr'>{Math.abs(info.getValue()).toFixed(2)}</span>,
      }),
      columnHelper.accessor('cashier_name', {
        header: 'الموظف',
        meta: { align: 'start' },
      }),
      columnHelper.accessor('has_anomaly', {
        header: 'ملاحظات',
        meta: { align: 'center' },
        cell: (info) =>
          info.getValue() ? (
            <span
              className='text-red-500 flex items-center gap-1 text-xs'
              title={info.row.original.anomaly_reason}
            >
              <span className='material-symbols-rounded text-sm'>warning</span>
              تنبيه
            </span>
          ) : (
            '-'
          ),
      }),
    ],
    [textTransform]
  );

  return (
    <TanStackTable
      data={data}
      columns={columns}
      onRowClick={onRowClick}
      tableId='transaction-log-table'
      lite={false}
      enableSearch={false}
      enablePagination={true}
      pageSize='auto'
      enableShowAll={true}
      emptyMessage='لا توجد عمليات مسجلة'
    />
  );
};

