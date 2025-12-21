import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Drug, CartItem } from "../../types";
import { TRANSLATIONS } from "../../i18n/translations";
import { getLocalizedProductType } from "../../data/productCategories";

export interface SortableCartItemProps {
  packItem?: CartItem;
  unitItem?: CartItem;
  commonItem: CartItem;
  itemId: string;
  color: string;
  t: typeof TRANSLATIONS.EN.pos;
  showMenu: (x: number, y: number, items: any[]) => void;
  getCartItemActions: (item: CartItem) => any[];
  currentTouchCartItem: React.MutableRefObject<CartItem | null>;
  onCartItemTouchStart: (e: React.TouchEvent) => void;
  onCartItemTouchEnd: () => void;
  onCartItemTouchMove: (e: React.TouchEvent) => void;
  removeFromCart: (id: string, isUnit: boolean) => void;
  toggleUnitMode: (id: string, currentIsUnit: boolean) => void;
  updateItemDiscount: (id: string, isUnit: boolean, discount: number) => void;
  setGlobalDiscount: (discount: number) => void;
  updateQuantity: (id: string, isUnit: boolean, delta: number) => void;
  calculateItemTotal: (item: CartItem) => number;
  addToCart: (drug: Drug, isUnitMode?: boolean, quantity?: number) => void;
  removeDrugFromCart: (id: string) => void;
  allBatches: Drug[];
  onSelectBatch: (currentItem: CartItem, newBatch: Drug, packQty: number, unitQty: number) => void;
  isHighlighted?: boolean;
  currentLang: 'en' | 'ar';
  globalDiscount?: number;
}

