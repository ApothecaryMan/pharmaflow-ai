import type { ColumnDef } from '@tanstack/react-table';
import React from 'react';
import { useMemo, useState } from 'react';
import { useSettings } from '../../context';
import { RETURN_HISTORY_HELP } from '../../i18n/helpInstructions';
import { TRANSLATIONS } from '../../i18n/translations';
import { CartItem, type Return, type Sale } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { CARD_BASE } from '../../utils/themeStyles';
import { useContextMenu } from '../common/ContextMenu';
import { DatePicker, DateRangePicker } from '../common/DatePicker';
import { HelpButton, HelpModal } from '../common/HelpModal';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { TanStackTable } from '../common/TanStackTable';
import { SaleDetailModal } from './SaleDetailModal';

interface ReturnHistoryProps {
  returns: Return[];
  sales: Sale[];
  color: string;
  t: any;
  language: string;
  datePickerTranslations: any;
  navigationParams?: any;
}

export const ReturnHistory: React.FC<ReturnHistoryProps> = ({
  returns,
  sales,
  color,
  t,
  language,
  datePickerTranslations,
  // @ts-ignore
  navigationParams,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Handle Navigation Params (Deep Linking)
  React.useEffect(() => {
    if (navigationParams?.id) {
      setSearchTerm(navigationParams.id);
      setTimeout(() => {
        const ret = returns.find(r => r.id === navigationParams.id);
        if (ret) setSelectedReturn(ret);
      }, 100);
    }
  }, [navigationParams, returns]);

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [viewedSale, setViewedSale] = useState<Sale | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { textTransform } = useSettings();
  const { showMenu } = useContextMenu();

  // Get help content based on language
  const helpContent = RETURN_HISTORY_HELP[language as 'EN' | 'AR'] || RETURN_HISTORY_HELP.EN;

  // Locale for dates
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';

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
        accessorKey: 'id',
        header: t.headers.returnId,
        meta: { align: 'start' },
      },
      {
        accessorKey: 'saleId',
        header: t.headers.saleId,
        meta: { align: 'start' },
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
              #{sid}
            </button>
          );
        },
      },
      {
        accessorKey: 'date',
        header: t.headers.date,
        meta: { align: 'center' },
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
      },
      {
        accessorKey: 'totalRefund',
        header: t.headers.refundAmount,
        cell: (info) => (
          <span className='font-bold text-red-600 dark:text-red-400'>
            -${(info.getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'reason',
        header: t.headers.reason,
        cell: (info) => {
          const reason = info.getValue() as string;
          const style =
            reason === 'damaged'
              ? { textColor: 'text-red-500', borderColor: 'border-red-500', icon: 'broken_image' }
              : reason === 'defective'
                ? { textColor: 'text-red-500', borderColor: 'border-red-500', icon: 'build_circle' }
                : reason === 'expired'
                  ? { textColor: 'text-orange-500', borderColor: 'border-orange-500', icon: 'event_busy' }
                  : reason === 'wrong_item'
                    ? { textColor: 'text-teal-500', borderColor: 'border-teal-500', icon: 'error' }
                  : reason === 'customer_request'
                    ? { textColor: 'text-blue-500', borderColor: 'border-blue-500', icon: 'person' }
                    : reason === 'overage'
                      ? { textColor: 'text-emerald-500', borderColor: 'border-emerald-500', icon: 'add_circle' }
                      : { textColor: 'text-gray-500', borderColor: 'border-gray-500', icon: 'help' };

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border bg-transparent ${style.borderColor} ${style.textColor} text-[10px] font-black uppercase tracking-wider`}
            >
              <span className='material-symbols-rounded text-sm'>{style.icon}</span>
              {t.reasons?.[reason] || reason}
            </span>
          );
        },
      },
    ],
    [t, locale, sales, color, textTransform]
  );

  const filterableColumns = useMemo(
    () => [
      {
        id: 'reason',
        label: t.headers.reason,
        icon: 'help',
        mode: 'multiple' as const,
        options: [
          { label: t.reasons?.customer_request || 'Customer Request', value: 'customer_request' },
          { label: t.reasons?.damaged || 'Damaged', value: 'damaged' },
          { label: t.reasons?.defective || 'Defective', value: 'defective' },
          { label: t.reasons?.expired || 'Expired', value: 'expired' },
          { label: t.reasons?.wrong_item || 'Wrong Item', value: 'wrong_item' },
          { label: t.reasons?.overage || 'Overage', value: 'overage' },
        ],
      },
    ],
    [t]
  );

  // Filter returns by date only (text search handled by TanStackTable globalFilter)
  const filteredReturns = useMemo(() => {
    let data = [...returns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Date Filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from).getTime();
      data = data.filter((r) => new Date(r.date).getTime() >= fromDate);
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to).getTime();
      // Add 1 day to include the end date fully if it's just a date string without time
      // Actually Purchase logic just compares timestamps. Assuming consistent formats.
      // Purchase logic: data = data.filter(p => new Date(p.date).getTime() <= toDate);
      data = data.filter((r) => new Date(r.date).getTime() <= toDate);
    }

    return data;
  }, [returns, dateRange]);

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight page-title'>{t.title}</h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t.subtitle}</p>
        </div>
      </div>


      {/* Table Section */}
      <div className='flex-1 flex flex-col min-h-0'>
        <TanStackTable
          data={filteredReturns}
          columns={columns}
          tableId='return_history'
          globalFilter={searchTerm}
          onSearchChange={setSearchTerm}
          filterableColumns={filterableColumns}
          enableTopToolbar={true}
          enableSearch={true}
          searchPlaceholder={t.searchPlaceholder}
          onRowClick={(row) => setSelectedReturn(row)}
          onRowContextMenu={(e, row) => showMenu(e.clientX, e.clientY, getRowActions(row))}
          color={color}
          enablePagination={true}
          enableVirtualization={false}
          pageSize='auto'
          enableShowAll={true}
          rightCustomControls={
              <DateRangePicker
                startDate={dateRange.from}
                endDate={dateRange.to}
                onStartDateChange={(val) => setDateRange((prev) => ({ ...prev, from: val }))}
                onEndDateChange={(val) => setDateRange((prev) => ({ ...prev, to: val }))}
                color='gray'
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
        >
          <div className='space-y-4'>
            {/* Return Information Section */}
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div className='space-y-0.5'>
                <p className='text-gray-500 text-xs'>{t.headers?.returnId || 'Return ID'}</p>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  {selectedReturn.id || '001'}
                </p>
              </div>
              <div className='space-y-0.5 text-end'>
                <p className='text-gray-500 text-xs'>{t.headers?.date || 'Date'}</p>
                <p className='font-medium text-gray-700 dark:text-gray-300'>
                  {new Date(selectedReturn.date).toLocaleDateString(locale, {
                    numberingSystem: 'latn',
                  })}
                </p>
              </div>

              <div className='space-y-0.5'>
                <p className='text-gray-500 text-xs'>{t.headers?.saleId || 'Sale ID'}</p>
                <p className='font-medium text-gray-900 dark:text-gray-100 uppercase'>
                  {selectedReturn.saleId}
                </p>
              </div>
              <div className='space-y-0.5 text-end'>
                <p className='text-gray-500 text-xs'>{t.headers?.customer || 'Customer'}</p>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  {sales.find((s) => s.id === selectedReturn.saleId)?.customerName ||
                    'Walk-in Customer'}
                </p>
              </div>

              <div className='space-y-1'>
                <p className='text-gray-500 text-xs'>{t.headers?.reason || 'Reason'}</p>
                {(() => {
                  const reason = selectedReturn.reason;
                  const style =
                    reason === 'damaged'
                      ? { textColor: 'text-red-500', borderColor: 'border-red-500', icon: 'broken_image' }
                      : reason === 'defective'
                        ? { textColor: 'text-red-500', borderColor: 'border-red-500', icon: 'build_circle' }
                      : reason === 'expired'
                        ? { textColor: 'text-orange-500', borderColor: 'border-orange-500', icon: 'event_busy' }
                      : reason === 'wrong_item'
                        ? { textColor: 'text-teal-500', borderColor: 'border-teal-500', icon: 'error' }
                      : reason === 'customer_request'
                        ? { textColor: 'text-blue-500', borderColor: 'border-blue-500', icon: 'person' }
                      : { textColor: 'text-gray-500', borderColor: 'border-gray-500', icon: 'help' };
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border bg-transparent ${style.borderColor} ${style.textColor} text-[10px] font-black uppercase tracking-wider`}
                    >
                      <span className='material-symbols-rounded text-[14px]'>{style.icon}</span>
                      {t.reasons?.[reason] || reason}
                    </span>
                  );
                })()}
              </div>
              <div className='space-y-0.5 text-end'>
                <p className='text-gray-500 text-xs'>{t.headers?.totalRefund || 'Total Refund'}</p>
                <p className='font-bold text-red-500 text-base'>
                  ${selectedReturn.totalRefund.toFixed(2)}
                </p>
              </div>
            </div>

            <div className='border-t border-gray-100 dark:border-gray-800 pt-3'>
              <p className='text-xs font-bold text-gray-400 uppercase mb-2'>
                {t.modal?.itemsReturned || 'Returned Items'}
              </p>
              <div className='flex flex-col gap-1'>
                {selectedReturn.items.map((item, idx) => (
                  <MaterialTabs
                    key={idx}
                    index={idx}
                    total={selectedReturn.items.length}
                    color={color}
                    className='h-auto py-3 bg-red-50/10 dark:bg-red-900/5'
                  >
                    <div className='flex justify-between items-center w-full' dir='ltr'>
                      <div className='text-left'>
                        <p className='font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 item-name'>
                          {getDisplayName({ name: item.name, dosageForm: item.dosageForm }, textTransform)}
                        </p>
                        <div className='text-xs text-gray-500 flex flex-row items-center gap-1 mt-0.5' dir='ltr'>
                          <span className='shrink-0'>{t.modal?.qty}:</span>
                          <span className='font-bold shrink-0'>{item.quantityReturned}</span>
                          <span className='text-[8px] border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-1 py-1 leading-none rounded-sm font-bold tracking-tighter uppercase whitespace-nowrap'>
                            {item.isUnit ? t.modal?.unit : t.modal?.pack}
                          </span>
                        </div>
                      </div>
                      <div className='font-bold text-red-600 dark:text-red-400 text-right'>
                        <span className='tabular-nums'>${item.refundAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </MaterialTabs>
                ))}
              </div>
            </div>

            {selectedReturn.notes && (
              <div className='border-t border-gray-100 dark:border-gray-800 pt-3'>
                <p className='text-xs font-bold text-gray-400 uppercase mb-2'>{t.headers?.notes || 'Notes'}</p>
                <div className='p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-900 dark:text-amber-100 border border-amber-100 dark:border-amber-900/30 text-sm'>
                  {selectedReturn.notes}
                </div>
              </div>
            )}
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
    </div>
  );
};
