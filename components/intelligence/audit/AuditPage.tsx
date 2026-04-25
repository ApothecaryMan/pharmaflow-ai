import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useMemo, useState } from 'react';
import { SearchInput } from '../../../components/common/SearchInput';
import { TanStackTable } from '../../../components/common/TanStackTable';
import { useAudit } from '../../../hooks/useAudit';
import type { AuditTransaction } from '../../../types/intelligence';
import { formatCurrency } from '../../../utils/currency';
import { TransactionDetailModal } from './TransactionDetailModal';
import { useSettings } from '../../../context';
import { getDisplayName } from '../../../utils/drugDisplayName';
import { DashboardPageSkeleton } from '../common/IntelligenceSkeletons';

interface AuditPageProps {
  t: any;
  language?: string;
  transactions: AuditTransaction[];
  loading: boolean;
  globalFilter?: string;
}

export const AuditPage: React.FC<AuditPageProps> = ({
  t,
  language = 'EN',
  transactions,
  loading,
  globalFilter = '',
}) => {
  const { textTransform } = useSettings();
  const [selectedTransaction, setSelectedTransaction] = useState<AuditTransaction | null>(null);

  const columnHelper = createColumnHelper<AuditTransaction>();

  const columns = useMemo<ColumnDef<AuditTransaction, any>[]>(
    () => [
      columnHelper.accessor('timestamp', {
        header: t?.intelligence?.audit?.grid?.columns?.date || 'Date',
        meta: { align: 'start' },
        cell: (info) => (
          <div className='flex flex-col'>
            <span className='font-medium text-gray-900 dark:text-white'>
              {new Date(info.getValue()).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className='text-xs text-gray-400'>
              {new Date(info.getValue()).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: t?.intelligence?.audit?.grid?.columns?.type || 'Type',
        meta: { align: 'center' },
        cell: (info) => {
          const type = info.getValue();
          const isSale = type === 'SALE';
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-[10px] font-bold uppercase tracking-wider bg-transparent ${
                isSale
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              <span className='material-symbols-rounded text-sm'>
                {isSale ? 'check_circle' : 'assignment_return'}
              </span>
              {isSale
                ? t?.intelligence?.audit?.types?.sale || 'Sale'
                : t?.intelligence?.audit?.types?.return || 'Return'}
            </span>
          );
        },
      }),
      columnHelper.accessor('product_name', {
        header: t?.intelligence?.audit?.grid?.columns?.product || 'Product',
        meta: { align: 'start' },
        cell: (info) => (
          <div className='font-medium text-gray-900 dark:text-white'>
            {getDisplayName({ name: info.getValue() }, textTransform)}
          </div>
        ),
      }),
      columnHelper.accessor('quantity', {
        header: t?.intelligence?.audit?.grid?.columns?.qty || 'Qty',
        meta: { align: 'center' },
        cell: (info) => <span className='font-bold'>{info.getValue()}</span>,
      }),
      columnHelper.accessor('amount', {
        header: t?.intelligence?.audit?.grid?.columns?.amount || 'Amount',
        meta: { align: 'end' },
        cell: (info) => (
          <span className='font-mono font-bold text-gray-900 dark:text-white'>
            {info.getValue().toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor('cashier_name', {
        header: t?.intelligence?.audit?.grid?.columns?.user || 'User',
        meta: { align: 'start' },
        cell: (info) => <span className='text-sm text-gray-600 dark:text-gray-400'>{info.getValue()}</span>,
      }),
    ],
    [columnHelper, t, language, textTransform]
  );

  if (loading) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      {/* Table Container - Simplified since TanStackTable will provide card styling */}
      <div className='flex-1 min-h-0'>
        <TanStackTable
          data={transactions}
          columns={columns}
          isLoading={loading}
          emptyMessage={t?.intelligence?.audit?.empty?.title || 'No logs found'}
          tableId='audit-log-table'
          lite={false}
          enableSearch={false}
          globalFilter={globalFilter}
          enablePagination={true}
          enableVirtualization={false}
          pageSize='auto'
          enableShowAll={true}
          onRowClick={(row) => setSelectedTransaction(row)}
        />
      </div>

      <TransactionDetailModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        t={t}
        language={language}
      />
    </div>
  );
};
