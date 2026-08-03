import { createColumnHelper } from '@tanstack/react-table';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useSupplierStatement } from '../../hooks/suppliers/useSupplierAccount';
import { useSuppliers } from '../../hooks/queries/useInventoryQuery';
import { useAuthStore } from '../../stores/authStore';
import type { SupplierStatementRow } from '../../types';
import { DatePicker, DateRangePicker } from '../common/DatePicker';
import { SearchInput } from '../common/SearchInput';
import { TanStackTable } from '../common/TanStackTable';
import { SupplierSelect } from '../suppliers/SupplierSelect';

interface SupplierStatementProps {
  color: string;
  t: any;
  language: 'EN' | 'AR';
  navigationParams?: {
    supplierId?: string;
    [key: string]: unknown;
  };
}

const columnHelper = createColumnHelper<SupplierStatementRow>();

export const SupplierStatement: React.FC<SupplierStatementProps> = ({
  color,
  t,
  language: _language,
  navigationParams,
}) => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: suppliers = [] } = useSuppliers(activeBranchId);

  const [selectedSupplierId, setSelectedSupplierId] = useState(
    navigationParams?.supplierId || ''
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: statement = [] } = useSupplierStatement(
    selectedSupplierId,
    dateFrom || undefined,
    dateTo || undefined
  );

  const columns = useMemo(() => [
    columnHelper.accessor('entryDate', { header: t.entryDate || 'Date' }),
    columnHelper.accessor('entryType', {
      header: t.paymentType || 'Type',
      cell: (info) => {
        const type = info.getValue();
        const labelMap: Record<string, string> = {
          purchase: t.purchase || 'Purchase',
          payment: t.payment || 'Payment',
          credit_note: t.creditNote || 'Credit Note',
          opening_balance: t.openingBalance || 'Opening Balance',
          purchase_reversal: t.reversal || 'Reversal',
          credit_note_reversal: t.reversal || 'Reversal',
          payment_reversal: t.reversal || 'Reversal',
        };
        return labelMap[type] || type;
      },
    }),
    columnHelper.accessor('sourceId', {
      header: t.sourceRef || 'Source Ref',
      cell: (info) => String(info.getValue() || '').slice(0, 8),
    }),
    columnHelper.accessor('debit', {
      header: t.debit || 'Debit',
      cell: (info) => Number(info.getValue()).toLocaleString(),
    }),
    columnHelper.accessor('credit', {
      header: t.credit || 'Credit',
      cell: (info) => Number(info.getValue()).toLocaleString(),
    }),
    columnHelper.accessor('runningBalance', {
      header: t.runningBalance || 'Running Balance',
      cell: (info) => Number(info.getValue()).toLocaleString(),
    }),
  ],
    [t]
  );

  const exportCSV = () => {
    const header = [
      t.entryDate || 'Date',
      t.paymentType || 'Type',
      t.sourceRef || 'Source Ref',
      t.debit || 'Debit',
      t.credit || 'Credit',
      t.runningBalance || 'Running Balance',
    ];
    const rows = statement.map((row) => [
      row.entryDate,
      row.entryType,
      row.sourceId,
      row.debit,
      row.credit,
      row.runningBalance,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-statement-${selectedSupplierId.slice(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = (value: string) => setSearchTerm(value);

  return (
    <div className='flex flex-col h-full'>
      <div className='flex-1 pt-4 sm:pt-6 overflow-hidden flex flex-col transition-opacity duration-300 opacity-100'>
        <TanStackTable
          leftCustomControls={
            <h1
              className='hidden md:block text-2xl !font-["GraphicSansFont"] tracking-tight leading-normal text-gray-900 dark:text-white page-title me-2 sm:me-4 shrink-0'
              style={{
                fontFeatureSettings:
                  '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
              }}
            >
              {t.statementTitle || 'Supplier Statement'}
            </h1>
          }
          rightCustomControls={
            <div className='flex items-center justify-center sm:justify-end w-full gap-2'>
              <SearchInput
                compact
                expandable
                value={searchTerm}
                onSearchChange={handleSearchChange}
                placeholder={t.searchTransactions || 'ابحث بالمرجع، التاريخ، أو النوع...'}
                wrapperClassName='w-full sm:w-[250px] lg:w-[300px]'
              />
              <SupplierSelect
                value={selectedSupplierId}
                onChange={setSelectedSupplierId}
                suppliers={suppliers}
                placeholder={t.selectSupplier || 'Select a supplier'}
                color={color}
                className='w-full sm:w-[180px] lg:w-[220px] h-pageheader shrink-0'
              />
              <DateRangePicker
                startDate={dateFrom}
                endDate={dateTo}
                onStartDateChange={setDateFrom}
                onEndDateChange={setDateTo}
                color={color}
                rounded='lg'
                className='h-pageheader'
              />
              <button
                type='button'
                onClick={exportCSV}
                disabled={!selectedSupplierId || statement.length === 0}
                className='inline-flex items-center justify-center gap-2 px-3 text-sm font-medium rounded-lg bg-white dark:bg-gray-900 border border-(--border-divider) hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 cursor-pointer whitespace-nowrap flex-shrink-0 text-gray-700 dark:text-gray-200 h-pageheader'
              >
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <title>Export</title>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                <span className='hidden lg:inline'>{t.exportCSV || 'Export CSV'}</span>
              </button>
            </div>
          }
          data={statement}
          columns={columns}
          emptyMessage={
            selectedSupplierId
              ? t.noTransactions || 'No transactions found'
              : t.selectSupplier || 'Select a supplier'
          }
          enableSearch={false}
          globalFilter={searchTerm}
          onSearchChange={handleSearchChange}
        />
      </div>
    </div>
  );
};
