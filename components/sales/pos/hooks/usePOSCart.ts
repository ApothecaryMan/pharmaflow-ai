import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { type UserRole } from '../../../../config/permissions';
import { permissionsService } from '../../../../services/auth/permissionsService';
import type { CartItem, Drug } from '../../../../types';
import * as stockOps from '../../../../utils/stockOperations';
import { isStockConstraintMet } from '../../../../utils/stockOperations';
import { batchService } from '../../../../services/inventory/batchService';
import type { GroupedDrug } from '../../../../types';

interface UsePOSCartProps {
  activeTab: any;
  activeTabId: string;
  updateTab: (id: string, updates: any) => void;
  inventory: Drug[];
  showToastError: (msg: string) => void;
  addNotification: (notification: any) => void;
  playBeep: () => void;
  playError: () => void;
}

export const usePOSCart = ({
  activeTab,
  activeTabId,
  updateTab,
  inventory,
  showToastError,
  addNotification,
  playBeep,
  playError,
}: UsePOSCartProps) => {
  // --- Cart State ---
  const cart: CartItem[] = activeTab?.cart || [];

  // Ref to break the dependency cascade: setCart no longer depends on `cart`,
  // so all downstream callbacks (addToCart, updateQuantity, etc.) become stable.
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const setCart = useCallback(
    (newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
      const updatedCart = typeof newCart === 'function' ? newCart(cartRef.current) : newCart;
      updateTab(activeTabId, { cart: updatedCart });
    },
    [activeTabId, updateTab]
  );

  const globalDiscount = activeTab?.discount || 0;
  const setGlobalDiscount = useCallback(
    (discount: number) => {
      if (!permissionsService.can('sale.discount')) {
        showToastError('Permission Denied: Cannot apply global discount');
        return;
      }
      updateTab(activeTabId, { discount });
      // BUG-D5: Clear all item-level discounts when setting a global discount
      if (discount > 0) {
        setCart((prev: CartItem[]) =>
          prev.map((item) => (item.discount ? { ...item, discount: 0 } : item))
        );
      }
    },
    [activeTabId, updateTab, showToastError, setCart]
  );

  // Derived state: Group cart items by Drug ID (Visual Merging)
  const mergedCartItems = useMemo(() => {
    const map = new Map<string, { pack?: CartItem; unit?: CartItem; order: number }>();
    cart.forEach((item, index) => {
      if (!map.has(item.id)) {
        map.set(item.id, { order: index });
      }
      const entry = map.get(item.id)!;
      if (item.isUnit) entry.unit = item;
      else entry.pack = item;
    });
    return Array.from(map.values()).map((entry) => ({
      id: (entry.pack || entry.unit)!.id,
      pack: entry.pack,
      unit: entry.unit,
      common: (entry.pack || entry.unit)!,
    }));
  }, [cart]);

  // Unit and Batch selection state (for grouping)
  const [selectedUnits, setSelectedUnits] = useState<Record<string, 'pack' | 'unit'>>({});
  const [openUnitDropdown, setOpenUnitDropdown] = useState<string | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({}); // drugId -> batchId
  const [openBatchDropdown, setOpenBatchDropdown] = useState<string | null>(null);

  // --- Out of Stock Tracking ---
  const prevStockRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    inventory.forEach((drug) => {
      const prevStock = prevStockRef.current.get(drug.id);
      if (prevStock !== undefined && prevStock > 0 && drug.stock <= 0) {
        addNotification({
          messageKey: 'outOfStock',
          messageParams: { name: drug.name, form: drug.dosageForm || '' },
          type: 'out_of_stock',
        });
        playError(); // Use error sound for attention
      }
      prevStockRef.current.set(drug.id, drug.stock);
    });
  }, [inventory, addNotification, playError]);

  // --- Cart Actions ---
  const addToCart = useCallback((drug: Drug, isUnitMode: boolean = false, initialQuantity: number = 1) => {
    if (drug.stock <= 0) return;

    if (cartRef.current.length === 0 && !activeTab?.firstItemAt) {
      updateTab(activeTabId, { firstItemAt: Date.now() });
    }

    setCart((prev: CartItem[]) => {
      if (!isStockConstraintMet(drug.id, drug.stock, drug.unitsPerPack, prev, initialQuantity, isUnitMode)) {
        return prev;
      }

      const existingIndex = prev.findIndex(
        (item) => item.id === drug.id && !!item.isUnit === isUnitMode
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + initialQuantity,
        };
        initialQuantity > 0 && playBeep();
        return updated;
      }

      if (initialQuantity <= 0) return prev;

      initialQuantity > 0 && playBeep();
      return [
        ...prev,
        {
          ...drug,
          publicPrice: stockOps.resolvePrice(drug.publicPrice, isUnitMode, drug.unitsPerPack, drug.unitPrice),
          quantity: initialQuantity,
          discount: prev.find((i) => i.id === drug.id && !!i.isUnit !== isUnitMode)?.discount || 0,
          isUnit: isUnitMode,
          basePackPrice: drug.publicPrice, // Preserve base price for future toggles
          preferredBatchId: drug.id,
        },
      ];
    });
  }, [activeTab?.firstItemAt, activeTabId, updateTab, setCart]);

  const addGroupToCart = useCallback((group: Drug[]) => {
    // Treat the array as a potential group
    const grouped = batchService.groupInventory(group)[0];
    if (!grouped) return;

    const drugKey = grouped.groupId;
    const selectedBatchId = selectedBatches[drugKey];

    const targetBatch = batchService.findTargetBatch(grouped, cartRef.current, selectedBatchId);

    if (targetBatch) {
      const unitMode = selectedUnits[drugKey] === 'unit';
      addToCart(targetBatch, unitMode);
    }
  }, [selectedBatches, selectedUnits, addToCart]);

  const removeFromCart = useCallback((id: string, isUnit: boolean) => {
    setCart((prev: CartItem[]) => prev.filter((item) => !(item.id === id && !!item.isUnit === isUnit)));
  }, [setCart]);

  const removeDrugFromCart = useCallback((id: string) => {
    setCart((prev: CartItem[]) => prev.filter((item) => item.id !== id));
  }, [setCart]);

  const switchBatchWithAutoSplit = useCallback((
    currentItem: CartItem,
    newBatch: Drug,
    packQty: number,
    unitQty: number
  ) => {
    const allBatches = inventory
      .filter((d) => d.name === currentItem.name && d.dosageForm === currentItem.dosageForm)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    setCart((prev: CartItem[]) => {
      const insertionIndex = prev.findIndex(
        (item) => item.name === currentItem.name && item.dosageForm === currentItem.dosageForm
      );

      const filtered = prev.filter(
        (item) => !(item.name === currentItem.name && item.dosageForm === currentItem.dosageForm)
      );

      const newItems: CartItem[] = [];
      let remainingPacks = packQty;
      let remainingUnits = unitQty;
      const orderedBatches = [newBatch, ...allBatches.filter((b) => b.id !== newBatch.id)];

      for (const batch of orderedBatches) {
        if (remainingPacks <= 0 && remainingUnits <= 0) break;

        const unitsPerPack = batch.unitsPerPack || 1;
        const stockInPacks = Math.floor(batch.stock / unitsPerPack);

        if (remainingPacks > 0) {
          const packsTake = Math.min(remainingPacks, stockInPacks);
          if (packsTake > 0) {
            newItems.push({
              ...batch,
              quantity: packsTake,
              discount: currentItem.discount || 0,
              isUnit: false,
              publicPrice: stockOps.resolvePrice(batch.publicPrice, false, unitsPerPack, batch.unitPrice),
              preferredBatchId: batch.id,
            });
            remainingPacks -= packsTake;
          }
        }

        const usedPacks = newItems
          .filter((i) => i.id === batch.id && !i.isUnit)
          .reduce((s, i) => s + i.quantity, 0);
        const remainingStockForUnits = (stockInPacks - usedPacks) * unitsPerPack;

        if (remainingUnits > 0 && unitsPerPack > 1) {
          const unitsTake = Math.min(remainingUnits, remainingStockForUnits);
          if (unitsTake > 0) {
            newItems.push({
              ...batch,
              quantity: unitsTake,
              discount: currentItem.discount || 0,
              isUnit: true,
              publicPrice: stockOps.resolvePrice(batch.publicPrice, true, unitsPerPack, batch.unitPrice),
              preferredBatchId: batch.id,
            });
            remainingUnits -= unitsTake;
          }
        }
      }

      if (insertionIndex !== -1) {
        const result = [...filtered];
        result.splice(insertionIndex, 0, ...newItems);
        return result;
      }
      return [...filtered, ...newItems];
    });
  }, [inventory, setCart]);

  const updateQuantity = useCallback((id: string, isUnit: boolean, delta: number) => {
    setCart((prev: CartItem[]) => {
      // 1. Find the parent drug definition to get ALL its batches
      const drugDefinition = inventory.find((d) => d.id === id || (d as any).dbId === id);
      if (!drugDefinition) return prev;

      const targetItem = prev.find((i) => (i.id === id || (i as any).dbId === id) && !!i.isUnit === isUnit);
      if (!targetItem) return prev;

      // 2. Calculate new total requested quantity for this drug-type pair in cart
      // We sum up all items of same drug definition and same unit mode
      const sameTypeItems = prev.filter(i => (i.id === id || (i as any).dbId === id) && !!i.isUnit === isUnit);
      const currentTotalQty = sameTypeItems.reduce((sum, i) => sum + i.quantity, 0);
      const newTotalQty = currentTotalQty + delta;

      if (newTotalQty < 0) return prev;
      if (newTotalQty === 0) {
        return prev.filter(i => !((i.id === id || (i as any).dbId === id) && !!i.isUnit === isUnit));
      }

      // 3. Get all available batches sorted by expiry (FEFO)
      const availableBatches = (drugDefinition as any).batches || [drugDefinition];
      
      // 4. Redistribute the new total quantity across batches
      const newItems: CartItem[] = [];
      let remainingToDistribute = newTotalQty;

      for (const batch of availableBatches) {
        if (remainingToDistribute <= 0) break;

        const unitsPerPack = drugDefinition.unitsPerPack || 1;
        const batchStock = isUnit ? batch.stock : Math.floor(batch.stock / unitsPerPack);
        
        if (batchStock <= 0) continue;

        const take = Math.min(remainingToDistribute, batchStock);
        if (take > 0) {
          newItems.push({
            ...batch,
            quantity: take,
            isUnit,
            discount: targetItem.discount,
            publicPrice: stockOps.resolvePrice(batch.publicPrice, isUnit, unitsPerPack, batch.unitPrice),
            preferredBatchId: batch.id
          });
          remainingToDistribute -= take;
        }
      }

      // If we couldn't fulfill the whole quantity, stay with previous state (Stock constraint)
      if (remainingToDistribute > 0 && delta > 0) {
        return prev;
      }

      // 5. Replace old items with new distributed items
      const otherItems = prev.filter(i => !((i.id === id || (i as any).dbId === id) && !!i.isUnit === isUnit));
      
      playBeep();
      return [...otherItems, ...newItems];
    });
  }, [inventory, setCart, playBeep]);

  const toggleUnitMode = useCallback((id: string, currentIsUnit: boolean) => {
    setCart((prev: CartItem[]) => {
      const item = prev.find((i) => i.id === id && !!i.isUnit === currentIsUnit);
      if (!item) return prev;

      const unitsPerPack = item.unitsPerPack || 1;
      if (unitsPerPack <= 1) return prev; // Cannot toggle if no packs/units distinction

      const drug = inventory.find((d) => d.id === id);
      const newIsUnit = !currentIsUnit;
      const convertedQty = currentIsUnit 
        ? Math.floor(item.quantity / unitsPerPack) || 1
        : item.quantity * unitsPerPack;

      const existingIndex = prev.findIndex((i) => i.id === id && !!i.isUnit === newIsUnit);
      
      let updated = [...prev];
      if (existingIndex >= 0) {
        // Merge with existing item of that type
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + convertedQty,
        };
        // Remove the toggled item
        updated = updated.filter((i) => !(i.id === id && !!i.isUnit === currentIsUnit));
      } else {
        // Just change the type of the current item
        updated = prev.map((i) => 
          (i.id === id && !!i.isUnit === currentIsUnit) 
            ? { 
                ...i, 
                isUnit: newIsUnit, 
                quantity: convertedQty,
                publicPrice: stockOps.resolvePrice(
                  i.basePackPrice || drug?.publicPrice || i.publicPrice,
                  newIsUnit,
                  unitsPerPack,
                  drug?.unitPrice
                )
              } 
            : i
        );
      }
      return updated;
    });
  }, [inventory, setCart]);

  const updateItemDiscount = useCallback((id: string, isUnit: boolean, discount: number) => {
    if (!permissionsService.can('sale.discount')) {
      showToastError('Permission Denied: Cannot apply item discount');
      return;
    }
    setCart((prev: CartItem[]) => {
      const item = prev.find((i) => i.id === id && !!i.isUnit === isUnit);
      // BUG-D1: Enforce maxDiscount from the item, not just 0-100
      const maxDisc = item?.maxDiscount && item.maxDiscount > 0 ? item.maxDiscount : 10;
      const validDiscount = Math.min(maxDisc, Math.max(0, discount));
      return prev.map((i) =>
        i.id === id && !!i.isUnit === isUnit ? { ...i, discount: validDiscount } : i
      );
    });
  }, [showToastError, setCart]);


  const cartSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCartDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setCart((prev: CartItem[]) => {
        const groups = new Map<string, CartItem[]>();
        const order: string[] = [];

        prev.forEach((item) => {
          if (!groups.has(item.id)) {
            groups.set(item.id, []);
            order.push(item.id);
          }
          groups.get(item.id)!.push(item);
        });

        const oldIndex = order.indexOf(active.id as string);
        const newIndex = order.indexOf(over!.id as string);
        const newOrder = arrayMove(order, oldIndex, newIndex);

        const newCart: CartItem[] = [];
        newOrder.forEach((id) => {
          if (groups.has(id)) {
            newCart.push(...groups.get(id)!);
          }
        });
        return newCart;
      });
    }
  }, [setCart]);

  return {
    cart,
    setCart,
    mergedCartItems,
    globalDiscount,
    setGlobalDiscount,
    addToCart,
    addGroupToCart,
    removeFromCart,
    removeDrugFromCart,
    switchBatchWithAutoSplit,
    updateQuantity,
    toggleUnitMode,
    updateItemDiscount,
    cartSensors,
    handleCartDragEnd,
    selectedUnits,
    setSelectedUnits,
    openUnitDropdown,
    setOpenUnitDropdown,
    selectedBatches,
    setSelectedBatches,
    openBatchDropdown,
    setOpenBatchDropdown,
  };
};
