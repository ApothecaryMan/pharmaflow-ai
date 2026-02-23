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
import { canPerformAction, type UserRole } from '../../../config/permissions';
import type { CartItem, Drug } from '../../../types';
import { isStockConstraintMet } from '../utils/POSUtils';

interface UsePOSCartProps {
  activeTab: any;
  activeTabId: string;
  updateTab: (id: string, updates: any) => void;
  inventory: Drug[];
  userRole: UserRole;
  showToastError: (msg: string) => void;
  addNotification: (notification: any) => void;
  playError: () => void;
}

export const usePOSCart = ({
  activeTab,
  activeTabId,
  updateTab,
  inventory,
  userRole,
  showToastError,
  addNotification,
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
      if (!canPerformAction(userRole, 'sale.discount')) {
        showToastError('Permission Denied: Cannot apply global discount');
        return;
      }
      updateTab(activeTabId, { discount });
    },
    [activeTabId, updateTab, userRole, showToastError]
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
        return updated;
      }

      return [
        ...prev,
        {
          ...drug,
          quantity: initialQuantity,
          discount: prev.find((i) => i.id === drug.id && !!i.isUnit !== isUnitMode)?.discount || 0,
          isUnit: isUnitMode,
        },
      ];
    });
  }, [activeTab?.firstItemAt, activeTabId, updateTab, setCart]);

  const addGroupToCart = useCallback((group: Drug[]) => {
    const firstDrug = group[0];
    const selectedBatchId = selectedBatches[firstDrug.id];

    let targetBatch: Drug | undefined;

    if (selectedBatchId) {
      targetBatch = group.find((d) => d.id === selectedBatchId);
    }

    if (!targetBatch || targetBatch.stock <= 0) {
      const currentCart = cartRef.current;
      targetBatch = group.find((d) => {
        const inCart = currentCart
          .filter((c) => c.id === d.id)
          .reduce(
            (sum, c) =>
              sum + (c.isUnit && c.unitsPerPack ? c.quantity / c.unitsPerPack : c.quantity),
            0
          );
        return d.stock - inCart > 0;
      });
    }

    if (targetBatch) {
      const unitMode = selectedUnits[firstDrug.id] === 'unit';
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
      const drug = inventory.find((d) => d.id === id);
      if (!drug) return prev;

      const targetItem = prev.find((i) => i.id === id && !!i.isUnit === isUnit);
      if (!targetItem) return prev;

      const newQty = targetItem.quantity + delta;
      
      // Basic validation: Cannot go below 1 pack, but units can hit 0 (if there are packs)
      const unitsPerPack = drug.unitsPerPack || 1;
      const hasDualMode = unitsPerPack > 1;
      const minQtyValid = hasDualMode ? newQty >= 0 : isUnit ? newQty >= 0 : newQty >= 1;

      if (!minQtyValid) return prev;

      if (!isStockConstraintMet(id, drug.stock, drug.unitsPerPack, prev, delta, isUnit)) {
        return prev;
      }

      return prev.map((item) =>
        item.id === id && !!item.isUnit === isUnit ? { ...item, quantity: newQty } : item
      );
    });
  }, [inventory, setCart]);

  const toggleUnitMode = useCallback((id: string, currentIsUnit: boolean) => {
    setCart((prev: CartItem[]) => {
      const item = prev.find((i) => i.id === id && !!i.isUnit === currentIsUnit);
      if (!item) return prev;

      const unitsPerPack = item.unitsPerPack || 1;
      if (unitsPerPack <= 1) return prev; // Cannot toggle if no packs/units distinction

      const newIsUnit = !currentIsUnit;
      const convertedQty = currentIsUnit ? item.quantity / unitsPerPack : item.quantity * unitsPerPack;

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
            ? { ...i, isUnit: newIsUnit, quantity: convertedQty } 
            : i
        );
      }
      return updated;
    });
  }, [setCart]);

  const updateItemDiscount = useCallback((id: string, isUnit: boolean, discount: number) => {
    if (!canPerformAction(userRole, 'sale.discount')) {
      showToastError('Permission Denied: Cannot apply item discount');
      return;
    }
    const validDiscount = Math.min(100, Math.max(0, discount));
    setCart((prev: CartItem[]) =>
      prev.map((item) =>
        item.id === id && !!item.isUnit === isUnit ? { ...item, discount: validDiscount } : item
      )
    );
  }, [userRole, showToastError, setCart]);


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
