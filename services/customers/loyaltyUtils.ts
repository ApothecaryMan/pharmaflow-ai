import type { Sale } from '../../types';

/**
 * Calculates loyalty points for a single sale based on tiered business rules.
 * 
 * Rules:
 * 1. Order Points: Percentage of total sale based on tiers (1% to 5%).
 * 2. Item Points: Percentage of individual item prices based on tiers (2% to 15%).
 */
export const calculateSalePoints = (sale: Sale) => {
  // 1. Order-level Points (based on total)
  let totalRate = 0;
  if (sale.total > 20000) totalRate = 0.05;
  else if (sale.total > 10000) totalRate = 0.04;
  else if (sale.total > 5000) totalRate = 0.03;
  else if (sale.total > 1000) totalRate = 0.02;
  else if (sale.total > 100) totalRate = 0.01;

  const orderPoints = sale.total * totalRate;

  // 2. Item-level Points (based on price)
  let itemPoints = 0;
  sale.items.forEach((item) => {
    let itemRate = 0;
    let price = item.price;
    if (item.isUnit && item.unitsPerPack) {
      price = item.price / item.unitsPerPack;
    }

    if (price > 20000) itemRate = 0.15;
    else if (price > 10000) itemRate = 0.12;
    else if (price > 5000) itemRate = 0.1;
    else if (price > 1000) itemRate = 0.05;
    else if (price > 500) itemRate = 0.03;
    else if (price > 100) itemRate = 0.02;

    if (itemRate > 0) {
      itemPoints += price * item.quantity * itemRate;
    }
  });

  return {
    orderPoints: parseFloat(orderPoints.toFixed(1)),
    itemPoints: parseFloat(itemPoints.toFixed(1)),
    totalEarned: parseFloat((orderPoints + itemPoints).toFixed(1)),
  };
};
