import { PurchaseItem } from '../../../types';
import { money, pricing } from '../../../utils/money';

export const computeUpdatedItem = (
  i: PurchaseItem,
  field: keyof PurchaseItem,
  value: number | string
): PurchaseItem => {
  // T3: Allow empty string to pass through for better typing UX
  const updatedItem = { ...i, [field]: value };

  // Convert to number for calculations, but keep string for display if empty
  const numValue =
    value === '' ? 0 : typeof value === 'number' ? value : parseFloat(value as string) || 0;

  // Auto-format expiry date: 1125 -> 2025-11-01 (ISO format)
  if (
    field === 'expiryDate' &&
    typeof value === 'string' &&
    value.length === 4 &&
    /^\d+$/.test(value)
  ) {
    const month = value.slice(0, 2);
    const year = value.slice(2);
    updatedItem.expiryDate = `20${year}-${month}`;
  }

  // Interdependent Calculation Logic (Smart Sync Chain)
  if (field === 'discount') {
    updatedItem.costPrice = pricing.afterDiscount(i.publicPrice, numValue);
    updatedItem.unitCostPrice = money.divide(updatedItem.costPrice, i.unitsPerPack || 1);
  } else if (field === 'costPrice') {
    if (i.publicPrice > 0) {
      updatedItem.discount = pricing.actualMargin(numValue, i.publicPrice);
    }
    updatedItem.unitCostPrice = money.divide(numValue, i.unitsPerPack || 1);
  } else if (field === 'unitCostPrice') {
    const newCost = money.multiply(numValue, i.unitsPerPack || 1, 0);
    const currentCostFromThisUnit = money.divide(i.costPrice, i.unitsPerPack || 1);
    if (!money.isEqual(currentCostFromThisUnit, numValue)) {
      updatedItem.costPrice = newCost;
      if (i.publicPrice > 0) {
        updatedItem.discount = pricing.actualMargin(updatedItem.costPrice, i.publicPrice);
      }
    }
  } else if (field === 'publicPrice') {
    updatedItem.costPrice = pricing.afterDiscount(numValue, i.discount || 0);
    updatedItem.unitPrice = money.divide(numValue, i.unitsPerPack || 1);
    updatedItem.unitCostPrice = money.divide(updatedItem.costPrice, i.unitsPerPack || 1);
  } else if (field === 'unitPrice') {
    const newSale = money.multiply(numValue, i.unitsPerPack || 1, 0);
    const currentSaleFromThisUnit = money.divide(i.publicPrice, i.unitsPerPack || 1);
    if (!money.isEqual(currentSaleFromThisUnit, numValue)) {
      updatedItem.publicPrice = newSale;
      if (updatedItem.publicPrice > 0) {
        updatedItem.discount = pricing.actualMargin(i.costPrice, updatedItem.publicPrice);
      }
    }
  } else if (field === 'tax') {
    updatedItem.tax = numValue;
  }

  return updatedItem;
};
