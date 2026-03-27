import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';
import { canPerformAction, type UserRole } from '../../../config/permissions';
import { useLongPress } from '../../../hooks/useLongPress';
import type { TRANSLATIONS } from '../../../i18n/translations';
import type { CartItem, Drug } from '../../../types';
import { getDisplayName } from '../../../utils/drugDisplayName';
import { useSettings } from '../../../context';
import { resolvePrice } from '../../../utils/stockOperations';

import {
  CartItemExpiryBadge,
  CartItemDiscountControl,
  CartItemQuantityControl,
} from './CartItemControls';


export interface SortableCartItemProps {
  packItem?: CartItem;
  unitItem?: CartItem;
  commonItem: CartItem;
  itemId: string;
  color: string;
  t: typeof TRANSLATIONS.EN.pos;
  showMenu: (x: number, y: number, items: any[]) => void;
  removeFromCart: (id: string, isUnit: boolean) => void;
  toggleUnitMode: (id: string, currentIsUnit: boolean) => void;
  updateItemDiscount: (id: string, isUnit: boolean, discount: number) => void;
  setGlobalDiscount: (discount: number) => void;
  updateQuantity: (id: string, isUnit: boolean, delta: number) => void;
  addToCart: (drug: Drug, isUnitMode?: boolean, quantity?: number) => void;
  removeDrugFromCart: (id: string) => void;
  allBatches: Drug[];
  onSelectBatch: (currentItem: CartItem, newBatch: Drug, packQty: number, unitQty: number) => void;
  isHighlighted?: boolean;
  currentLang: 'en' | 'ar';
  globalDiscount?: number;
  onSearchInTable: (term: string) => void;
  userRole: UserRole;
  isMobile?: boolean;
}

export const calculateItemTotal = (item: CartItem) => {
  const unitPrice = resolvePrice(item.price, !!item.isUnit, item.unitsPerPack);
  const baseTotal = unitPrice * item.quantity;
  const discountAmount = baseTotal * ((item.discount || 0) / 100);
  return baseTotal - discountAmount;
};

