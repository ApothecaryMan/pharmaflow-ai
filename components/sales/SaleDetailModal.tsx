import React, { useState } from 'react';
import type { Sale, Return, Shift } from '../../types';
import { getDisplayName } from '../../utils/drugDisplayName';
import { permissionsService } from '../../services/auth/permissions';
import { Modal } from '../common/Modal';
import { MaterialTabs } from '../common/MaterialTabs';
import { ReturnModal } from './ReturnModal';
import { getActiveReceiptSettings, printInvoice, type InvoiceTemplateOptions } from './InvoiceTemplate';

interface SaleDetailModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  t: any;
  language: string;
  color: string;
  textTransform: any;
  // Optional permission/action props
  currentShift?: Shift | null;
  currentEmployeeId?: string;
  currentDailyRefunds?: number;
  onProcessReturn?: (returnData: Return) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  sale,
  isOpen,
  onClose,
  t,
  language,
  color,
  textTransform,
  currentShift,
  currentEmployeeId,
  currentDailyRefunds = 0,
  onProcessReturn,
}) => {
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    const activeSettings = getActiveReceiptSettings();
    const options: InvoiceTemplateOptions = {
      ...activeSettings,
      language: language as 'EN' | 'AR',
    };
    printInvoice(sale, options);
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !returnModalOpen}
        onClose={onClose}
        size='lg'
        title={t.modal.title}
        icon='receipt_long'
        className='overscroll-contain'
      >
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <p className='text-gray-500 text-xs'>{t.modal.date}</p>
              <p className='font-medium text-gray-700 dark:text-gray-300 mt-0.5 flex items-center gap-1.5'>
                {(() => {
                  const d = new Date(sale.date);
                  const dateStr = d.toLocaleDateString('en-US');
                  let timeStr = d.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    numberingSystem: 'latn',
                  });
                  if (language === 'AR') {
                    timeStr = timeStr.replace('AM', 'ص').replace('PM', 'م');
                  }
                  return (
                    <>
                      <span>{dateStr}</span>
                      <span className='text-gray-300 dark:text-gray-700 font-bold'>•</span>
                      <span>{timeStr}</span>
                    </>
                  );
                })()}
              </p>
            </div>
            <div className='text-end'>
              <p className='text-gray-500 text-xs'>{t.modal.id}</p>
              <div className='flex items-center justify-end gap-2 mt-0.5'>
                {sale.status && (
                   <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-black uppercase tracking-wider ${
                     sale.status === 'completed' ? 'border-emerald-500 text-emerald-500' :
                     sale.status === 'cancelled' ? 'border-red-500 text-red-500' :
                     sale.status === 'pending' ? 'border-blue-500 text-blue-500' :
                     sale.status === 'with_delivery' ? 'border-indigo-500 text-indigo-500' :
                     sale.status === 'on_way' ? 'border-orange-500 text-orange-500' :
                     'border-gray-500 text-gray-500'
                   }`}>
                     {t[sale.status] || sale.status}
                   </span>
                )}
                <span className='text-sm text-gray-600 dark:text-gray-400 font-medium'>
                  {sale.serialId || sale.id}
                </span>
              </div>
            </div>
            <div>
              <p className='text-gray-500 text-xs'>{t.modal.customer}</p>
              <div className='flex items-center gap-2 mt-0.5'>
                <p className='font-bold text-gray-900 dark:text-gray-100'>
                  {sale.customerName || 'Guest'}
                </p>
                {sale.customerCode && (
                  <>
                    <span className='text-gray-300 dark:text-gray-700'>•</span>
                    <span className='text-sm text-gray-600 dark:text-gray-400 font-medium'>
                      {sale.customerCode}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className='text-end'>
              <p className='text-gray-500 text-xs'>{t.modal.payment}</p>
              <div className='font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 justify-end mt-0.5'>
                <span className='material-symbols-rounded text-[18px] text-gray-400'>
                  {sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                </span>
                {sale.paymentMethod === 'visa' ? t.visa : t.cash}
              </div>
            </div>
          </div>

          <div className='border-t border-gray-100 dark:border-gray-800 pt-3'>
            <p className='text-xs font-bold text-gray-400 uppercase mb-2'>{t.modal.items}</p>
            <div className='flex flex-col gap-1'>
              {sale.items.map((item, idx) => {
                const effectivePrice =
                  item.isUnit && item.unitsPerPack ? item.price / item.unitsPerPack : item.price;
                const lineKey = `${item.id}_${idx}`;
                const returnedQty =
                  sale.itemReturnedQuantities?.[lineKey] ||
                  sale.itemReturnedQuantities?.[item.id] ||
                  0;
                const hasReturn = returnedQty > 0;
                const isFullyReturned = returnedQty >= item.quantity;

                return (
                  <MaterialTabs
                    key={idx}
                    index={idx}
                    total={sale.items.length}
                    color={color}
                    className={`h-auto py-3 transition-all ${hasReturn ? 'border-2 border-orange-500/40 bg-orange-50/30 dark:bg-orange-900/10' : ''}`}
                  >
                    <div className='flex justify-between items-center w-full' dir='ltr'>
                      <div className='text-left'>
                        <p className='font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 item-name'>
                          {getDisplayName({ name: item.name, dosageForm: item.dosageForm }, textTransform)}
                        </p>
                        <div
                          className='text-xs text-gray-500 flex flex-row items-center gap-1 mt-0.5'
                          dir='ltr'
                        >
                          <span className='shrink-0'>{t.modal.qty}:</span>
                          <span className='font-bold shrink-0'>{item.quantity}</span>
                          {item.isUnit && (
                            <span className='text-[8px] border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 px-1 py-1 leading-none rounded-sm font-bold tracking-tighter uppercase whitespace-nowrap'>
                              {language === 'AR' ? 'وحدة' : 'UNIT'}
                            </span>
                          )}
                          {!permissionsService.can('sale.view_assigned_only') && (
                            <>
                              <span className='opacity-50 text-[10px] shrink-0'>x</span>
                              <span className='shrink-0 tabular-nums'>
                                ${effectivePrice.toFixed(2)}
                              </span>
                              {item.discount && item.discount > 0 ? (
                                <span className='text-green-600 dark:text-green-400 shrink-0'>
                                  (-{item.discount}%)
                                </span>
                              ) : (
                                ''
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className='font-medium text-gray-700 dark:text-gray-300 text-right flex flex-col items-end'>
                        {hasReturn && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${isFullyReturned ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 mb-1'} whitespace-nowrap`}
                          >
                            <span className='material-symbols-rounded text-[13px]'>
                              {isFullyReturned ? 'assignment_return' : 'replay'}
                            </span>
                            {isFullyReturned
                              ? language === 'AR'
                                ? 'مرتجع كلي'
                                : 'FULLY RETURNED'
                              : language === 'AR'
                                ? `مرتجع (${returnedQty})`
                                : `RETURNED (${returnedQty})`}
                          </span>
                        )}
                        {!isFullyReturned && (
                          <div>
                            <span className='tabular-nums'>
                              $
                              {(
                                effectivePrice *
                                (item.quantity - returnedQty) *
                                (1 - (item.discount || 0) / 100)
                              ).toFixed(2)}
                            </span>
                            {hasReturn && (
                              <span className='text-[10px] block text-gray-400 leading-none mt-0.5 line-through tabular-nums'>
                                $
                                {(
                                  effectivePrice *
                                  item.quantity *
                                  (1 - (item.discount || 0) / 100)
                                ).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </MaterialTabs>
                );
              })}
            </div>
          </div>

          <div
            className={`${sale.subtotal !== sale.total && !permissionsService.can('sale.view_assigned_only') ? 'border-t border-gray-100 dark:border-gray-800 pt-3' : ''} space-y-2 text-sm`}
          >
            {sale.subtotal !== undefined &&
              sale.subtotal !== sale.total &&
              !permissionsService.can('sale.view_assigned_only') && (
                <div className='flex justify-between text-gray-500'>
                  <span>{t.modal.subtotal}</span>
                  <span>${sale.subtotal.toFixed(2)}</span>
                </div>
              )}
            {Number(sale.deliveryFee) > 0 && (
              <div className='flex justify-between text-gray-500'>
                <span>{t.pos?.deliveryOrder || t.deliveryFee || 'Delivery'}</span>
                <span>+${sale.deliveryFee!.toFixed(2)}</span>
              </div>
            )}
            <div className='flex justify-between text-lg font-bold text-gray-900 dark:text-white py-3 border-t border-gray-100 dark:border-gray-800 tabular-nums'>
              <span>{t.modal.total}</span>
              <span>${sale.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className='pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 mt-0'>
          {(() => {
            const hasItemsToReturn = sale.items.some((item, index) => {
              const lineKey = `${item.id}_${index}`;
              const returnedQty =
                sale.itemReturnedQuantities?.[lineKey] ||
                sale.itemReturnedQuantities?.[item.id] ||
                0;
              return returnedQty < item.quantity;
            });

            const isSaleInCurrentShift =
              !!currentShift && new Date(sale.date) >= new Date(currentShift.openTime);
            
            // Check if return is allowed
            const currentUserRole = permissionsService.getEffectiveRole();
            const canRefund = onProcessReturn && 
              permissionsService.can('sale.refund') &&
              (currentUserRole !== 'cashier' || isSaleInCurrentShift);

            return (
              <>
                {hasItemsToReturn && canRefund && (
                  <button
                    onClick={() => setReturnModalOpen(true)}
                    aria-label={t.returns?.processReturn || 'Process Return'}
                    className={`flex-1 py-2.5 rounded-full font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors flex items-center justify-center gap-2`}
                  >
                    <span className='material-symbols-rounded'>assignment_return</span>
                    {t.returns?.processReturn || 'Process Return'}
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  aria-label={t.modal.print}
                  className={`flex-1 py-2.5 rounded-full font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center justify-center gap-2`}
                >
                  <span className='material-symbols-rounded'>print</span>
                  {t.modal.print}
                </button>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* Return Modal */}
      {returnModalOpen && onProcessReturn && (
        <ReturnModal
          isOpen={returnModalOpen}
          sale={sale}
          onClose={() => {
            setReturnModalOpen(false);
          }}
          onConfirm={(returnData) => {
            onProcessReturn(returnData);
            setReturnModalOpen(false);
            onClose(); // Close parent
          }}
          color={color}
          t={t}
          language={language}
          currentDailyRefunds={currentDailyRefunds}
          currentShift={currentShift}
          currentEmployeeId={currentEmployeeId}
        />
      )}
    </>
  );
};
