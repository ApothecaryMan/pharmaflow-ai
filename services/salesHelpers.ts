import { batchService } from '../services/inventory/batchService';
import {
  type CartItem,
  type Drug,
  type OrderModification,
  OrderModificationRecord,
  type Sale,
} from '../types';
import { idGenerator } from '../utils/idGenerator';
import { validateStock } from '../utils/inventory';
import * as stockOps from '../utils/stockOperations';

// --- Cancellation Logic ---
export const restoreStockForCancelledSale = (sale: Sale, inventory: Drug[]): Drug[] => {
  // Logic: The stock movement logging and batch restoration are now handled 
  // by the caller (hook) using stockOps.returnStock.
  // This helper remains for the bulk state update of the drug inventory array.

  // Return updated inventory array
  return inventory.map((drug) => {
    const matchingItems = sale.items.filter((i) => i.id === drug.id);
    if (matchingItems.length > 0) {
      const totalUnitsToRestore = matchingItems.reduce((sum, item) => {
        const units = stockOps.resolveUnits(item.quantity, !!item.isUnit, drug.unitsPerPack);
        return sum + units;
      }, 0);
      return {
        ...drug,
        stock: validateStock(drug.stock + totalUnitsToRestore),
        expiryDate: batchService.getEarliestExpiry(drug.id) || drug.expiryDate,
      };
    }
    return drug;
  });
};

// --- Modification Logic (Simple Diff) ---
