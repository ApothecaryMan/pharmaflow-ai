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
    const basePrice = item.publicPrice;
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
      return money.add(sum, money.multiply(item.publicPrice, item.quantity, 0));
    }, 0);

    // 2. Sum up all individual item net totals (after item-level discounts)
    const netSubtotal = items.reduce((sum, item) => {
      return money.add(sum, pricingService.calculateItemTotal(item));
    }, 0);

    // 3. Apply global discount to the net subtotal
    let finalTotal = netSubtotal;
    let globalDiscountAmount = 0;
    if (globalDiscountPercent > 0) {
      globalDiscountAmount = money.multiply(netSubtotal, globalDiscountPercent, 2);
      finalTotal = money.subtract(netSubtotal, globalDiscountAmount);
    }

    // 4. Calculate Tax per item and sum it up
    // Since we apply global discount to the total, we need to proportionally 
    // distribute the global discount across items to get the effective item price for tax.
    
    let totalTaxAmount = 0;
    const itemWeights = items.map(item => money.toSmallestUnit(pricingService.calculateItemTotal(item)));
    const allocatedFinalTotals = money.allocate(finalTotal, itemWeights);

    items.forEach((item, idx) => {
      const itemFinalTotal = allocatedFinalTotals[idx];
      const itemTaxRate = item.tax ?? 0; // Use item-specific tax rate or 0
      
      if (itemTaxRate > 0) {
        // Extract tax from the allocated final total of this item
        const itemTax = tax.inclusiveAmount(itemFinalTotal, itemTaxRate);
        totalTaxAmount = money.add(totalTaxAmount, itemTax);
      }
    });

    return {
      grossSubtotal,
      netSubtotal,
      finalTotal,
      taxAmount: totalTaxAmount,
      subtotalExclTax: money.subtract(finalTotal, totalTaxAmount),
      totalDiscountAmount: money.subtract(grossSubtotal, finalTotal),
    };
  },

  /**
   * Calculates the precise refund amount for selected items using the allocate algorithm.
   * This ensures that partial returns always sum up to the original net total.
   */
  calculateRefundAmount: (sale: any, selectedItems: Map<string, number>): number => {
    if (selectedItems.size === 0) return 0;

    // 1. Calculate the weights for all items in the original sale
    const itemWeights = sale.items.map((item: any) => {
      const itemTotal = money.multiply(item.publicPrice, item.quantity, 0);
      return money.toSmallestUnit(itemTotal);
    });

    // 2. Allocate the original netTotal across all items based on their weights
    const allocatedAmounts = money.allocate(sale.netTotal, itemWeights);

    // 3. Sum up the allocated shares for the selected items and their quantities
    let totalRefund = 0;
    sale.items.forEach((item: any, index: number) => {
      const lineKey = item.isUnit ? `${item.id}_unit` : `${item.id}_pack`;
      if (selectedItems.has(lineKey)) {
        const returnedQty = selectedItems.get(lineKey) || 0;
        // Share per single unit/pack in this line
        const sharePerFullQty = allocatedAmounts[index];
        const sharePerIndividualItem = money.divide(sharePerFullQty, item.quantity);
        
        const itemRefund = money.multiply(sharePerIndividualItem, returnedQty, 0);
        totalRefund = money.add(totalRefund, itemRefund);
      }
    });

    return totalRefund;
  }
};
