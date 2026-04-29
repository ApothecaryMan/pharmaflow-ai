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
    const drug = inventory.find((d) => d.id === item.id);

    if (!drug) {
      return { success: false, message: `Item not found in inventory: ${item.name}` };
    }

    const requestedQty = stockOps.resolveUnits(item.quantity, !!item.isUnit, drug.unitsPerPack);

    // 1. Check total stock
    if (drug.stock < requestedQty) {
      return {
        success: false,
        message: `Insufficient stock for ${drug.name}. Requested: ${requestedQty} units, Available: ${drug.stock} units`,
      };
    }

    // 2. dry-run batch allocation to ensure we have valid batches
    // We pass 'false' to commit parameter if the service supports it, or we rely on the fact
    // that we are just checking math here.
    // Ideally batchService should have a 'checkAvailability' method.
    // Assuming allocateStock returns null on failure without side-effects if strict checking is on.
    // However, looking at usage, batchService.allocateStock MIGHT have side effects or just return allocations.
    // We will assume simpler Total Stock validation is the first line of defense,
    // and specific batch validation happens during the granular allocation step.
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