export const SortableCartItem: React.FC<SortableCartItemProps> = React.memo(({
  packItem,
  unitItem,
  commonItem,
  itemId,
  color,
  t,
  showMenu,
  removeFromCart,
  toggleUnitMode,
  updateItemDiscount,
  setGlobalDiscount,
  updateQuantity,
  addToCart,
  removeDrugFromCart,
  allBatches,
  onSelectBatch,
  isHighlighted,
  currentLang,
  globalDiscount,
  onSearchInTable,
  userRole,
  isMobile,
}) => {
  const { textTransform } = useSettings();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  // Use common item for shared props like name, expiry, etc.
  // BUT: Look up the fresh batch data from allBatches to ensure we have the latest maxDiscount/costPrice
  // The cart item might be a stale copy.
  const staleItem = commonItem;
  const freshBatch = allBatches.find((b) => b.id === staleItem.id) || staleItem;
  // Merge to ensure we have latest props, and unify discount from pack/unit
  const unifiedDiscount = Math.max(packItem?.discount || 0, unitItem?.discount || 0);
  const item = { ...staleItem, ...freshBatch, discount: unifiedDiscount }; // Use unified discount for display

  const hasDualMode = item.unitsPerPack && item.unitsPerPack > 1;

  const getCartItemActions = (item: CartItem) => {
    const actions: any[] = [
      {
        label: t.removeItem,
        icon: 'delete',
        action: () => removeFromCart(item.id, !!item.isUnit),
        danger: true,
      },
    ];

    const unitsPerPack = item.unitsPerPack || 1;
    const hasDualMode = unitsPerPack > 1;

    // Resolve full drug state from props to correctly determine actions for merged row
    const packQty = packItem?.quantity || 0;
    const unitQty = unitItem?.quantity || 0;

    const canSwitchToUnit = hasDualMode && packQty === 1 && unitQty === 0;
    const canSwitchToPack = hasDualMode && unitQty >= unitsPerPack;

    // When switching, we need to know the CURRENT state of THIS item being clicked
    // The item passed to this function is the one that triggered the menu/action.

    if (canSwitchToUnit) {
      actions.push({ separator: true });
      actions.push({
        label: t.switchToUnit,
        icon: 'swap_horiz',
        action: () => toggleUnitMode(item.id, false), // false = currently is Pack
        danger: false,
      });
    }

    if (canSwitchToPack) {
      actions.push({ separator: true });
      actions.push({
        label: t.switchToPack,
        icon: 'swap_horiz',
        action: () => toggleUnitMode(item.id, true), // true = currently is Unit
        danger: false,
      });
    }

    actions.push({ separator: true });
    if (canPerformAction(userRole, 'sale.discount')) {
      actions.push({
        label: t.actions.discount,
        icon: 'percent',
        action: () => {
          const disc = prompt(
            'Enter discount percentage (0-100):',
            item.discount?.toString() || '0'
          );
          if (disc !== null) {
            const val = parseFloat(disc);
            if (!isNaN(val) && val >= 0 && val <= 100) {
              const maxDisc = item.maxDiscount ?? 10;
              if (val > maxDisc) {
                alert(`Discount cannot exceed ${maxDisc}%`);
              } else {
                updateItemDiscount(item.id, !!item.isUnit, val);
                if (val > 0) setGlobalDiscount(0);
              }
            }
          }
        },
        danger: false,
      });
    }

    // Search in table option
    actions.push({
      label: t.actions?.searchInTable || 'Search in Table',
      icon: 'search',
      action: () => {
        onSearchInTable(item.name);
      },
      danger: false,
    });
    return actions;
  };

  const {
    onTouchStart: onLongPressTouchStart,
    onTouchEnd: onLongPressTouchEnd,
    onTouchMove: onLongPressTouchMove,
  } = useLongPress({
    onLongPress: (e) => {
      const touch = e.touches[0];
      showMenu(touch.clientX, touch.clientY, getCartItemActions(item));
    },
  });

  // Helpers to handle updates (create if missing)
  const handleQtyChange = (isUnit: boolean, delta: number) => {
    const targetItem = isUnit ? unitItem : packItem;
    if (targetItem) {
      updateQuantity(targetItem.id, !!targetItem.isUnit, delta);
    } else {
      // Create new entry
      if (delta > 0) addToCart(item, isUnit); // Add 1
    }
  };

  const handleManualQty = (isUnit: boolean, val: number) => {
    // Calculate total global stock for this drug (all batches combined)
    // We filter by name AND dosageForm to ensure accurate stock
    const totalGlobalStock = allBatches.reduce((sum, b) => sum + b.stock, 0);
    const unitsPerPack = item.unitsPerPack || 1;
    const totalStockUnits = totalGlobalStock * unitsPerPack;

    // Existing totals
    const currentPackQty = packItem ? packItem.quantity : 0;
    const currentUnitQty = unitItem ? unitItem.quantity : 0;

    // New totals based on input
    let newPackQty = !isUnit ? val : currentPackQty;
    let newUnitQty = isUnit ? val : currentUnitQty;

    // Validate Total Request <= Total Stock
    const requestedTotalUnits = newPackQty * unitsPerPack + newUnitQty;

    if (requestedTotalUnits > totalStockUnits) {
      // Clamp to Max
      // If changing Pack: reduce Pack to max possible given current Unit
      if (!isUnit) {
        const maxPack = Math.floor((totalStockUnits - currentUnitQty) / unitsPerPack);
        newPackQty = Math.max(0, maxPack);
      } else {
        // If changing Unit: reduce Unit to max possible given current Pack
        const maxUnit = totalStockUnits - currentPackQty * unitsPerPack;
        newUnitQty = Math.max(0, maxUnit);
      }
    }

    // If we have any existing item, use it as the "target batch" preference
    // If not (creating new), use commonItem (which has batch info)
    const targetBatch = (packItem || unitItem || commonItem) as Drug;

    if (val < 0) return;

    onSelectBatch(item, targetBatch, newPackQty, newUnitQty);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex flex-col p-1.5 transition-all touch-manipulation relative group outline-hidden select-none
        ${isDragging ? `z-50 opacity-100 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm shadow-2xl scale-[1.02] rounded-xl` : 'rounded-lg'}
        ${
          isHighlighted
            ? `bg-primary-500/[0.04] dark:bg-primary-500/[0.08]`
            : 'bg-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
        }`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        showMenu(e.clientX, e.clientY, getCartItemActions(item)); // Actions for general
      }}
      onTouchStart={onLongPressTouchStart}
      onTouchEnd={onLongPressTouchEnd}
      onTouchMove={onLongPressTouchMove}
    >
      {/* Subtle Drag Handle / Accent */}
      <div className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-all duration-300
        ${isHighlighted ? 'bg-primary-500 opacity-100 scale-y-100' : 'bg-primary-500/40 opacity-0 group-hover:opacity-100 scale-y-50 group-hover:scale-y-100'}
      `} />

      <div className='flex flex-wrap items-center justify-between gap-x-1 gap-y-1 relative pl-2'>
        {/* Name Section */}
        <div className='flex-1 min-w-[120px]'>
          <h4
            className='font-bold text-xs text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 drug-name'
            title={getDisplayName(item, textTransform)}
          >
            {getDisplayName(item, textTransform)}
          </h4>
        </div>

        {/* Unified 'Rest' Section: Date, Controls, Price */}
        <div className='flex items-center gap-1 shrink-0 ml-auto'>
          {/* Expiry Date Badge with Batch Details */}
          {/* Expiry Date Badge */}
          <CartItemExpiryBadge
            item={item}
            allBatches={allBatches}
            packItem={packItem}
            unitItem={unitItem}
            t={t}
            showMenu={showMenu}
            onSelectBatch={onSelectBatch}
          />

          {/* Smart Discount Logic Info */}
          <CartItemDiscountControl
            item={item}
            packItem={packItem}
            unitItem={unitItem}
            globalDiscount={globalDiscount}
            userRole={userRole}
            updateItemDiscount={updateItemDiscount}
            setGlobalDiscount={setGlobalDiscount}
          />

          {/* Dual Qty Control */}
          <CartItemQuantityControl
            item={item}
            packItem={packItem}
            unitItem={unitItem}
            hasDualMode={hasDualMode}
            updateQuantity={updateQuantity}
            addToCart={addToCart}
            allBatches={allBatches}
            isMobile={isMobile}
          />

            {/* Total Price (Sum of both) */}
            <div className='text-xs font-bold text-gray-900 dark:text-white w-12 shrink-0 text-end tabular-nums'>
              $
              {(
                (packItem ? calculateItemTotal(packItem) : 0) +
                (unitItem ? calculateItemTotal(unitItem) : 0)
              ).toFixed(2)}
            </div>

            {/* Quick Remove button */}
            <button
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeDrugFromCart(item.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className='w-7 h-7 flex items-center justify-center text-gray-400/50 hover:text-red-500 transition-all duration-200 active:scale-90 focus:outline-none'
            >
              <span className='material-symbols-rounded' style={{ fontSize: '20px' }}>delete</span>
            </button>
          </div>
        </div>
      </div>
  );
});
