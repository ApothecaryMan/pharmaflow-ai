import type { ColumnDef } from '@tanstack/react-table';
import React, { useMemo, useState } from 'react';
import { useSettings } from '../../context';
import { usePageHelp } from '../../context/HelpContext';
import { RETURN_HISTORY_HELP } from '../../i18n/helpInstructions';
import { TRANSLATIONS } from '../../i18n/translations';
import { CartItem, type Return, type Sale } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { formatExpiryDate } from '../../utils/expiryUtils';
import { CARD_BASE } from '../../utils/themeStyles';
import { useAuthStore } from '../../stores/authStore';
import { useRecentSales } from '../../hooks/queries/useSalesQuery';
import { useSalesReturns } from '../../hooks/queries/useReturnsQuery';
import { useContextMenu } from '../common/ContextMenu';
import { DatePicker, DateRangePicker } from '../common/DatePicker';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { TanStackTable } from '../common/TanStackTable';
import { SaleDetailModal } from './SaleDetailModal';

const REASON_STYLES: Record<string, { badgeClass: string; icon: string }> = {
  // Discarded / Write-off (إهلاك وتلف)
  damaged: { badgeClass: 'badge-danger', icon: 'delete_forever' },
  expired: { badgeClass: 'badge-danger', icon: 'delete_forever' },

  // Restocked (إعادة للمخزون)
  wrong_item: { badgeClass: 'badge-success', icon: 'settings_backup_restore' },
  customer_request: { badgeClass: 'badge-success', icon: 'settings_backup_restore' },

  // Supplier Claim / Action (إجراء مع المورد)
  defective: { badgeClass: 'badge-warning', icon: 'local_shipping' },
  overage: { badgeClass: 'badge-info', icon: 'local_shipping' },
};

const ListWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`flex flex-col gap-0.5 ${className}`}>{children}</div>;