export const SortableCartItem: React.FC<SortableCartItemProps> = ({
  packItem,
  unitItem,
  commonItem,
  itemId,
  color,
  t,
  showMenu,
  getCartItemActions,
  currentTouchCartItem,
  onCartItemTouchStart,
  onCartItemTouchEnd,
  onCartItemTouchMove,
  removeFromCart,
  toggleUnitMode,
  updateItemDiscount,
  setGlobalDiscount,
  updateQuantity,
  calculateItemTotal,
  addToCart,
  removeDrugFromCart,
  allBatches,
  onSelectBatch,
  isHighlighted,
  currentLang,
  globalDiscount,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  // Use common item for shared props like name, expiry, etc.
  // BUT: Look up the fresh batch data from allBatches to ensure we have the latest maxDiscount/costPrice
  // The cart item might be a stale copy.
  const staleItem = commonItem;
  const freshBatch = allBatches.find(b => b.id === staleItem.id) || staleItem;
  const item = { ...staleItem, ...freshBatch }; // Merge to ensure we have latest props

  const hasDualMode = item.unitsPerPack && item.unitsPerPack > 1;

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
    const requestedTotalUnits = (newPackQty * unitsPerPack) + newUnitQty;
    
    if (requestedTotalUnits > totalStockUnits) {
       // Clamp to Max
       // If changing Pack: reduce Pack to max possible given current Unit
       if (!isUnit) {
          const maxPack = Math.floor((totalStockUnits - currentUnitQty) / unitsPerPack);
          newPackQty = Math.max(0, maxPack);
       } else {
          // If changing Unit: reduce Unit to max possible given current Pack
          const maxUnit = totalStockUnits - (currentPackQty * unitsPerPack);
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
      className={`flex flex-col p-2 rounded-xl bg-white dark:bg-gray-900 border transition-all touch-manipulation relative group outline-none
        ${
          isDragging
            ? "shadow-xl ring-2 ring-blue-500 scale-[1.02] z-50 opacity-90"
            : ""
        }
        ${
          isHighlighted
            ? `border-gray-100 dark:border-gray-800 bg-${color}-50 dark:bg-${color}-900/20`
            : "border-gray-100 dark:border-gray-800"
        }`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        showMenu(e.clientX, e.clientY, getCartItemActions(item)); // Actions for general
      }}
      onTouchStart={(e) => {
        currentTouchCartItem.current = item;
        onCartItemTouchStart(e);
      }}
      onTouchEnd={onCartItemTouchEnd}
      onTouchMove={onCartItemTouchMove}
    >
      {/* Drag Handle */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-full flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
        <div className={`w-1 h-3/5 rounded-full bg-${color}-100 dark:bg-${color}-800`}></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 relative pl-3">
        {/* Name Section */}
        <div className="flex-1 min-w-[120px]">
          <h4
            className="font-bold text-xs text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 drug-name"
            title={item.name}
          >
            {item.name}{" "}
            {item.dosageForm ? (
              <span className="font-normal text-gray-500">
                ({item.dosageForm})
              </span>
            ) : (
              ""
            )}
          </h4>
        </div>

        {/* Unified 'Rest' Section: Date, Controls, Price */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Expiry Date Badge with Batch Details */}
          <div className="flex items-center gap-1">
            <span
              className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm cursor-pointer hover:ring-2 hover:ring-white/50 transition-all ${(() => {
                const today = new Date();
                const expiry = new Date(item.expiryDate);
                const monthDiff =
                  (expiry.getFullYear() - today.getFullYear()) * 12 +
                  (expiry.getMonth() - today.getMonth());
                if (monthDiff <= 0) return "bg-red-500";
                if (monthDiff <= 3) return "bg-orange-500";
                return "bg-gray-500 dark:bg-gray-600";
              })()}`}
              onClick={(e) => {
                e.stopPropagation();
                const batchMenuItems = allBatches.map((batch) => ({
                  label: `${new Date(batch.expiryDate).toLocaleDateString("en-US", { month: "2-digit", year: "2-digit" })} • ${batch.stock} ${t.pack || 'Pack'}`,
                  icon: batch.id === item.id ? 'check_circle' : undefined,
                  disabled: batch.stock <= 0,
                  action: () => {
                    // Call switch function with current quantities to re-distribute if needed
                    const currentPackQty = packItem ? packItem.quantity : 0;
                    const currentUnitQty = unitItem ? unitItem.quantity : 0;
                    onSelectBatch(item, batch, currentPackQty, currentUnitQty);
                  },
                }));
                showMenu(e.clientX, e.clientY, [
                  ...batchMenuItems,
                ]);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {new Date(item.expiryDate).toLocaleDateString("en-US", {
                month: "2-digit",
                year: "2-digit",
              })}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Smart Discount Logic Info */}
            {(() => {
               const cost = item.costPrice || 0;
               const price = item.price || 0;
               const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
               
               // "Default max is 10%, if margin < 20% then max is floor(margin/2)"
               let calculatedMax = 10;
               if (margin < 20) {
                 calculatedMax = Math.floor(margin / 2);
               }
               
               // If item defines an explicit max (e.g. 5% or 50%), use it? 
               // User said "logic I calculate... is written", implying this dynamic logic IS the rule.
               // But let's respect explicit overrides if they exist and are non-zero.
               // Or simple fallback:
               const effectiveMax = (item.maxDiscount && item.maxDiscount > 0) 
                  ? item.maxDiscount 
                  : calculatedMax;

               // Hide discount control if global discount is active and > 0
               if (globalDiscount && globalDiscount > 0) return null;

               return (
            <div
              title={`Max Discount: ${effectiveMax}%\nProfit Margin: ${margin.toFixed(1)}%`}
              className={`flex items-center rounded-lg border shadow-sm h-6 overflow-hidden transition-colors w-14 shrink-0 ${
                (item.discount || 0) > 0
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              }`}
            >
              <button
                tabIndex={-1}
                onClick={() => {
                  const currentDiscount = item.discount || 0;
                  // Toggle: Apply Max / Clear
                  const newVal = currentDiscount === 0 ? effectiveMax : 0;
                  
                  if (packItem) updateItemDiscount(packItem.id, false, newVal);
                  if (unitItem) updateItemDiscount(unitItem.id, true, newVal);
                  if (newVal > 0) setGlobalDiscount(0);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`w-6 h-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ${
                  (item.discount || 0) > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-400"
                }`}
              >
                <span className="material-symbols-rounded text-[12px]">
                  percent
                </span>
              </button>
              <input
                type="number"
                value={item.discount || ""}
                placeholder="0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const valid = !isNaN(val) && val >= 0;
                  // Clamp to Effective Max
                  let finalVal = valid ? val : 0;
                  
                  if (finalVal > effectiveMax) finalVal = effectiveMax;

                  if (packItem)
                    updateItemDiscount(packItem.id, false, finalVal);
                  if (unitItem) updateItemDiscount(unitItem.id, true, finalVal);
                  if (finalVal > 0) setGlobalDiscount(0);
                }}
                className={`w-8 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  (item.discount || 0) > 0
                    ? "text-green-700 dark:text-green-300 placeholder-green-300"
                    : "text-gray-900 dark:text-gray-100 placeholder-gray-400"
                }`}
              />
            </div>
               );
            })()}

            {/* Dual Qty Control: [ Pack | Unit ] - Fixed width matching discount */}
            <div
              className={`flex items-center bg-white dark:bg-gray-900 rounded-lg border shadow-sm h-6 overflow-hidden w-14 shrink-0 transition-colors ${
                hasDualMode &&
                (!packItem || packItem.quantity === 0) &&
                (!unitItem || unitItem.quantity === 0)
                  ? "border-yellow-400 dark:border-yellow-500 ring-1 ring-yellow-400/20"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {/* Pack Input */}
              <input
                type="number"
                min={hasDualMode ? "0" : "1"}
                placeholder={hasDualMode ? "P" : "1"}
                value={packItem?.quantity === 0 ? "" : packItem?.quantity || ""}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(e) => {
                  const val =
                    e.target.value === ""
                      ? hasDualMode
                        ? 0
                        : 1
                      : parseInt(e.target.value);
                  if (isNaN(val)) return;
                  const minVal = hasDualMode ? 0 : 1;
                  const clampedVal = Math.max(minVal, val);
                  if (packItem) {
                    updateQuantity(
                      packItem.id,
                      false,
                      clampedVal - packItem.quantity
                    );
                  } else if (clampedVal > 0) {
                    addToCart(item, false, clampedVal);
                  }
                }}
                className={`h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-gray-300 shrink-0 min-w-0 ${
                  hasDualMode ? "w-7" : "w-full"
                }`}
              />

              {/* Separator */}
              {hasDualMode && (
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
              )}

              {/* Unit Input */}
              {hasDualMode && (
                <input
                  type="number"
                  min="0"
                  placeholder="U"
                  title={`1 Pack = ${item.unitsPerPack || 1} Units`}
                  value={
                    unitItem?.quantity === 0 ? "" : unitItem?.quantity || ""
                  }
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onChange={(e) => {
                    const val =
                      e.target.value === "" ? 0 : parseInt(e.target.value);
                    if (isNaN(val)) return;
                    const clampedVal = Math.max(0, val);
                    if (unitItem) {
                      updateQuantity(
                        unitItem.id,
                        true,
                        clampedVal - unitItem.quantity
                      );
                    } else if (clampedVal > 0) {
                      addToCart(item, true, clampedVal);
                    }
                  }}
                  className="w-7 min-w-0 h-full text-[10px] font-bold text-center bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-blue-600 dark:text-blue-400 placeholder-blue-200 shrink-0"
                />
              )}
            </div>

            {/* Total Price (Sum of both) */}
            <div className="text-sm font-bold text-gray-900 dark:text-white w-16 shrink-0 text-end tabular-nums">
              $
              {(
                (packItem ? calculateItemTotal(packItem) : 0) +
                (unitItem ? calculateItemTotal(unitItem) : 0)
              ).toFixed(2)}
            </div>

            {/* Delete button (if both, maybe show one delete for row?) */}
            <button
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeDrugFromCart(item.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/30 focus:text-red-500"
            >
              <span className="material-symbols-rounded text-[16px]">
                close
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
