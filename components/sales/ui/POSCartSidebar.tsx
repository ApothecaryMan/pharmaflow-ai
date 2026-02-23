import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type React from 'react';
import { canPerformAction, type UserRole } from '../../../config/permissions';
import type { CartItem, Drug, Employee, Language } from '../../../types';
import { CARD_MD } from '../../../utils/themeStyles';
import { PriceDisplay } from '../../common/TanStackTable';
import { SortableCartItem } from '../SortableCartItem';

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
  inventory: Drug[];
  switchBatchWithAutoSplit: any;
  currentLang: string;
  globalDiscount: number;
  setSearch: (term: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  userRole: UserRole;
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
}

export const POSCartSidebar: React.FC<POSCartSidebarProps> = ({
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
  inventory,
  switchBatchWithAutoSplit,
  currentLang,
  globalDiscount,
  setSearch,
  searchInputRef,
  userRole,
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
}) => {
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
        <div className='w-1 h-16 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors'></div>
      </div>

      {/* Cart Sidebar - Hidden on Mobile if Products Tab is active */}
      <div
        ref={sidebarRef}
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        className={`w-full lg:w-(--sidebar-width) ${CARD_MD} border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden h-full ${
          mobileTab === 'products' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className='p-3 space-y-2 shrink-0'>
          <div className='flex items-center justify-between'>
            <h2
              className={`text-sm font-bold text-primary-900 dark:text-primary-100 flex items-center gap-2`}
            >
              <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                shopping_cart
              </span>
              {t.cartTitle}
              {totalItems > 0 && (
                <span
                  className={`bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-1.5 rounded-full min-w-[30px] h-[18px] inline-flex justify-center items-center`}
                >
                  {totalItems}
                </span>
              )}
            </h2>

            {/* Mobile Back Button */}
            <button
              onClick={() => setMobileTab('products')}
              className='lg:hidden p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
            >
              <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        <div
          className={`flex-1 p-2 space-y-2 cart-scroll ${cart.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}
          dir='ltr'
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.6) transparent',
          }}
        >
          <style>{`
              .cart-scroll::-webkit-scrollbar {
                  width: 2px;
                  background: transparent;
              }
              .cart-scroll::-webkit-scrollbar-track {
                  background: transparent;
                  border: none;
                  box-shadow: none;
              }
              .cart-scroll::-webkit-scrollbar-thumb {
                  background: rgba(156, 163, 175, 0.6);
                  border-radius: 9999px;
              }
              .cart-scroll::-webkit-scrollbar-corner {
                  background: transparent;
              }
          `}</style>
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
            >
              <SortableContext
                items={mergedCartItems.map((group) => group.id)}
                strategy={verticalListSortingStrategy}
              >
                {mergedCartItems.map((group, index) => {
                  const itemId = group.id;
                  return (
                    <div
                      key={itemId}
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
                        allBatches={inventory
                          .filter(
                            (d) =>
                              d.name === group.common.name &&
                              d.dosageForm === group.common.dosageForm
                          )
                          .sort(
                            (a, b) =>
                              new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
                          )}
                        onSelectBatch={switchBatchWithAutoSplit}
                        isHighlighted={index === highlightedIndex}
                        currentLang={currentLang as 'en' | 'ar'}
                        globalDiscount={globalDiscount}
                        onSearchInTable={(term) => {
                          setSearch(term);
                          searchInputRef.current?.focus();
                        }}
                        userRole={userRole}
                      />
                    </div>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className='px-3 py-2 border-t border-gray-200 dark:border-gray-800 space-y-2 shrink-0'>
          {/* Summary Row - Horizontal Layout like Purchases */}
          <div className='flex items-center justify-between gap-2'>
            {
              /* Subtotal - Only show if different from total (i.e. if there's a discount or fee) */
              grossSubtotal !== cartTotal && (
                <div className='flex items-center gap-2 ps-3'>
                  <span className='text-[10px] text-gray-500 font-medium uppercase'>
                    {t.subtotal}:
                  </span>
                  <span className='font-medium text-sm text-gray-700 dark:text-gray-300 tabular-nums'>
                    <PriceDisplay value={grossSubtotal} />
                  </span>
                </div>
              )
            }

            {/* Discount */}
            {/* Discount - Only show if > 0 */}
            {orderDiscountPercent > 0 && (
              <div className='flex items-center gap-2 border-s border-gray-200 dark:border-gray-700 ps-3'>
                <span className='text-[10px] text-gray-500 font-medium uppercase'>
                  {t.orderDiscount}:
                </span>

                {/* Order Discount % */}
                <div className='flex items-center gap-1'>
                  <span className='font-medium text-sm text-gray-700 dark:text-gray-300 tabular-nums'>
                    {orderDiscountPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Total */}
            <div className='flex items-center gap-2 border-s border-gray-200 dark:border-gray-700 ps-3'>
              <span className='text-xs text-gray-500 font-bold uppercase whitespace-nowrap'>
                {t.total}:
              </span>
              <span
                className={`text-2xl font-black text-primary-600 dark:text-primary-400 h-8 flex items-center tabular-nums`}
              >
                <PriceDisplay value={cartTotal} />
              </span>
            </div>
          </div>

          {/* Checkout Area Container */}
          {!hasOpenShift ? (
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
                    !isValidOrder || !hasOpenShift || !canPerformAction(userRole, 'sale.checkout')
                  }
                  className={`flex-1 py-2.5 rounded-xl bg-primary-600 enabled:hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm transition-colors flex justify-center items-center gap-2 whitespace-nowrap`}
                >
                  <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                    payments
                  </span>
                  {t.completeOrder}
                </button>
                <button
                  onClick={() => {
                    setIsDeliveryMode(true);
                    setIsCheckoutMode(false);
                  }}
                  disabled={
                    !isValidOrder || !hasOpenShift || !canPerformAction(userRole, 'sale.checkout')
                  }
                  className={`w-12 py-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 enabled:hover:bg-primary-200 dark:enabled:hover:bg-primary-900/50 disabled:opacity-50 disabled:pointer-events-none transition-colors flex justify-center items-center shrink-0`}
                  title={t.deliveryOrder}
                >
                  <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>
                    local_shipping
                  </span>
                </button>
              </div>

              {/* Checkout Mode - Expands from 0 to full width */}
              <div
                className={`flex gap-2 items-stretch transition-[width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isCheckoutMode ? 'w-full opacity-100' : 'w-0 opacity-0 overflow-hidden'
                }`}
              >
                {/* Amount Input */}
                <div
                  className={`flex-1 bg-white dark:bg-gray-900 border border-primary-500 dark:border-primary-400 rounded-xl flex items-center px-3 gap-1 overflow-hidden whitespace-nowrap shadow-xs`}
                >
                  <input
                    ref={(el) => {
                      if (el && isCheckoutMode) setTimeout(() => el.focus(), 50);
                    }}
                    type='number'
                    inputMode='decimal'
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={cartTotal.toString()}
                    className='flex-1 min-w-0 bg-transparent border-none focus:outline-hidden focus:ring-0 font-bold text-base text-gray-900 dark:text-white p-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCheckout('walk-in');
                        setIsCheckoutMode(false);
                        setAmountPaid('');
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
                    (parseFloat(amountPaid) || 0) >= cartTotal
                      ? `bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700`
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <span className='text-[8px] text-gray-500 uppercase font-bold text-center'>
                    {t.remainder || 'Change'}
                  </span>
                  <span
                    className={`text-sm font-bold text-center tabular-nums ${
                      (parseFloat(amountPaid) || 0) >= cartTotal
                        ? `text-primary-600 dark:text-primary-400`
                        : 'text-gray-400'
                    }`}
                  >
                    <PriceDisplay value={Math.max(0, (parseFloat(amountPaid) || 0) - cartTotal)} />
                  </span>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={() => {
                    handleCheckout('walk-in');
                    setIsCheckoutMode(false);
                    setAmountPaid('');
                  }}
                  className={`w-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors shrink-0`}
                >
                  <span className='material-symbols-rounded'>check</span>
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setIsCheckoutMode(false);
                    setAmountPaid('');
                  }}
                  className='w-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center transition-colors shrink-0'
                >
                  <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                    close
                  </span>
                </button>
              </div>

              {/* Delivery Driver Mode - Expands from 0 to full width */}
              <div
                className={`flex gap-2 items-stretch transition-[width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isDeliveryMode ? 'w-full opacity-100' : 'w-0 opacity-0 overflow-hidden'
                }`}
              >
                {/* Driver Select */}
                <div className={`flex-1 overflow-hidden relative`}>
                  <select
                    value={deliveryEmployeeId}
                    onChange={(e) => setDeliveryEmployeeId(e.target.value)}
                    className={`w-full h-full bg-white dark:bg-gray-900 border border-primary-400 dark:border-primary-500/50 rounded-xl text-sm px-3 focus:ring-0 focus:outline-hidden appearance-none cursor-pointer font-bold tabular-nums shadow-xs transition-all`}
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: isRTL ? 'left .7em top 50%' : 'right .7em top 50%',
                      backgroundSize: '.65em auto',
                    }}
                  >
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
                    handleCheckout('delivery', true);
                    setIsDeliveryMode(false);
                  }}
                  className={`w-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors shrink-0`}
                >
                  <span className='material-symbols-rounded'>check</span>
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setIsDeliveryMode(false);
                  }}
                  className='w-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 flex items-center justify-center transition-colors shrink-0'
                >
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
};
