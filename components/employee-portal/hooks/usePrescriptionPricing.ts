import { useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryRepository } from '../../../services/inventory/repositories/inventoryRepository';
import type { Drug } from '../../../types';

export interface PrescriptionItem {
  drug: Drug;
  quantity: number;
}

export function usePrescriptionPricing() {
  const [inventory, setInventory] = useState<Drug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    inventoryRepository
      .getAll()
      .then((data) => {
        if (!cancelled) setInventory(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = useCallback((drug: Drug) => {
    setPrescriptionItems((prev) => {
      const existing = prev.find((item) => item.drug.id === drug.id);
      if (existing) {
        return prev.map((item) =>
          item.drug.id === drug.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { drug, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((drugId: string) => {
    setPrescriptionItems((prev) => prev.filter((item) => item.drug.id !== drugId));
  }, []);

  const updateQuantity = useCallback((drugId: string, delta: number) => {
    setPrescriptionItems((prev) => {
      const updated = prev.map((item) => {
        if (item.drug.id !== drugId) return item;
        const newQty = item.quantity + delta;
        return { ...item, quantity: Math.max(0, newQty) };
      });
      return updated.filter((item) => item.quantity > 0);
    });
  }, []);

  const clearAll = useCallback(() => {
    setPrescriptionItems([]);
  }, []);

  const totals = useMemo(() => {
    const subtotal = prescriptionItems.reduce(
      (sum, item) => sum + item.drug.publicPrice * item.quantity,
      0
    );
    return { subtotal, grandTotal: subtotal };
  }, [prescriptionItems]);

  return {
    inventory,
    isLoading,
    prescriptionItems,
    addItem,
    removeItem,
    updateQuantity,
    clearAll,
    ...totals,
  };
}
