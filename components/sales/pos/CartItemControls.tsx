import React, { useEffect, useRef, useState } from 'react';
import type { UserRole } from '../../../config/permissions';
import { permissionsService } from '../../../services/auth/permissionsService';
import { pricingService } from '../../../services/sales/pricingService';
import type { CartItem, Drug } from '../../../types';
import {
  formatExpiryDate,
  getExpiryColorClass,
  parseExpiryEndOfMonth,
} from '../../../utils/expiryUtils';
import { money, pricing } from '../../../utils/money';
import { PopupAlert } from '../../common/PopupAlert';

export interface CartItemExpiryBadgeProps {
  item: CartItem;
  allBatches: Drug[];
  packItem?: CartItem;
  unitItem?: CartItem;
  t: Translations;
  showMenu: (x: number, y: number, items: any[]) => void;
  onSelectBatch: (currentItem: CartItem, newBatch: Drug, packQty: number, unitQty: number) => void;
}
// ==========================================
// 1. EXPIRY & BATCH SELECTION COMPONENT
// ==========================================
export const CartItemExpiryBadge: React.FC<CartItemExpiryBadgeProps> = ({
  item,
  allBatches,
  packItem,
  unitItem,
  t,
  showMenu,
  onSelectBatch,
}) => {
  const getUrgencyColor = () => {
    return getExpiryColorClass(item.expiryDate);
  };

  const currentExpiry = formatExpiryDate(item.expiryDate);

  return (
    <div
      className={`flex items-center rounded-lg h-6 overflow-hidden w-16 shrink-0 transition-all bg-black/[0.03] dark:bg-white/[0.05] border border-gray-100/50 dark:border-white/5`}
      title={currentExpiry}
    >
      <button
        type='button'
        className={`w-6 h-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ${getUrgencyColor()}`}
        onClick={(e) => {
          e.stopPropagation();
          const batchMenuItems = allBatches.map((batch) => ({
            label: `${formatExpiryDate(batch.expiryDate)} • ${batch.stock} ${t?.pack || 'Pack'}`,
            icon: batch.id === item.id ? 'check_circle' : undefined,
            disabled: batch.stock <= 0,
            action: () => {
              const currentPackQty = packItem ? packItem.quantity : 0;
              const currentUnitQty = unitItem ? unitItem.quantity : 0;
              onSelectBatch(item, batch, currentPackQty, currentUnitQty);
            },
          }));
          showMenu(e.clientX, e.clientY, [...batchMenuItems]);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
          event
        </span>
      </button>
      <div className='flex-1 min-w-0 h-full flex items-center justify-center pr-1'>
        <span className={`text-[10px] font-bold tabular-nums leading-none ${getUrgencyColor()}`}>
          {currentExpiry}
        </span>
      </div>
    </div>
  );
};

export interface CartItemDiscountControlProps {
  item: CartItem;
  packItem?: CartItem;
  unitItem?: CartItem;
  globalDiscount?: number;
  updateItemDiscount: (id: string, isUnit: boolean, discount: number) => void;
  setGlobalDiscount: (discount: number) => void;
}
// ==========================================
// 2. ITEM DISCOUNT CONTROL COMPONENT
// ==========================================
export const CartItemDiscountControl: React.FC<CartItemDiscountControlProps> = ({
  item,
  packItem,
  unitItem,
  globalDiscount,
  updateItemDiscount,
  setGlobalDiscount,
}) => {
  const effectiveMax = pricingService.calculateMaxDiscount(
    item.costPrice || 0,
    item.publicPrice || 0,
    item.maxDiscount
  );

  const margin = pricing.actualMargin(item.costPrice || 0, item.publicPrice || 0);

  if ((globalDiscount && globalDiscount > 0) || !permissionsService.can('sale.discount')) {
    return null;
  }

  const currentDiscount = item.discount || 0;
  const hasDiscount = currentDiscount > 0;

  return (
    <div
      title={
        permissionsService.can('reports.view_financial')
          ? `Max Discount: ${effectiveMax}%\nProfit Margin: ${margin.toFixed(1)}%`
          : `Max Discount: ${effectiveMax}%`
      }
      className={`flex items-center rounded-lg h-6 overflow-hidden transition-all w-14 shrink-0 border
        ${
          hasDiscount
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-black/[0.03] dark:bg-white/[0.05] text-gray-400 border-gray-100/50 dark:border-white/5'
        }`}
    >
      <button
        tabIndex={-1}
        onClick={() => {
          const newVal = currentDiscount === 0 ? effectiveMax : 0;
          if (packItem) updateItemDiscount(packItem.id, false, newVal);
          if (unitItem) updateItemDiscount(unitItem.id, true, newVal);
          if (newVal > 0) setGlobalDiscount(0);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-6 h-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ${
          hasDiscount ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
        }`}
      >
        <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
          percent
        </span>
      </button>
      <input
        type='number'
        value={item.discount || ''}
        placeholder='0'
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          const valid = !isNaN(val) && val >= 0;
          let finalVal = valid ? val : 0;
          if (finalVal > effectiveMax) finalVal = effectiveMax;

          if (packItem) updateItemDiscount(packItem.id, false, finalVal);
          if (unitItem) updateItemDiscount(unitItem.id, true, finalVal);
          if (finalVal > 0) setGlobalDiscount(0);
        }}
        className={`w-8 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none leading-none ${
          hasDiscount
            ? 'text-emerald-700 dark:text-emerald-300 placeholder-emerald-300'
            : 'text-gray-900 dark:text-gray-100 placeholder-gray-400'
        }`}
      />
    </div>
  );
};

export interface CartItemQuantityControlProps {
  item: CartItem;
  packItem?: CartItem;
  unitItem?: CartItem;
  hasDualMode: boolean;
  updateQuantity: (id: string, isUnit: boolean, delta: number) => void;
  addToCart: (drug: Drug, isUnitMode?: boolean, quantity?: number) => void;
  allBatches?: Drug[];
  isMobile?: boolean; // New prop for UI separation
  t: Translations;
  currentLang: string;
  cart: CartItem[];
  // Auto-split: distribute qty across batches when exceeding current batch
  onSelectBatch?: (currentItem: CartItem, newBatch: Drug, packQty: number, unitQty: number) => void;
}
// ==========================================
// 3. QUANTITY STEPPER (DESKTOP & MOBILE)
// ==========================================
export const CartItemQuantityControl: React.FC<CartItemQuantityControlProps> = ({
  item,
  packItem,
  unitItem,
  hasDualMode,
  updateQuantity,
  addToCart,
  allBatches,
  isMobile = false,
  t,
  currentLang,
  cart,
  onSelectBatch,
}) => {
  const unitsPerPack = item.unitsPerPack || 1;
  const isRTL = currentLang === 'ar';

  // stock is already stored in units (per type definition) — no multiplication needed
  const totalStockUnits = React.useMemo(() => {
    if (!allBatches || allBatches.length === 0) return item.stock || 0;
    return allBatches.reduce((sum, b) => sum + b.stock, 0);
  }, [allBatches, item.stock]);

  const formatQty = (q?: number) => (q === 0 || q === undefined ? '' : q.toString());

  const [localPack, setLocalPack] = useState(formatQty(packItem?.quantity));
  const [localUnit, setLocalUnit] = useState(formatQty(unitItem?.quantity));

  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'warning' | 'info';
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'info', message: '' });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLocalPack(formatQty(packItem?.quantity)), [packItem?.quantity]);
  useEffect(() => setLocalUnit(formatQty(unitItem?.quantity)), [unitItem?.quantity]);

  const handleQtyChange = (valStr: string, isUnit: boolean) => {
    const setLocal = isUnit ? setLocalUnit : setLocalPack;
    const target = isUnit ? unitItem : packItem;

    // Allow clearing the field for re-typing
    if (valStr === '') {
      setLocal('');
      return;
    }

    // Integer-only — reject NaN/negative
    const val = parseInt(valStr);
    if (isNaN(val) || val < 0) return;

    // Zero = remove this mode's entry from cart
    if (val === 0) {
      setLocal('');
      if (target) {
        updateQuantity(target.id, isUnit, -target.quantity);
      }
      return;
    }

    // Calculate units consumed by the OTHER mode (pack↔unit) of same drug
    const otherDrugItems = cart.filter(
      (i) =>
        i.name === item.name &&
        (i.dosageForm || '') === (item.dosageForm || '') &&
        !(i.id === item.id && !!i.isUnit === isUnit)
    );
    const unitsConsumedByOthers = otherDrugItems.reduce((sum, i) => {
      return sum + (i.isUnit ? i.quantity : i.quantity * (i.unitsPerPack || unitsPerPack));
    }, 0);

    const availableUnits = Math.max(0, totalStockUnits - unitsConsumedByOthers);
    const max = isUnit ? availableUnits : Math.floor(availableUnits / unitsPerPack);

    // REJECT if value exceeds total stock limit — don't clamp, don't change
    if (val > max) {
      setPopupState({
        isOpen: true,
        type: 'warning',
        message: t.stockLimitReached || 'لا يوجد رصيد كافي في المخزن لتلبية هذه الكمية',
        confirmText: 'حسناً',
        onConfirm: () => {
          setPopupState((prev) => ({ ...prev, isOpen: false }));
          setLocal(formatQty(target?.quantity));
        },
      });
      return;
    }

    // Auto-split OR Prevent: if qty exceeds CURRENT BATCH stock
    const currentBatchStock = item.stock || 0;
    const currentBatchMax = isUnit
      ? currentBatchStock
      : Math.floor(currentBatchStock / unitsPerPack);

    if (val > currentBatchMax) {
      const currentCartQty = isUnit ? unitItem?.quantity || 0 : packItem?.quantity || 0;
      const hasOtherBatchesInCart = cart.some(
        (i) => i.name === item.name && i.dosageForm === item.dosageForm && i.id !== item.id
      );

      // If the row is ALREADY maxed out AND there are already other batches in the cart, prevent any further increases
      // This forces the user to increase the quantities on the newly added batch rows instead of the completed one
      if (currentCartQty >= currentBatchMax && val > currentCartQty && hasOtherBatchesInCart) {
        setLocal(formatQty(target?.quantity));
        return;
      }

      if (onSelectBatch && allBatches && allBatches.length > 1) {
        setPopupState({
          isOpen: true,
          type: 'confirm',
          title: 'توزيع باقي الكمية',
          message:
            'الكمية المطلوبة غير متوفرة بالكامل في هذه التشغيلة. هل تريد استكمال الباقي من التشغيلات الأخرى؟',
          confirmText: 'توزيع الباقي',
          cancelText: 'إلغاء',
          onConfirm: () => {
            const newPackQty = isUnit ? packItem?.quantity || 0 : val;
            const newUnitQty = isUnit ? val : unitItem?.quantity || 0;
            const currentDrug =
              allBatches.find((b) => b.id === item.id) || (item as unknown as Drug);
            onSelectBatch(item, currentDrug, newPackQty, newUnitQty);
            setPopupState((prev) => ({ ...prev, isOpen: false }));
          },
          onCancel: () => {
            setLocal(formatQty(target?.quantity));
            setPopupState((prev) => ({ ...prev, isOpen: false }));
          },
        });
        return;
      }
    }

    // Normal update within current batch
    setLocal(val.toString());
    if (target) {
      updateQuantity(target.id, isUnit, val - target.quantity);
    } else if (val > 0) {
      addToCart(item, isUnit, val);
    }
  };

  const inputClass =
    'w-full h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  const currentBatchStockForStyle = item.stock || 0;
  const currentBatchMaxPacks = Math.floor(currentBatchStockForStyle / unitsPerPack);
  const currentBatchMaxUnits = currentBatchStockForStyle;
  const currentPackQty = packItem?.quantity || 0;
  const currentUnitQty = unitItem?.quantity || 0;
  const isPackMaxed = currentBatchMaxPacks > 0 && currentPackQty >= currentBatchMaxPacks;
  const isUnitMaxed = currentBatchMaxUnits > 0 && currentUnitQty >= currentBatchMaxUnits;
  const isAnyMaxed = isPackMaxed || isUnitMaxed;

  if (isMobile) {
    const renderStepper = (isUnit: boolean) => {
      const q = (isUnit ? unitItem : packItem)?.quantity || 0;
      const isMaxed = isUnit ? isUnitMaxed : isPackMaxed;
      return (
        <div
          className={`flex items-center rounded-lg h-6 overflow-hidden ${isMaxed ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500/50' : 'bg-black/[0.03] dark:bg-white/[0.05]'}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              q > 0 && updateQuantity(item.id, isUnit, -1);
            }}
            disabled={q <= 0}
            className='w-5 h-full flex items-center justify-center hover:bg-black/5 text-gray-400 active:scale-90 disabled:opacity-30'
          >
            <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
              remove
            </span>
          </button>
          <input
            type='number'
            value={isUnit ? localUnit : localPack}
            placeholder={isUnit ? 'U' : 'P'}
            min={0}
            step={1}
            onChange={(e) => handleQtyChange(e.target.value, isUnit)}
            onBlur={() =>
              (isUnit ? localUnit : localPack) === '' &&
              (isUnit ? setLocalUnit : setLocalPack)(formatQty(q))
            }
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            className={`w-6 h-full text-[10px] font-black text-center bg-transparent border-none p-0 focus:outline-none ${isMaxed ? 'text-red-600 dark:text-red-400' : ''}`}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateQuantity(item.id, isUnit, 1);
            }}
            disabled={isMaxed}
            className={`w-5 h-full flex items-center justify-center active:scale-90 ${isMaxed ? 'opacity-30 text-gray-400' : 'text-primary-600'}`}
          >
            <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
              add
            </span>
          </button>
        </div>
      );
    };
    return (
      <div className='flex items-center gap-0.5 shrink-0 relative' dir='ltr' ref={containerRef}>
        {renderStepper(false)}
        {hasDualMode && (
          <>
            <div className='w-px h-full bg-gray-100/50 dark:bg-white/5 shrink-0' />
            {renderStepper(true)}
          </>
        )}
        <PopupAlert {...popupState} anchorRef={containerRef} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex items-center rounded-lg h-6 overflow-hidden w-14 shrink-0 border ${isAnyMaxed ? 'bg-red-50 dark:bg-red-900/20 border-red-500/50' : 'bg-black/[0.03] dark:bg-white/[0.05] border-gray-100/50 dark:border-white/5'} relative`}
    >
      <div className='flex-1 h-full flex items-center min-w-0'>
        <input
          type='number'
          value={localPack}
          placeholder='P'
          min={0}
          step={1}
          onChange={(e) => handleQtyChange(e.target.value, false)}
          onBlur={() => localPack === '' && setLocalPack(formatQty(packItem?.quantity))}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          className={`${inputClass} ${isPackMaxed ? 'text-red-600 dark:text-red-400' : ''}`}
        />
      </div>
      {hasDualMode && (
        <>
          <div
            className={`w-px h-full shrink-0 ${isAnyMaxed ? 'bg-red-500/20' : 'bg-gray-100/50 dark:bg-white/5'}`}
          />
          <div className='flex-1 h-full flex items-center min-w-0'>
            <input
              type='number'
              value={localUnit}
              placeholder='U'
              min={0}
              step={1}
              title={`1 Pack = ${unitsPerPack} Units`}
              onChange={(e) => handleQtyChange(e.target.value, true)}
              onBlur={() => localUnit === '' && setLocalUnit(formatQty(unitItem?.quantity))}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              className={`${inputClass} ${isUnitMaxed ? 'text-red-600 dark:text-red-400' : ''}`}
            />
          </div>
        </>
      )}
      <PopupAlert {...popupState} anchorRef={containerRef} />
    </div>
  );
};
