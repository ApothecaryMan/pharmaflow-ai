import { CartItem } from '../../types';
import { money, tax } from '../../utils/money';

/**
 * Pricing Service - Centralized logic for all financial calculations in POS and Sales.
 * Complies with Principle IV (Separation of Concerns).
 */
export const pricingService = {
  /**
   * Calculates the total for a single cart item, including precision-safe discounts.
   */
  calculateItemTotal: (item: CartItem): number => {
    // 1. Get base price
    const basePrice = item.price;
    const qty = item.quantity;
    
    // 2. Subtotal = Price * Quantity
    const subtotal = money.multiply(basePrice, qty, 0);
    
    // 3. Apply discount if exists
    if (item.discount && item.discount > 0) {
      // Amount * (Discount / 100)
      const discountAmount = money.multiply(subtotal, item.discount, 2);
      return money.subtract(subtotal, discountAmount);
    }
    
    return subtotal;
  },

  /**
   * Calculates the grand total for a list of items and a global discount.
   */
  calculateOrderTotals: (items: CartItem[], globalDiscountPercent: number = 0) => {
    // 1. Sum up all individual item totals (Gross Subtotal)
    const grossSubtotal = items.reduce((sum, item) => {
      return money.add(sum, money.multiply(item.price, item.quantity, 0));
    }, 0);

    // 2. Sum up all individual item net totals (after item-level discounts)
    const netSubtotal = items.reduce((sum, item) => {
      return money.add(sum, pricingService.calculateItemTotal(item));
    }, 0);

    // 3. Apply global discount to the net subtotal
    let finalTotal = netSubtotal;
    if (globalDiscountPercent > 0) {
      const globalDiscountAmount = money.multiply(netSubtotal, globalDiscountPercent, 2);
      finalTotal = money.subtract(netSubtotal, globalDiscountAmount);
    }

    // 4. Extract VAT using the tax engine (Inclusive)
    const taxRate = 14; // Default VAT in Egypt
    const { base: subtotalExclTax, taxAmount } = tax.invoiceTax(finalTotal, 0, taxRate, 'inclusive');

    return {
      grossSubtotal,
      netSubtotal,
      finalTotal,
      taxAmount,
      subtotalExclTax,
      totalDiscountAmount: money.subtract(grossSubtotal, finalTotal),
    };
  }
};
