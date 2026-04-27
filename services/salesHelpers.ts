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
export const restoreStockForCancelledSale = async (
  inventory: Drug[],
  saleItems: CartItem[]
): Promise<Drug[]> => {
  return Promise.all(
    inventory.map(async (drug) => {
      const saleItem = saleItems.find((item) => item.id === drug.id);
      if (saleItem) {
        const totalUnitsToRestore = saleItem.quantity * (saleItem.isUnit ? 1 : drug.unitsPerPack || 1);
        return {
          ...drug,
          stock: validateStock(drug.stock + totalUnitsToRestore),
          expiryDate: (await batchService.getEarliestExpiry(drug.id, drug.branchId)) || drug.expiryDate,
        };
      }
      return drug;
    })
  );
};

// --- Modification Logic (Simple Diff) ---
