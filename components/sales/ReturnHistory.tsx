
import React, { useState, useMemo } from 'react';
import { Return, Sale, CartItem } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';

import { SearchInput } from '../common/SearchInput';
import { RETURN_HISTORY_HELP } from '../../i18n/helpInstructions';
import { HelpModal, HelpButton } from '../common/HelpModal';
import { Modal } from '../common/Modal';
import { DatePicker } from '../common/DatePicker';
import { TanStackTable } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';
import { useContextMenu } from '../common/ContextMenu';
import { getDisplayName } from '../../utils/drugDisplayName';

interface ReturnHistoryProps {
  returns: Return[];
  sales: Sale[];
  color: string;
  t: any;
  language: string;
  datePickerTranslations: any;
}

export const ReturnHistory: React.FC<ReturnHistoryProps> = ({ returns, sales, color, t, language, datePickerTranslations }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [showHelp, setShowHelp] = useState(false);
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
        cell: (info) => <span className="font-medium text-gray-900 dark:text-gray-100">#{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'date',
        header: t.headers.date,
        cell: (info) => (
          <span className="text-gray-600 dark:text-gray-400">
            {new Date(info.getValue() as string).toLocaleDateString(locale)}
          </span>
        ),
      },
      {
        accessorKey: 'saleId',
        header: t.headers.saleId,
        cell: (info) => <span className="text-gray-600 dark:text-gray-400">#{info.getValue() as string}</span>,
      },
      {
        id: 'customerName',
        header: t.headers.customer,
        accessorFn: (row) => {
          const sale = sales.find((s) => s.id === row.saleId);
          return sale?.customerName || 'Unknown';
        },
        cell: (info) => <span className="font-medium text-gray-900 dark:text-gray-100">{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'totalRefund',
        header: t.headers.refundAmount,
        cell: (info) => (
          <span className="font-bold text-red-600 dark:text-red-400">-${(info.getValue() as number).toFixed(2)}</span>
        ),
      },
      {
        accessorKey: 'reason',
        header: t.headers.reason,
        cell: (info) => {
          const reason = info.getValue() as string;
          const style = 
            reason === 'damaged' ? { color: 'red', icon: 'broken_image' } :
            reason === 'defective' ? { color: 'red', icon: 'build_circle' } :
            reason === 'expired' ? { color: 'orange', icon: 'event_busy' } :
            reason === 'wrong_item' ? { color: 'purple', icon: 'error' } :
            reason === 'overage' ? { color: 'blue', icon: 'add_circle' } :
            { color: 'gray', icon: 'help' };

          return (
            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border bg-transparent border-${style.color}-200 dark:border-${style.color}-900/50 text-${style.color}-700 dark:text-${style.color}-400 text-xs font-bold uppercase tracking-wider`}>
              <span className="material-symbols-rounded text-sm">{style.icon}</span>
              {t.reasons?.[reason] || reason}
            </span>
          );
        },
      },

    ],
    [t, locale, sales, color]
  );

  // Filter returns by date only (text search handled by TanStackTable globalFilter)
  const filteredReturns = useMemo(() => {
    let data = [...returns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Date Filter
    if (dateRange.from) {
        const fromDate = new Date(dateRange.from).getTime();
        data = data.filter(r => new Date(r.date).getTime() >= fromDate);
    }
    if (dateRange.to) {
        const toDate = new Date(dateRange.to).getTime();
        // Add 1 day to include the end date fully if it's just a date string without time
        // Actually Purchase logic just compares timestamps. Assuming consistent formats.
        // Purchase logic: data = data.filter(p => new Date(p.date).getTime() <= toDate);
        data = data.filter(r => new Date(r.date).getTime() <= toDate);
    }
    
    return data;
  }, [returns, dateRange]);

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center py-2">
        <div className="relative group w-full sm:w-auto">
          <SearchInput
            value={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder={t.searchPlaceholder || 'Search returns...'}
            wrapperClassName="w-full sm:w-96"
            className="py-3"
          />
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <DatePicker
                value={dateRange.from}
                onChange={(val) => setDateRange(prev => ({ ...prev, from: val }))}
                label={datePickerTranslations?.from || t.fromDate || "From"}
                color="gray"
                icon="calendar_today"
            />
            <span className="text-gray-400 material-symbols-rounded px-1 text-lg rtl:rotate-180">arrow_forward</span>
            <DatePicker
                value={dateRange.to}
                onChange={(val) => setDateRange(prev => ({ ...prev, to: val }))}
                label={datePickerTranslations?.to || t.toDate || "To"}
                color="gray"
                icon="event"
            />
        </div>
      </div>

      {/* Table */}
      <div className={`flex-1 overflow-hidden ${CARD_BASE} rounded-xl p-0 flex flex-col`}>
        <TanStackTable
          data={filteredReturns}
          columns={columns}
          tableId="return_history"
          globalFilter={searchTerm}
          onSearchChange={setSearchTerm}
          enableTopToolbar={false}
          searchPlaceholder={t.searchPlaceholder}
          onRowClick={(row) => setSelectedReturn(row)}
          onRowContextMenu={(e, row) => showMenu(e.clientX, e.clientY, getRowActions(row))}
          color={color}
        />
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReturn(null)}
          size="2xl"
          zIndex={50}
          title={t.modal?.title || 'Return Details'}
          icon="assignment_return"
          footer={
            <div className="flex justify-end">
               <button
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
               >
                 {t.modal?.close || 'Close'}
               </button>
            </div>
          }
        >
          <div className="space-y-6">
            
            {/* Return Information Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded text-[18px]">info</span>
                {t.modal?.returnInfo || 'Return Information'}
              </h3>
              
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.headers?.returnId || 'Return ID'}</label>
                    <p className="font-bold text-gray-900 dark:text-white font-mono text-sm">{selectedReturn.id || '001'}</p>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.headers?.date || 'Date'}</label>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{new Date(selectedReturn.date).toLocaleDateString()}</p>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.headers?.saleId || 'Sale ID'}</label>
                    <p className="font-bold text-gray-900 dark:text-white font-mono text-sm">{selectedReturn.saleId}</p>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.headers?.customer || 'Customer'}</label>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {sales.find(s => s.id === selectedReturn.saleId)?.customerName || 'Walk-in Customer'}
                    </p>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.headers?.reason || 'Reason'}</label>
                     {(() => {
                        const reason = selectedReturn.reason;
                        const style = 
                            reason === 'damaged' ? { color: 'red', icon: 'broken_image' } :
                            reason === 'defective' ? { color: 'red', icon: 'build_circle' } :
                            reason === 'expired' ? { color: 'orange', icon: 'event_busy' } :
                            reason === 'wrong_item' ? { color: 'purple', icon: 'error' } :
                            { color: 'gray', icon: 'help' };
                        return (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border bg-transparent border-${style.color}-200 dark:border-${style.color}-900/50 text-${style.color}-700 dark:text-${style.color}-400 text-xs font-bold uppercase tracking-wider`}>
                                <span className="material-symbols-rounded text-sm">{style.icon}</span>
                                {t.reasons?.[reason] || reason}
                            </span>
                        );
                     })()}
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.headers?.totalRefund || 'Total Refund'}</label>
                    <p className="font-bold text-red-600 text-sm">${selectedReturn.totalRefund.toFixed(2)}</p>
                 </div>
              </div>
            </div>

            {/* Returned Items Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <span className="material-symbols-rounded text-[18px]">inventory_2</span>
                {t.modal?.itemsReturned || 'Returned Items'}
              </h3>
              
              <div className="space-y-2">
                {selectedReturn.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center group hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                     <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                           {getDisplayName(item)}
                        </p>
                        <p className="text-xs text-gray-500">
                           <span className="opacity-70">{t.modal?.qty || 'Quantity'}:</span> {item.quantityReturned} <span className="mx-1 opacity-30">|</span> 
                           <span className="opacity-70">{t.modal?.refund || 'Refund'}:</span> ${item.refundAmount.toFixed(2)} <span className="mx-1 opacity-30">|</span> 
                           <span className="opacity-70">{t.modal?.unit || 'Unit'}:</span> {item.isUnit ? (t.modal?.unitLabel || 'Unit') : (t.modal?.packLabel || 'Pack')}
                        </p>
                     </div>
                     <p className="font-bold text-red-600 text-sm">
                        ${item.refundAmount.toFixed(2)}
                     </p>
                  </div>
                ))}
              </div>
            </div>

            {selectedReturn.notes && (
               <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[18px]">notes</span>
                    {t.headers?.notes || 'Notes'}
                  </h3>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-900 dark:text-amber-100 border border-amber-100 dark:border-amber-900/30 text-sm">
                    {selectedReturn.notes}
                  </div>
               </div>
            )}

          </div>
        </Modal>
      )}

      {/* Help */}
      <HelpButton onClick={() => setShowHelp(true)} title={helpContent.title} color={color} isRTL={language === 'AR'} />
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