const ListItem: React.FC<{
  index: number;
  total: number;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ index, total, children, className = '', onClick }) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const rounding =
    isFirst && isLast
      ? 'rounded-2xl'
      : isFirst
        ? 'rounded-t-2xl rounded-b-md'
        : isLast
          ? 'rounded-b-2xl rounded-t-md'
          : 'rounded-md';
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-1.5 px-3 bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 transition-all ${rounding} ${className}`}
    >
      {children}
    </div>
  );
};

const ReturnQuantityBadge: React.FC<{
  qty: number;
  isUnit: boolean;
  language: string;
}> = ({ qty, isUnit, language }) => (
  <div className='relative w-10 h-10 shrink-0'>
    <div className='flex w-full h-full bg-red-500/5 dark:bg-red-500/10 rounded-xl border border-red-500/10 overflow-hidden'>
      <div className='flex flex-col items-center justify-center flex-1 leading-none'>
        <span className='text-[13px] font-black text-red-600 dark:text-red-400 tabular-nums'>
          {qty}
        </span>
        <span className='text-[7px] font-black text-red-600/70 dark:text-red-400/70 uppercase tracking-wider mt-0.5'>
          {isUnit ? (language === 'AR' ? 'وحدة' : 'UNIT') : language === 'AR' ? 'علبة' : 'PACK'}
        </span>
      </div>
    </div>
  </div>
);

interface ReturnHistoryProps {
  color: string;
  t: Translations;
  language: string;
  navigationParams?: any;
}

export const ReturnHistory: React.FC<ReturnHistoryProps> = ({
  color,
  t,
  language,
  navigationParams,
}) => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: returns = [] } = useSalesReturns(activeBranchId);
  const { data: sales = [] } = useRecentSales(activeBranchId);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});

  const [page, setPage] = useState(1);
  const [pagedReturns, setPagedReturns] = useState<Return[]>(returns || []);
  const [totalReturns, setTotalReturns] = useState(returns?.length || 0);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const pageSize = 50;

  // Handle Navigation Params (Deep Linking)
  React.useEffect(() => {
    if (navigationParams?.id) {
      setSearchTerm(navigationParams.id);
      setTimeout(() => {
        const ret = returns.find((r) => r.id === navigationParams.id);
        if (ret) setSelectedReturn(ret);
      }, 100);
    }
  }, [navigationParams, returns]);

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [viewedSale, setViewedSale] = useState<Sale | null>(null);
  const { textTransform } = useSettings();
  const { showMenu } = useContextMenu();

  // Get help content based on language
  const helpContent = RETURN_HISTORY_HELP[language as 'EN' | 'AR'] || RETURN_HISTORY_HELP.EN;
  usePageHelp(helpContent);

  // Locale for dates
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';

  const serverFilters = useMemo(() => {
    return {
      dateFrom: dateRange.from ? `${dateRange.from}T00:00:00` : undefined,
      dateTo: dateRange.to ? `${dateRange.to}T23:59:59` : undefined,
      search: searchTerm || undefined,
      reason: activeFilters.reason?.[0] !== 'all' ? activeFilters.reason?.[0] : undefined,
    };
  }, [activeFilters, dateRange, searchTerm]);

  React.useEffect(() => {
    let isCancelled = false;
    setIsPageLoading(true);

    import('../../services/returns/returnService').then(({ returnService }) => {
      returnService
        .listSalesReturnsPage({
          page,
          pageSize,
          filters: serverFilters,
          sort: { column: 'date', ascending: false },
        })
        .then((result) => {
          if (isCancelled) return;
          setPagedReturns(result.rows);
          setTotalReturns(result.total);
        })
        .catch((error) => {
          if (isCancelled) return;
          console.error('[ReturnHistory] Failed to load returns page:', error);
          setPagedReturns([]);
          setTotalReturns(0);
        })
        .finally(() => {
          if (!isCancelled) setIsPageLoading(false);
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [page, serverFilters, returns]);

  const totalPages = Math.max(1, Math.ceil(totalReturns / pageSize));

  const getRowActions = (returnItem: Return) => [
    {
      label: t.actions.viewDetails || 'View Details',
      icon: 'visibility',
      action: () => setSelectedReturn(returnItem),
    },
  ];

  const columns = useMemo<ColumnDef<Return>[]>(
    () => [
      {
        accessorKey: 'serialId',
        header: t.headers.returnId,
        meta: { width: 202, align: 'start' },
      },
      {
        accessorKey: 'saleId',
        header: t.headers.saleId,
        meta: { width: 202, align: 'start' },
        cell: (info) => {
          const sid = info.getValue() as string;
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const sale = sales.find((s) => s.id === sid);
                if (sale) setViewedSale(sale);
              }}
              className='text-primary-600 dark:text-primary-400 hover:underline font-bold text-xs'
            >
              #{sales.find((s) => s.id === sid)?.serialId || sid}
            </button>
          );
        },
      },
      {
        accessorKey: 'date',
        header: t.headers.date,
        meta: { width: 202, align: 'center' },
      },
      {
        id: 'customerName',
        header: t.headers.customer,
        accessorFn: (row) => {
          const sale = sales.find((s) => s.id === row.saleId);
          return sale?.customerName || 'Unknown';
        },
        cell: (info) => (
          <span className='font-medium text-gray-900 dark:text-gray-100'>
            {info.getValue() as string}
          </span>
        ),
        meta: { width: 202, align: 'start' },
      },
      {
        id: 'items',
        accessorFn: (row) => row.items.length,
        header: t.headers.items || 'Items',
        cell: ({ getValue }) => (
          <span className='text-sm text-gray-600 dark:text-gray-400'>
            {getValue() as number} {language === 'AR' ? 'أصناف' : 'items'}
          </span>
        ),
        meta: { width: 110, align: 'start' },
      },
      {
        accessorKey: 'totalRefund',
        header: t.headers.refundAmount,
        cell: ({ row }) => {
          const ret = row.original;
          const isAr = language === 'AR';
          const itemsText = ret.items
            ?.map(
              (i) =>
                `• ${i.quantityReturned} ${i.isUnit ? (isAr ? 'شريط' : 'unit') : isAr ? 'علبة' : 'pack'} * ${i.name || ''} (${formatCurrency(i.refundAmount)})`
            )
            .join('\n');
          const tooltipText = [
            `--- ${isAr ? 'الأصناف المرتجعة' : 'Returned Items'} ---`,
            itemsText,
            '-------------------',
            `${isAr ? 'إجمالي الاسترداد' : 'Total Refund'}: ${formatCurrency(ret.totalRefund)}`,
            ret.notes ? `\n${isAr ? 'ملاحظات' : 'Notes'}: ${ret.notes}` : '',
          ]
            .filter(Boolean)
            .join('\n');

          return (
            <span
              className='font-bold text-red-600 dark:text-red-400 cursor-help'
              title={tooltipText}
            >
              -{formatCurrency(ret.totalRefund)}
            </span>
          );
        },
        meta: { width: 202, align: 'end' },
      },
      {
        accessorKey: 'reason',
        header: t.headers.reason,
        cell: (info) => {
          const reason = info.getValue() as string;
          const style = REASON_STYLES[reason] || { badgeClass: 'badge-neutral', icon: 'help' };
          const notes = info.row.original.notes;

          return (
            <div className='flex items-center gap-1.5'>
              <span className={`inline-flex items-center gap-1.5 ${style.badgeClass}`}>
                <span className='material-symbols-rounded text-sm'>{style.icon}</span>
                {t.reasons?.[reason] || reason}
              </span>
              {notes && (
                <span
                  className='material-symbols-rounded text-sm text-amber-500 cursor-help shrink-0'
                  title={notes}
                >
                  chat_bubble
                </span>
              )}
            </div>
          );
        },
        meta: { width: 132, align: 'center' },
      },
    ],
    [t, locale, sales, color, textTransform]
  );

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight page-title'>{t.title}</h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t.subtitle}</p>
        </div>
        <div className='flex items-center gap-2 h-9'>
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
      </div>

      {/* Table Section */}
      <div className='flex-1 flex flex-col min-h-0'>
        <TanStackTable<Return, any>
          data={pagedReturns}
          columns={columns}
          tableId='return_history'
          globalFilter={searchTerm}
          onSearchChange={setSearchTerm}
          filterableColumns={[
            {
              id: 'reason',
              label: t.headers.reason,
              icon: 'help',
              mode: 'multiple' as const,
              options: [
                {
                  label: t.reasons?.customer_request || 'Customer Request',
                  value: 'customer_request',
                },
                { label: t.reasons?.damaged || 'Damaged', value: 'damaged' },
                { label: t.reasons?.defective || 'Defective', value: 'defective' },
                { label: t.reasons?.expired || 'Expired', value: 'expired' },
                { label: t.reasons?.wrong_item || 'Wrong Item', value: 'wrong_item' },
                { label: t.reasons?.overage || 'Overage', value: 'overage' },
              ],
            },
          ]}
          initialFilters={activeFilters}
          onFilterChange={(f) => {
            setActiveFilters(f);
            setPage(1);
          }}
          enableTopToolbar={true}
          enableSearch={true}
          searchPlaceholder={t.searchPlaceholder}
          onRowClick={(row: Return) => setSelectedReturn(row)}
          onRowContextMenu={(e, row: Return) => showMenu(e.clientX, e.clientY, getRowActions(row))}
          color={color}
          enablePagination={true}
          enableVirtualization={false}
          pageSize={pageSize}
          isLoading={isPageLoading}
          rightCustomControls={
            <DatePicker
              label={t.headers?.date || 'Date'}
              value={dateRange.from}
              onChange={(v) => {
                setDateRange((prev) => ({ ...prev, from: v, to: prev.to || v }));
                setPage(1);
              }}
              color={color}
              locale={locale}
            />
          }
        />
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReturn(null)}
          size='lg'
          zIndex={50}
          title={t.modal?.title || 'Return Details'}
          icon='receipt_long'
          className='overscroll-contain'
          disabled={isPageLoading}
        >
          <div className='flex flex-col h-full max-h-[80vh]'>
            {/* 1. Header Info Section (Fixed) */}
            <div className='shrink-0 mb-4'>
              <ListWrapper>
                {[
                  {
                    label: t.headers?.date || 'Date',
                    icon: 'calendar_today',
                    value: (() => {
                      const d = new Date(selectedReturn.date);
                      let timeStr = d.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        numberingSystem: 'latn',
                      });
                      if (language === 'AR')
                        timeStr = timeStr.replace('AM', 'ص').replace('PM', 'م');
                      return (
                        <div className='flex items-center gap-1.5'>
                          <span>{d.toLocaleDateString('en-US')}</span>
                          <span className='opacity-30'>•</span>
                          <span>{timeStr}</span>
                        </div>
                      );
                    })(),
                  },
                  {
                    label: t.headers?.returnId || 'Return ID',
                    icon: 'tag',
                    value: (
                      <span className='font-mono'>
                        {selectedReturn.serialId || selectedReturn.id}
                      </span>
                    ),
                  },
                  {
                    label: t.headers?.saleId || 'Invoice Number',
                    icon: 'receipt',
                    value: (() => {
                      const sale = sales.find((s) => s.id === selectedReturn.saleId);
                      return (
                        <button
                          onClick={() => {
                            if (sale) {
                              setViewedSale(sale);
                            }
                          }}
                          className='text-primary-600 dark:text-primary-400 hover:underline font-bold text-xs'
                        >
                          #{sale?.serialId || selectedReturn.saleId}
                        </button>
                      );
                    })(),
                  },
                  {
                    label: t.headers?.customer || 'Customer',
                    icon: 'person',
                    value: (
                      <span className='font-bold'>
                        {sales.find((s) => s.id === selectedReturn.saleId)?.customerName ||
                          'Walk-in Customer'}
                      </span>
                    ),
                  },
                  {
                    label: t.headers?.reason || 'Reason',
                    icon: 'help',
                    value: (() => {
                      const reason = selectedReturn.reason;
                      const style = REASON_STYLES[reason] || {
                        badgeClass: 'badge-neutral',
                        icon: 'help',
                      };
                      return (
                        <span className={`inline-flex items-center gap-1.5 ${style.badgeClass}`}>
                          <span className='material-symbols-rounded text-[14px]'>{style.icon}</span>
                          {t.reasons?.[reason] || reason}
                        </span>
                      );
                    })(),
                  },
                ].map((item, i, arr) => (
                  <ListItem key={i} index={i} total={arr.length}>
                    <div className='flex items-center gap-2 shrink-0'>
                      <span className='material-symbols-rounded text-base opacity-40'>
                        {item.icon}
                      </span>
                      <span className='text-[9px] font-bold uppercase tracking-wider opacity-50'>
                        {item.label}
                      </span>
                    </div>
                    <div className='text-[12px] font-bold text-right pl-2'>{item.value}</div>
                  </ListItem>
                ))}
              </ListWrapper>
            </div>

            {/* 2. Scrollable Middle Section (Returned Items) */}
            <div className='flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1'>
              <p className='text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest'>
                {t.modal?.itemsReturned || 'Items Returned'}
              </p>
              <ListWrapper>
                {selectedReturn.items.map((item, idx) => (
                  <ListItem key={idx} index={idx} total={selectedReturn.items.length}>
                    <div className='flex justify-between items-center w-full min-w-0' dir='ltr'>
                      <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                        <ReturnQuantityBadge
                          qty={item.quantityReturned}
                          isUnit={item.isUnit}
                          language={language}
                        />
                        <div className='text-left min-w-0 flex-1 py-0.5'>
                          <p className='font-bold truncate text-[13px]'>
                            {getDisplayName(
                              { name: item.name, dosageForm: item.dosageForm },
                              textTransform
                            )}
                          </p>
                          {item.expiryDate && (
                            <div className='text-[10px] text-gray-400 flex items-center flex-wrap gap-1.5 mt-0.5'>
                              <span className='font-mono font-bold text-gray-400'>
                                {formatExpiryDate(item.expiryDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='text-right flex flex-col items-end shrink-0 pl-1 leading-tight'>
                        <span className='font-bold text-red-600 dark:text-red-400'>
                          -{formatCurrency(item.refundAmount)}
                        </span>
                      </div>
                    </div>
                  </ListItem>
                ))}
              </ListWrapper>
            </div>

            {/* 3. Footer Section (Notes & Total Refund) */}
            <div className='shrink-0 pt-3'>
              {selectedReturn.notes && (
                <div className='mb-3'>
                  <p className='text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1.5'>
                    {t.headers?.notes || 'Notes'}
                  </p>
                  <div className='p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-900 dark:text-amber-100 border border-amber-100 dark:border-amber-900/30 text-sm'>
                    {selectedReturn.notes}
                  </div>
                </div>
              )}

              <div className='flex justify-between items-center py-3 px-4 bg-gray-100/50 dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5'>
                <span className='font-bold text-[14px] text-red-600 dark:text-red-400'>
                  {t.headers?.totalRefund || 'Total Refund'}
                </span>
                <span className='text-xl font-black text-red-600 dark:text-red-400 tabular-nums tracking-tight'>
                  -{formatCurrency(selectedReturn.totalRefund)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Sale Details Modal (View Only for Return History) */}
      <SaleDetailModal
        sale={viewedSale}
        isOpen={!!viewedSale}
        onClose={() => setViewedSale(null)}
        t={TRANSLATIONS[(language || 'EN') as keyof typeof TRANSLATIONS].salesHistory}
        language={language}
        color={color}
        textTransform={textTransform}
      />
    </div>
  );
};
