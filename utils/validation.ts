import { batchService } from '../services/inventory/batchService';
import { type CartItem, type Drug, Sale } from '../types';
import * as stockOps from './stockOperations';

export interface ValidationResult {
  success: boolean;
  message?: string;
}

export const validateStockAvailability = (
  items: CartItem[],
  inventory: Drug[]
): ValidationResult => {
  for (const item of items) {
    // Inventory contains grouped items (where id = template.id), but cart items might have id = batch.id
    const drug = inventory.find(
      (d) => d.id === item.id || d.batches?.some((b) => b.id === item.id)
    );

    if (!drug) {
      // Fallback display name for better error clarity
      const displayName = item.name || item.internalCode || item.id;
      return { success: false, message: `Item not found in inventory: ${displayName}` };
    }

    // Determine the actual batch inside the group if the cart item was a batch
    const targetBatch = drug.id === item.id ? drug : drug.batches?.find(b => b.id === item.id) || drug;

    const requestedQty = stockOps.resolveUnits(item.quantity, !!item.isUnit, targetBatch.unitsPerPack);

    // 1. Check total stock against the specific batch or group
    // We check against targetBatch.stock so it validates the exact batch added
    if ((targetBatch.stock || 0) < requestedQty) {
      return {
        success: false,
        message: `Insufficient stock for ${targetBatch.name || drug.name}. Requested: ${requestedQty} units, Available: ${targetBatch.stock} units`,
      };
    }
  }

  return { success: true };
};

export const validateSaleData = (saleData: SaleData): ValidationResult => {
  if (!saleData.items || saleData.items.length === 0) {
    return { success: false, message: 'Cart is empty' };
  }

  if (saleData.total <= 0) {
    return { success: false, message: 'Sale total must be greater than zero' };
  }

  // Validate individual item quantities
  for (const item of saleData.items) {
    if (!item.quantity || item.quantity <= 0) {
      return { success: false, message: `Invalid quantity for ${item.name || 'item'}: must be positive` };
    }
    if (!Number.isInteger(item.quantity)) {
      return { success: false, message: `Quantity for ${item.name || 'item'} must be a whole number` };
    }
  }

  return { success: true };
};

// Re-export SaleData for convenience if needed, or import from types
// But SaleData is defined in useEntityHandlers.ts locally in the original file.
// We might need to extract it or perform structural typing.
interface SaleData {
  items: CartItem[];
  total: number;
  [key: string]: any;
}

export const validateDrug = (drug: Partial<Drug>): ValidationResult => {
  if (!drug.name || drug.name.trim().length < 2) {
    return { success: false, message: 'Drug name is required (min 2 chars)' };
  }
  if (!drug.publicPrice || drug.publicPrice < 0) {
    return { success: false, message: 'Invalid price' };
  }
  if (drug.stock !== undefined && drug.stock < 0) {
    return { success: false, message: 'Stock cannot be negative' };
  }
  return { success: true };
};
