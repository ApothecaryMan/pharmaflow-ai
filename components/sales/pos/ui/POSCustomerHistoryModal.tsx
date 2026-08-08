import { format } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';
import React, { useMemo, useState } from 'react';
import type { CartItem, Customer, Language, Sale } from '../../../../types';
import { formatCurrency, formatCurrencyParts } from '../../../../utils/currency';
import { pricingService } from '../../../../services/sales/pricingService';
import { getDisplayName } from '../../../../utils/drugDisplayName';
import { MaterialTabs } from '../../../common/MaterialTabs';
import { Modal } from '../../../common/Modal';
import { Tooltip } from '../../../common/Tooltip';

interface POSCustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  sales: Sale[];
  color: string;
  t: Translations;
  language: Language | string;
  onAddToCart?: (drugCode: string) => void;
}

const CopyableSerial: React.FC<{ serial: string }> = ({ serial }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(serial);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] font-bold">{serial}</span>
      <button 
        onClick={handleCopy}
        className={`p-1 rounded cursor-pointer active:scale-95 transition-all flex items-center justify-center ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/20 text-white'}`}
        title="Copy"
      >
        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
    </div>
  );
};

export const POSCustomerHistoryModal: React.FC<POSCustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer: _customer,
  sales,
  color: _color,
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
    if (!_customer) return [];
    return sales
      .filter((s) => s.customerCode === _customer.code)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [_customer, sales]);

  // Aggregate favorite drugs by frequency of orders
  const favoriteDrugs = useMemo(() => {
    if (!customerSales.length) return [];

    const counts: Record<string, { item: CartItem; frequency: number }> = {};

    customerSales.forEach((sale) => {
      const uniqueCodesInSale = new Set<string>();
      sale.items.forEach((item) => {
        const code = item.internalCode || item.barcode || item.id;
        if (code) uniqueCodesInSale.add(code);
      });

      uniqueCodesInSale.forEach((code) => {
        const representativeItem = sale.items.find(
          (i) => (i.internalCode || i.barcode || i.id) === code
        );
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

  if (!_customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.modal?.history || t.customerHistory?.title || 'Customer History'}
      size='2xl'
      bodyClassName='p-1.5'
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
              <div className='w-9 h-9 rounded-full bg-[var(--bg-skeleton)] flex items-center justify-center text-zinc-500 dark:text-zinc-300 shrink-0 border border-zinc-200/50 dark:border-zinc-700/50'>
                <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                  person
                </span>
              </div>
              <div className='flex flex-col min-w-0 truncate'>
                <span className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1'>
                  {t.customer || 'Customer'}
                </span>
                <h3 className='text-[15px] font-black text-zinc-900 dark:text-zinc-100 leading-none truncate'>
                  {_customer.name}
                </h3>
              </div>
            </div>

            {/* Center: Large Customer Code */}
            <div className='flex flex-col items-center justify-center w-1/3'>
              <div className='text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 bg-zinc-200/50 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded'>
                {language === 'AR' ? 'كود العميل' : 'CUSTOMER CODE'}
              </div>
              <div className='text-3xl font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tighter leading-none'>
                {_customer.code}
              </div>
            </div>

            {/* Right: Phone */}
            <div className='flex flex-col items-end w-1/3'>
              <span className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1'>
                {t.phone || 'Phone'}
              </span>
              <span
                className='text-xs font-bold text-zinc-600 dark:text-zinc-400 font-mono'
                dir='ltr'
              >
                {_customer.phone || '---'}
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
                  <p className='text-xs font-medium'>
                    {t.noSalesFound || 'No sales history found'}
                  </p>
                </div>
              ) : (
                customerSales.map((sale, idx) => (
                  <div key={sale.id} className='flex flex-col'>
                    <MaterialTabs
                      index={idx}
                      total={customerSales.length}
                      isSelected={false}
                      onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                      className={`!h-auto py-1.5 !px-3 ${expandedSaleId === sale.id ? '!rounded-b-none' : ''}`}
                    >
                      <div className='flex items-center justify-between w-full gap-2.5'>
                        {/* Right Section (Start in RTL): Invoice Details & Status */}
                        <div className='flex items-center gap-2.5 flex-1 min-w-0'>
                          {/* Payment Icon */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              sale.paymentMethod === 'visa'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}
                          >
                            <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                              {sale.paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                            </span>
                          </div>

                          <div className='flex items-center gap-2 min-w-0'>
                            <div className='flex items-center gap-1.5 shrink-0'>
                              <Tooltip content={sale.status === 'completed' ? (t.completed || 'Completed') : (t.pending || 'Pending')} position="top">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    sale.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                />
                              </Tooltip>
                              <Tooltip content={<CopyableSerial serial={sale.serialId || sale.id} />} position="top">
                                <span className='font-black text-zinc-900 dark:text-zinc-100 truncate text-[13px] uppercase tracking-tight hover:underline cursor-pointer underline-offset-4 decoration-zinc-400 dark:decoration-zinc-600'>
                                  {t.invoice || 'Invoice'}{' '}
                                  {sale.dailyOrderNumber ? `#${sale.dailyOrderNumber}` : ''}
                                </span>
                              </Tooltip>
                            </div>
                            <span className='w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0' />
                            <span className='font-black text-zinc-900 dark:text-zinc-100 truncate text-[13px] uppercase tracking-tight'>
                              {format(
                                new Date(sale.date),
                                language === 'AR' ? 'd MMM - hh:mm a' : 'MMM d - hh:mm a',
                                { locale: dateLocale }
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Left Section (End in RTL): Price & Collapse */}
                        <div className='flex items-center gap-2.5'>
                          <div className='text-left md:text-right flex flex-col items-end'>
                            <span className='flex items-baseline gap-1 font-black text-zinc-900 dark:text-white tabular-nums'>
                              <span className='text-base leading-none'>
                                {formatCurrencyParts(sale.total, undefined, language).amount}
                              </span>
                              <span className='text-[10px] font-bold text-zinc-400 dark:text-zinc-500 leading-none'>
                                {formatCurrencyParts(sale.total, undefined, language).symbol}
                              </span>
                            </span>
                          </div>

                          <div className='flex items-center gap-1.5'>
                            <span className='text-[10px] font-black text-white dark:text-primary-950 bg-primary-700 dark:bg-primary-200 px-1.5 py-0.5 rounded tabular-nums min-w-[20px] text-center'>
                              {sale.items.length}
                            </span>
                            <div
                              className={`transition-all active:scale-95 cursor-pointer ${expandedSaleId === sale.id ? 'rotate-180 text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'}`}
                            >
                              <span
                                className='material-symbols-rounded'
                                style={{ fontSize: '20px' }}
                              >
                                expand_more
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </MaterialTabs>{' '}
                    {/* Expandable Item Details */}
                    {expandedSaleId === sale.id && (
                      <div
                        className='px-3 pb-3 bg-gray-100/80 dark:bg-white/5 rounded-b-lg pt-2 transition-all animate-slide-down'
                        dir='ltr'
                      >
                        <div className='space-y-3'>
                          <div className='flex flex-col gap-1'>
                            {sale.items.map((item, idx) => (
                              <div
                                key={`${item.id || idx}`}
                                className='flex items-center justify-between text-[11px] py-2 px-1 border-b border-zinc-200/50 dark:border-zinc-800/50 last:border-0'
                              >
                                <div className='flex items-center gap-2.5 flex-1 min-w-0'>
                                  <span className='font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight truncate'>
                                    {getDisplayName(item)}
                                  </span>
                                  <div className='flex items-center gap-1.5 shrink-0'>
                                    {item.discount > 0 && (
                                      <span className='text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded'>
                                        {t.discount || 'Discount'}: {item.discount}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className='flex items-center gap-3 text-right shrink-0 ml-2'>
                                  <div className='px-1.5 py-0.5 rounded-sm bg-white dark:bg-zinc-900/60 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 border border-zinc-200/50 dark:border-zinc-700/50 tabular-nums font-mono shadow-sm'>
                                    <span>
                                      {item.batchAllocations?.[0]?.batchNumber || '---'}
                                    </span>
                                    <span className='w-px h-2 bg-[var(--bg-skeleton)]' />
                                    <span className='text-zinc-400 dark:text-zinc-500'>
                                      {item.batchAllocations?.[0]?.expiryDate
                                        ? format(
                                            new Date(item.batchAllocations[0].expiryDate),
                                            'MM/yy'
                                          )
                                        : '--/--'}
                                    </span>
                                  </div>
                                  <span className='text-[10px] text-zinc-500 dark:text-zinc-400 font-black tabular-nums uppercase tracking-widest'>
                                    x{item.quantity}
                                  </span>
                                  <span className='flex items-baseline gap-1 font-black tabular-nums'>
                                    <span className='text-zinc-900 dark:text-zinc-100 min-w-[50px] text-right'>
                                      {formatCurrencyParts(pricingService.calculateItemTotal(item), undefined, language).amount}
                                    </span>
                                    <span className='text-[9px] font-bold text-zinc-400 dark:text-zinc-500'>
                                      {formatCurrencyParts(pricingService.calculateItemTotal(item), undefined, language).symbol}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Invoice Summary Footer */}
                          <div className='pt-3 flex flex-col gap-1.5'>
                            <div dir={language === 'AR' ? 'rtl' : 'ltr'} className='flex justify-between items-center px-4 py-2 mt-1 bg-primary-700 dark:bg-primary-200 rounded-full shadow-md'>
                              <span className='text-xs font-black text-primary-100 dark:text-primary-800 uppercase tracking-widest leading-none'>
                                {t.total || 'Total'}
                              </span>
                              <span className='flex items-baseline gap-1.5 font-black text-white dark:text-primary-950 tabular-nums'>
                                <span className='text-xl leading-none'>
                                  {formatCurrencyParts(sale.total, undefined, language).amount}
                                </span>
                                <span className='text-[10px] font-bold text-primary-200 dark:text-primary-800 leading-none opacity-80'>
                                  {formatCurrencyParts(sale.total, undefined, language).symbol}
                                </span>
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
                  <p className='text-[10px] font-black uppercase tracking-widest'>
                    {t.favoritesEmpty || 'No favorites yet'}
                  </p>
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
                          <div className='w-8 h-8 rounded-lg bg-[var(--bg-skeleton)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-black text-[11px] shrink-0 border border-zinc-200/50 dark:border-zinc-700/50 tabular-nums'>
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
                            onClick={() =>
                              onAddToCart(item.internalCode || item.barcode || item.id)
                            }
                            className='flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all shadow-sm'
                            type='button'
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
