import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { useAuthStore } from '../../stores/authStore';
import type { Drug, Employee, Purchase, PurchaseReturn, Shift, Supplier } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { checkExpiryStatus, formatExpiryDate, getExpiryStatusStyle } from '../../utils/expiryUtils';
import { money, tax } from '../../utils/money';
import { parseSearchTerm } from '../../utils/searchUtils';
import { usePurchases } from '../../hooks/queries/usePurchasesQuery';
import { usePurchaseReturns } from '../../hooks/queries/useReturnsQuery';
import { useInventory } from '../../hooks/queries/useInventoryQuery';
import { useSuppliers } from '../../hooks/queries/useInventoryQuery';
import { useEmployees } from '../../hooks/queries/useEmployeesQuery';
import { useHandlerInfrastructure } from '../../hooks/useHandlerInfrastructure';
import { usePurchaseHandlers } from '../../hooks/purchases/usePurchaseHandlers';
import {
  DateRangePicker,
  type FilterConfig,
  FilterPill,
  Modal,
  PageHeader,
  PriceDisplay,
  SearchInput,
  SegmentedControl,
  Switch,
  TanStackTable,
  useContextMenu,
  useSmartDirection,
} from '../common';

interface PurchaseHistoryProps {
  color: string;
  t: Translations;
  language: 'EN' | 'AR';
  navigationParams?: any;
  onViewChange?: (view: string, params?: any) => void;
  isLoading?: boolean;
}

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({
  color,
  t,
  language,
  navigationParams,
  onViewChange,
  isLoading,
}) => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { textTransform } = useSettings();
  const { data: purchases = [] } = usePurchases(activeBranchId);
  const { data: purchaseReturns = [] } = usePurchaseReturns(activeBranchId);
  const { data: inventory = [] } = useInventory(activeBranchId);
  const { data: suppliers = [] } = useSuppliers(activeBranchId);
  const { data: employees = [] } = useEmployees(activeBranchId);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const currentEmployeeId = useAuthStore((s) => s.currentEmployee?.id ?? null);
  const infra = useHandlerInfrastructure();
  const { handleMarkAsReceived } = usePurchaseHandlers({
    currentEmployeeId,
    employees,
    activeBranchId,
    activeOrgId,
    purchases,
    setPurchases: infra.setPurchases,
    purchaseReturns,
    setPurchaseReturns: infra.setPurchaseReturns,
    currentShift: infra.currentShift,
    addPurchase: infra.addPurchase,
    approvePurchase: infra.approvePurchase,
    markAsReceived: infra.markAsReceived,
    createPurchaseReturn: infra.createPurchaseReturn,
  });
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [historySearch, setHistorySearch] = useState('');
  const [showAllBranches, setShowAllBranches] = useState(false);

  const [page, setPage] = useState(1);
  const [pagedPurchases, setPagedPurchases] = useState<Purchase[]>(purchases || []);
  const [totalPurchases, setTotalPurchases] = useState(purchases?.length || 0);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const pageSize = 50;

  const statusFilterConfig: FilterConfig = useMemo(
    () => ({
      id: 'status',
      label: t.status?.title || 'Status',
      icon: 'rule',
      mode: 'single',
      options: [
        { value: 'all', label: t.status?.all || 'All Status' },
        { value: 'pending', label: t.status?.pending || 'Pending' },
        { value: 'completed', label: t.status?.completed || 'Completed' },
        { value: 'returned', label: t.status?.returned || 'Returned' },
        { value: 'rejected', label: t.status?.rejected || 'Rejected' },
        { value: 'approved', label: t.status?.approved || 'Approved' },
      ],
      defaultValue: 'all',
    }),
    [t]
  );

  const { showMenu } = useContextMenu();

  // Helper: Format time with Arabic AM/PM
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    const period = hours >= 12 ? t.time?.pm || 'PM' : t.time?.am || 'AM';
    return `${hour12}:${minuteStr} ${period}`;
  };

  // Copy helper with fallback
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle Deep Linking
  useEffect(() => {
    if (navigationParams?.id) {
      setHistorySearch(navigationParams.id);
      const purchase = purchases.find((p) => p.id === navigationParams.id);
      if (purchase) setSelectedPurchase(purchase);
    }
  }, [navigationParams, purchases]);

  // Optimization: Map of purchase IDs that have returns
  const purchasesWithReturns = useMemo(() => {
    return new Set(purchaseReturns.map((r) => r.purchaseId));
  }, [purchaseReturns]);

  const getPurchaseReturns = (purchaseId: string) => {
    return purchaseReturns.filter((r) => r.purchaseId === purchaseId);
  };

  const serverFilters = useMemo(() => {
    return {
      dateFrom: dateRange.from ? `${dateRange.from}T00:00:00` : undefined,
      dateTo: dateRange.to ? `${dateRange.to}T23:59:59` : undefined,
      search: historySearch || undefined,
      status: activeFilters.status?.[0] !== 'all' ? activeFilters.status?.[0] : undefined,
    };
  }, [activeFilters, dateRange, historySearch]);

  useEffect(() => {
    let isCancelled = false;
    setIsPageLoading(true);

    import('../../services/purchases/purchaseService').then(({ purchaseService }) => {
      purchaseService
        .listPage({
          branchId: showAllBranches ? 'all' : activeBranchId,
          page,
          pageSize,
          filters: serverFilters,
          sort: { column: 'date', ascending: false },
        })
        .then((result) => {
          if (isCancelled) return;
          setPagedPurchases(result.rows);
          setTotalPurchases(result.total);
        })
        .catch((error) => {
          if (isCancelled) return;
          console.error('[PurchaseHistory] Failed to load purchases page:', error);
          setPagedPurchases([]);
          setTotalPurchases(0);
        })
        .finally(() => {
          if (!isCancelled) setIsPageLoading(false);
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [activeBranchId, showAllBranches, page, serverFilters, purchases]);

  const totalPages = Math.max(1, Math.ceil(totalPurchases / pageSize));

  const columns = useMemo<ColumnDef<Purchase>[]>(
    () => [
      {
        header: t.tableHeaders?.orderId || 'Order #',
        accessorKey: 'invoiceId',
        meta: { align: 'start' },
      },
      {
        header: t.tableHeaders?.invId || 'Inv #',
        accessorKey: 'externalInvoiceId',
        meta: { align: 'start' },
      },
      {
        header: t.tableHeaders?.date || 'Date',
        accessorKey: 'date',
        meta: { align: 'center' },
        cell: (info: any) => {
          const date = new Date(info.getValue());
          return (
            <div className='flex flex-col items-center leading-tight'>
              <span className='font-bold'>{date.toLocaleDateString()}</span>
              <span className='text-[10px] text-gray-400 font-medium'>{formatTime(date)}</span>
            </div>
          );
        },
      },
      {
        header: t.tableHeaders?.supplier || 'Supplier',
        accessorKey: 'supplierName',
        meta: { align: 'start' },
        cell: (info: any) => (
          <span className='text-sm font-bold text-gray-800 dark:text-gray-100'>
            {info.getValue()}
          </span>
        ),
      },
      {
        header: t.tableHeaders?.payment || 'Payment',
        accessorKey: 'paymentMethod',
        meta: { align: 'center' },
        cell: (info: any) => {
          const method = info.getValue() as string;
          const isCash = method === 'cash';
          const badgeClass = isCash ? 'badge-success' : 'badge-info';
          return (
            <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
              <span className='material-symbols-rounded text-xs'>
                {isCash ? 'payments' : 'credit_card'}
              </span>
              <span>{isCash ? t.cash || 'Cash' : t.credit || 'Credit'}</span>
            </span>
          );
        },
      },
      {
        header: t.tableHeaders?.items || 'Items',
        accessorFn: (row: any) => row.items?.length || 0,
        meta: { align: 'center' },
        cell: (info: any) => (
          <span className='text-xs text-gray-500 font-medium'>{info.getValue()}</span>
        ),
      },
      {
        header: t.tableHeaders?.total || 'Total',
        accessorKey: 'totalCost',
        meta: { align: 'end' },
        cell: (info: any) => {
          if (!permissionsService.can('reports.view_financial')) {
            return <span className='text-gray-400 opacity-20 select-none'>••••••</span>;
          }
          const p = info.row.original;
          const returns = getPurchaseReturns(p.id);
          const totalReturned = returns.reduce((sum, r) => sum + r.totalRefund, 0);
          return (
            <div className='flex flex-col items-end'>
              <div className='text-sm font-bold text-gray-900 dark:text-white'>
                <PriceDisplay value={info.getValue()} />
              </div>
              {totalReturned > 0 && (
                <span className='text-[10px] text-orange-600 dark:text-orange-400 font-medium'>
                  <PriceDisplay value={-totalReturned} />{' '}
                  {t.detailsModal?.returnedLabel || 'returned'}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: t.status?.title || 'Status',
        id: 'status',
        meta: { align: 'center' },
        accessorFn: (p: any) => {
          const hasReturns = purchasesWithReturns.has(p.id);
          if (p.status === 'rejected') return 'rejected';
          if (p.status === 'pending') return 'pending';
          if (p.status === 'approved') return 'approved';
          if (p.status === 'received' || p.status === 'completed') {
            return hasReturns ? 'returned' : 'completed';
          }
          return p.status;
        },
        cell: (info: any) => {
          const status = info.getValue() as string;
          let badgeClass = 'badge-success';
          let icon = 'check_circle';
          let label = t.tooltips?.completed || 'Completed';

          if (status === 'pending') {
            badgeClass = 'badge-warning';
            icon = 'pending';
            label = t.tooltips?.pending || 'Pending';
          } else if (status === 'rejected') {
            badgeClass = 'badge-danger';
            icon = 'cancel';
            label = t.tooltips?.rejected || 'Rejected';
          } else if (status === 'returned') {
            badgeClass = 'badge-neutral';
            icon = 'assignment_return';
            label = t.tooltips?.returned || 'Returned';
          } else if (status === 'approved') {
            badgeClass = 'badge-info';
            icon = 'fact_check';
            label = t.tooltips?.approved || 'Approved';
          } else if (status === 'received') {
            badgeClass = 'badge-success';
            icon = 'task_alt';
            label = t.tooltips?.received || 'Received';
          }

          return (
            <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
              <span className='material-symbols-rounded text-xs'>{icon}</span>
              <span>{label}</span>
            </span>
          );
        },
      },
    ],
    [t, purchaseReturns, language]
  );

  // Helper: Get context menu actions for a purchase row
  const getRowContextActions = (purchase: Purchase) => [
    {
      label: t.contextMenu?.viewDetails || 'View Details',
      icon: 'visibility',
      action: () => setSelectedPurchase(purchase),
    },
    { separator: true },
    {
      label: t.contextMenu?.copyInvoice || 'Copy Invoice',
      icon: 'content_copy',
      action: () => copyToClipboard(purchase.invoiceId || ''),
    },
    {
      label: t.contextMenu?.copySupplier || 'Copy Supplier',
      icon: 'person',
      action: () => copyToClipboard(purchase.supplierName || ''),
    },
    { separator: true },
    {
      label: t.contextMenu?.markAsReceived || 'Mark as Received',
      icon: 'inventory',
      action: () => handleMarkAsReceived(purchase.id),
      disabled: purchase.status !== 'approved' && purchase.status !== 'pending',
    },
  ];

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in overflow-hidden'>
      <PageHeader
        leftContent={
          <div className='relative w-48 xl:w-140'>
            <SearchInput
              value={historySearch}
              onSearchChange={setHistorySearch}
              onClear={() => setHistorySearch('')}
              placeholder={t.placeholders?.searchHistory || 'Search ID, Supplier...'}
              rounded='full'
              color={color}
              className='h-9 text-sm'
              filterConfigs={[statusFilterConfig]}
              activeFilters={activeFilters}
              onUpdateFilter={(gid, vals) => setActiveFilters((prev) => ({ ...prev, [gid]: vals }))}
            />
          </div>
        }
        centerContent={
          <SegmentedControl
            options={[
              { value: 'create', label: t.newPurchase || 'Purchase', icon: 'shopping_cart' },
              {
                value: 'approve',
                label: t.pendingApproval?.title || 'Approve',
                icon: 'assignment_turned_in',
              },
              { value: 'history', label: t.viewHistory || 'History', icon: 'history' },
            ]}
            value='history'
            onChange={(val) => {
              if (val === 'history') return;
              if (val === 'approve') onViewChange?.('pending-approval');
              else onViewChange?.('purchases', { mode: 'create' });
            }}
            shape='pill'
            size='md'
            iconSize='--icon-lg'
            useGraphicFont={true}
            className='w-full sm:w-[520px]'
          />
        }
        rightContent={
          <div className='flex items-center gap-2'>
            <DateRangePicker
              startDate={dateRange.from}
              endDate={dateRange.to}
              onStartDateChange={(val) => setDateRange((prev) => ({ ...prev, from: val }))}
              onEndDateChange={(val) => setDateRange((prev) => ({ ...prev, to: val }))}
              color='gray'
              locale={language === 'AR' ? 'ar-EG' : 'en-US'}
            />
            <label className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors h-9'>
              <span className='text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider select-none'>
                {t.globalView || 'Global'}
              </span>
              <Switch checked={showAllBranches} onChange={setShowAllBranches} activeColor={color} />
            </label>

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
          </div>
        }
      />

      <div className='flex-1 overflow-hidden'>
        <TanStackTable<Purchase, any>
          data={pagedPurchases}
          columns={columns}
          color={color}
          onRowClick={(p) => setSelectedPurchase(p)}
          onRowContextMenu={(e, p) => showMenu(e.clientX, e.clientY, getRowContextActions(p))}
          tableId='purchases_history_v3'
          isLoading={isLoading || isPageLoading}
          enablePagination={true}
          pageSize={pageSize}
          enableVirtualization={true}
          enableTopToolbar={true}
          enableSearch={false}
          filterableColumns={[statusFilterConfig]}
          initialFilters={activeFilters}
          onFilterChange={(filters) => {
            setActiveFilters(filters);
            setPage(1);
          }}
          manualFiltering={true}
        />
      </div>

      {selectedPurchase && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPurchase(null)}
          size='4xl'
          title={t.detailsModal?.title || 'Purchase Order Details'}
          icon='receipt_long'
          disabled={isLoading}
          subtitle={`${selectedPurchase.invoiceId} • ${new Date(selectedPurchase.date).toLocaleDateString()} ${formatTime(new Date(selectedPurchase.date))}`}
        >
          <div className='p-6 space-y-6'>
            <div className='grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-6 p-1'>
              <div className='group relative'>
                <p className='text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider'>
                  {t.tableHeaders?.supplier || 'Supplier'}
                </p>
                <div className='flex items-center gap-2'>
                  <p className='font-bold text-gray-900 dark:text-white truncate max-w-[150px]'>
                    {selectedPurchase.supplierName}
                  </p>
                  <button
                    onClick={() => copyToClipboard(selectedPurchase.supplierName)}
                    className='p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                  >
                    <span className='material-symbols-rounded text-[14px]'>content_copy</span>
                  </button>
                </div>
              </div>

              <div className='group relative'>
                <p className='text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider'>
                  {t.detailsModal?.invNumber || 'Inv #'}
                </p>
                <div className='flex items-center gap-2'>
                  <p className='font-mono font-bold text-gray-900 dark:text-white'>
                    {selectedPurchase.externalInvoiceId || '-'}
                  </p>
                  {selectedPurchase.externalInvoiceId && (
                    <button
                      onClick={() => copyToClipboard(selectedPurchase.externalInvoiceId)}
                      className='p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                    >
                      <span className='material-symbols-rounded text-[14px]'>content_copy</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className='text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider'>
                  {t.paymentMethod || 'Payment'}
                </p>
                <div className='flex items-center gap-2'>
                  <span
                    className={`material-symbols-rounded text-sm ${selectedPurchase.paymentMethod === 'cash' ? 'text-emerald-500' : 'text-blue-500'}`}
                  >
                    {selectedPurchase.paymentMethod === 'cash' ? 'payments' : 'credit_card'}
                  </span>
                  <p className='font-bold text-gray-900 dark:text-white capitalize text-sm'>
                    {selectedPurchase.paymentMethod === 'cash'
                      ? t.cash || 'Cash'
                      : t.credit || 'Credit'}
                  </p>
                </div>
              </div>

              <div>
                <p className='text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider'>
                  {t.tableHeaders?.date || 'Date'}
                </p>
                <div className='flex items-center gap-2'>
                  <span className='material-symbols-rounded text-sm text-zinc-400'>
                    calendar_today
                  </span>
                  <p className='font-bold text-gray-900 dark:text-white text-sm'>
                    {new Date(selectedPurchase.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <p className='text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider'>
                  {language === 'AR' ? 'بواسطة' : 'By'}
                </p>
                <div className='flex items-center gap-2'>
                  <span className='material-symbols-rounded text-sm text-zinc-400'>person</span>
                  <p className='font-bold text-gray-900 dark:text-white text-sm truncate'>
                    {selectedPurchase.createdByName || t.unknown || 'Unknown'}
                  </p>
                </div>
              </div>

              {selectedPurchase.approvedBy && (
                <div>
                  <p className='text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider'>
                    {t.status?.approved || 'Approved'}
                  </p>
                  <div className='flex items-center gap-2 text-blue-600 dark:text-blue-400'>
                    <span className='material-symbols-rounded text-sm'>verified_user</span>
                    <p className='font-bold text-sm truncate'>{selectedPurchase.approvedBy}</p>
                  </div>
                </div>
              )}
            </div>

            <div className='rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden'>
              <table className='w-full text-left border-collapse'>
                <thead>
                  <tr className='bg-gray-50 dark:bg-gray-900/30 text-[10px] font-bold text-gray-400 uppercase tracking-wider'>
                    <th className='px-4 py-3'>{t.detailsModal?.item || 'Item'}</th>
                    <th className='px-4 py-3 text-center'>{t.detailsModal?.expiry || 'Expiry'}</th>
                    <th className='px-4 py-3 text-center'>{t.detailsModal?.qty || 'Qty'}</th>
                    <th className='px-4 py-3 text-right'>{t.detailsModal?.cost || 'Cost'}</th>
                    <th className='px-4 py-3 text-center'>{t.detailsModal?.discount || 'Disc%'}</th>
                    <th className='px-4 py-3 text-center'>{t.detailsModal?.tax || 'Tax%'}</th>
                    <th className='px-4 py-3 text-right'>
                      {t.detailsModal?.publicPrice || 'Sale'}
                    </th>
                    <th className='px-4 py-3 text-right'>{t.detailsModal?.total || 'Total'}</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50 dark:divide-gray-900 text-sm'>
                  {selectedPurchase.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className='hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors'
                    >
                      <td className='px-4 py-3'>
                        <div className='flex flex-col'>
                          <span className='font-bold text-gray-900 dark:text-white'>
                            {getDisplayName(item as any, textTransform)}
                          </span>
                          {item.barcode && (
                            <span className='text-[10px] text-gray-400 font-mono'>
                              {item.barcode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getExpiryStatusStyle(checkExpiryStatus(item.expiryDate || ''), 'badge')}`}
                        >
                          {formatExpiryDate(item.expiryDate || '')}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-center font-bold'>{item.quantity}</td>
                      <td className='px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400'>
                        <PriceDisplay value={item.costPrice} size='sm' />
                      </td>
                      <td className='px-4 py-3 text-center text-gray-500'>{item.discount || 0}%</td>
                      <td className='px-4 py-3 text-center text-gray-500'>{item.tax ?? 14}%</td>
                      <td className='px-4 py-3 text-right text-primary-600 font-medium'>
                        <PriceDisplay value={item.publicPrice || 0} size='sm' />
                      </td>
                      <td className='px-4 py-3 text-right font-bold text-gray-900 dark:text-white'>
                        {(() => {
                          const lineNet = money.multiply(item.costPrice, item.quantity, 0);
                          const totalNet = selectedPurchase.items.reduce(
                            (sum, it) =>
                              money.add(sum, money.multiply(it.costPrice, it.quantity, 0)),
                            0
                          );
                          const totalTax = selectedPurchase.totalTax || 0;
                          const itemTaxShare = totalNet > 0 ? (totalTax * lineNet) / totalNet : 0;
                          const lineTotal = money.add(
                            lineNet,
                            Math.round(itemTaxShare * 100) / 100
                          );
                          return <PriceDisplay value={lineTotal} size='sm' />;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className='bg-gray-50/50 dark:bg-gray-900/30 font-bold border-t border-gray-100 dark:border-gray-800'>
                    <td
                      colSpan={7}
                      className='px-4 py-4 text-right text-gray-400 uppercase text-[10px] tracking-widest'
                    >
                      {t.summary?.totalCost || 'Grand Total'}
                    </td>
                    <td className='px-4 py-4 text-right'>
                      <PriceDisplay value={selectedPurchase.totalCost} size='lg' />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedPurchase.status === 'approved' && (
              <div className='flex justify-end'>
                <button
                  onClick={() => {
                    handleMarkAsReceived(selectedPurchase.id);
                    setSelectedPurchase(null);
                  }}
                  className='flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-200 dark:shadow-none'
                >
                  <span className='material-symbols-rounded'>inventory</span>
                  {t.contextMenu?.markAsReceived || 'Mark as Received'}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
