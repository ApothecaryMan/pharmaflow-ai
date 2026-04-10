import type { ColumnDef } from '@tanstack/react-table';
import React, { useRef, useState } from 'react';
import { useSettings } from '../../context';
import { type UserRole } from '../../config/permissions';
import { permissionsService } from '../../services/auth/permissions';
import { SALES_HISTORY_HELP } from '../../i18n/helpInstructions';
import type { Customer, Return, Sale, Shift } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { POSCustomerHistoryModal } from './pos/ui/POSCustomerHistoryModal';
import { createSearchRegex } from '../../utils/searchUtils';
import { CARD_BASE } from '../../utils/themeStyles';
import { DatePicker, DateRangePicker } from '../common/DatePicker';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { TanStackTable } from '../common/TanStackTable';
import { ReturnModal } from '../sales/ReturnModal';
import {
  getActiveReceiptSettings,
  type InvoiceTemplateOptions,
  printInvoice,
} from './InvoiceTemplate';
import { SaleDetailModal } from './SaleDetailModal';
import { formatCurrency } from '../../utils/currency';

interface SalesHistoryProps {
  sales: Sale[];
  returns: Return[];
  onProcessReturn: (returnData: Return) => void;
  color: string;
  t: any;
  language: string;
  datePickerTranslations: any;
  currentEmployeeId?: string;
  currentShift: Shift | null;
  navigationParams?: any;
  customers: Customer[];
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  sales,
  returns,
  onProcessReturn,
  color,
  t,
  language,
  datePickerTranslations,
  currentEmployeeId,
  currentShift,
  // @ts-ignore
  navigationParams,
  customers = [],
}) => {
  // Determine locale based on language
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [isHistOpen, setIsHistOpen] = useState(false);
  const { textTransform } = useSettings();

  // Calculate daily refunds for the current employee (used for pharmacist limits)
  const currentDailyRefunds = React.useMemo(() => {
    const userRole = permissionsService.getEffectiveRole();
    if (!currentEmployeeId || userRole !== 'pharmacist') return 0;

    const today = new Date().toISOString().split('T')[0];
    return (returns || [])
      .filter((r) => {
        const isToday = r.date.startsWith(today);
        const isSameEmployee = r.processedBy === currentEmployeeId;
        return isToday && isSameEmployee;
      })
      .reduce((sum, r) => sum + r.totalRefund, 0);
  }, [returns, currentEmployeeId]);
  
  // Handle Navigation Params (Deep Linking)
  React.useEffect(() => {
    if (navigationParams?.id) {
      const saleId = navigationParams.id;
      setSearchTerm(saleId);
      // Wait for next tick to ensure search term is applied if needed, but here we scan the array directly
      const sale = sales.find(s => s.id === saleId);
      if (sale) {
        setSelectedSale(sale);
      }
    }
  }, [navigationParams, sales]);

  // Get help content
  const helpContent = SALES_HISTORY_HELP[language as 'EN' | 'AR'] || SALES_HISTORY_HELP.EN;

  // Column definitions using TanStackTable's ColumnDef
  const tableColumns = React.useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        accessorKey: 'serialId',
        header: t.modal.id,
        cell: ({ row }) => (
          <span className='font-mono font-bold text-sm text-gray-900 dark:text-gray-100'>
            {row.original.serialId || row.original.id.slice(0, 8)}
          </span>
        ),
        meta: { align: 'start' },
      },
      {
        accessorKey: 'date',
        header: t.headers.date,
        meta: { align: 'center' },
        cell: ({ getValue }) => (
          <span className='text-sm text-gray-700 dark:text-gray-300'>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'customerCode',
        header: t.headers.code || 'Code',
        cell: ({ getValue }) => {
          const code = getValue() as string;
          const customer = customers.find(c => c.code === code);
          const isClickable = !!customer;

          return (
            <span 
              onClick={(e) => {
                if (isClickable) {
                  e.stopPropagation();
                  setSelectedCust(customer);
                  setIsHistOpen(true);
                }
              }}
              className={`font-mono font-bold text-sm ${
                isClickable 
                  ? 'text-gray-900 dark:text-gray-100 cursor-pointer hover:opacity-70 transition-opacity' 
                  : 'text-gray-400'
              }`}
            >
              {code || '-'}
            </span>
          );
        },
      },
      {
        accessorKey: 'customerName',
        header: t.headers.customer,
        cell: ({ row }) => {
          const name = row.original.customerName;
          return (
            <div className='font-medium text-gray-900 dark:text-gray-100 text-sm'>
              {name || 'Guest'}
            </div>
          );
        },
      },
      {
        accessorKey: 'paymentMethod',
        header: t.headers.payment,
        cell: ({ getValue }) => {
          const method = getValue() as string;
          const isVisa = method === 'visa';
          return (
            <span
              className={`flex items-center gap-1 ${isVisa ? 'text-primary-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}
            >
              <span className='material-symbols-rounded text-[16px]'>
                {isVisa ? 'credit_card' : 'payments'}
              </span>
              <span className='text-sm font-medium'>{isVisa ? t.visa : t.cash}</span>
            </span>
          );
        },
      },
      {
        id: 'items',
        accessorFn: (row) => row.items.length,
        header: t.headers.items,
        cell: ({ getValue }) => (
          <span className='text-sm text-gray-600 dark:text-gray-400'>
            {getValue() as number} {t.items || 'items'}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: t.headers.total,
        cell: ({ row }) => {
          const sale = row.original;
          return (
            <div className='font-bold text-gray-900 dark:text-gray-100 tabular-nums text-sm'>
              {formatCurrency(sale.total)}
              {sale.deliveryFee && sale.deliveryFee > 0 && (
                <div className='text-[10px] text-gray-400 font-normal tabular-nums'>
                  +{formatCurrency(sale.deliveryFee)} {t.delivery || 'delivery'}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (sale) => {
          if (sale.status === 'cancelled') return 'cancelled';
          if (sale.hasReturns) return 'returned';
          // If it's delivery and not completed, return its specific status
          if (sale.saleType === 'delivery' && sale.status !== 'completed') {
            return sale.status;
          }
          return 'completed';
        },
        header: t.status || 'Status',
        meta: { align: 'end' },
        cell: ({ row }) => {
          const sale = row.original;
          const totalReturned = sale.netTotal !== undefined ? sale.total - sale.netTotal : 0;

          if (sale.hasReturns) {
            return (
              <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-orange-500 text-orange-500 text-[10px] font-black uppercase tracking-wider bg-transparent'>
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>assignment_return</span>
                -${totalReturned.toFixed(2)}
              </span>
            );
          }

          if (sale.status === 'cancelled') {
            return (
              <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-red-500 text-red-500 text-[10px] font-black uppercase tracking-wider bg-transparent'>
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>cancel</span>
                {t.cancelled || 'Cancelled'}
              </span>
            );
          }

          // Delivery Specific Statuses
          if (sale.saleType === 'delivery' && sale.status !== 'completed') {
            const isPending = sale.status === 'pending';
            const isWithDelivery = sale.status === 'with_delivery';
            const isOnWay = sale.status === 'on_way';
            
            let colorClass = 'border-blue-500 text-blue-500';
            let icon = 'pending';
            if (isWithDelivery) {
              colorClass = 'border-indigo-500 text-indigo-500';
              icon = 'delivery_dining';
            } else if (isOnWay) {
              colorClass = 'border-orange-500 text-orange-500';
              icon = 'local_shipping';
            }

            return (
              <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border ${colorClass} text-[10px] font-black uppercase tracking-wider bg-transparent`}>
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>{icon}</span>
                {t[sale.status!] || sale.status}
              </span>
            );
          }

          return (
            <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-emerald-500 text-emerald-500 text-[10px] font-black uppercase tracking-wider bg-transparent'>
              <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>check_circle</span>
              {t.completed || 'Completed'}
            </span>
          );
        },
      },
    ],
    [t, textTransform, customers]
  );

  const filterableColumns = React.useMemo(
    () => [
      {
        id: 'status',
        label: t.status,
        icon: 'dynamic_feed',
        mode: 'multiple' as const,
        options: [
          { label: t.completed, value: 'completed', icon: 'check_circle' },
          { label: t.pending, value: 'pending', icon: 'pending' },
          { label: t.with_delivery || 'With Delivery', value: 'with_delivery', icon: 'delivery_dining' },
          { label: t.on_way || 'On Way', value: 'on_way', icon: 'local_shipping' },
          { label: t.cancelled, value: 'cancelled', icon: 'cancel' },
          { label: t.returns?.returned || 'Returned', value: 'returned', icon: 'assignment_return' },
        ],
      },
      {
        id: 'paymentMethod',
        label: t.headers.payment,
        icon: 'payments',
        mode: 'single' as const,
        options: [
          { label: t.cash, value: 'cash', icon: 'payments' },
          { label: t.visa, value: 'visa', icon: 'credit_card' },
        ],
      },
    ],
    [t]
  );

  const filteredSales = React.useMemo(() => {
    return sales.filter((sale) => {
      // 1. Date Filtering (Manual because TanStackTable doesn't have a built-in range filter UI yet)
      const saleDate = new Date(sale.date);
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

      // 2. Role Restrictions
      if (!permissionsService.isOrgAdmin() && permissionsService.can('sale.view_assigned_only')) {
        return sale.deliveryEmployeeId === currentEmployeeId;
      }

      return true;
    });
  }, [sales, startDate, endDate, currentEmployeeId]);

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  const exportToCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      'ID',
      'Date',
      'Customer',
      'Customer Code',
      'Payment Method',
      'Items Count',
      'Subtotal',
      'Global Discount (%)',
      'Total',
    ];
    const escape = (str: string | number | undefined) =>
      `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = filteredSales.map((sale) => [
      sale.id,
      new Date(sale.date).toLocaleString(locale, { numberingSystem: 'latn' }),
      sale.customerName || 'Guest',
      sale.customerCode || '-',
      sale.paymentMethod === 'visa' ? 'Visa' : 'Cash',
      sale.items.length,
      (sale.subtotal || 0).toFixed(2),
      sale.globalDiscount || 0,
      sale.total.toFixed(2),
    ]);

    const csvContent = [
      headers.map(escape).join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_history_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (sale: Sale) => {
    const activeSettings = getActiveReceiptSettings();
    const options: InvoiceTemplateOptions = {
      ...activeSettings,
      language: language as 'EN' | 'AR',
    };
    printInvoice(sale, options);
  };

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight page-title'>{t.title}</h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t.subtitle}</p>
        </div>

        {/* Total Revenue Card - Hidden for Delivery Agents */}
        {!permissionsService.can('sale.view_assigned_only') && (
          <div
            className={`px-4 py-2 rounded-2xl bg-primary-50 dark:bg-primary-900/20 ${CARD_BASE} flex flex-col items-end min-w-[140px]`}
          >
            <span
              className={`text-[10px] font-bold uppercase text-primary-600 dark:text-primary-400`}
            >
              {t.totalRevenue}
            </span>
            <span className={`text-xl font-bold text-primary-900 dark:text-primary-100`}>
              ${totalRevenue.toFixed(2)}
            </span>
          </div>
        )}
      </div>


      {/* Table Section */}
      <div className='flex-1 flex flex-col min-h-0'>
        <TanStackTable
          data={filteredSales}
          columns={tableColumns}
          tableId='sales_history_table'
          color={color}
          enableTopToolbar={true}
          enableSearch={true}
          searchPlaceholder={t.searchPlaceholder || 'Search sales…'}
          globalFilter={searchTerm}
          onSearchChange={setSearchTerm}
          filterableColumns={filterableColumns}
          onRowClick={(sale) => setSelectedSale(sale)}
          emptyMessage={t.noResults}
          lite={false}
          dense={true}
          initialSorting={[{ id: 'date', desc: true }]}
          enablePagination={true}
          enableVirtualization={false}
          pageSize='auto'
          enableShowAll={true}
          rightCustomControls={
            <>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                color={color}
                locale={locale}
              />

              <button
                onClick={exportToCSV}
                disabled={filteredSales.length === 0}
                className='h-9 px-3 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs font-semibold disabled:opacity-50 text-gray-700 dark:text-gray-200'
              >
                <span className='material-symbols-rounded text-lg'>download</span>
                <span className='hidden lg:inline'>{t.exportCSV}</span>
              </button>
            </>
          }
        />
      </div>

      {/* Sale Details Modal (includes Return logic internally) */}
      <SaleDetailModal
        sale={selectedSale}
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        t={t}
        language={language}
        color={color}
        textTransform={textTransform}
        currentShift={currentShift}
        currentEmployeeId={currentEmployeeId}
        currentDailyRefunds={currentDailyRefunds}
        onProcessReturn={onProcessReturn}
      />

      {/* Help */}
      <HelpButton
        onClick={() => setShowHelp(true)}
        title={helpContent.title}
        color={color}
        isRTL={language === 'AR'}
      />
      <HelpModal
        show={showHelp}
        onClose={() => setShowHelp(false)}
        helpContent={helpContent as any}
        color={color}
        language={language}
      />

      {/* Customer History Modal */}
      <POSCustomerHistoryModal
        isOpen={isHistOpen}
        onClose={() => setIsHistOpen(false)}
        customer={selectedCust}
        sales={sales}
        color={color}
        t={t}
        language={language}
      />
    </div>
  );
};
