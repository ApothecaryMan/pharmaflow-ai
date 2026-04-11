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

// --- Sub-components for better organization and smaller code size ---

const SmartQuantityBadge: React.FC<{
  packQty: number;
  unitQty: number;
  hasDiscount: boolean;
  avgDiscount: number;
  language: string;
}> = ({ packQty, unitQty, hasDiscount, avgDiscount, language }) => (
  <div className={`relative ${packQty > 0 && unitQty > 0 ? 'w-[52px]' : 'w-10'} h-10 shrink-0 group`}>
    {hasDiscount && (
      <div className='absolute -top-1 -right-1 z-20 flex items-center justify-center'>
        <div className='absolute w-2 h-2 bg-emerald-500 rounded-full shadow-sm' />
        <div className='opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300 pointer-events-none'>
          <div className='bg-emerald-500 dark:bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg ring-2 ring-white dark:ring-gray-900 whitespace-nowrap -translate-y-1 translate-x-1'>
            {avgDiscount}%
          </div>
        </div>
      </div>
    )}
    <div className='flex w-full h-full bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden group-hover:border-primary-500/30 group-hover:shadow-lg group-hover:shadow-primary-500/5 transition-all duration-300'>
      {packQty > 0 && (
        <div className={`flex flex-col items-center justify-center flex-1 leading-none ${unitQty > 0 ? 'border-r border-gray-200/50 dark:border-white/5' : ''}`}>
          <span className='text-[13px] font-black text-gray-900 dark:text-white tabular-nums'>{packQty}</span>
          <span className='text-[7px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5'>{language === 'AR' ? 'علبة' : 'BOX'}</span>
        </div>
      )}
      {unitQty > 0 && (
        <div className='flex flex-col items-center justify-center flex-1 leading-none'>
          <span className='text-[12px] font-black text-primary-600 dark:text-primary-400 tabular-nums'>{unitQty}</span>
          <span className='text-[7px] font-black text-primary-600/60 dark:text-primary-400/60 uppercase tracking-wider mt-0.5'>{language === 'AR' ? 'وحدة' : 'UNIT'}</span>
        </div>
      )}
    </div>
  </div>
);

const StatCapsule: React.FC<{
  label: string;
  value: string;
  icon: string;
  variant?: 'default' | 'success';
  side?: 'start' | 'end' | 'full';
}> = ({ label, value, icon, variant = 'default', side = 'full' }) => {
  const isSuccess = variant === 'success';
  const roundedClasses = side === 'start' ? 'rounded-s-2xl rounded-e-sm' : side === 'end' ? 'rounded-e-2xl rounded-s-sm' : 'rounded-2xl';
  const bgClasses = isSuccess ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10' : 'bg-gray-50 dark:bg-white/[0.03] border-gray-100 dark:border-white/5';
  const textClasses = isSuccess ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-900 dark:text-gray-100';

  return (
    <div className={`flex-1 flex items-center justify-between gap-2 px-3 py-2 border ${bgClasses} ${roundedClasses}`}>
      <div className={`flex items-center gap-1.5 ${isSuccess ? 'opacity-80' : 'opacity-50'} ${textClasses}`}>
        <span className='material-symbols-rounded text-[14px]'>{icon}</span>
        <span className='text-[9px] font-bold uppercase tracking-wider'>{label}</span>
      </div>
      <span className={`text-[13px] font-black tabular-nums ${textClasses}`}>{value}</span>
    </div>
  );
};

