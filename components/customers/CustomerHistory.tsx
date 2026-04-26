import type { ColumnDef } from '@tanstack/react-table';
import React, { useMemo, useState } from 'react';
import type { TRANSLATIONS } from '../../i18n/translations';
import type { Customer, Return, Sale } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { TanStackTable } from '../common/TanStackTable';
import { PageHeader } from '../common/PageHeader';
import { DateRangePicker } from '../common/DatePicker';

interface CustomerHistoryProps {
  color: string;
  t: typeof TRANSLATIONS.EN.customers;
  language: 'EN' | 'AR';
  customers: Customer[];
  sales: Sale[];
  returns: Return[];
  navigationParams?: Record<string, any> | null;
  isLoading?: boolean;
  onViewChange?: (view: string, params?: Record<string, any>) => void;
  datePickerTranslations?: any;
}

export const CustomerHistory: React.FC<CustomerHistoryProps> = ({
  color,
  t,
  language,
  customers,
  sales,
  returns,
  navigationParams,
  isLoading,
  onViewChange,
  datePickerTranslations,
}) => {
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales');

  // Unify Transactions (Sales & Returns) - Filtered for registered customers only
  const registeredCodes = useMemo(() => new Set(customers.map((c) => c.code)), [customers]);

  const salesWithCustomer = useMemo(() => {
    return sales.filter((s) => {
      // 1. Customer Filtering
      const hasCorrectCustomer = s.customerCode && registeredCodes.has(s.customerCode);
      if (!hasCorrectCustomer) return false;

      // 2. Date Filtering
      const saleDate = new Date(s.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) {
        start.setHours(0, 0, 0, 0);
        if (saleDate < start) return false;
      }
      if (end) {
        end.setHours(23, 59, 59, 999);
        if (saleDate > end) return false;
      }

      return true;
    });
  }, [sales, registeredCodes, startDate, endDate]);

  const returnsWithCustomer = useMemo(() => {
    // Only include returns linked to sales of registered customers
    const registeredSaleIds = new Set(salesWithCustomer.map((s) => s.id));

    return returns
      .filter((ret) => {
        // 1. Registered Customer Filtering
        const isRegistered = registeredSaleIds.has(ret.saleId);
        if (!isRegistered) return false;

        // 2. Date Filtering
        const returnDate = new Date(ret.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) {
          start.setHours(0, 0, 0, 0);
          if (returnDate < start) return false;
        }
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (returnDate > end) return false;
        }

        return true;
      })
      .map((ret) => {
        const sale = sales.find((s) => s.id === ret.saleId);
        return {
          ...ret,
          customerName: sale?.customerName || '-',
          customerCode: sale?.customerCode || '-',
          customerPhone: sale?.customerPhone || '-',
        };
      });
  }, [returns, sales, salesWithCustomer, startDate, endDate]);

  // Handle passed initial search from navigation (optional)
  React.useEffect(() => {
    if (navigationParams?.customerId) {
      const customer = customers.find((c) => c.id === navigationParams.customerId);
      if (customer) {
        // We can potentially set an initial filter for the table here if the table component supports pass-through filters
      }
    }
  }, [navigationParams, customers]);

  // Columns for Sales Table
  const salesColumns = useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        accessorKey: 'date',
        header: t.customerHistory?.table.date || 'Date',
        meta: { width: 110, align: 'center' },
      },
      {
        accessorKey: 'customerCode',
        header: t.modal.code || 'Code',
        meta: { width: 100 },
      },
      {
        accessorKey: 'customerName',
        header: t.headers.name || 'Customer',
        meta: { width: 180 },
      },
      {
        accessorKey: 'customerPhone',
        header: t.modal.phone || 'Phone',
        meta: { width: 130 },
      },
      {
        accessorKey: 'dailyOrderNumber',
        header: t.customerHistory?.table.invoiceNo || 'Invoice #',
        cell: (info) =>
          info.row.original.dailyOrderNumber
            ? `#${info.row.original.dailyOrderNumber}`
            : info.row.original.id.substring(0, 8),
        meta: { width: 100 },
      },
      {
        accessorKey: 'items',
        header: t.customerHistory?.table.items || 'Items',
        cell: (info) => info.row.original.items?.length || 0,
        meta: { align: 'center', width: 70 },
      },
      {
        accessorKey: 'total',
        header: t.customerHistory?.table.total || 'Total',
        cell: (info) => `$${info.row.original.total?.toFixed(2)}`,
        meta: { align: 'end', isNumeric: true, width: 90 },
      },
      {
        accessorKey: 'status',
        header: t.customerHistory?.table.status || 'Status',
        meta: { align: 'center', width: 100 },
        cell: (info) => {
          const status = info.row.original.status;
          const isCompleted = status === 'completed';
          const colorClasses = isCompleted
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-gray-600 dark:text-gray-400';
          const icon = isCompleted ? 'check_circle' : 'history';

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current bg-transparent text-[10px] font-bold uppercase tracking-wider ${colorClasses}`}
            >
              <span className='material-symbols-rounded text-sm'>{icon}</span>
              {status}
            </span>
          );
        },
      },
    ],
    [t]
  );

  // Columns for Returns Table
  const returnsColumns = useMemo<ColumnDef<Return>[]>(
    () => [
      {
        accessorKey: 'date',
        header: t.customerHistory?.table.date || 'Date',
        meta: { width: 110, align: 'center' },
      },
      {
        accessorKey: 'customerCode',
        header: t.modal.code || 'Code',
        meta: { width: 100 },
      },
      {
        accessorKey: 'customerName',
        header: t.headers.name || 'Customer',
        meta: { width: 180 },
      },
      {
        accessorKey: 'id',
        header: t.customerHistory?.table.returnNo || 'Return #',
        meta: { width: 100, align: 'start' },
      },
      {
        accessorKey: 'totalRefund',
        header: t.customerHistory?.table.refundAmount || 'Refund',
        cell: (info) => `$${info.row.original.totalRefund?.toFixed(2)}`,
        meta: { align: 'end', isNumeric: true, width: 90 },
      },
      {
        accessorKey: 'reason',
        header: t.customerHistory?.table.reason || 'Reason',
      },
    ],
    [t]
  );

  return (
    <div className='h-full flex flex-col space-y-6 overflow-hidden'>
      <PageHeader
        leftContent={
          <div className='w-full max-w-md'>
            <SearchInput
              value={searchTerm}
              onSearchChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              placeholder={t.customerHistory?.searchPlaceholder || 'Search...'}
              color={color}
            />
          </div>
        }
        centerContent={
          <SegmentedControl
            options={[
              { value: 'customers', label: t.allCustomers || 'List', icon: 'group' },
              { value: 'add-customer', label: t.addCustomer || 'Add', icon: 'person_add' },
              { value: 'customer-history', label: t.customerHistory?.title || 'History', icon: 'history' },
            ]}
            value="customer-history"
            onChange={(val) => {
              if (val === 'add-customer') onViewChange?.('customers', { mode: 'add' });
              else onViewChange?.(val);
            }}
            variant="onPage"
            shape="pill"
            color={color}
            size="md"
            iconSize="--icon-lg"
            useGraphicFont={true}
            className="w-full sm:w-[480px]"
          />
        }
        rightContent={
          <div className='flex items-center gap-3'>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              color={color}
              locale={locale}
            />
            <SegmentedControl
              value={activeTab}
              onChange={(val) => setActiveTab(val as 'sales' | 'returns')}
              color={color}
              options={[
                {
                  label: t.customerHistory?.tabs.invoices || 'Invoices',
                  value: 'sales',
                  icon: 'receipt_long',
                },
                {
                  label: t.customerHistory?.tabs.returns || 'Returns',
                  value: 'returns',
                  icon: 'assignment_return',
                },
              ]}
            />
          </div>
        }
      />

      <div className='flex-1 min-h-0 flex flex-col'>
        {/* Unified Transactions Table */}
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col'>
          <div className='flex-1 p-0'>
            {activeTab === 'sales' ? (
              <TanStackTable
                data={salesWithCustomer}
                columns={salesColumns}
                tableId='cust_history_sales_v2'
                color={color}
                globalFilter={searchTerm}
                onSearchChange={setSearchTerm}
                enableSearch={false}
                isLoading={isLoading}
                enablePagination={true}
                enableVirtualization={false}
                pageSize='auto'
                enableShowAll={true}
              />
            ) : (
              <TanStackTable
                data={returnsWithCustomer}
                columns={returnsColumns}
                tableId='cust_history_returns_v2'
                color={color}
                globalFilter={searchTerm}
                onSearchChange={setSearchTerm}
                enableSearch={false}
                isLoading={isLoading}
                enablePagination={true}
                enableVirtualization={false}
                pageSize='auto'
                enableShowAll={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
