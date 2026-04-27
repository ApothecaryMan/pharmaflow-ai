import React, { useMemo, useState } from 'react';
import { Modal } from '../../../common/Modal';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { MaterialTabs } from '../../../common/MaterialTabs';
import type { Customer, Sale, Language, CartItem } from '../../../../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';
import { getDisplayName } from '../../../../utils/drugDisplayName';
import { formatCurrency, money, pricing } from '../../../../utils/currency';

interface POSCustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  sales: Sale[];
  color: string;
  t: any;
  language: Language | string;
  onAddToCart?: (drugCode: string) => void;
}

export const POSCustomerHistoryModal: React.FC<POSCustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  sales,
  color,
  t,
  language,
  onAddToCart,
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

  // Aggregate favorite drugs by frequency of orders
  const favoriteDrugs = useMemo(() => {
    if (!customerSales.length) return [];
    
    const counts: Record<string, { item: CartItem; frequency: number }> = {};
    
    customerSales.forEach(sale => {
      const uniqueCodesInSale = new Set<string>();
      sale.items.forEach(item => {
        const code = item.internalCode || item.barcode || item.id;
        if (code) uniqueCodesInSale.add(code);
      });
      
      uniqueCodesInSale.forEach(code => {
        const representativeItem = sale.items.find(i => (i.internalCode || i.barcode || i.id) === code);
        if (representativeItem) {
          if (!counts[code]) {
            counts[code] = { 
              item: representativeItem, 
              frequency: 0,
            };
          }
          counts[code].frequency += 1;
        }
      });
    });
    
    return Object.values(counts).sort((a, b) => b.frequency - a.frequency);
  }, [customerSales]);

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.modal?.history || t.customerHistory?.title || 'Customer History'}
      size='2xl'
      bodyClassName="p-1.5"
      tabs={[
        {
          label: t.history || 'Purchase History',
          value: 'history',
          icon: 'history',
        },
        {
          label: t.favorites || 'Favorites',
          value: 'favorites',
          icon: 'grade',
        },
      ]}
      activeTab={activeTab}
      onTabChange={(val) => setActiveTab(val as 'history' | 'favorites')}
    >
      <div className='flex flex-col gap-1.5'>
        {/* Customer Header - Hyper Compact Input Cell Pattern */}
        <div className='bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/50'>
          <div className='flex items-center justify-between'>
            {/* Left: Avatar and Name */}
            <div className='flex items-center gap-3 w-1/3 min-w-0'>
              <div className='w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-300 shrink-0 border border-zinc-200/50 dark:border-zinc-700/50'>
                <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                  person
                </span>
              </div>
              <div className='flex flex-col min-w-0 truncate'>
                <label className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1'>
                  {t.customer || 'Customer'}
                </label>
                <h3 className='text-[15px] font-black text-zinc-900 dark:text-zinc-100 leading-none truncate'>
                  {customer.name}
                </h3>
              </div>
            </div>

            {/* Center: Large Customer Code */}
            <div className='flex flex-col items-center justify-center w-1/3'>
              <div className='text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 bg-zinc-200/50 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded'>
                {language === 'AR' ? 'كود العميل' : 'CUSTOMER CODE'}
              </div>
              <div className='text-3xl font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tighter leading-none'>
                {customer.code}
              </div>
            </div>
            
            {/* Right: Phone */}
            <div className='flex flex-col items-end w-1/3'>
              <label className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1'>
                {t.phone || 'Phone'}
              </label>
              <span className='text-xs font-bold text-zinc-600 dark:text-zinc-400 font-mono' dir='ltr'>
                {customer.phone || '---'}
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className='max-h-[60vh] overflow-y-auto pr-0.5 custom-scrollbar'>
          {activeTab === 'history' ? (
            <div className='flex flex-col gap-1'>
              {customerSales.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-8 text-gray-400 gap-2'>
                  <span className='material-symbols-rounded' style={{ fontSize: '32px' }}>
                    receipt_long
                  </span>
                  <p className='text-xs font-medium'>{t.noSalesFound || 'No sales history found'}</p>
                </div>
              ) : (
                customerSales.map((sale, idx) => (
                  <div key={sale.id} className="flex flex-col">
                    <MaterialTabs
                      index={idx}
                      total={customerSales.length}
                      isSelected={expandedSaleId === sale.id}
                      onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                      className="!h-auto py-1.5 !px-3"
                    >
                      <div className='flex items-center justify-between w-full gap-2.5'>
                        {/* Right Section (Start in RTL): Invoice Details & Status */}
                        <div className='flex items-center gap-2.5 flex-1 min-w-0'>
                          {/* Payment Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            sale.paymentMethod === 'visa' 
                              ? 'bg-blue-500/10 text-blue-500' 
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                              {sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                            </span>
                          </div>

                          <div className='flex flex-col min-w-0'>
                            <div className='flex items-center gap-1.5'>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  sale.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
                                }`} />
                              <span className='font-black text-zinc-900 dark:text-zinc-100 truncate text-[13px] uppercase tracking-tight'>
                                {t.invoice || 'Invoice'} {sale.dailyOrderNumber ? `#${sale.dailyOrderNumber}` : ''}
                                <span className="ml-1.5 opacity-40 font-medium text-[11px]">
                                  {sale.serialId || sale.id.substring(0, 8)}
                                </span>
                              </span>
                            </div>
                            <span className='text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-tighter'>
                              {format(new Date(sale.date), language === 'AR' ? 'PPPP - hh:mm a' : 'MMM d, yyyy - hh:mm a', { locale: dateLocale })}
                            </span>
                          </div>
                        </div>

                        {/* Left Section (End in RTL): Price & Collapse */}
                        <div className='flex items-center gap-2.5'>
                          <div className='text-left md:text-right flex flex-col items-end'>
                            <span className='block font-black text-base text-zinc-900 dark:text-white leading-none tabular-nums'>
                              {formatCurrency(sale.total)}
                            </span>
                          </div>
                          
                          <div className='flex items-center gap-1.5'>
                            <span className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 bg-zinc-100/50 dark:bg-zinc-800/30 px-1.5 py-0.5 rounded tabular-nums min-w-[20px] text-center'>
                              {sale.items.length}
                            </span>
                            <div className={`transition-all active:scale-95 cursor-pointer ${expandedSaleId === sale.id ? 'rotate-180 text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'}`}>
                              <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                                expand_more
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </MaterialTabs>                    {/* Expandable Item Details */}
                    {expandedSaleId === sale.id && (
                      <div className='px-2.5 pb-2.5 bg-zinc-50 dark:bg-zinc-900/30 border-x border-b border-zinc-100 dark:border-zinc-800/50 rounded-b-lg -mt-1 pt-3 transition-all animate-slide-down' dir='ltr'>
                        <div className='space-y-2'>
                          <h4 className='text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1'>
                            {t.invoiceDetails || 'Invoice Items'}
                          </h4>
                          <div className='bg-white dark:bg-zinc-950/40 rounded-lg border border-zinc-100 dark:border-zinc-800/50 p-1 space-y-0.5'>
                            {sale.items.map((item, idx) => (
                              <div key={idx} className='flex items-center justify-between text-[11px] py-1.5 px-2 border-b border-zinc-50 dark:border-zinc-900/50 last:border-0'>
                                 <div className='flex flex-col'>
                                  <span className='font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight'>
                                    {getDisplayName(item)}
                                  </span>
                                  <div className='flex items-center gap-1.5 mt-1'>
                                    <div className='px-1.5 py-0.5 rounded-sm bg-zinc-50 dark:bg-zinc-900/40 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 border border-zinc-200/50 dark:border-zinc-700/50 tabular-nums font-mono shadow-sm'>
                                      <span>{item.batchAllocations?.[0]?.batchNumber || '---'}</span>
                                      <span className='w-px h-2 bg-zinc-200 dark:bg-zinc-700' />
                                      <span className='text-zinc-400 dark:text-zinc-500'>
                                        {item.batchAllocations?.[0]?.expiryDate ? format(new Date(item.batchAllocations[0].expiryDate), 'MM/yy') : '--/--'}
                                      </span>
                                    </div>
                                    {item.discount > 0 && (
                                      <span className='text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded'>
                                        {t.discount || 'Discount'}: {item.discount}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className='flex items-center gap-3 text-right'>
                                  <span className='text-[10px] text-zinc-400 dark:text-zinc-300 font-black tabular-nums bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-widest border border-zinc-200/50 dark:border-zinc-700/50'>
                                    x{item.quantity}
                                  </span>
                                  <span className='font-black text-zinc-900 dark:text-zinc-100 min-w-[70px] text-right tabular-nums'>
                                    {formatCurrency(pricing.lineTotal(item.price, item.quantity, item.discount))}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Invoice Summary Footer */}
                          <div className='bg-zinc-900 dark:bg-zinc-100 rounded-lg p-2.5 flex flex-col gap-1 shadow-sm'>
                            {sale.globalDiscount > 0 && (
                              <div className='flex justify-between text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest'>
                                <span>{t.globalDiscount || 'Global Discount'}</span>
                                <span className='tabular-nums'>-{formatCurrency(sale.globalDiscount)}</span>
                              </div>
                            )}
                            <div className='flex justify-between items-center'>
                              <span className='text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none'>{t.total || 'Total'}</span>
                              <span className='text-lg font-black text-white dark:text-zinc-950 leading-none tabular-nums'>
                                {formatCurrency(sale.total)}
                              </span>
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
            <div className='flex flex-col gap-1'>
              {favoriteDrugs.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-20 text-zinc-400 dark:text-zinc-600 gap-2'>
                  <span className='material-symbols-rounded' style={{ fontSize: '40px' }}>
                    grade
                  </span>
                  <p className='text-[10px] font-black uppercase tracking-widest'>{t.favoritesEmpty || 'No favorites yet'}</p>
                </div>
              ) : (
                favoriteDrugs.map(({ item, frequency }, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === favoriteDrugs.length - 1;
                  const isSingle = favoriteDrugs.length === 1;

                  let roundedClass = 'rounded-lg';
                  if (isSingle) {
                    roundedClass = 'rounded-3xl';
                  } else if (isFirst) {
                    roundedClass = 'rounded-t-3xl rounded-b-lg';
                  } else if (isLast) {
                    roundedClass = 'rounded-b-3xl rounded-t-lg';
                  }

                  return (
                    <div
                      key={item.internalCode || item.barcode || item.id}
                      className={`relative px-3 py-1.5 flex items-center bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/50 ${roundedClass}`}
                      dir='ltr'
                    >
                      <div className='flex items-center justify-between w-full'>
                        <div className='flex items-center gap-3 min-w-0'>
                          <div className='w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-black text-[11px] shrink-0 border border-zinc-200/50 dark:border-zinc-700/50 tabular-nums'>
                            {frequency}
                          </div>
                          <div className='flex flex-col min-w-0'>
                            <span className='font-black text-[13px] text-zinc-900 dark:text-zinc-100 uppercase tracking-tight truncate'>
                              {getDisplayName(item)}
                            </span>

                          </div>
                        </div>

                        {onAddToCart && (
                          <button
                            onClick={() => onAddToCart(item.internalCode || item.barcode || item.id)}
                            className='flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all shadow-sm'
                          >
                            <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>
                              add_shopping_cart
                            </span>
                            <span className='text-[11px] font-black uppercase tracking-widest'>
                              {t.addToCart || 'Buy'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
