import { describe, it, expect } from 'vitest';
import { money } from './money';

// Standardized shortage restock calculation logic mapped from ShortagesPage and intelligenceService
interface DrugMock {
  stock: number;         // in units
  minStock: number;      // in packs
  unitsPerPack: number;
  costPrice: number;     // in EGP
}

function calculateShortageItem(
  drug: DrugMock,
  avgDailySales: number
) {
  const stock = drug.stock;
  const minStock = drug.minStock;
  const unitsPerPack = drug.unitsPerPack || 1;

  // 1. Classification Check (Units vs Packs)
  let alertType: 'NORMAL' | 'OUT_OF_STOCK_SOLD' | 'OUT_OF_STOCK_DEFAULT' | 'MANUAL_MINIMUM_REACHED' | 'PREDICTIVE_SHORTAGE' = 'NORMAL';
  const stockDays = avgDailySales > 0 ? stock / avgDailySales : null;

  if (stock <= 0) {
    alertType = avgDailySales > 0 ? 'OUT_OF_STOCK_SOLD' : 'OUT_OF_STOCK_DEFAULT';
  } else if (minStock > 0 && stock <= minStock * unitsPerPack) {
    alertType = 'MANUAL_MINIMUM_REACHED';
  } else if (stockDays !== null && stockDays < 14) {
    alertType = 'PREDICTIVE_SHORTAGE';
  }

  // 2. High Precision Weekly Lost Sales (using money engine)
  const weeklyLostPacks = (avgDailySales / unitsPerPack) * 7;
  const weeklyLostSales = stock === 0
    ? money.multiply(drug.costPrice, Math.round(weeklyLostPacks * 10000), 4)
    : 0;

  // 3. Suggested Order Quantity (in packs)
  const safetyStockPacks = avgDailySales > 0
    ? Math.max(0, Math.ceil((14 * avgDailySales * 1.5 - stock) / unitsPerPack))
    : 0;
  const minStockReplenishPacks = (stock <= minStock * unitsPerPack && minStock > 0)
    ? Math.max(0, minStock - Math.floor(stock / unitsPerPack))
    : 0;
  const suggestedQty = Math.max(safetyStockPacks, minStockReplenishPacks);

  return {
    alertType,
    weeklyLostSales,
    suggestedQty,
  };
}

describe('Shortage & Reorder Precision Logic', () => {
  it('correctly compares stock in units with manual minStock scaled to units', () => {
    // Min stock = 5 packs, each pack = 10 units -> min limit = 50 units.
    // Case A: Stock is 45 units (below 50 units). Should trigger MANUAL_MINIMUM_REACHED.
    const drugA: DrugMock = { stock: 45, minStock: 5, unitsPerPack: 10, costPrice: 100 };
    const resultA = calculateShortageItem(drugA, 0);
    expect(resultA.alertType).toBe('MANUAL_MINIMUM_REACHED');

    // Case B: Stock is 55 units (above 50 units). Should remain NORMAL.
    const drugB: DrugMock = { stock: 55, minStock: 5, unitsPerPack: 10, costPrice: 100 };
    const resultB = calculateShortageItem(drugB, 0);
    expect(resultB.alertType).toBe('NORMAL');
  });

  it('calculates the suggested order quantity correctly in packs/boxes', () => {
    // Min stock = 5 packs, unitsPerPack = 10.
    // Stock is 20 units (which is exactly 2 packs).
    // Replenishment should be: 5 - 2 = 3 packs.
    const drug: DrugMock = { stock: 20, minStock: 5, unitsPerPack: 10, costPrice: 100 };
    const result = calculateShortageItem(drug, 0);
    expect(result.suggestedQty).toBe(3);
  });

  it('uses 14-day sales velocity and safety buffers when daily sales are active', () => {
    // Min stock = 5 packs, unitsPerPack = 10.
    // Stock is 10 units. Daily sales = 4 units.
    // targetStock = 14 * 4 * 1.5 = 84 units required.
    // Shortage in units = 84 - 10 = 74 units.
    // In packs: CEIL(74 / 10) = 8 packs.
    const drug: DrugMock = { stock: 10, minStock: 5, unitsPerPack: 10, costPrice: 100 };
    const result = calculateShortageItem(drug, 4);
    expect(result.suggestedQty).toBe(8);
  });

  it('computes weekly lost sales with high-precision cents matching the money engine', () => {
    // Out of stock. Daily sales = 2.5 units. unitsPerPack = 10. Cost = 120.50 EGP.
    // weeklyLostPacks = (2.5 / 10) * 7 = 1.75 packs.
    // Expected lost sales = 1.75 * 120.50 = 210.875 EGP -> rounded to 210.88 EGP.
    const drug: DrugMock = { stock: 0, minStock: 5, unitsPerPack: 10, costPrice: 120.50 };
    const result = calculateShortageItem(drug, 2.5);
    expect(result.weeklyLostSales).toBe(210.88);
  });
});
