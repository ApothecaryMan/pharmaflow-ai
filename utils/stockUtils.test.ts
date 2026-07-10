import { describe, expect, it } from 'vitest';
import type { CartItem } from '../types';
import {
  convertToPacks,
  isStockConstraintMet,
  resolveDisplayStock,
  resolvePrice,
  resolveUnits,
} from './stockUtils';

describe('stockUtils', () => {
  describe('resolveUnits', () => {
    it('should calculate units correctly when isUnit is true', () => {
      expect(resolveUnits(5, true, 10)).toBe(5);
    });

    it('should calculate units correctly when isUnit is false (packs)', () => {
      expect(resolveUnits(2, false, 10)).toBe(20);
    });

    it('should fallback to 1 if unitsPerPack is not provided', () => {
      expect(resolveUnits(3, false, undefined as any)).toBe(3);
    });
  });

  describe('isStockConstraintMet', () => {
    const createMockCartItem = (
      name: string,
      dosageForm: string,
      quantity: number,
      isUnit: boolean,
      unitsPerPack: number
    ): CartItem =>
      ({
        id: `drug-${Date.now()}`,
        name,
        dosageForm,
        quantity,
        isUnit,
        unitsPerPack,
        price: 10,
        costPrice: 5,
        tax: 0,
        total: 10 * quantity,
      }) as unknown as CartItem;

    it('returns true when cart is empty and delta is within stock (packs)', () => {
      const result = isStockConstraintMet('Panadol', 'Tablet', 50, 10, [], 2, false);
      // 2 packs * 10 units = 20 units <= 50
      expect(result).toBe(true);
    });

    it('returns false when cart is empty and delta exceeds stock (packs)', () => {
      const result = isStockConstraintMet('Panadol', 'Tablet', 50, 10, [], 6, false);
      // 6 packs * 10 units = 60 units > 50
      expect(result).toBe(false);
    });

    it('returns true when cart is empty and delta is within stock (units)', () => {
      const result = isStockConstraintMet('Panadol', 'Tablet', 50, 10, [], 45, true);
      // 45 units <= 50
      expect(result).toBe(true);
    });

    it('returns false when cart is empty and delta exceeds stock (units)', () => {
      const result = isStockConstraintMet('Panadol', 'Tablet', 50, 10, [], 55, true);
      // 55 units > 50
      expect(result).toBe(false);
    });

    it('calculates correctly when cart already has the same item in packs', () => {
      const cart = [createMockCartItem('Panadol', 'Tablet', 3, false, 10)]; // 3 packs = 30 units
      const result1 = isStockConstraintMet('Panadol', 'Tablet', 50, 10, cart, 2, false); // +2 packs = 20 units (Total: 50 <= 50)
      const result2 = isStockConstraintMet('Panadol', 'Tablet', 50, 10, cart, 3, false); // +3 packs = 30 units (Total: 60 > 50)

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('calculates correctly when cart already has the same item in units and adding packs', () => {
      const cart = [createMockCartItem('Panadol', 'Tablet', 15, true, 10)]; // 15 units
      const result1 = isStockConstraintMet('Panadol', 'Tablet', 50, 10, cart, 3, false); // +3 packs = 30 units (Total: 45 <= 50)
      const result2 = isStockConstraintMet('Panadol', 'Tablet', 50, 10, cart, 4, false); // +4 packs = 40 units (Total: 55 > 50)

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('calculates correctly when cart has multiple batches of the same item', () => {
      const cart = [
        createMockCartItem('Panadol', 'Tablet', 1, false, 10), // 1 pack = 10 units
        createMockCartItem('Panadol', 'Tablet', 5, true, 10), // 5 units
      ]; // Total in cart: 15 units

      const result1 = isStockConstraintMet('Panadol', 'Tablet', 20, 10, cart, 5, true); // +5 units = 20 <= 20
      const result2 = isStockConstraintMet('Panadol', 'Tablet', 20, 10, cart, 6, true); // +6 units = 21 > 20

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('ignores items in the cart with a different name', () => {
      const cart = [createMockCartItem('Brufen', 'Tablet', 5, false, 10)]; // 50 units of Brufen
      const result = isStockConstraintMet('Panadol', 'Tablet', 20, 10, cart, 2, false); // +2 packs of Panadol = 20 <= 20

      expect(result).toBe(true);
    });

    it('ignores items in the cart with the same name but different dosage form', () => {
      const cart = [createMockCartItem('Panadol', 'Syrup', 2, false, 1)]; // 2 packs of Syrup
      const result = isStockConstraintMet('Panadol', 'Tablet', 20, 10, cart, 2, false); // +2 packs of Tablet = 20 <= 20

      expect(result).toBe(true);
    });
  });
});
