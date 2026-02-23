import React from 'react';
import { canPerformAction, type UserRole } from '../../config/permissions';
import type { CartItem, Drug } from '../../types';
import { formatExpiryDate } from './utils/POSUtils';

export interface CartItemExpiryBadgeProps {
  item: CartItem;
  allBatches: Drug[];
  packItem?: CartItem;
  unitItem?: CartItem;
  t: any;
  showMenu: (x: number, y: number, items: any[]) => void;
  onSelectBatch: (currentItem: CartItem, newBatch: Drug, packQty: number, unitQty: number) => void;
}

export const CartItemExpiryBadge: React.FC<CartItemExpiryBadgeProps> = ({
  item,
  allBatches,
  packItem,
  unitItem,
  t,
  showMenu,
  onSelectBatch,
}) => {
  const getBadgeColor = () => {
    const today = new Date();
    const expiry = new Date(item.expiryDate);
    const monthDiff = (expiry.getFullYear() - today.getFullYear()) * 12 + (expiry.getMonth() - today.getMonth());
    if (monthDiff <= 0) return 'bg-red-500';
    if (monthDiff <= 3) return 'bg-orange-500';
    return 'bg-gray-500 dark:bg-gray-600';
  };

  return (
    <div className='flex items-center gap-1'>
      <span
        className={`text-[9px] font-bold text-white w-[38px] h-[18px] flex items-center justify-center rounded shadow-sm cursor-pointer hover:ring-2 hover:ring-white/50 transition-all ${getBadgeColor()}`}
        onClick={(e) => {
          e.stopPropagation();
          const batchMenuItems = allBatches.map((batch) => ({
            label: `${formatExpiryDate(batch.expiryDate)} • ${batch.stock} ${t.pack || 'Pack'}`,
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
        {formatExpiryDate(item.expiryDate)}
      </span>
    </div>
  );
};

export interface CartItemDiscountControlProps {
  item: CartItem;
  packItem?: CartItem;
  unitItem?: CartItem;
  globalDiscount?: number;
  userRole: UserRole;
  updateItemDiscount: (id: string, isUnit: boolean, discount: number) => void;
  setGlobalDiscount: (discount: number) => void;
}

export const CartItemDiscountControl: React.FC<CartItemDiscountControlProps> = ({
  item,
  packItem,
  unitItem,
  globalDiscount,
  userRole,
  updateItemDiscount,
  setGlobalDiscount,
}) => {
  const cost = item.costPrice || 0;
  const price = item.price || 0;
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  let calculatedMax = 10;
  if (margin < 20) {
    calculatedMax = Math.floor(margin / 2);
  }

  const effectiveMax = item.maxDiscount && item.maxDiscount > 0 ? item.maxDiscount : calculatedMax;

  if ((globalDiscount && globalDiscount > 0) || !canPerformAction(userRole, 'sale.discount')) {
    return null;
  }

  const currentDiscount = item.discount || 0;
  const hasDiscount = currentDiscount > 0;

  return (
    <div
      title={`Max Discount: ${effectiveMax}%\nProfit Margin: ${margin.toFixed(1)}%`}
      className={`flex items-center rounded-lg border shadow-sm h-6 overflow-hidden transition-colors w-14 shrink-0 ${
        hasDiscount
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
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
        className={`w-8 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
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
}

export const CartItemQuantityControl: React.FC<CartItemQuantityControlProps> = ({
  item,
  packItem,
  unitItem,
  hasDualMode,
  updateQuantity,
  addToCart,
}) => {
  return (
    <div
      className={`flex items-center bg-white dark:bg-gray-900 rounded-lg border shadow-sm h-6 overflow-hidden w-14 shrink-0 transition-colors ${
        hasDualMode && (!packItem || packItem.quantity === 0) && (!unitItem || unitItem.quantity === 0)
          ? 'border-yellow-400 dark:border-yellow-500 ring-1 ring-yellow-400/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <input
        type='number'
        min={hasDualMode ? '0' : '1'}
        step='any'
        placeholder={hasDualMode ? 'P' : '1'}
        value={packItem?.quantity === 0 ? '' : packItem?.quantity || ''}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        onChange={(e) => {
          const val = e.target.value === '' ? (hasDualMode ? 0 : 1) : parseFloat(e.target.value);
          if (isNaN(val)) return;
          const minVal = hasDualMode ? 0 : 1;
          const clampedVal = Math.max(minVal, val);
          if (packItem) {
            updateQuantity(packItem.id, false, clampedVal - packItem.quantity);
          } else if (clampedVal > 0) {
            addToCart(item, false, clampedVal);
          }
        }}
        className={`h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-gray-300 shrink-0 min-w-0 ${
          hasDualMode ? 'w-7' : 'w-full'
        } text-primary-600 dark:text-primary-400`}
      />

      {hasDualMode && <div className='w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0'></div>}

      {hasDualMode && (
        <input
          type='number'
          min='0'
          placeholder='U'
          title={`1 Pack = ${item.unitsPerPack || 1} Units`}
          value={unitItem?.quantity === 0 ? '' : unitItem?.quantity || ''}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
            if (isNaN(val)) return;
            const clampedVal = Math.max(0, val);
            if (unitItem) {
              updateQuantity(unitItem.id, true, clampedVal - unitItem.quantity);
            } else if (clampedVal > 0) {
              addToCart(item, true, clampedVal);
            }
          }}
          className={`w-7 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-primary-600 dark:text-primary-400 placeholder-primary-200 shrink-0`}
        />
      )}
    </div>
  );
};
