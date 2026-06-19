import type { CartItem } from '../types';
import { money } from './money';

/**
 * Resolves total unit quantity based on input type (units or packs).
 */
export const resolveUnits = (qty: number, isUnit: boolean, unitsPerPack: number = 1): number => {
  const perPack = unitsPerPack || 1;
  return isUnit ? qty : qty * perPack;
};

/**
 * Resolves unit price based on input type.
 */
export const resolvePrice = (
  price: number,
  isUnit: boolean,
  unitsPerPack: number = 1,
  manualUnitPrice?: number
): number => {
  const perPack = unitsPerPack || 1;
  if (!isUnit) return price;

  // Use manual unit price if available
  if (manualUnitPrice !== undefined && manualUnitPrice > 0) return manualUnitPrice;

  // Fallback to safe division
  return money.divide(price, perPack);
};

/**
 * Converts total units back to pack quantity.
 */
export const convertToPacks = (totalUnits: number, unitsPerPack: number = 1): number => {
  return money.divide(totalUnits, unitsPerPack || 1);
};

/**
 * Resolves stock value for display based on mode (pack vs unit).
 */
export const resolveDisplayStock = (
  stock: number,
  unitsPerPack: number = 1,
  mode: 'pack' | 'unit'
): number => {
  if (mode === 'unit') return stock;
  const packs = stock / (unitsPerPack || 1);
  return parseFloat(packs.toFixed(2));
};

/**
 * Validates if adding a specific quantity of a drug (in packs or units)
 * would exceed the current total stock.
 * Used in POS to prevent adding more than available.
 */
export const isStockConstraintMet = (
  drugName: string,
  dosageForm: string,
  totalStockUnits: number,
  unitsPerPack: number | undefined,
  currentCart: CartItem[],
  delta: number,
  isUnit: boolean
): boolean => {
  // Calculate existing units in cart for this drug (all batches/modes)
  const existingUnits = currentCart
    .filter((item) => item.name === drugName && (item.dosageForm || '') === (dosageForm || ''))
    .reduce((sum, item) => {
      return sum + resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack || unitsPerPack);
    }, 0);

  // Calculate new units to be added
  const newUnits = resolveUnits(delta, isUnit, unitsPerPack);

  return existingUnits + newUnits <= totalStockUnits;
};
