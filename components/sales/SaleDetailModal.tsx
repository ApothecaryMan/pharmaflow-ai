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
  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');

  if (!sale) return null;

  const tabs = [
    { label: t.modal.items || 'Items', value: 'items', icon: 'list' },
    { label: t.modal.modificationHistory || 'History', value: 'history', icon: 'history' },
  ];

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
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <div className='space-y-4'>
          <div className='flex flex-col gap-0.5'>
            {[
              {
                label: t.modal.date,
                icon: 'calendar_today',
                value: (() => {
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
                    <div className='flex items-center gap-1.5'>
                      <span>{dateStr}</span>
                      <span className='text-gray-300 dark:text-gray-500 font-bold'>•</span>
                      <span>{timeStr}</span>
                    </div>
                  );
                })(),
              },
              {
                label: t.modal.id,
                icon: 'tag',
                value: (
                  <div className='flex items-center gap-2'>
                    {sale.status && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wider ${
                        sale.status === 'completed' ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/5' :
                        sale.status === 'cancelled' ? 'border-red-500/50 text-red-500 bg-red-500/5' :
                        sale.status === 'pending' ? 'border-blue-500/50 text-blue-500 bg-blue-500/5' :
                        sale.status === 'with_delivery' ? 'border-indigo-500/50 text-indigo-500 bg-indigo-500/5' :
                        sale.status === 'on_way' ? 'border-orange-500/50 text-orange-500 bg-orange-500/5' :
                        'border-gray-500/50 text-gray-500 bg-gray-500/5'
                      }`}>
                        {(() => {
                           const statusMap: Record<string, string> = language === 'AR' ? {
                             'completed': 'مكتمل',
                             'cancelled': 'ملغي',
                             'pending': 'معلق',
                             'with_delivery': 'مع المندوب',
                             'on_way': 'في الطريق'
                           } : {
                             'completed': 'Completed',
                             'cancelled': 'Cancelled',
                             'pending': 'Pending',
                             'with_delivery': 'With Delivery',
                             'on_way': 'On the Way'
                           };
                           return statusMap[sale.status] || t[sale.status] || sale.status;
                        })()}
                      </span>
                    )}
                    <span className='font-mono'>{sale.serialId || sale.id}</span>
                  </div>
                ),
              },
              {
                label: t.modal.customer,
                icon: 'person',
                value: (
                  <div className='flex items-center gap-1.5'>
                    <span className='font-bold'>{sale.customerName || 'Guest'}</span>
                    {sale.customerCode && (
                      <>
                        <span className='text-gray-300 dark:text-gray-500 font-bold'>•</span>
                        <span className='text-xs font-bold text-gray-700 dark:text-gray-300'>{sale.customerCode}</span>
                      </>
                    )}
                  </div>
                ),
              },
              {
                label: t.modal.payment,
                icon: sale.paymentMethod === 'visa' ? 'credit_card' : 'payments',
                value: (
                  <div className='flex items-center gap-1.5'>
                    {sale.paymentMethod === 'visa' ? t.visa : t.cash}
                  </div>
                ),
              },
            ].map((item, idx, arr) => (
              <MaterialTabs
                key={idx}
                index={idx}
                total={arr.length}
                variant='compact'
                interactive={false}
                className='dark:bg-white/[0.03] dark:border dark:border-white/[0.05] !px-3'
              >
                <div className='flex justify-between items-center w-full'>
                  <div className='flex items-center gap-2 opacity-50'>
                    <span className='material-symbols-rounded text-[15px]'>{item.icon}</span>
                    <span className='text-[9px] font-bold uppercase tracking-wider'>{item.label}</span>
                  </div>
                  <div className='text-[12px] text-gray-900 dark:text-gray-100 font-bold'>
                    {item.value}
                  </div>
                </div>
              </MaterialTabs>
            ))}
          </div>

          <div>
            {activeTab === 'items' ? (
              <>
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
                          variant='compact'
                          interactive={false}
                          color={color}
                          className={`transition-all ${hasReturn ? 'border-2 border-orange-500/40 bg-orange-50/30 dark:bg-orange-900/10' : ''}`}
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
              </>
            ) : (
              <div className='border-t border-gray-100 dark:border-gray-800 pt-3'>
                <div className='flex items-center gap-2 mb-4'>
                  <span className='material-symbols-rounded text-sm text-gray-400'>history</span>
                  <p className='text-xs font-bold text-gray-400 uppercase'>{t.modal.modificationHistory || 'Modification History'}</p>
                </div>
                {sale.modificationHistory && sale.modificationHistory.length > 0 ? (
                  <div className='flex flex-col gap-1.5 thin-scrollbar pb-2'>
                    {sale.modificationHistory.slice().reverse().map((record, rIdx) => (
                      <MaterialTabs
                        key={rIdx}
                        index={rIdx}
                        total={sale.modificationHistory!.length}
                        variant='compact'
                        interactive={false}
                        className='flex-col !items-stretch py-3'
                      >
                        <div className='flex justify-between items-center mb-2 px-1'>
                          <span className='text-xs font-bold text-primary-600 dark:text-primary-400'>{record.modifiedBy}</span>
                          <span className='text-[10px] text-gray-500 font-mono'>
                            {new Date(record.timestamp).toLocaleString('en-US', {
                              numberingSystem: 'latn',
                              hour12: true,
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            }).replace(/, /g, ' • ')}
                          </span>
                        </div>
                        <div className='flex flex-col gap-1'>
                          {record.modifications.map((mod, mIdx) => (
                            <div key={mIdx} className='text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-2 py-1.5 rounded-lg' dir='ltr'>
                              <span className='material-symbols-rounded text-[14px] text-gray-400 shrink-0'>
                                {mod.type === 'item_removed' ? 'remove_circle' : mod.type === 'item_added' ? 'add_circle' : 'edit'}
                              </span>
                              <div className='flex items-center gap-2 overflow-hidden'>
                                <span className='font-bold text-gray-900 dark:text-gray-200 truncate'>
                                  {getDisplayName({ name: mod.itemName, dosageForm: mod.dosageForm }, textTransform)}
                                </span>
                                <span className='text-[10px] opacity-60'>|</span>
                                <div className='whitespace-nowrap font-medium'>
                                  {mod.type === 'item_removed' ? (
                                    <span className='text-red-500'>{t.modal.removed || 'Removed'}</span>
                                  ) : mod.type === 'quantity_update' ? (
                                    <span>{mod.previousQuantity} → <span className='font-bold text-primary-600 dark:text-primary-400'>{mod.newQuantity}</span></span>
                                  ) : mod.type === 'discount_update' ? (
                                    <span>{mod.previousDiscount}% → <span className='font-bold text-primary-600 dark:text-primary-400'>{mod.newDiscount}%</span></span>
                                  ) : (
                                    <span className='text-green-600 dark:text-green-400'>{t.modal.added || 'Added'} ({mod.newQuantity})</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </MaterialTabs>
                    ))}
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-12 text-gray-400'>
                    <span className='material-symbols-rounded text-4xl mb-2 opacity-20'>history</span>
                    <p className='text-xs font-medium'>{t.modal.noHistory || 'No modification history'}</p>
                  </div>
                )}
              </div>
            )}
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
            const isDeliveryNotCompleted = sale.saleType === 'delivery' && sale.status !== 'completed';
            const canRefund = onProcessReturn && 
              permissionsService.can('sale.refund') &&
              !isDeliveryNotCompleted &&
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
