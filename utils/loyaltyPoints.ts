import { CartItem } from '../types';

/**
 * Loyalty point rate tiers for total purchase amount
 */
const TOTAL_RATE_TIERS = [
  { threshold: 20000, rate: 0.05 },
  { threshold: 10000, rate: 0.04 },
  { threshold: 5000, rate: 0.03 },
  { threshold: 1000, rate: 0.02 },
  { threshold: 100, rate: 0.01 },
] as const;

/**
 * Loyalty point rate tiers for individual item prices
 */
const ITEM_RATE_TIERS = [
  { threshold: 20000, rate: 0.15 },
  { threshold: 10000, rate: 0.12 },
  { threshold: 5000, rate: 0.10 },
  { threshold: 1000, rate: 0.05 },
  { threshold: 500, rate: 0.03 },
  { threshold: 100, rate: 0.02 },
] as const;

/**
 * Gets the rate for a given value based on tier thresholds
 */
function getRateForValue(value: number, tiers: readonly { threshold: number; rate: number }[]): number {
  for (const tier of tiers) {
    if (value > tier.threshold) return tier.rate;
  }
  return 0;
}

/**
 * Calculates loyalty points earned from a sale.
 * Points are calculated based on:
 * 1. Total purchase amount (tiered rates)
 * 2. Individual item prices (bonus points for high-value items)
 * 
 * @param total - Total sale amount
 * @param items - Cart items in the sale
 * @returns Points earned (rounded to 1 decimal place)
 */
export function calculateLoyaltyPoints(total: number, items: CartItem[]): number {
  // Calculate points from total purchase amount
  const totalRate = getRateForValue(total, TOTAL_RATE_TIERS);
  const totalPoints = total * totalRate;

  // Calculate bonus points from individual high-value items
  let itemPoints = 0;
  items.forEach(item => {
    // Normalize price for unit items
    let price = item.price;
    if (item.isUnit && item.unitsPerPack) {
      price = item.price / item.unitsPerPack;
    }
    
    const itemRate = getRateForValue(price, ITEM_RATE_TIERS);
    if (itemRate > 0) {
      itemPoints += price * item.quantity * itemRate;
    }
  });

  const rawPoints = totalPoints + itemPoints;
  return parseFloat(rawPoints.toFixed(1));
}
