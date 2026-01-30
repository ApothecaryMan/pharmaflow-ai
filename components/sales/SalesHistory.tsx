
import React, { useState, useRef } from 'react';
import { Sale, Return } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { ReturnModal } from '../sales/ReturnModal';
import { DatePicker } from '../common/DatePicker';
import { createSearchRegex } from '../../utils/searchUtils';
import { SearchInput } from '../common/SearchInput';
import { SALES_HISTORY_HELP } from '../../i18n/helpInstructions';
import { HelpModal, HelpButton } from '../common/HelpModal';
import { Modal } from '../common/Modal';
import { printInvoice, InvoiceTemplateOptions, getActiveReceiptSettings } from './InvoiceTemplate';
import { getDisplayName } from '../../utils/drugDisplayName';
import { TanStackTable } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';
import { UserRole, canPerformAction } from '../../config/permissions';
import { MaterialTabs } from '../common/MaterialTabs';
import { Shift } from '../../types';

interface SalesHistoryProps {
  sales: Sale[];
  returns: Return[];
  onProcessReturn: (returnData: Return) => void;
  color: string;
  t: any;
  language: string;
  datePickerTranslations: any;
  userRole: UserRole;
  currentEmployeeId?: string;
  currentShift: Shift | null;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ 
  sales, 
  returns, 
  onProcessReturn, 
  color, 
  t, 
  language, 
  datePickerTranslations, 
  userRole,
  currentEmployeeId,
  currentShift
}) => {
  // Determine locale based on language
  const locale = language === 'AR' ? 'ar-EG' : 'en-US';
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Calculate daily refunds for the current employee (used for pharmacist limits)
  const currentDailyRefunds = React.useMemo(() => {
    if (!currentEmployeeId || userRole !== 'pharmacist') return 0;
    
    const today = new Date().toISOString().split('T')[0];
    return (returns || [])
      .filter(r => {
        const isToday = r.date.startsWith(today);
        const isSameEmployee = r.processedBy === currentEmployeeId;
        return isToday && isSameEmployee;
      })
      .reduce((sum, r) => sum + r.totalRefund, 0);
  }, [returns, currentEmployeeId, userRole]);

  // Get help content
  const helpContent = SALES_HISTORY_HELP[language as 'EN' | 'AR'] || SALES_HISTORY_HELP.EN;

  // Column definitions using TanStackTable's ColumnDef
  const tableColumns = React.useMemo<ColumnDef<Sale>[]>(() => [
    {
      accessorKey: 'id',
      header: t.modal.id,
      meta: { align: 'start' }
    },
    {
      accessorKey: 'date',
      header: t.headers.date,
      meta: { align: 'center' }
    },
    {
      accessorKey: 'customerName',
      header: t.headers.customer,
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {sale.customerName || "Guest"}
            </div>
            {sale.customerCode && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {sale.customerCode}
              </div>
            )}
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
          <span className={`flex items-center gap-1 ${isVisa ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
            <span className="material-symbols-rounded text-[16px]">{isVisa ? 'credit_card' : 'payments'}</span>
            <span className="text-sm font-medium">{isVisa ? t.visa : t.cash}</span>
          </span>
        );
      },
    },
    {
      id: 'items',
      header: t.headers.items,
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.items.length} {t.items || "items"}
        </span>
      ),
    },
    {
      accessorKey: 'total',
      header: t.headers.total,
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            ${sale.total.toFixed(2)}
            {sale.deliveryFee && sale.deliveryFee > 0 && (
              <div className="text-[10px] text-gray-400 font-normal tabular-nums">
                +${sale.deliveryFee.toFixed(2)} delivery
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      meta: { align: 'end' },
      cell: ({ row }) => {
        const sale = row.original;
        const totalReturned = sale.netTotal !== undefined ? sale.total - sale.netTotal : 0;
        
        if (sale.hasReturns) {
          return (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-orange-200 text-orange-700 bg-transparent font-bold">
              <span className="material-symbols-rounded text-[16px]">assignment_return</span>
              <span className="text-xs">-${totalReturned.toFixed(2)}</span>
            </div>
          );
        }
        
        if (sale.status === 'cancelled') {
          return (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-700 bg-transparent font-bold">
              <span className="material-symbols-rounded text-[16px]">cancel</span>
              <span className="text-xs uppercase">{t.cancelled || 'Cancelled'}</span>
            </div>
          );
        }
        
        return (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 bg-transparent font-bold">
            <span className="material-symbols-rounded text-[16px]">check_circle</span>
            <span className="text-xs uppercase">{t.completed || 'Completed'}</span>
          </div>
        );
      },
    }
  ], [t]);

  const filteredSales = sales
    .filter(sale => {
      const searchRegex = createSearchRegex(searchTerm);
      const matchesTerm = (
        searchRegex.test(sale.customerName || '') ||
        searchRegex.test(sale.id) ||
        sale.items.some(item => 
           searchRegex.test(item.name) || 
           (item.barcode && searchRegex.test(item.barcode))
        )
      );

      if (!matchesTerm) return false;

      const saleDate = new Date(sale.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && saleDate < start) return false;
      if (end && saleDate > end) return false;
      
      // Restriction: View assigned orders only (Delivery Agent)
      // FIX: Admins, Owners, and Managers should always see everything even if they have this permission (e.g. from ALL_PERMISSIONS)
      const isPrivileged = ['admin', 'pharmacist_owner', 'pharmacist_manager', 'manager'].includes(userRole);
      if (!isPrivileged && canPerformAction(userRole, 'sale.view_assigned_only')) {
        return sale.deliveryEmployeeId === currentEmployeeId;
      }

      return true;
    });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  const exportToCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = ['ID', 'Date', 'Customer', 'Customer Code', 'Payment Method', 'Items Count', 'Subtotal', 'Global Discount (%)', 'Total'];
    const escape = (str: string | number | undefined) => `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = filteredSales.map(sale => [
      sale.id,
      new Date(sale.date).toLocaleString(),
      sale.customerName || 'Guest',
      sale.customerCode || '-',
      sale.paymentMethod === 'visa' ? 'Visa' : 'Cash',
      sale.items.length,
      (sale.subtotal || 0).toFixed(2),
      sale.globalDiscount || 0,
      sale.total.toFixed(2)
    ]);

    const csvContent = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_history_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (sale: Sale) => {
    const activeSettings = getActiveReceiptSettings();
    const options: InvoiceTemplateOptions = { 
        ...activeSettings, 
        language: language as 'EN' | 'AR' 
    };
    printInvoice(sale, options);
  };



  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.subtitle}</p>
        </div>
        
        {/* Total Revenue Card - Hidden for Delivery Agents */}
        {userRole !== 'delivery' && (
          <div className={`px-4 py-2 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 ${CARD_BASE} flex flex-col items-end min-w-[140px]`}>
              <span className={`text-[10px] font-bold uppercase text-${color}-600 dark:text-${color}-400`}>{t.totalRevenue}</span>
              <span className={`text-xl font-bold text-${color}-900 dark:text-${color}-100`}>${sales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center py-2">
        <div className="flex flex-wrap items-center gap-3 w-full sm:flex-1">
            <div className="relative group flex-1">
                <SearchInput
                    name="salesSearch"
                    autoComplete="off"
                    spellCheck={false}
                    value={searchTerm}
                    onSearchChange={setSearchTerm}
                    placeholder={t.searchPlaceholder || "Search sales…"}
                    className="ps-10"
                    wrapperClassName="w-full"
                />
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    label={t.dateFrom || "From"}
                    color={color}
                    icon="calendar_today"
                    locale={locale}
                    translations={datePickerTranslations}
                />
                <span className="text-gray-300 dark:text-gray-700 rtl:rotate-180">
                    <span className="material-symbols-rounded text-[16px]">arrow_forward</span>
                </span>
                <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    label={t.dateTo || "To"}
                    color={color}
                    icon="event"
                    locale={locale}
                    translations={datePickerTranslations}
                />
            </div>
        </div>
            
        <button 
            onClick={exportToCSV}
            disabled={filteredSales.length === 0}
            className={`px-4 py-2.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 text-gray-700 dark:text-gray-200`}
        >
            <span className="material-symbols-rounded text-lg">download</span>
            <span className="hidden md:inline">{t.exportCSV}</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="flex-1 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
        <TanStackTable
          data={filteredSales}
          columns={tableColumns}
          tableId="sales_history_table"
          color={color}
          enableTopToolbar={false} // We have custom filters above
          onRowClick={(sale) => setSelectedSale(sale)}
          emptyMessage={t.noResults}
          lite={true}
          initialSorting={[{ id: 'date', desc: true }]}
        />
      </div>

      {/* Detail Modal - hide when return modal is open */}
      {selectedSale && !returnModalOpen && (
        <Modal
            isOpen={true}
            onClose={() => setSelectedSale(null)}
            size="lg"
            title={t.modal.title}
            icon="receipt_long"
            className="overscroll-contain"
        >
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <p className="text-gray-500 text-xs">{t.modal.date}</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300 mt-0.5 flex items-center gap-1.5">
                            {(() => {
                                const d = new Date(selectedSale.date);
                                const dateStr = d.toLocaleDateString('en-US');
                                let timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                if (language === 'AR') {
                                    timeStr = timeStr.replace('AM', 'ص').replace('PM', 'م');
                                }
                                return (
                                  <>
                                    <span>{dateStr}</span>
                                    <span className="text-gray-300 dark:text-gray-700 font-bold">•</span>
                                    <span>{timeStr}</span>
                                  </>
                                );
                            })()}
                          </p>
                      </div>
                      <div className="text-end">
                          <p className="text-gray-500 text-xs">{t.modal.id}</p>
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">{selectedSale.id}</span>
                      </div>
                      <div>
                          <p className="text-gray-500 text-xs">{t.modal.customer}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="font-bold text-gray-900 dark:text-gray-100">{selectedSale.customerName || 'Guest'}</p>
                            {selectedSale.customerCode && (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">•</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{selectedSale.customerCode}</span>
                              </>
                            )}
                          </div>
                      </div>
                      <div className="text-end">
                          <p className="text-gray-500 text-xs">{t.modal.payment}</p>
                          <div className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 justify-end mt-0.5">
                            <span className="material-symbols-rounded text-[18px] text-gray-400">
                              {selectedSale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                            </span>
                            {selectedSale.paymentMethod === 'visa' ? t.visa : t.cash}
                          </div>
                      </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">{t.modal.items}</p>
                      <div className="flex flex-col gap-1">
                          {selectedSale.items.map((item, idx) => {
                             const effectivePrice = (item.isUnit && item.unitsPerPack) ? item.price / item.unitsPerPack : item.price;
                             const lineKey = `${item.id}_${idx}`;
                             const returnedQty = selectedSale.itemReturnedQuantities?.[lineKey] || selectedSale.itemReturnedQuantities?.[item.id] || 0;
                             const hasReturn = returnedQty > 0;
                             const isFullyReturned = returnedQty >= item.quantity;

                              return (
                              <MaterialTabs 
                                key={idx} 
                                index={idx} 
                                total={selectedSale.items.length} 
                                color={color} 
                                className={`h-auto py-3 transition-all ${hasReturn ? 'border-2 border-orange-500/40 bg-orange-50/30 dark:bg-orange-900/10' : ''}`}
                              >
                                <div className="flex justify-between items-center w-full" dir="ltr">
                                  <div className="text-left">
                                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 item-name">
                                        {getDisplayName({ name: item.name, dosageForm: item.dosageForm })}
                                      </p>
                                      <div className="text-xs text-gray-500 flex flex-row items-center gap-1 mt-0.5" dir="ltr">
                                          <span className="shrink-0">{t.modal.qty}:</span>
                                          <span className="font-bold shrink-0">{item.quantity}</span>
                                          {item.isUnit && (
                                            <span className="text-[8px] border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 px-1 py-1 leading-none rounded font-bold tracking-tighter uppercase whitespace-nowrap">
                                              {language === 'AR' ? 'وحدة' : 'UNIT'}
                                            </span>
                                          )}
                                          {userRole !== 'delivery' && (
                                            <>
                                              <span className="opacity-50 text-[10px] shrink-0">x</span>
                                              <span className="shrink-0 tabular-nums">${effectivePrice.toFixed(2)}</span>
                                              {item.discount && item.discount > 0 ? <span className="text-green-600 dark:text-green-400 shrink-0">(-{item.discount}%)</span> : ''}
                                            </>
                                          )}
                                      </div>
                                  </div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 text-right flex flex-col items-end">
                                      {hasReturn && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${isFullyReturned ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 mb-1'} whitespace-nowrap`}>
                                          <span className="material-symbols-rounded text-[13px]">{isFullyReturned ? 'assignment_return' : 'replay'}</span>
                                          {isFullyReturned ? (language === 'AR' ? 'مرتجع كلي' : 'FULLY RETURNED') : (language === 'AR' ? `مرتجع (${returnedQty})` : `RETURNED (${returnedQty})`)}
                                        </span>
                                      )}
                                      {!isFullyReturned && (
                                        <div>
                                          <span className="tabular-nums">
                                            ${((effectivePrice * (item.quantity - returnedQty)) * (1 - (item.discount || 0)/100)).toFixed(2)}
                                          </span>
                                          {hasReturn && <span className="text-[10px] block text-gray-400 leading-none mt-0.5 line-through tabular-nums">
                                            ${((effectivePrice * item.quantity) * (1 - (item.discount || 0)/100)).toFixed(2)}
                                          </span>}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </MaterialTabs>
                             );
                          })}
                      </div>
                  </div>

                  <div className={`${(selectedSale.subtotal !== selectedSale.total && userRole !== 'delivery') ? 'border-t border-gray-100 dark:border-gray-800 pt-3' : ''} space-y-2 text-sm`}>
                  {selectedSale.subtotal !== undefined && selectedSale.subtotal !== selectedSale.total && userRole !== 'delivery' && (
                           <div className="flex justify-between text-gray-500">
                               <span>{t.modal.subtotal}</span>
                               <span>${selectedSale.subtotal.toFixed(2)}</span>
                           </div>
                       )}
                       {/* {selectedSale.globalDiscount !== undefined && selectedSale.globalDiscount > 0 && (
                           <div className="flex justify-between text-green-600 dark:text-green-400">
                               <span>{t.modal.discount} ({selectedSale.globalDiscount}%)</span>
                               <span>-${(selectedSale.subtotal! * selectedSale.globalDiscount / 100).toFixed(2)}</span>
                           </div>
                       )} */}
                       {Number(selectedSale.deliveryFee) > 0 && (
                           <div className="flex justify-between text-gray-500">
                               <span>{t.pos?.deliveryOrder || t.deliveryFee || "Delivery"}</span>
                               <span>+${selectedSale.deliveryFee!.toFixed(2)}</span>
                           </div>
                       )}
                       <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white py-3 border-t border-gray-100 dark:border-gray-800 tabular-nums">
                           <span>{t.modal.total}</span>
                           <span>${selectedSale.total.toFixed(2)}</span>
                       </div>
                  </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 mt-0">
                  {(() => {
                      // Check if there are any items that can still be returned (using lineKey pattern)
                      const hasItemsToReturn = selectedSale.items.some((item, index) => {
                          const lineKey = `${item.id}_${index}`;
                          const returnedQty = selectedSale.itemReturnedQuantities?.[lineKey] || selectedSale.itemReturnedQuantities?.[item.id] || 0;
                          return returnedQty < item.quantity;
                      });

                      // Check if sale is in current shift (for cashier)
                      const isSaleInCurrentShift = !!currentShift && new Date(selectedSale.date) >= new Date(currentShift.openTime);
                      const canRefund = canPerformAction(userRole, 'sale.refund') && 
                                       (userRole !== 'cashier' || isSaleInCurrentShift);
                      
                      return (
                        <>
                           {hasItemsToReturn && canRefund && (
                             <button 
                               onClick={() => setReturnModalOpen(true)}
                               aria-label={t.returns?.processReturn || 'Process Return'}
                               className={`flex-1 py-2.5 rounded-full font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center gap-2`}
                             >
                                 <span className="material-symbols-rounded">assignment_return</span>
                                 {t.returns?.processReturn || 'Process Return'}
                             </button>
                           )}
                          <button 
                            onClick={() => handlePrint(selectedSale)}
                            aria-label={t.modal.print}
                            className={`flex-1 py-2.5 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 transition-colors flex items-center justify-center gap-2`}
                          >
                              <span className="material-symbols-rounded">print</span>
                              {t.modal.print}
                          </button>
                        </>
                      );
                  })()}
              </div>
        </Modal>
      )}

       {/* Return Modal */}
       {selectedSale && returnModalOpen && (
         <ReturnModal
           isOpen={returnModalOpen}
           sale={selectedSale}
           onClose={() => {
             setReturnModalOpen(false);
             setSelectedSale(null);
           }}
           onConfirm={(returnData) => {
             onProcessReturn(returnData);
             setReturnModalOpen(false);
             setSelectedSale(null);
           }}
           color={color}
           t={t}
           language={language}
           userRole={userRole}
           currentDailyRefunds={currentDailyRefunds}
           currentShift={currentShift}
          />
       )}

      {/* Help */}
      <HelpButton onClick={() => setShowHelp(true)} title={helpContent.title} color={color} isRTL={language === 'AR'} />
      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} helpContent={helpContent as any} color={color} language={language} />
     </div>
   );
};