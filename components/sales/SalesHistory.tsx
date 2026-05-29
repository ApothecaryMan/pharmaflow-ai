import type { ColumnDef } from '@tanstack/react-table';
import React, { useState } from 'react';
import { useSettings } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { SALES_HISTORY_HELP } from '../../i18n/helpInstructions';
import type { Customer, Employee, Return, Sale, Shift } from '../../types';
import { POSCustomerHistoryModal } from './pos/ui/POSCustomerHistoryModal';
import { CARD_BASE } from '../../utils/themeStyles';
import { DateRangePicker } from '../common/DatePicker';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { TanStackTable } from '../common/TanStackTable';
import { SaleDetailModal } from './SaleDetailModal';
import { formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { money } from '../../utils/money';
import { salesService } from '../../services/sales';

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
  employees: Employee[];
  isLoading?: boolean;
  activeBranchId?: string;
  activeOrgId?: string;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  sales,
  returns,
  onProcessReturn,
  color,
  t,
  language,
  datePickerTranslations: _datePickerTranslations,
  currentEmployeeId,
  currentShift,
  navigationParams,
  customers = [],
  employees = [],
  isLoading = false,
  activeBranchId,
  activeOrgId,
}) => {
  // Determine locale based on language
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [isHistOpen, setIsHistOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string | number>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [page, setPage] = useState(1);
  const [pagedSales, setPagedSales] = useState<Sale[]>(sales || []);
  const [totalSales, setTotalSales] = useState(sales?.length || 0);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const { textTransform } = useSettings();
  const pageSize = 50;

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
      .reduce((sum, r) => money.add(sum, r.totalRefund), 0);
  }, [returns, currentEmployeeId]);

  // Handle Navigation Params (Deep Linking)
  React.useEffect(() => {
    if (navigationParams?.id) {
      const saleId = navigationParams.id;
      setSearchTerm(saleId);
      salesService.getById(saleId).then((sale) => {
        if (sale) setSelectedSale(sale);
      }).catch((error) => {
        console.error('[SalesHistory] Failed to load linked sale:', error);
      });
    }
  }, [navigationParams]);

  // Get help content
  const helpContent = SALES_HISTORY_HELP[language as 'EN' | 'AR'] || SALES_HISTORY_HELP.EN;

  // Column definitions using TanStackTable's ColumnDef
  const tableColumns = React.useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        id: 'serialId',
        accessorFn: (row) => row.serialId || row.id.slice(0, 8),
        header: t.modal.id,
        cell: ({ getValue }) => (
          <span className='font-mono font-bold text-sm text-gray-900 dark:text-gray-100'>
            {getValue() as string}
          </span>
        ),
        meta: { width: 202, align: 'start' },
      },
      {
        accessorKey: 'date',
        header: t.headers.date,
        meta: { width: 202, align: 'center' },
        cell: ({ getValue }) => (
          <span className='text-sm text-gray-700 dark:text-gray-300'>
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'customerCode',
        accessorKey: 'customerCode',
        header: t.headers.code || 'Code',
        cell: ({ getValue }) => {
          const code = getValue() as string;
          const customer = customers.find(c => c.code === code);
          const isClickable = !!customer;

          return isClickable ? (
            <button
              type='button'
              onClick={(e) => {
                if (isClickable) {
                  e.stopPropagation();
                  setSelectedCust(customer);
                  setIsHistOpen(true);
                }
              }}
              className='font-mono font-bold text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:opacity-70 transition-opacity bg-transparent p-0'
            >
              {code || '-'}
            </button>
          ) : (
            <span className='font-mono font-bold text-sm text-gray-400'>
              {code || '-'}
            </span>
          );
        },
        meta: { width: 140, align: 'start' },
      },
      {
        id: 'customerInfo',
        accessorFn: (row) => row.customerName || 'Guest',
        header: t.headers.customer,
        cell: ({ getValue }) => (
          <div className='font-medium text-gray-900 dark:text-gray-100 text-sm'>
            {getValue() as string}
          </div>
        ),
        meta: { width: 202, align: 'start' },
      },
      {
        accessorKey: 'paymentMethod',
        header: t.headers.payment,
        cell: ({ getValue }) => {
          const method = getValue() as string;
          const isVisa = method === 'visa';
          const badgeClass = isVisa ? 'badge-blue' : 'badge-green';
          return (
            <span className={`gap-1.5 ${badgeClass}`}>
              <span className='material-symbols-rounded'>
                {isVisa ? 'credit_card' : 'payments'}
              </span>
              <span className='whitespace-nowrap'>{isVisa ? t.visa : t.cash}</span>
            </span>
          );
        },
        meta: { width: 202, align: 'center' },
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
        meta: { width: 110, align: 'start' },
      },
      {
        accessorKey: 'total',
        header: t.headers.total,
        cell: ({ row }) => {
          const sale = row.original;
          const displayTotal = sale.netTotal !== undefined ? sale.netTotal : sale.total;
          const totalParts = formatCurrencyParts(displayTotal);
          const isReturned = sale.netTotal !== undefined && sale.netTotal < sale.total;

          // Build tooltip text for detailed breakdown
          const isAr = language === 'AR';
          const discountVal = (sale.subtotal || 0) * ((sale.globalDiscount || 0) / 100);
          const returnedAmount = sale.total - (sale.netTotal || 0);

          const itemsText = sale.items?.map(i => `• ${i.quantity} ${i.isUnit ? (isAr ? 'شريط' : 'unit') : (isAr ? 'علبة' : 'pack')} * ${i.brandName || i.name || ''}`).join('\n');

          const tooltipText = [
            `--- ${isAr ? 'تفاصيل الطلب' : 'Order Details'} ---`,
            itemsText,
            '-------------------',
            sale.subtotal && `${isAr ? 'المجموع الفرعي' : 'Subtotal'}: ${formatCurrency(sale.subtotal)}`,
            sale.globalDiscount && `${isAr ? 'الخصم' : 'Discount'}: ${sale.globalDiscount}% (-${formatCurrency(discountVal)})`,
            sale.tax && `${isAr ? 'الضريبة' : 'Tax'}: ${formatCurrency(sale.tax)}`,
            sale.deliveryFee && `${t.headers.delivery || (isAr ? 'التوصيل' : 'Delivery')}: ${formatCurrency(sale.deliveryFee)}`,
            isReturned 
              ? `${isAr ? 'المرتجع' : 'Returned'}: -${formatCurrency(returnedAmount)}\n${isAr ? 'صافي الإجمالي' : 'Net Total'}: ${formatCurrency(sale.netTotal || 0)}`
              : `${t.headers.total || (isAr ? 'الإجمالي' : 'Total')}: ${formatCurrency(sale.total)}`,
            '-------------------',
            `${isAr ? 'طريقة الدفع' : 'Payment Method'}: ${sale.paymentMethod === 'visa' ? t.visa : t.cash}`,
            sale.saleType && `${isAr ? 'نوع المعاملة' : 'Transaction Type'}: ${sale.saleType === 'delivery' ? (isAr ? 'توصيل' : 'Delivery') : (isAr ? 'شراء مباشر' : 'Walk-in')}`,
            sale.notes?.trim() && `${isAr ? 'ملاحظات' : 'Notes'}: ${sale.notes}`
          ].filter(Boolean).join('\n');

          return (
            <div
              className='font-bold text-gray-900 dark:text-gray-100 tabular-nums text-sm flex flex-col items-end'
              title={tooltipText}
            >
              <div className='flex items-baseline gap-1'>
                <span className={isReturned ? 'text-orange-600 dark:text-orange-400' : ''}>{totalParts.amount}</span>
                <span className='text-[10px] text-gray-400 font-medium'>{totalParts.symbol}</span>
              </div>
              {isReturned && (
                <div className='text-[8px] text-gray-400 font-normal line-through opacity-50'>
                  {formatCurrency(sale.total)}
                </div>
              )}
              {!!sale.deliveryFee && sale.deliveryFee > 0 && (
                <div className='text-[10px] text-gray-400 font-normal tabular-nums flex items-baseline gap-0.5 mt-0.5'>
                  <span>{formatCurrencyParts(sale.deliveryFee).amount}</span>
                  <span className='text-[8px] opacity-70 ps-0.5'>{formatCurrencyParts(sale.deliveryFee).symbol}</span>
                  <span className='ms-1'>{t.headers.delivery}</span>
                </div>
              )}
            </div>
          );
        },
        meta: { width: 202, align: 'end' },
      },
      {
        id: 'status',
        accessorFn: (sale) => {
          if (sale.status === 'cancelled') return 'cancelled';
          const isReturned = (sale.netTotal !== undefined && sale.netTotal < sale.total) ||
            (sale.itemReturnedQuantities && Object.keys(sale.itemReturnedQuantities).length > 0);
          if (isReturned) return 'returned';
          // If it's delivery and not completed, return its specific status
          if (sale.saleType === 'delivery' && sale.status !== 'completed') {
            return sale.status;
          }
          return 'completed';
        },
        header: t.status || 'Status',
        meta: { width: 132, align: 'center' },
        cell: ({ row }) => {
          const sale = row.original;
          const isReturned = (sale.netTotal !== undefined && sale.netTotal < sale.total) ||
            (sale.itemReturnedQuantities && Object.keys(sale.itemReturnedQuantities).length > 0);

          if (isReturned) {
            const totalReturned = sale.netTotal !== undefined ? money.subtract(sale.total, sale.netTotal) : 0;
            const isFullReturn = sale.netTotal === 0;
            const returnParts = formatCurrencyParts(totalReturned);

            return (
              <span className={`${isFullReturn ? 'badge-purple' : 'badge-warning'} gap-1.5`} dir={language === 'AR' ? 'rtl' : 'ltr'}>
                <span className='material-symbols-rounded'>assignment_return</span>
                {isFullReturn ? (
                  t.fullReturn
                ) : (
                  <span className='flex items-center gap-1'>
                    <span>{t.partialReturn}</span>
                    <span dir='ltr' className='font-bold tabular-nums'>{returnParts.amount}</span>
                    <span className='text-[8px] opacity-70'>{returnParts.symbol}</span>
                  </span>
                )}
              </span>
            );
          }

          if (sale.status === 'cancelled') {
            return (
              <span className='badge-danger gap-1.5' dir={language === 'AR' ? 'rtl' : 'ltr'}>
                <span className='material-symbols-rounded'>cancel</span>
                {t.cancelled || 'Cancelled'}
              </span>
            );
          }

          // Delivery Specific Statuses
          if (sale.saleType === 'delivery' && sale.status !== 'completed') {
            const isWithDelivery = sale.status === 'with_delivery';
            const isOnWay = sale.status === 'on_way';

            let badgeClass = 'badge-neutral';
            let icon = 'pending';
            if (isWithDelivery) {
              badgeClass = 'badge-blue';
              icon = 'delivery_dining';
            } else if (isOnWay) {
              badgeClass = 'badge-teal';
              icon = 'local_shipping';
            }

            const statusText = sale.status ? (t[sale.status] || sale.status) : '';

            return (
              <span className={`${badgeClass} gap-1.5`} dir={language === 'AR' ? 'rtl' : 'ltr'}>
                <span className='material-symbols-rounded'>{icon}</span>
                {statusText}
              </span>
            );
          }

          return (
            <span className='badge-success gap-1.5' dir={language === 'AR' ? 'rtl' : 'ltr'}>
              <span className='material-symbols-rounded'>check_circle</span>
              {t.completed || 'Completed'}
            </span>
          );
        },
      },
      {
        id: 'seller',
        accessorKey: 'soldByEmployeeId',
        header: t.headers.soldBy,
        cell: ({ getValue }) => {
          const empId = getValue() as string;
          
          // Show a pulsing skeleton loader for the seller cell if employee data is still loading
          if (employees.length === 0) {
            return (
              <div className='flex items-center gap-1.5 animate-pulse'>
                <div className='w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0' />
                <div className='h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded' />
              </div>
            );
          }

          const employee = employees.find(e => e.id === empId || e.userId === empId);
          const hasImage = !!employee?.image;
          return (
            <div className='flex items-center gap-1.5'>
              <div className='w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200/50 dark:border-gray-700/50'>
                {hasImage ? (
                  <img src={employee.image} className='w-full h-full object-cover' alt="" />
                ) : (
                  <span className='material-symbols-rounded text-[14px] text-gray-400'>person</span>
                )}
              </div>
              <span className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                {employee ? (language === 'AR' ? (employee.nameArabic || employee.name) : employee.name) : (language === 'AR' ? 'غير معروف' : 'Unknown')}
              </span>
            </div>
          );
        },
        meta: { width: 202, align: 'start' },
      },
    ],
    [t, customers, employees, language]
  );

  const filterableColumns = React.useMemo(
    () => [
      {
        id: 'status',
        label: t.status,
        icon: 'dynamic_feed',
        mode: 'single' as const,
        options: [
          { label: t.completed, value: 'completed', icon: 'check_circle' },
          { label: t.pending, value: 'pending', icon: 'pending' },
          { label: t.with_delivery, value: 'with_delivery', icon: 'delivery_dining' },
          { label: t.on_way, value: 'on_way', icon: 'local_shipping' },
          { label: t.cancelled, value: 'cancelled', icon: 'cancel' },
          { label: t.returned, value: 'returned', icon: 'assignment_return' },
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
      {
        id: 'soldByEmployeeId',
        label: t.headers.soldBy,
        icon: 'person',
        mode: 'single' as const,
        options: employees.map(emp => ({
          label: emp.name,
          value: emp.id,
          icon: 'person'
        })),
      },
    ],
    [t, employees]
  );

  const serverFilters = React.useMemo(() => {
    const status = activeFilters.status?.[0];
    const paymentMethod = activeFilters.paymentMethod?.[0];
    const soldByEmployeeId = activeFilters.soldByEmployeeId?.[0];
    return {
      dateFrom: startDate ? `${startDate}T00:00:00` : undefined,
      dateTo: endDate ? `${endDate}T23:59:59` : undefined,
      search: searchTerm || undefined,
      status,
      paymentMethod,
      soldByEmployeeId,
      deliveryEmployeeId:
        !permissionsService.isOrgAdmin() && permissionsService.can('sale.view_assigned_only')
          ? currentEmployeeId
          : undefined,
    };
  }, [activeFilters, startDate, endDate, searchTerm, currentEmployeeId]);

  React.useEffect(() => {
    let isCancelled = false;
    setIsPageLoading(true);

    salesService.listPage({
      branchId: activeBranchId,
      orgId: activeOrgId,
      page,
      pageSize,
      filters: serverFilters,
      sort: { column: 'date', ascending: false },
    }).then((result) => {
      if (isCancelled) return;
      setPagedSales(result.rows);
      setTotalSales(result.total);
    }).catch((error) => {
      if (isCancelled) return;
      console.error('[SalesHistory] Failed to load sales page:', error);
      setPagedSales([]);
      setTotalSales(0);
    }).finally(() => {
      if (!isCancelled) setIsPageLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [activeBranchId, activeOrgId, page, serverFilters]);

  const totalRevenue = pagedSales.reduce((sum, sale) => money.add(sum, sale.total), 0);
  const totalPages = Math.max(1, Math.ceil(totalSales / pageSize));

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  const handleStartDateChange = React.useCallback((value: string) => {
    setStartDate(value);
    setPage(1);
  }, []);

  const handleEndDateChange = React.useCallback((value: string) => {
    setEndDate(value);
    setPage(1);
  }, []);

  const handleFilterChange = React.useCallback((filters: Record<string, any[]>) => {
    setActiveFilters(filters);
    setPage(1);
  }, []);

  const handleSelectSale = async (sale: Sale) => {
    setIsDetailLoading(true);
    try {
      const fullSale = await salesService.getById(sale.id);
      setSelectedSale(fullSale || sale);
    } catch (error) {
      console.error('[SalesHistory] Failed to load sale details:', error);
      setSelectedSale(sale);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const exportToCSV = () => {
    if (pagedSales.length === 0) return;

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
    const escapeCsv = (str: string | number | undefined) =>
      `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = pagedSales.map((sale) => [
      sale.id,
      new Date(sale.date).toLocaleString(locale, { numberingSystem: 'latn' }),
      sale.customerName || 'Guest',
      sale.customerCode || '-',
      sale.paymentMethod === 'visa' ? 'Visa' : 'Cash',
      sale.items.length,
      money.divide(sale.subtotal || 0, 1).toFixed(2),
      sale.globalDiscount || 0,
      money.divide(sale.total, 1).toFixed(2),
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
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

  // Wrap onProcessReturn to track pending state for the "real" duration
  const handleProcessReturn = async (returnData: Return) => {
    if (!returnData.saleId) return;

    setPendingIds(prev => new Set(prev).add(returnData.saleId));
    try {
      await onProcessReturn(returnData);
    } finally {
      // Small delay to let the "success" pulse take over naturally after data refresh
      setTimeout(() => {
        setPendingIds(prev => {
          const next = new Set(prev);
          next.delete(returnData.saleId);
          return next;
        });
      }, 300);
    }
  };

  const [isMounting, setIsMounting] = useState(true);

  React.useEffect(() => {
    // TIER 1: Instant Skeleton.
    // Delay mounting the heavy table by 100ms to allow the skeleton to show up 
    // before the main thread gets busy with virtualization calculations.
    const timer = setTimeout(() => setIsMounting(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const showLoading = isLoading || isMounting || isPageLoading || isDetailLoading;

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in' dir={language === 'AR' ? 'rtl' : 'ltr'}>
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
              {formatCurrency(totalRevenue)}
            </span>
            <span className='text-[10px] text-primary-600/70 dark:text-primary-400/70 font-semibold'>
              {language === 'AR' ? 'الصفحة الحالية' : 'current page'}
            </span>
          </div>
        )}
      </div>


      {/* Table Section */}
      <div className={`flex-1 flex flex-col min-h-0 transition-opacity${isMounting ? 'opacity-50' : 'opacity-100'}`}>
        <TanStackTable
          data={pagedSales}
          columns={tableColumns}
          tableId='sales_history_table'
          color={color}
          isLoading={showLoading}
          enableTopToolbar={true}
          enableSearch={true}
          searchPlaceholder={t.searchPlaceholder || 'Search sales…'}
          globalFilter={searchTerm}
          onSearchChange={handleSearchChange}
          filterableColumns={filterableColumns}
          initialFilters={activeFilters}
          onFilterChange={handleFilterChange}
          manualFiltering={true}
          onRowClick={handleSelectSale}
          emptyMessage={t.noResults}
          lite={false}
          dense={true}
          initialSorting={[{ id: 'date', desc: true }]}
          enablePagination={true}
          enableVirtualization={true}
          pageSize={pageSize}
          enableShowAll={false}
          pendingRowIds={pendingIds}
          rightCustomControls={
            <>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                color={color}
                locale={locale}
              />

              <button
                type='button'
                onClick={exportToCSV}
                disabled={pagedSales.length === 0}
                className='h-9 px-3 rounded-full bg-white dark:bg-gray-900 border border-(--border-divider) hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs font-semibold disabled:opacity-50 text-gray-700 dark:text-gray-200'
              >
                <span className='material-symbols-rounded text-lg'>download</span>
                <span className='hidden lg:inline'>{t.exportCSV}</span>
              </button>
              <div className='h-9 rounded-full border border-(--border-divider) bg-white dark:bg-gray-900 flex items-center overflow-hidden'>
                <button
                  type='button'
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isPageLoading}
                  className='h-full w-9 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800'
                  title={language === 'AR' ? 'السابق' : 'Previous'}
                >
                  <span className='material-symbols-rounded text-lg'>chevron_left</span>
                </button>
                <span className='px-2 text-xs font-bold tabular-nums text-gray-600 dark:text-gray-300'>
                  {page} / {totalPages}
                </span>
                <button
                  type='button'
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isPageLoading}
                  className='h-full w-9 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800'
                  title={language === 'AR' ? 'التالي' : 'Next'}
                >
                  <span className='material-symbols-rounded text-lg'>chevron_right</span>
                </button>
              </div>
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
        onProcessReturn={handleProcessReturn}
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
