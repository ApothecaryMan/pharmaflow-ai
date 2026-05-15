import React, { useState, useEffect } from 'react';
import { type UserRole } from '../../../config/permissions';
import { permissionsService } from '../../../services/auth/permissionsService';
import type { CartItem, Drug } from '../../../types';
import { formatExpiryDate, parseExpiryEndOfMonth, getExpiryColorClass } from '../../../utils/expiryUtils';
import { money, pricing } from '../../../utils/money';
import { pricingService } from '../../../services/sales/pricingService';

export interface CartItemExpiryBadgeProps {
  item: CartItem;
  allBatches: Drug[];
  packItem?: CartItem;
  unitItem?: CartItem;
  t: any;
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
        type="button"
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
        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
          event
        </span>
      </button>
      <div className="flex-1 min-w-0 h-full flex items-center justify-center pr-1">
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
      title={permissionsService.can('reports.view_financial') 
        ? `Max Discount: ${effectiveMax}%\nProfit Margin: ${margin.toFixed(1)}%`
        : `Max Discount: ${effectiveMax}%`}
      className={`flex items-center rounded-lg h-6 overflow-hidden transition-all w-14 shrink-0 border
        ${hasDiscount 
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
          : 'bg-black/[0.03] dark:bg-white/[0.05] text-gray-400 border-gray-100/50 dark:border-white/5'}`}
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
  t: any;
  currentLang: string;
  cart: CartItem[];
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
}) => {
  const unitsPerPack = item.unitsPerPack || 1;
  const isRTL = currentLang === 'ar';

  const totalStockUnits = React.useMemo(() => {
    if (!allBatches || allBatches.length === 0) return (item.stock || 0) * unitsPerPack;
    return allBatches.reduce((sum, b) => sum + b.stock, 0) * unitsPerPack;
  }, [allBatches, item.stock, unitsPerPack]);

  const [localPack, setLocalPack] = useState(packItem?.quantity.toString() || '');
  const [localUnit, setLocalUnit] = useState(unitItem?.quantity.toString() || '');

  useEffect(() => setLocalPack(packItem?.quantity.toString() || ''), [packItem?.quantity]);
  useEffect(() => setLocalUnit(unitItem?.quantity.toString() || ''), [unitItem?.quantity]);

  const handleQtyChange = (valStr: string, isUnit: boolean) => {
    const setLocal = isUnit ? setLocalUnit : setLocalPack;
    const target = isUnit ? unitItem : packItem;
    setLocal(valStr);
    if (valStr === '') return;
    const val = isUnit ? parseInt(valStr) : parseFloat(valStr);
    
    if (!isNaN(val) && val !== (target?.quantity ?? -1)) {
      // Calculate units consumed by OTHER items of the same drug in the cart
      const otherDrugItems = cart.filter(i => 
        i.name === item.name && 
        (i.dosageForm || '') === (item.dosageForm || '') && 
        !(i.id === item.id && !!i.isUnit === isUnit)
      );
      
      const unitsConsumedByOthers = otherDrugItems.reduce((sum, i) => {
        return sum + (i.isUnit ? i.quantity : i.quantity * (i.unitsPerPack || unitsPerPack));
      }, 0);

      const availableUnits = Math.max(0, totalStockUnits - unitsConsumedByOthers);
      const max = isUnit ? availableUnits : Math.floor(availableUnits / unitsPerPack);
      
      const clamped = Math.max(0, Math.min(val, max));
      
      if (target) {
        updateQuantity(target.id, isUnit, clamped - target.quantity);
      } else if (clamped > 0) {
        addToCart(item, isUnit, clamped);
      }
    }
  };

  const inputClass = "w-full h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  if (isMobile) {
    const renderStepper = (isUnit: boolean) => {
      const q = (isUnit ? unitItem : packItem)?.quantity || 0;
      return (
        <div className="flex items-center rounded-lg h-6 overflow-hidden bg-black/[0.03] dark:bg-white/[0.05]">
          <button onClick={e => { e.stopPropagation(); q > 0 && updateQuantity(item.id, isUnit, -1); }} disabled={q <= 0} className="w-5 h-full flex items-center justify-center hover:bg-black/5 text-gray-400 active:scale-90 disabled:opacity-30"><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>remove</span></button>
          <input type="number" value={isUnit ? localUnit : localPack} placeholder={isUnit ? 'U' : 'P'} onChange={e => handleQtyChange(e.target.value, isUnit)} onBlur={() => (isUnit ? localUnit : localPack) === '' && (isUnit ? setLocalUnit : setLocalPack)(q.toString())} className="w-6 h-full text-[10px] font-black text-center bg-transparent border-none p-0 focus:outline-none" />
          <button onClick={e => { e.stopPropagation(); updateQuantity(item.id, isUnit, 1); }} className="w-5 h-full flex items-center justify-center text-primary-600 active:scale-90"><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span></button>
        </div>
      );
    };
    return <div className="flex items-center gap-0.5 shrink-0" dir="ltr">{renderStepper(false)}{hasDualMode && <><div className="w-px h-full bg-gray-100/50 dark:bg-white/5 shrink-0" />{renderStepper(true)}</>}</div>;
  }

  return (
    <div className="flex items-center rounded-lg h-6 overflow-hidden w-14 shrink-0 bg-black/[0.03] dark:bg-white/[0.05] border border-gray-100/50 dark:border-white/5">
      <div className="flex-1 h-full flex items-center min-w-0">
        <input type="number" value={localPack} placeholder="P" onChange={e => handleQtyChange(e.target.value, false)} onBlur={() => localPack === '' && setLocalPack(packItem?.quantity.toString() || '')} className={inputClass} />
      </div>
      {hasDualMode && (
        <><div className="w-px h-full bg-gray-100/50 dark:bg-white/5 shrink-0" />
        <div className="flex-1 h-full flex items-center min-w-0">
          <input type="number" value={localUnit} placeholder="U" title={`1 Pack = ${unitsPerPack} Units`} onChange={e => handleQtyChange(e.target.value, true)} onBlur={() => localUnit === '' && setLocalUnit(unitItem?.quantity.toString() || '')} className={inputClass} />
        </div></>
      )}
    </div>
  );
};
