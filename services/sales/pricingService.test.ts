import { describe, expect, it } from 'vitest';
import { pricingService } from './pricingService';

describe('pricingService.calculateItemGrossTotal', () => {
  it('multiplies publicPrice by quantity with 0-decimal rounding', () => {
    expect(pricingService.calculateItemGrossTotal({ publicPrice: 35, quantity: 3 } as any)).toBe(105);
  });

  it('rounds fractional gross totals to cents', () => {
    expect(pricingService.calculateItemGrossTotal({ publicPrice: 7.5, quantity: 2 } as any)).toBe(15);
    expect(pricingService.calculateItemGrossTotal({ publicPrice: 10, quantity: 0 } as any)).toBe(0);
  });
});

describe('pricingService.calculateItemTotal', () => {
  it('returns gross total when no discount is present', () => {
    expect(pricingService.calculateItemTotal({ publicPrice: 50, quantity: 2 } as any)).toBe(100);
  });

  it('subtracts item-level discount from the gross total', () => {
    const item = { publicPrice: 50, quantity: 2, discount: 10 } as any;
    expect(pricingService.calculateItemTotal(item)).toBe(90);
  });

  it('treats a zero discount as no discount', () => {
    const item = { publicPrice: 50, quantity: 2, discount: 0 } as any;
    expect(pricingService.calculateItemTotal(item)).toBe(100);
  });
});

describe('pricingService.calculateOrderTotals', () => {
  it('computes totals with no discounts and no tax', () => {
    const items = [
      { publicPrice: 10, quantity: 3 } as any,
      { publicPrice: 5, quantity: 2 } as any,
    ];
    expect(pricingService.calculateOrderTotals(items)).toEqual({
      grossSubtotal: 40,
      netSubtotal: 40,
      finalTotal: 40,
      taxAmount: 0,
      subtotalExclTax: 40,
      totalDiscountAmount: 0,
    });
  });

  it('reflects item-level discounts only', () => {
    const items = [
      { publicPrice: 100, quantity: 1, discount: 10 } as any,
      { publicPrice: 50, quantity: 2 } as any,
    ];
    const totals = pricingService.calculateOrderTotals(items);
    expect(totals.grossSubtotal).toBe(200);
    expect(totals.netSubtotal).toBe(190);
    expect(totals.finalTotal).toBe(190);
    expect(totals.totalDiscountAmount).toBe(10);
    expect(totals.subtotalExclTax).toBe(190);
  });

  it('applies a global discount percentage to the net subtotal', () => {
    const items = [{ publicPrice: 100, quantity: 1 } as any];
    const totals = pricingService.calculateOrderTotals(items, 10);
    expect(totals.grossSubtotal).toBe(100);
    expect(totals.netSubtotal).toBe(100);
    expect(totals.finalTotal).toBe(90);
    expect(totals.totalDiscountAmount).toBe(10);
    expect(totals.subtotalExclTax).toBe(90);
  });

  it('allocates finalTotal across item weights for tax extraction', () => {
    const items = [
      { publicPrice: 100, quantity: 1, tax: 14 } as any,
      { publicPrice: 50, quantity: 2, tax: 14 } as any,
    ];
    const totals = pricingService.calculateOrderTotals(items);
    expect(totals.finalTotal).toBe(200);
    expect(totals.taxAmount).toBe(24.56);
    expect(totals.subtotalExclTax).toBe(175.44);
    expect(totals.totalDiscountAmount).toBe(0);
    expect(totals.subtotalExclTax + totals.taxAmount).toBe(totals.finalTotal);
  });

  it('allocates a globally discounted total across item weights for tax', () => {
    const items = [{ publicPrice: 100, quantity: 1, tax: 14 } as any];
    const totals = pricingService.calculateOrderTotals(items, 10);
    expect(totals.finalTotal).toBe(90);
    expect(totals.taxAmount).toBe(11.05);
    expect(totals.subtotalExclTax).toBe(78.95);
    expect(totals.subtotalExclTax + totals.taxAmount).toBe(totals.finalTotal);
  });

  it('only extracts tax for items with a tax rate above zero', () => {
    const items = [
      { publicPrice: 100, quantity: 1, tax: 14 } as any,
      { publicPrice: 50, quantity: 1, tax: 0 } as any,
    ];
    const totals = pricingService.calculateOrderTotals(items);
    expect(totals.finalTotal).toBe(150);
    expect(totals.taxAmount).toBe(12.28);
    expect(totals.subtotalExclTax).toBe(137.72);
  });

  it('handles an empty items list', () => {
    expect(pricingService.calculateOrderTotals([])).toEqual({
      grossSubtotal: 0,
      netSubtotal: 0,
      finalTotal: 0,
      taxAmount: 0,
      subtotalExclTax: 0,
      totalDiscountAmount: 0,
    });
  });

  it('handles a single item', () => {
    const totals = pricingService.calculateOrderTotals([{ publicPrice: 7.5, quantity: 2 } as any]);
    expect(totals.grossSubtotal).toBe(15);
    expect(totals.finalTotal).toBe(15);
    expect(totals.totalDiscountAmount).toBe(0);
  });

  it('handles a zero-quantity item alongside positive-quantity items', () => {
    const items = [
      { publicPrice: 10, quantity: 2, tax: 14 } as any,
      { publicPrice: 50, quantity: 0, tax: 14 } as any,
    ];
    const totals = pricingService.calculateOrderTotals(items);
    expect(totals.finalTotal).toBe(20);
    expect(totals.taxAmount).toBe(2.46);
    expect(totals.subtotalExclTax).toBe(17.54);
  });

  it.skip('CURRENTLY BUGGY (BUG-D6): all-zero-quantity cart with tax poisons totals with NaN', () => {
    // BUG-D6: must be 0; currently NaN. money.allocate(0, [0]) divides by totalRatio=0 (money.ts:101).
    // Test asserts the CORRECT value (0), red on current code. TODO: re-enable after BUG-D6 fix.
    const totals = pricingService.calculateOrderTotals([{ publicPrice: 10, quantity: 0, tax: 14 } as any]);
    expect(totals.taxAmount).toBe(0);
    expect(totals.subtotalExclTax).toBe(0);
    expect(totals.finalTotal).toBe(0);
  });
});

