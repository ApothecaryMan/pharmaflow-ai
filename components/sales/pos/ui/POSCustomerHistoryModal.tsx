import React, { useMemo, useState } from 'react';
import { Modal } from '../../../common/Modal';
import { SegmentedControl } from '../../../common/SegmentedControl';
import type { Customer, Sale, Language } from '../../../../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';
import { getDisplayName } from '../../../../utils/drugDisplayName';

interface POSCustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  sales: Sale[];
  color: string;
  t: any;
  language: Language | string;
}

export const POSCustomerHistoryModal: React.FC<POSCustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  sales,
  color,
  t,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Reset expansion state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setExpandedSaleId(null);
    }
  }, [isOpen]);

  const dateLocale = language === 'AR' ? ar : enUS;

  // Filter sales for this customer
  const customerSales = useMemo(() => {
    if (!customer) return [];
    return sales
      .filter((s) => s.customerCode === customer.code)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customer, sales]);

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.customerHistory?.title || 'Customer History'}
      size='2xl'
    >
      <div className='flex flex-col gap-6'>
        {/* Customer Header */}
        <div className='flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50'>
          <div className='w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0'>
            <span className='material-symbols-rounded' style={{ fontSize: '32px' }}>
              person
            </span>
          </div>
          <div className='flex flex-col gap-0.5'>
            <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight'>
              {customer.name}
            </h3>
            <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
              <span className='font-mono font-bold bg-gray-200/50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded'>
                {customer.code}
              </span>
              <span className='opacity-30'>•</span>
              <span dir='ltr'>{customer.phone}</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <SegmentedControl
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'history' | 'favorites')}
          color={color}
          fullWidth
          options={[
            {
              label: t.history || 'Purchase History',
              value: 'history',
              icon: 'history',
            },
            {
              label: t.favorites || 'Favorites',
              value: 'favorites',
              icon: 'grade',
              disabled: true, // As requested
            },
          ]}
        />

        {/* Content Area */}
        <div className='min-h-[300px] max-h-[500px] overflow-y-auto pr-1 custom-scrollbar'>
          {activeTab === 'history' ? (
            <div className='flex flex-col gap-3'>
              {customerSales.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-gray-400 gap-3'>
                  <span className='material-symbols-rounded' style={{ fontSize: '48px' }}>
                    receipt_long
                  </span>
                  <p className='text-sm font-medium'>{t.noSalesFound || 'No sales history found'}</p>
                </div>
              ) : (
                customerSales.map((sale) => (
                  <div
                    key={sale.id}
                    className={`border rounded-xl transition-all overflow-hidden ${
                      expandedSaleId === sale.id
                        ? 'border-primary-200 dark:border-primary-800 bg-primary-50/20 dark:bg-primary-900/10 shadow-sm'
                        : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {/* Invoice Header (Clickable to Expand) */}
                    <div
                      onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                      className='p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors'
                    >
                      <div className='flex items-center gap-4'>
                        <div className={`flex items-center justify-center ${
                          sale.paymentMethod === 'visa' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                            {sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                          </span>
                        </div>
                        <div className='flex flex-col gap-0.5'>
                          <div className='flex items-center gap-2'>
                            <span className='font-bold text-gray-800 dark:text-gray-200'>
                              {t.invoice || 'Invoice'} #{sale.dailyOrderNumber || sale.id.substring(0, 8)}
                            </span>
                            <span
                              className={`material-symbols-rounded text-sm ${
                                sale.status === 'completed'
                                  ? 'text-emerald-500'
                                  : 'text-amber-500'
                              }`}
                              title={sale.status}
                            >
                              {sale.status === 'completed' ? 'check_circle' : 'pending'}
                            </span>
                          </div>
                          <span className='text-xs text-gray-500 dark:text-gray-400'>
                            {format(new Date(sale.date), language === 'AR' ? 'PPPP - hh:mm a' : 'MMM d, yyyy - hh:mm a', { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center gap-3'>
                        <div className='text-right'>
                          <span className='block font-bold text-gray-900 dark:text-white'>
                            {sale.total.toFixed(2)} {t.currency || 'EGP'}
                          </span>
                          <span className='text-[10px] text-gray-500 uppercase font-bold'>
                            {sale.items.length} {t.items || 'Items'}
                          </span>
                        </div>
                        <span className={`material-symbols-rounded text-gray-400 transition-transform ${expandedSaleId === sale.id ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Expandable Item Details */}
                    {expandedSaleId === sale.id && (
                      <div className='px-4 pb-4 animate-slide-down' dir='ltr'>
                        <div className='border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3'>
                          <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider'>
                            {t.invoiceDetails || 'Invoice Items'}
                          </h4>
                          <div className='space-y-2'>
                            {sale.items.map((item, idx) => (
                              <div key={idx} className='flex items-center justify-between text-sm py-1 border-b border-gray-50/50 dark:border-gray-700/30 last:border-0'>
                                <div className='flex flex-col'>
                                  <span className='font-semibold text-gray-700 dark:text-gray-300'>
                                    {getDisplayName(item)}
                                  </span>
                                  {item.discount > 0 && (
                                    <span className='text-[10px] text-emerald-600 dark:text-emerald-400 font-bold'>
                                      {t.discount || 'Discount'}: {item.discount}%
                                    </span>
                                  )}
                                </div>
                                <div className='flex items-center gap-4 text-right'>
                                  <span className='text-gray-500 dark:text-gray-400 font-mono'>
                                    {item.quantity}
                                  </span>
                                  <span className='font-bold text-gray-800 dark:text-gray-100 min-w-[60px]'>
                                    {(item.quantity * item.price * (1 - (item.discount || 0) / 100)).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Invoice Summary Footer */}
                          <div className='mt-4 bg-gray-100/50 dark:bg-gray-700/30 p-3 rounded-lg flex flex-col gap-1'>
                            {sale.globalDiscount > 0 && (
                              <div className='flex justify-between text-xs text-gray-500'>
                                <span>{t.globalDiscount || 'Global Discount'}:</span>
                                <span>-{sale.globalDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className='flex justify-between items-center text-sm font-bold'>
                              <span className='text-gray-600 dark:text-gray-300'>{t.total || 'Total'}:</span>
                              <span className='text-primary-600 dark:text-primary-400'>{sale.total.toFixed(2)} {t.currency || 'EGP'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center py-20 text-gray-400 gap-3'>
              <span className='material-symbols-rounded' style={{ fontSize: '48px' }}>
                grade
              </span>
              <p className='text-sm font-medium'>{t.favoritesEmpty || 'Coming Soon'}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
