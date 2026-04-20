import { describe, it, expect } from 'vitest';
import { validateStock, formatStock, getStockStatusColor } from './inventory';

describe('Inventory Utils', () => {
  describe('validateStock', () => {
    it('returns 0 for negative numbers', () => {
      expect(validateStock(-5)).toBe(0);
    });
    it('returns 0 for NaN', () => {
      expect(validateStock(NaN)).toBe(0);
    });
    it('rounds floating numbers', () => {
      expect(validateStock(10.6)).toBe(11);
      expect(validateStock(10.4)).toBe(10);
    });
    it('returns valid integers as is', () => {
       expect(validateStock(50)).toBe(50); 
    });
  });

  describe('formatStock', () => {
    it('handles out of stock', () => {
      expect(formatStock(0)).toBe('Out of Stock');
      expect(formatStock(-1)).toBe('Out of Stock');
    });

    it('formats pure packs (unitsPerPack=1)', () => {
      expect(formatStock(10, 1)).toBe('10 Packs');
    });

    it('formats fractional packs', () => {
      // 50 units, 10 per pack -> 5 packs
      expect(formatStock(50, 10)).toBe('5 Packs');
      
      // 55 units, 10 per pack -> 5.5 packs
      expect(formatStock(55, 10)).toBe('5.5 Packs');
      
      // 55 units, 100 per pack -> 0.55 packs
      expect(formatStock(55, 100)).toBe('0.55 Packs');
    });
  });

  describe('getStockStatusColor', () => {
    it('returns red for empty', () => {
      expect(getStockStatusColor(0)).toContain('text-red-600');
    });

    it('returns orange for low stock', () => {
      // 50 units, 10 per pack = 5 packs. Min is 10 packs.
      expect(getStockStatusColor(50, 10, 10)).toContain('text-orange-600');
    });

    it('returns green for sufficient stock', () => {
      // 200 units, 10 per pack = 20 packs. Min is 10 packs.
      expect(getStockStatusColor(200, 10, 10)).toContain('text-green-600');
    });
  });
});