const ModificationItem: React.FC<{
  mod: any;
  textTransform: any;
  t: any;
}> = ({ mod, textTransform, t }) => {
  const typeColors: Record<string, string> = {
    item_removed: 'text-rose-500',
    item_added: 'text-emerald-500',
    default: 'text-indigo-500',
  };
  const icon = mod.type === 'item_removed' ? 'remove_circle' : mod.type === 'item_added' ? 'add_circle' : 'edit_square';
  const colorClass = typeColors[mod.type] || typeColors.default;

  return (
    <div className='text-[11px] text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-50 dark:bg-white/[0.03] px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-white/5' dir='ltr'>
      <div className='flex items-center gap-2.5 overflow-hidden'>
        <span className={`material-symbols-rounded text-[16px] shrink-0 ${colorClass}`}>{icon}</span>
        <span className='font-bold text-gray-900 dark:text-gray-200 truncate max-w-[140px]'>
          {getDisplayName({ name: mod.itemName, dosageForm: mod.dosageForm }, textTransform)}
        </span>
      </div>
      <div className='whitespace-nowrap font-medium flex items-center gap-1.5 shrink-0 uppercase tracking-tighter'>
        {mod.type === 'item_removed' ? (
          <span className='text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded text-[9px] font-black'>{t.modal.removed || 'Removed'}</span>
        ) : mod.type === 'quantity_update' || mod.type === 'discount_update' ? (
          <div className='flex items-center gap-1 text-[10px]'>
            <span className='opacity-40'>{mod.type === 'quantity_update' ? mod.previousQuantity : `${mod.previousDiscount}%`}</span>
            <span className='material-symbols-rounded text-[12px] opacity-20'>arrow_forward</span>
            <span className='font-black text-indigo-600 dark:text-indigo-400'>{mod.type === 'quantity_update' ? mod.newQuantity : `${mod.newDiscount}%`}</span>
          </div>
        ) : (
          <div className='flex items-center gap-1.5'>
            <span className='text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] font-black'>{t.modal.added || 'Added'}</span>
            <span className='font-black text-emerald-600 dark:text-emerald-400'>({mod.newQuantity})</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ListWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex flex-col gap-0.5 ${className}`}>{children}</div>
);

const ListItem: React.FC<{
  index: number;
  total: number;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ index, total, children, className = '', onClick }) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const rounding = isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-t-2xl rounded-b-md' : isLast ? 'rounded-b-2xl rounded-t-md' : 'rounded-md';
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-1.5 px-3 bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 transition-all ${rounding} ${className}`}
    >
      {children}
    </div>
  );
};

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  sale, isOpen, onClose, t, language, color, textTransform,
  currentShift, currentEmployeeId, currentDailyRefunds = 0, onProcessReturn,
}) => {
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');

  if (!sale) return null;

  const bdr = 'border-gray-100 dark:border-white/5';
  const labelText = 'text-[9px] font-bold uppercase tracking-wider opacity-50';

  const handlePrint = () => {
    printInvoice(sale, { ...getActiveReceiptSettings(), language: language as 'EN' | 'AR' });
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !returnModalOpen} onClose={onClose} size='lg' title={t.modal.title}
        icon='receipt_long' className='overscroll-contain' tabs={[
          { label: t.modal.items || 'Items', value: 'items', icon: 'list' },
          { label: t.modal.modificationHistory || 'History', value: 'history', icon: 'history' },
        ]} activeTab={activeTab} onTabChange={setActiveTab}
      >
        <div className='space-y-4'>
          <ListWrapper>
            {[
              { label: t.modal.date, icon: 'calendar_today', value: (() => {
                  const d = new Date(sale.date);
                  let timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, numberingSystem: 'latn' });
                  if (language === 'AR') timeStr = timeStr.replace('AM', 'ص').replace('PM', 'م');
                  return (
                    <div className='flex items-center gap-1.5'>
                      <span>{d.toLocaleDateString('en-US')}</span>
                      <span className='opacity-30'>•</span>
                      <span>{timeStr}</span>
                    </div>
                  );
                })()
              },
              { label: t.modal.id, icon: 'tag', value: (
                  <div className='flex items-center gap-2'>
                    {sale.status && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border font-bold uppercase tracking-wider ${
                        sale.status === 'completed' ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/5' :
                        'border-primary-500/50 text-primary-500 bg-primary-500/5'
                      }`}>
                        {(language === 'AR' ? { 'completed': 'مكتمل', 'cancelled': 'ملغي' }[sale.status] : sale.status.toUpperCase()) || sale.status}
                      </span>
                    )}
                    <span className='font-mono'>{sale.serialId || sale.id}</span>
                  </div>
                )
              },
              { label: t.modal.customer, icon: 'person', value: (
                  <div className='flex items-center gap-1.5 truncate'>
                    <span className='font-bold'>{sale.customerName || 'Guest'}</span>
                    {sale.customerCode && <><span className='opacity-30'>•</span><span className='text-xs'>{sale.customerCode}</span></>}
                  </div>
                )
              },
              { label: t.modal.payment, icon: 'payments', value: sale.paymentMethod === 'visa' ? t.visa : t.cash }
            ].map((item, i, arr) => (
              <ListItem key={i} index={i} total={arr.length}>
                <div className='flex items-center gap-2 shrink-0'><span className='material-symbols-rounded text-base opacity-40'>{item.icon}</span><span className={labelText}>{item.label}</span></div>
                <div className='text-[12px] font-bold text-right pl-2'>{item.value}</div>
              </ListItem>
            ))}
          </ListWrapper>

          <div>
            {activeTab === 'items' ? (
              <>
                <div className='pt-1'>
                  <p className='text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest'>{t.modal.items}</p>
                  <ListWrapper>
                    {(() => {
                      const groups: Record<string, any> = {};
                      sale.items.forEach((item, idx) => {
                        const g = groups[item.id] ||= { id: item.id, name: item.name, dosageForm: item.dosageForm, packQty: 0, unitQty: 0, totalPrice: 0, originalPrice: 0, returnedQty: 0, unitsPerPack: item.unitsPerPack || 1, itemBasePrice: item.price };
                        const isUnit = item.isUnit;
                        const price = isUnit ? item.price / (item.unitsPerPack || 1) : item.price;
                        const ret = sale.itemReturnedQuantities?.[`${item.id}_${idx}`] || sale.itemReturnedQuantities?.[item.id] || 0;
                        if (isUnit) g.unitQty += item.quantity; else g.packQty += item.quantity;
                        const realQty = item.quantity - ret;
                        g.totalPrice += realQty * price * (1 - (item.discount || 0) / 100);
                        g.originalPrice += realQty * price;
                        g.returnedQty += ret;
                      });

                      const groupList = Object.values(groups);
                      return groupList.map((g: any, i) => {
                        const hasRet = g.returnedQty > 0;
                        const isFullRet = g.returnedQty >= (g.packQty + g.unitQty);
                        const hasDisc = g.originalPrice > g.totalPrice + 0.01;
                        const disc = hasDisc ? Math.round(((g.originalPrice - g.totalPrice) / g.originalPrice) * 100) : 0;

                        return (
                          <ListItem key={g.id} index={i} total={groupList.length} className={hasRet ? '!bg-orange-50/30 !border-orange-500/20' : ''}>
                            <div className='flex justify-between items-center w-full min-w-0' dir='ltr'>
                              <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                                <SmartQuantityBadge packQty={g.packQty} unitQty={g.unitQty} hasDiscount={hasDisc} avgDiscount={disc} language={language} />
                                <div className='text-left min-w-0 flex-1 py-0.5'>
                                  <p className='font-bold truncate text-[13px]'>{getDisplayName({ name: g.name, dosageForm: g.dosageForm }, textTransform)}</p>
                                  {!permissionsService.can('sale.view_assigned_only') && (
                                    <div className='text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5'>
                                      <span>${g.itemBasePrice.toFixed(2)}</span>
                                      {hasDisc && <span className='px-1 rounded bg-green-500/10 text-green-600 font-black text-[9px]'>-{disc}%</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className='text-right flex flex-col items-end shrink-0 pl-1'>
                                {hasRet && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 mb-1 ${isFullRet ? 'bg-red-100/80 text-red-600' : 'bg-orange-100/80 text-orange-600'}`}>
                                    <span className='material-symbols-rounded text-[13px]'>{isFullRet ? 'assignment_return' : 'replay'}</span>
                                    {isFullRet ? (language === 'AR' ? 'مرتجع كلي' : 'FULL RETURN') : (language === 'AR' ? `مرتجع (${g.returnedQty})` : `RET (${g.returnedQty})`)}
                                  </span>
                                )}
                                {!isFullRet && (
                                  <div className='flex flex-col items-end leading-tight'>
                                    <span className='font-bold'>${g.totalPrice.toFixed(2)}</span>
                                    {hasDisc && <span className='text-[9px] text-gray-400 line-through opacity-60'>${g.originalPrice.toFixed(2)}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </ListItem>
                        );
                      });
                    })()}
                  </ListWrapper>
                </div>

                <div className={`mt-5 pt-5 border-t ${bdr} space-y-3`}>
                  {sale.subtotal !== undefined && sale.subtotal !== sale.total && !permissionsService.can('sale.view_assigned_only') && (
                    <div className='flex justify-between items-center text-[13px] text-gray-500 px-1'>
                      <div className='flex items-center gap-2'><span className='material-symbols-rounded text-base opacity-40'>payments</span><span>{t.modal.subtotal}</span></div>
                      <span className='font-medium'>${sale.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {(() => {
                    const hasDel = Number(sale.deliveryFee) > 0;
                    const sav = (sale.subtotal || 0) + (sale.deliveryFee || 0) - sale.total;
                    const hasSav = sav > 0.01;
                    if (!hasDel && !hasSav) return null;
                    return (
                      <div className='flex items-stretch gap-1'>
                        {hasDel && <StatCapsule label={t.pos?.deliveryOrder || t.deliveryFee || 'Delivery'} value={`+$${sale.deliveryFee!.toFixed(2)}`} icon='delivery_dining' side={hasSav ? 'start' : 'full'} />}
                        {hasSav && <StatCapsule label={language === 'AR' ? 'إجمالي الخصم' : 'Savings'} value={`-$${sav.toFixed(2)}`} icon='savings' variant='success' side={hasDel ? 'end' : 'full'} />}
                      </div>
                    );
                  })()}
                  <div className={`flex justify-between items-center py-4 px-4 bg-gray-100/50 dark:bg-white/[0.03] rounded-2xl border ${bdr}`}>
                    <span className='font-bold text-[15px]'>{language === 'AR' ? 'الإجمالي النهائي' : t.modal.total}</span>
                    <span className='text-2xl font-black tabular-nums tracking-tight'>${sale.total.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className='pt-1'>
                <div className='flex items-center gap-2 mb-3'><span className='material-symbols-rounded text-base text-gray-400'>history</span><p className={labelText}>{t.modal.modificationHistory || 'History'}</p></div>
                {sale.modificationHistory?.length ? (
                  <ListWrapper>
                    {sale.modificationHistory.slice().reverse().map((r, i, arr) => (
                      <ListItem key={i} index={i} total={arr.length} className='flex-col !items-stretch py-3'>
                        <div className='flex justify-between items-center mb-2.5'>
                          <div className='flex items-center gap-1.5'><div className='w-6 h-6 rounded-full bg-primary-500/10 flex items-center justify-center'><span className='material-symbols-rounded text-primary-500 text-xs'>person</span></div><span className='text-[11px] font-bold'>{r.modifiedBy}</span></div>
                          <span className='text-[9px] text-gray-400 font-mono bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded'>{new Date(r.timestamp).toLocaleString('en-US', { numberingSystem: 'latn', hour12: true, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className='flex flex-col gap-1.5'>
                          {r.modifications.map((m, mi) => <ModificationItem key={mi} mod={m} textTransform={textTransform} t={t} />)}
                        </div>
                      </ListItem>
                    ))}
                  </ListWrapper>
                ) : (
                  <div className='flex flex-col items-center justify-center py-12 text-gray-400'><span className='material-symbols-rounded text-4xl mb-2 opacity-20'>history</span><p className='text-xs'>{t.modal.noHistory || 'No history'}</p></div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`pt-4 border-t ${bdr} flex gap-3 mt-0`}>
          {(() => {
            const hasRet = sale.items.some((it, i) => (sale.itemReturnedQuantities?.[`${it.id}_${i}`] || sale.itemReturnedQuantities?.[it.id] || 0) < it.quantity);
            const inShift = !!currentShift && new Date(sale.date) >= new Date(currentShift.openTime);
            const canRef = onProcessReturn && permissionsService.can('sale.refund') && !(sale.saleType === 'delivery' && sale.status !== 'completed') && (permissionsService.getEffectiveRole() !== 'cashier' || inShift);
            return (
              <>
                {hasRet && canRef && (
                  <button onClick={() => setReturnModalOpen(true)} className='flex-1 py-3 rounded-full font-bold text-white bg-orange-600 hover:opacity-90 cursor-pointer transition-opacity flex items-center justify-center gap-2'>
                    <span className='material-symbols-rounded text-base'>assignment_return</span>{t.returns?.processReturn || 'Return'}
                  </button>
                )}
                <button onClick={handlePrint} className='flex-1 py-3 rounded-full font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-center gap-2'>
                  <span className='material-symbols-rounded text-base'>print</span>{t.modal.print}
                </button>
              </>
            );
          })()}
        </div>
      </Modal>

      {returnModalOpen && onProcessReturn && (
        <ReturnModal
          isOpen={returnModalOpen} sale={sale} onClose={() => setReturnModalOpen(false)}
          onConfirm={(d) => { onProcessReturn(d); setReturnModalOpen(false); onClose(); }}
          color={color} t={t} language={language} currentDailyRefunds={currentDailyRefunds} currentShift={currentShift} currentEmployeeId={currentEmployeeId}
        />
      )}
    </>
  );
};
