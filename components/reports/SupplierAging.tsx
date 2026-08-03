import type React from 'react';
import { useMemo, useState } from 'react';
import { useSupplierAging } from '../../hooks/suppliers/useSupplierAccount';
import { useAuthStore } from '../../stores/authStore';
import type { AgingBucketKey } from '../../types';
import { DatePicker } from '../common/DatePicker';
import { SearchInput } from '../common/SearchInput';
import { TanStackTable } from '../common/TanStackTable';

interface SupplierAgingProps {
  color: string;
  t: any;
  language: 'EN' | 'AR';
  onViewChange?: (view: string, params?: Record<string, unknown>) => void;
}

export const SupplierAging: React.FC<SupplierAgingProps> = ({
  color,
  t,
  language: _language,
  onViewChange,
}) => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [asOfDate, setAsOfDate] = useState('');

  const { data: aging = [] } = useSupplierAging(activeBranchId, asOfDate);

  const buckets = [
    { key: 'current', label: t.current || 'Current', amountKey: 'currentAmount', colorClass: 'bg-green-100/60 dark:bg-green-900/40 backdrop-blur-md border border-green-200/50 dark:border-green-800/50 text-green-800 dark:text-green-300 shadow-sm', dotClass: 'bg-green-500' },
    { key: 'due1To30', label: t.days130 || '1–30', amountKey: 'due1To30', colorClass: 'bg-blue-100/60 dark:bg-blue-900/40 backdrop-blur-md border border-blue-200/50 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 shadow-sm', dotClass: 'bg-blue-500' },
    { key: 'due31To60', label: t.days3160 || '31–60', amountKey: 'due31To60', colorClass: 'bg-purple-100/60 dark:bg-purple-900/40 backdrop-blur-md border border-purple-200/50 dark:border-purple-800/50 text-purple-800 dark:text-purple-300 shadow-sm', dotClass: 'bg-purple-500' },
    { key: 'due61To90', label: t.days6190 || '61–90', amountKey: 'due61To90', colorClass: 'bg-amber-100/60 dark:bg-amber-900/40 backdrop-blur-md border border-amber-200/50 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 shadow-sm', dotClass: 'bg-amber-500' },
    { key: 'dueOver90', label: t.days90Plus || '90+', amountKey: 'dueOver90', colorClass: 'bg-red-100/60 dark:bg-red-900/40 backdrop-blur-md border border-red-200/50 dark:border-red-800/50 text-red-800 dark:text-red-300 shadow-sm', dotClass: 'bg-red-500' },
  ] as const;

  const totals = useMemo(() => {
    const ttl: Record<string, number> = {
      currentAmount: 0,
      due1To30: 0,
      due31To60: 0,
      due61To90: 0,
      dueOver90: 0,
      totalOpen: 0,
    };
    for (const row of aging) {
      ttl.currentAmount += Number(row.currentAmount) || 0;
      ttl.due1To30 += Number(row.due1To30) || 0;
      ttl.due31To60 += Number(row.due31To60) || 0;
      ttl.due61To90 += Number(row.due61To90) || 0;
      ttl.dueOver90 += Number(row.dueOver90) || 0;
      ttl.totalOpen += Number(row.totalOpen) || 0;
    }
    return ttl;
  }, [aging]);

  const drillToStatement = (supplierId: string) => {
    onViewChange?.('supplier-statement', { supplierId });
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'supplierName',
        header: t.supplier || 'Supplier',
      },
      {
        accessorKey: 'currentAmount',
        header: t.current || 'Current',
        cell: (info: any) => Number(info.getValue()).toLocaleString(),
      },
      {
        accessorKey: 'due1To30',
        header: t.days130 || '1–30',
        cell: (info: any) => Number(info.getValue()).toLocaleString(),
      },
      {
        accessorKey: 'due31To60',
        header: t.days3160 || '31–60',
        cell: (info: any) => Number(info.getValue()).toLocaleString(),
      },
      {
        accessorKey: 'due61To90',
        header: t.days6190 || '61–90',
        cell: (info: any) => Number(info.getValue()).toLocaleString(),
      },
      {
        accessorKey: 'dueOver90',
        header: t.days90Plus || '90+',
        cell: (info: any) => Number(info.getValue()).toLocaleString(),
      },
      {
        accessorKey: 'totalOpen',
        header: t.total || 'Total',
        cell: (info: any) => (
          <span className='font-semibold'>{Number(info.getValue()).toLocaleString()}</span>
        ),
      },
    ],
    [t]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = (value: string) => setSearchTerm(value);

  return (
    <div className='flex flex-col h-full'>
      <div className='flex-1 pt-4 sm:pt-6 overflow-hidden flex flex-col transition-opacity duration-300 opacity-100'>
        <TanStackTable
          leftCustomControls={
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0 w-full'>
              <h1
                className='hidden xl:block text-2xl !font-["GraphicSansFont"] tracking-tight leading-normal text-gray-900 dark:text-white page-title me-2 sm:me-4 shrink-0'
                style={{
                  fontFeatureSettings:
                    '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
                }}
              >
                {t.agingTitle || 'Supplier Aging'}
              </h1>
              <div className='flex flex-wrap items-center gap-2'>
                {buckets.map((b) => (
                  <div
                    key={b.key}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${b.colorClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${b.dotClass} inline-block shrink-0`} />
                    <span className='whitespace-nowrap'>{b.label}</span>
                    <span className='font-bold ms-1'>{Number(totals[b.amountKey] || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          }
          rightCustomControls={
            <div className='flex items-center justify-center sm:justify-end w-full gap-2'>
              <SearchInput
                compact
                expandable
                value={searchTerm}
                onSearchChange={handleSearchChange}
                placeholder={t.searchSupplier || 'ابحث باسم المورد...'}
                wrapperClassName='w-full sm:w-[250px] lg:w-[320px]'
              />
              <DatePicker
                value={asOfDate}
                onChange={setAsOfDate}
                label={t.asOfDate || 'As of date'}
                color={color}
                className='w-full sm:w-[180px] lg:w-[210px] h-pageheader'
                rounded='lg'
                variant='input'
              />
            </div>
          }
          data={aging}
          columns={columns}
          onRowClick={(row) => drillToStatement(row.supplierId)}
          emptyMessage={t.noSuppliersFound || 'No suppliers found'}
          enableSearch={false}
          globalFilter={searchTerm}
          onSearchChange={handleSearchChange}
        />
      </div>
    </div>
  );
};
