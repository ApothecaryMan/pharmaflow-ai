import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import React, { useCallback, useMemo } from 'react';
import { type UserRole } from '../../../../config/permissions';
import { permissionsService } from '../../../../services/auth/permissions';
import type { CartItem, Drug, Employee, Language } from '../../../../types';
import { BUTTON_INACTIVE, CARD_MD } from '../../../../utils/themeStyles';
import { PriceDisplay } from '../../../common/TanStackTable';
import { Tooltip } from '../../../common/Tooltip';
import { SortableCartItem } from '../SortableCartItem';
import { resolvePrice } from '../../../../utils/stockOperations';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { money } from '../../../../utils/money';
import { getGroupingKey } from '../../../../services/inventory/batchService';


const cartScrollStyles = `
  .cart-scroll::-webkit-scrollbar { width: 2px; background: transparent; }
  .cart-scroll::-webkit-scrollbar-track { background: transparent; border: none; box-shadow: none; }
  .cart-scroll::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.6); border-radius: 9999px; }
  .cart-scroll::-webkit-scrollbar-corner { background: transparent; }
`;

export interface POSCartSidebarProps {
  mobileTab: 'products' | 'cart';
  setMobileTab: (tab: 'products' | 'cart') => void;
  cart: CartItem[];
  totalItems: number;
  t: any;
  cartTotal: number;
  sidebarWidth: number;
  startResizing: (e: any) => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
  cartSensors: any;
  handleCartDragEnd: (e: DragEndEvent) => void;
  mergedCartItems: any[];
  highlightedIndex: number;
  setHighlightedIndex: (idx: number) => void;
  color: string;
  showMenu: any;
  removeFromCart: any;
  toggleUnitMode: any;
  updateItemDiscount: any;
  setGlobalDiscount: any;
  updateQuantity: any;
  addToCart: any;
  removeDrugFromCart: any;
  batchesMap: Map<string, Drug[]>;
  switchBatchWithAutoSplit: any;
  currentLang: string;
  globalDiscount: number;
  setSearch: (term: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  grossSubtotal: number;
  orderDiscountPercent: number;
  hasOpenShift: boolean;
  isCheckoutMode: boolean;
  setIsCheckoutMode: (val: boolean) => void;
  isDeliveryMode: boolean;
  setIsDeliveryMode: (val: boolean) => void;
  amountPaid: string;
  setAmountPaid: (val: string) => void;
  isValidOrder: boolean;
  handleCheckout: (type: 'walk-in' | 'delivery', isDelivery?: boolean) => void;
  deliveryEmployeeId: string;
  setDeliveryEmployeeId: (id: string) => void;
  employees: Employee[];
  isRTL: boolean;
  paymentMethod: 'cash' | 'visa';
  isMobile?: boolean; // New prop for UI separation
  isProcessing?: boolean;
  taxAmount?: number;
}

export const POSCartSidebar: React.FC<POSCartSidebarProps> = React.memo(({
  mobileTab,
  setMobileTab,
  cart,
  totalItems,
  t,
  cartTotal,
  sidebarWidth,
  startResizing,
  sidebarRef,
  cartSensors,
  handleCartDragEnd,
  mergedCartItems,
  highlightedIndex,
  setHighlightedIndex,
  color,
  showMenu,
  removeFromCart,
  toggleUnitMode,
  updateItemDiscount,
  setGlobalDiscount,
  updateQuantity,
  addToCart,
  removeDrugFromCart,
  batchesMap,
  switchBatchWithAutoSplit,
  currentLang,
  globalDiscount,
  setSearch,
  searchInputRef,
  grossSubtotal,
  orderDiscountPercent,
  hasOpenShift,
  isCheckoutMode,
  setIsCheckoutMode,
  isDeliveryMode,
  setIsDeliveryMode,
  amountPaid,
  setAmountPaid,
  isValidOrder,
  handleCheckout,
  deliveryEmployeeId,
  setDeliveryEmployeeId,
  employees,
  isRTL,
  paymentMethod,
  isMobile = false,
  isProcessing = false,
  taxAmount = 0,
}) => {
  const { isOnline } = useNetworkStatus();

  const handleSearchInTable = useCallback(
    (term: string) => {
      setSearch(term);
      searchInputRef.current?.focus();
    },
    [setSearch, searchInputRef]
  );

  const packsCount = mergedCartItems.reduce((acc, g) => acc + (g.pack?.quantity || 0), 0);
  const unitsCount = mergedCartItems.reduce((acc, g) => acc + (g.unit?.quantity || 0), 0);
  const discountedCount = cart.filter(item => (item.discount || 0) > 0).length;

  // Calculate total profit margin (Accounts for item-level and global discounts)
  // Formula: Net Sale Total - Total Cost of Goods Sold
  const totalProfit = useMemo(() => {
    if (!permissionsService.can('reports.view_financial')) return 0;
    
    const cost = cart.reduce((acc, item) => {
      const unitCost = resolvePrice(item.costPrice || 0, !!item.isUnit, item.unitsPerPack);
      return money.add(acc, money.multiply(unitCost, item.quantity, 0));
    }, 0);
    return money.subtract(cartTotal, cost);
  }, [cart, cartTotal]);

  return (
    <>
      {/* Mobile Floating Cart Summary (Only in Products View) */}
      <div
        className={`lg:hidden fixed bottom-20 left-4 right-4 z-20 ${
          mobileTab === 'products' && cart.length > 0 ? 'block' : 'hidden'
        }`}
      >
        <button
          onClick={() => setMobileTab('cart')}
          className={`w-full p-3 rounded-2xl bg-primary-600 text-white shadow-xl shadow-primary-200 dark:shadow-none flex items-center justify-between animate-slide-up active:scale-95 transition-transform`}
        >
          <div className='flex items-center gap-3'>
            <span className='bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold'>
              {totalItems}
            </span>
            <span className='font-medium text-sm'>{t.viewCart}</span>
          </div>
          <span className='font-bold text-base tabular-nums'>
            <PriceDisplay value={cartTotal} />
          </span>
        </button>
      </div>

      {/* Resize Handle (Desktop Only) */}
      <div
        className='hidden lg:flex w-4 h-full items-center justify-center cursor-col-resize group z-10 -mx-2'
        onMouseDown={startResizing}
        onTouchStart={startResizing}
      >
        <div className='w-1 h-16 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-primary-500 transition-colors'></div>
      </div>

      {/* Cart Sidebar - Hidden on Mobile if Products Tab is active */}
      <div
        ref={sidebarRef}
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        className={`w-full lg:w-(--sidebar-width) ${CARD_MD} border border-gray-200 dark:border-(--border-divider) flex flex-col overflow-hidden isolate relative h-full ${
          mobileTab === 'products' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="px-4 py-3.5 border-b border-gray-200/60 dark:border-(--border-divider) bg-white/95 dark:bg-(--bg-card) backdrop-blur-xl shrink-0 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {/* Title */}
            <h2 className="text-[15px] font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight leading-none">
              {t.cartTitle}
            </h2>
            
            {/* Status & Counts in one row */}
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 tracking-wider">
              {cart.length > 0 ? (
                <>
                  <svg className="size-1.5 animate-pulse shrink-0" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="4" cy="4" r="3" className="fill-emerald-500" />
                  </svg>
                  <Tooltip content={
                    <div className="flex flex-col gap-1 py-0.5">
                      <span className="font-bold border-b border-gray-200/20 pb-0.5 mb-0.5">
                        {currentLang === 'ar' ? 'تحليل الأصناف' : 'Items Analysis'}
                      </span>
                      <div className="flex justify-between gap-4">
                        <span>{currentLang === 'ar' ? 'أنواع الأدوية:' : 'Drug Types:'}</span>
                        <span className="font-black tabular-nums">{mergedCartItems.length}</span>
                      </div>
                      {discountedCount > 0 && (
                        <div className="flex justify-between gap-4 text-emerald-400">
                          <span>{currentLang === 'ar' ? 'أصناف بخـصم:' : 'Discounted:'}</span>
                          <span className="font-black tabular-nums">{discountedCount}</span>
                        </div>
                      )}
                    </div>
                  }>
                    <span className="uppercase text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{cart.length} {t.items || 'أصناف'}</span>
                  </Tooltip>
                  <svg className="size-1 shrink-0 mx-0.5" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="3" cy="3" r="2" className="fill-gray-300 dark:fill-gray-600" />
                  </svg>
                  <Tooltip content={
                    <div className="flex flex-col gap-1 py-0.5">
                      <span className="font-bold border-b border-gray-200/20 pb-0.5 mb-0.5">
                        {currentLang === 'ar' ? 'توزيع الكمية' : 'Quantity Distribution'}
                      </span>
                      {packsCount > 0 && (
                        <div className="flex justify-between gap-4">
                          <span>{currentLang === 'ar' ? 'إجمالي العلب:' : 'Total Packs:'}</span>
                          <span className="font-black tabular-nums">{packsCount}</span>
                        </div>
                      )}
                      {unitsCount > 0 && (
                        <div className="flex justify-between gap-4">
                          <span>{currentLang === 'ar' ? 'إجمالي الوحدات/الأشرطة:' : 'Total Strips/Units:'}</span>
                          <span className="font-black tabular-nums">{unitsCount}</span>
                        </div>
                      )}
                    </div>
                  }>
                    <span className="whitespace-nowrap">{totalItems} {t.quantity || 'قطعة'}</span>
                  </Tooltip>

                  {/* Estimated Profit Display (Managers Only) */}
                  {permissionsService.can('reports.view_financial') && cart.length > 0 && totalProfit !== 0 && (
                    <>
                      <svg className="size-1 shrink-0 mx-0.5" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="3" cy="3" r="2" className="fill-gray-300 dark:fill-gray-600" />
                      </svg>
                      <Tooltip content={
                        <div className="flex flex-col gap-1 py-0.5 min-w-[120px]">
                          <span className="font-bold border-b border-emerald-200/20 pb-0.5 mb-0.5 text-emerald-400">
                            {currentLang === 'ar' ? 'صافي الربح' : 'Net Profit'}
                          </span>
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="opacity-70">{currentLang === 'ar' ? 'هامش الربح المتوقع:' : 'Exp. Margin:'}</span>
                            <span className="font-bold tabular-nums text-emerald-400">
                              {totalProfit >= 0 ? '+' : ''}<PriceDisplay value={totalProfit} />
                            </span>
                          </div>
                          <p className="text-[9px] text-gray-400 font-medium leading-tight mt-1 border-t border-gray-100/10 pt-1">
                            {currentLang === 'ar' 
                              ? 'صافي الربح بعد خصم التكلفة والخصومات.' 
                              : 'Net gain after cost and discounts.'}
                          </p>
                        </div>
                      }>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/30 whitespace-nowrap animate-in fade-in zoom-in duration-300 leading-none">
                          {totalProfit >= 0 ? '+' : ''}<PriceDisplay value={totalProfit} />
                        </span>
                      </Tooltip>
                    </>
                  )}
                </>
              ) : (
                <>
                  <svg className="size-1.5 shrink-0" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="4" cy="4" r="3" className="fill-gray-400 dark:fill-gray-500" />
                  </svg>
                  <span className="whitespace-nowrap">{t.emptyCart || 'سلة فارغة'}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Back Button */}
            <button
              onClick={() => setMobileTab('products')}
              className="lg:hidden w-9 h-9 rounded-xl bg-white dark:bg-[#3c3c3c] text-gray-500 flex items-center justify-center transition-all active:scale-95 border border-gray-200/50 dark:border-(--border-divider)"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
            </button>
          </div>
        </div>

        <div
          className={`flex-1 p-1 space-y-1 cart-scroll ${cart.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}
          dir='ltr'
        >
          <style>{cartScrollStyles}</style>
          {cart.length === 0 ? (
            <div className='h-full flex flex-col items-center justify-center text-gray-400 space-y-2'>
              <span className='material-symbols-rounded text-4xl opacity-20'>
                remove_shopping_cart
              </span>
              <p className='text-xs'>{t.emptyCart}</p>
              <button
                onClick={() => setMobileTab('products')}
                className={`lg:hidden px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium text-xs`}
              >
                {t.backToProducts}
              </button>
            </div>
          ) : (
            <DndContext
              sensors={cartSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCartDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={mergedCartItems.map((group) => group.id)}
                strategy={verticalListSortingStrategy}
              >
                {mergedCartItems.map((group, index) => {
                  const itemId = group.id;
                  return (
                    <React.Fragment key={itemId}>
                      <div
                        id={`cart-item-${index}`}
                        className='w-full'
                        onClick={() => setHighlightedIndex(index)}
                        onMouseDown={() => setHighlightedIndex(index)}
                      >
                        <SortableCartItem
                          packItem={group.pack}
                          unitItem={group.unit}
                          commonItem={group.common}
                          itemId={itemId}
                          color={color}
                          t={t}
                          showMenu={showMenu}
                          removeFromCart={removeFromCart}
                          toggleUnitMode={toggleUnitMode}
                          updateItemDiscount={updateItemDiscount}
                          setGlobalDiscount={setGlobalDiscount}
                          updateQuantity={updateQuantity}
                          addToCart={addToCart}
                          removeDrugFromCart={removeDrugFromCart}
                          allBatches={
                            (batchesMap.get(getGroupingKey(group.common)) || []).filter(b => (b.stock || 0) > 0)
                          }
                          onSelectBatch={switchBatchWithAutoSplit}
                          isHighlighted={index === highlightedIndex}
                          currentLang={currentLang as 'en' | 'ar'}
                          globalDiscount={globalDiscount}
                          onSearchInTable={handleSearchInTable}
                          isMobile={isMobile}
                        />
                      </div>
                      {index < mergedCartItems.length - 1 && (
                        <div className="h-px bg-gray-200/60 dark:bg-(--border-divider)" />
                      )}
                    </React.Fragment>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="px-4 py-4 border-t border-gray-200/60 dark:border-(--border-divider) bg-white/90 dark:bg-(--bg-card) backdrop-blur-md space-y-4 shrink-0 rounded-b-2xl">
          {/* Summary Card with Glassmorphism */}
          <div className="bg-(--bg-surface-neutral) dark:bg-(--bg-surface-neutral) rounded-2xl p-3 border border-gray-200/50 dark:border-(--border-divider) space-y-2.5">
            {/* Subtotal Row */}
            {grossSubtotal !== cartTotal && (
              <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                <span className="opacity-70">{t.subtotal}</span>
                <span className="tabular-nums font-black text-xs text-gray-700 dark:text-gray-300">
                  <PriceDisplay value={grossSubtotal} />
                </span>
              </div>
            )}

            {/* Tax Row */}
            {taxAmount !== undefined && taxAmount > 0 && (
              <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                <span className="opacity-70">{t.tax || 'Tax'}</span>
                <span className="tabular-nums font-black text-xs text-gray-700 dark:text-gray-300">
                  <PriceDisplay value={taxAmount} />
                </span>
              </div>
            )}

            {/* Subtle Divider (only if subtotal, discount, or tax exists) */}
            {(grossSubtotal !== cartTotal || orderDiscountPercent > 0 || (taxAmount || 0) > 0) && (
              <div className="h-px bg-gray-200/50 dark:bg-gray-700/50 -mx-1" />
            )}

            {/* Total Row */}
            <div className="flex items-center justify-between group">
              <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                {t.total}
              </span>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-primary-600 dark:text-primary-400 tabular-nums tracking-tighter transition-all">
                  <PriceDisplay value={cartTotal} />
                </span>
              </div>
            </div>
          </div>

          {/* Checkout Area Container */}
          {!isOnline ? (
            <div className='flex h-[42px] items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30'>
              <p className='text-xs font-bold text-red-600 dark:text-red-400 text-center px-2'>
                ⚠️ أنت غير متصل بالإنترنت. لا يمكن إتمام المبيعات حالياً.
              </p>
            </div>
          ) : !hasOpenShift ? (
            <div className='flex h-[42px] items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900'>
              <div className='flex items-center gap-2 text-red-700 dark:text-red-300'>
                <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                  warning
                </span>
                <p className='text-xs font-medium'>
                  {t.noOpenShift || 'Open a shift before completing sales'}
                </p>
              </div>
            </div>
          ) : (
            <div className='flex h-[42px] overflow-hidden'>
              {/* Standard Mode - Shrinks to 0 width when checkout or delivery active */}
              <div
                className={`flex gap-2 transition-[width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isCheckoutMode || isDeliveryMode
                    ? 'w-0 opacity-0 overflow-hidden'
                    : 'w-full opacity-100'
                }`}
              >
                <button
                  onClick={() => {
                    setIsCheckoutMode(true);
                    setIsDeliveryMode(false);
                    setAmountPaid('');
                  }}
                  disabled={
                    !isValidOrder || !hasOpenShift || !permissionsService.can('sale.checkout') || isProcessing
                  }
                  className={`flex-1 py-2.5 rounded-xl ${
                    !isValidOrder || !hasOpenShift || !permissionsService.can('sale.checkout') || isProcessing
                      ? BUTTON_INACTIVE
                      : paymentMethod === 'visa' 
                        ? 'bg-primary-600 hover:bg-blue-700 text-white cursor-pointer' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  } font-bold text-sm transition-colors flex justify-center items-center gap-2 whitespace-nowrap`}>
                  {!isMobile && (
                    <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                      {paymentMethod === 'visa' ? 'credit_card' : 'payments'}
                    </span>
                  )}
                  {t.completeOrder}
                </button>
                {!isMobile && (
                  <button
                    onClick={() => {
                      setIsDeliveryMode(true);
                      setIsCheckoutMode(false);
                    }}
                    disabled={
                      !isValidOrder || !hasOpenShift || !permissionsService.can('sale.checkout') || isProcessing
                    }
                    className={`w-12 py-2.5 rounded-xl ${
                      !isValidOrder || !hasOpenShift || !permissionsService.can('sale.checkout') || isProcessing
                        ? BUTTON_INACTIVE
                        : 'bg-emerald-100 dark:bg-[#3c3c3c] border border-(--border-divider) text-emerald-700 dark:text-gray-300 cursor-pointer'
                    } transition-colors flex justify-center items-center shrink-0`}
                    title={t.deliveryOrder}>
                    <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                      local_shipping
                    </span>
                  </button>
                )}
              </div>

              {/* Checkout Mode - Expands from 0 to full width */}
              <div
                className={`flex gap-2 items-stretch transition-[width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isCheckoutMode ? 'w-full opacity-100' : 'w-0 opacity-0 overflow-hidden'
                }`}>
                {/* Amount Input */}
                <div
                  className={`flex-1 bg-white dark:bg-gray-900 border border-primary-500 dark:border-primary-400 rounded-xl flex items-center px-3 gap-1 overflow-hidden whitespace-nowrap`}>
                  <input
                    ref={(el) => {
                      if (el && isCheckoutMode) setTimeout(() => el.focus(), 50);
                    }}
                    type='number'
                    inputMode='tel'
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={cartTotal.toString()}
                    className='flex-1 min-w-0 bg-transparent border-none focus:outline-hidden focus:ring-0 font-bold text-base text-gray-900 dark:text-white p-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (isProcessing) return;
                        handleCheckout('walk-in');
                      }
                      if (e.key === 'Escape') {
                        setIsCheckoutMode(false);
                        setAmountPaid('');
                      }
                    }}
                  />
                </div>

                {/* Change Display */}
                <div
                  className={`flex flex-col justify-center px-2 rounded-xl border min-w-[70px] transition-colors overflow-hidden whitespace-nowrap ${
                    money.toSmallestUnit(parseFloat(amountPaid) || 0) >= cartTotal
                      ? `bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700`
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                  <span className='text-[8px] text-gray-500 uppercase font-bold text-center'>
                    {t.remainder || 'Change'}
                  </span>
                  <span
                    className={`text-sm font-bold text-center tabular-nums ${
                      money.isGte(parseFloat(amountPaid) || 0, cartTotal)
                        ? `text-primary-600 dark:text-primary-400`
                        : 'text-gray-400'
                    }`}>
                    <PriceDisplay value={Math.max(0, money.subtract(parseFloat(amountPaid) || 0, cartTotal))} />
                  </span>
                </div>

                {/* Confirm Button */}
                  <button
                    onClick={() => {
                      if (isProcessing) return;
                      handleCheckout('walk-in');
                    }}
                    disabled={isProcessing}
                    className={`w-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors shrink-0 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isProcessing ? (
                      <span className='material-symbols-rounded animate-spin text-sm'>sync</span>
                    ) : (
                      <span className='material-symbols-rounded'>check</span>
                    )}
                  </button>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setIsCheckoutMode(false);
                    setAmountPaid('');
                  }}
                  className='w-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center transition-colors shrink-0'>
                  <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                    close
                  </span>
                </button>
              </div>

              {/* Delivery Driver Mode - Expands from 0 to full width */}
              <div
                className={`flex gap-2 items-stretch transition-[width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isDeliveryMode ? 'w-full opacity-100' : 'w-0 opacity-0 overflow-hidden'
                }`}>
                {/* Driver Select */}
                <div className='flex-1 overflow-hidden relative'>
                  <select
                    value={deliveryEmployeeId}
                    onChange={(e) => setDeliveryEmployeeId(e.target.value)}
                    className={`w-full h-full bg-white dark:bg-gray-900 border border-primary-400 dark:border-primary-500/50 rounded-xl text-sm px-3 focus:ring-0 focus:outline-hidden appearance-none cursor-pointer font-bold tabular-nums transition-all`}
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: isRTL ? 'left .7em top 50%' : 'right .7em top 50%',
                      backgroundSize: '.65em auto',
                    }}>
                    <option value=''>{t.selectDriver || 'Select Driver (Optional)'}</option>
                    {employees
                      .filter((e) => e.role === 'delivery')
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Confirm Button */}
                  <button
                    onClick={() => {
                      if (isProcessing) return;
                      handleCheckout('delivery', true);
                    }}
                    disabled={isProcessing}
                    className={`w-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors shrink-0 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isProcessing ? (
                      <span className='material-symbols-rounded animate-spin text-sm'>sync</span>
                    ) : (
                      <span className='material-symbols-rounded'>check</span>
                    )}
                  </button>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setIsDeliveryMode(false);
                  }}
                  className='w-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center transition-colors shrink-0'>
                  <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                    close
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

POSCartSidebar.displayName = 'POSCartSidebar';