describe('pricingService.calculateRefundAmount', () => {
  it('returns 0 when nothing is selected', () => {
    const sale = { netTotal: 300, items: [{ saleItemId: 'A', publicPrice: 100, quantity: 2 }] } as any;
    expect(pricingService.calculateRefundAmount(sale, new Map())).toBe(0);
  });

  it('allocates the net total across items by gross weight and refunds the full selected line', () => {
    const sale = {
      netTotal: 300,
      total: 300,
      items: [
        { saleItemId: 'A', publicPrice: 100, quantity: 2 },
        { saleItemId: 'B', publicPrice: 50, quantity: 2 },
      ],
    } as any;
    expect(pricingService.calculateRefundAmount(sale, new Map([['A', 2]]))).toBe(200);
  });

  it('refunds a proportional share for partial quantity selection', () => {
    const sale = {
      netTotal: 300,
      items: [
        { saleItemId: 'A', publicPrice: 100, quantity: 2 },
        { saleItemId: 'B', publicPrice: 50, quantity: 2 },
      ],
    } as any;
    expect(pricingService.calculateRefundAmount(sale, new Map([['B', 1]]))).toBe(50);
  });

  it('falls back to item.id when saleItemId is missing', () => {
    const sale = { netTotal: 10, items: [{ id: 'X', publicPrice: 10, quantity: 1 }] } as any;
    expect(pricingService.calculateRefundAmount(sale, new Map([['X', 1]]))).toBe(10);
  });

  it('returns refunds whose full selection sums to the original net total even with discounts', () => {
    const sale = {
      netTotal: 140,
      items: [
        { saleItemId: 'A', publicPrice: 100, quantity: 1 },
        { saleItemId: 'B', publicPrice: 50, quantity: 1 },
      ],
    } as any;
    expect(pricingService.calculateRefundAmount(sale, new Map([['A', 1]]))).toBe(93.34);
    expect(pricingService.calculateRefundAmount(sale, new Map([['B', 1]]))).toBe(46.66);
  });

  it.skip('CURRENTLY BUGGY (BUG-D7): full-line refund loses a penny when line quantity divides unevenly', () => {
    // BUG-D7: must be 100; currently 99.99. divide(100,3) rounds 33.33 per unit,
    // then multiply(33.33,3) yields 99.99 — a full selection under-refunds vs its 100.00 share.
    // Test asserts the CORRECT value (100), red on current code. TODO: re-enable after BUG-D7 fix.
    const sale = {
      netTotal: 100,
      total: 100,
      items: [{ saleItemId: 'S1', id: 'S1', publicPrice: 100, quantity: 3 }],
    } as any;
    expect(pricingService.calculateRefundAmount(sale, new Map([['S1', 3]]))).toBe(100);
  });
});

describe('pricingService.calculateMaxDiscount', () => {
  it('returns the default 10% floor when margin is at or above 20%', () => {
    expect(pricingService.calculateMaxDiscount(40, 50)).toBe(10);
    expect(pricingService.calculateMaxDiscount(0, 100)).toBe(10);
  });

  it('caps at half the margin when margin is below 20%', () => {
    expect(pricingService.calculateMaxDiscount(42.5, 50)).toBe(7);
  });

  it('uses a positive manualMaxDiscount as an override', () => {
    expect(pricingService.calculateMaxDiscount(40, 50, 25)).toBe(25);
    expect(pricingService.calculateMaxDiscount(42.5, 50, 3)).toBe(3);
  });

  it('ignores a zero manualMaxDiscount and falls back to the calculated cap', () => {
    expect(pricingService.calculateMaxDiscount(40, 50, 0)).toBe(10);
  });

  it('clamps the result to zero when the margin is zero or negative', () => {
    expect(pricingService.calculateMaxDiscount(0, 0)).toBe(0);
    expect(pricingService.calculateMaxDiscount(200, 100)).toBe(0);
  });
});
