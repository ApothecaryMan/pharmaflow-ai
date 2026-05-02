import { batchService } from '../services/inventory/batchService';
import { stockMovementService } from '../services/inventory/stockMovement/stockMovementService';
import type { Drug, StockBatch, BatchAllocation, StockMovementType, CartItem } from '../types';
import { validateStock, assertStockSufficient } from './inventory';
import { money } from './money';

/**
 * Context for stock operations to ensure accurate movement logging.
 */
export interface StockOperationContext {
  branchId: string;
  orgId?: string;
  performedBy: string;
  performedByName?: string;
}

/**
 * Represents a single stock change result.
 */
export interface StockMutation {
  drugId: string;
  previousStock: number;
  newStock: number;
  unitsChanged: number;
  allocations?: BatchAllocation[];
}

/**
 * Resolves total unit quantity based on input type (units or packs).
 */
export const resolveUnits = (qty: number, isUnit: boolean, unitsPerPack: number = 1): number => {
  const perPack = unitsPerPack || 1;
  return isUnit ? qty : qty * perPack;
};

/**
 * Resolves unit price based on input type.
 * Priority: 
 * 1. manualUnitPrice (if provided)
 * 2. Calculated via money.divide (if not provided)
 */
export const resolvePrice = (
  price: number, 
  isUnit: boolean, 
  unitsPerPack: number = 1,
  manualUnitPrice?: number
): number => {
  const perPack = unitsPerPack || 1;
  if (!isUnit) return price;
  
  // Use manual unit price if available (Bottom-Up)
  if (manualUnitPrice !== undefined && manualUnitPrice > 0) return manualUnitPrice;
  
  // Fallback to safe division
  return money.divide(price, perPack);
};

/**
 * Converts total units back to pack quantity.
 */
export const convertToPacks = (totalUnits: number, unitsPerPack: number = 1): number => {
  return money.divide(totalUnits, unitsPerPack || 1);
};

/**
 * Deducts stock from inventory, handles batch allocation and movement logging.
 * Returns the mutation details for state updates.
 */
export const deductStock = async (
  drug: Drug,
  quantity: number,
  isUnit: boolean,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  referenceId?: string
): Promise<StockMutation | null> => {
  const unitsToDeduct = resolveUnits(quantity, isUnit, drug.unitsPerPack);
  
  // BUG-S1: Assert stock sufficiency BEFORE allocating batches
  assertStockSufficient(drug.stock, unitsToDeduct, drug.name);
  
  const allocations = await batchService.allocateStock(drug.id, unitsToDeduct, ctx.branchId, true);

  if (!allocations) return null;

  const previousStock = drug.stock;
  const newStock = validateStock(previousStock - unitsToDeduct);

  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
    orgId: ctx.orgId,
    type,
    quantity: -unitsToDeduct,
    previousStock,
    newStock,
    reason,
    referenceId,
    performedBy: ctx.performedBy,
    performedByName: ctx.performedByName,
    status: 'approved',
  });

  return {
    drugId: drug.id,
    previousStock,
    newStock,
    unitsChanged: unitsToDeduct,
    allocations,
  };
};

/**
 * Adds stock to inventory, handles batch creation and movement logging.
 * Returns the mutation details for state updates.
 */
export const addStock = async (
  drug: Drug,
  quantity: number,
  isUnit: boolean,
  expiryDate: string | undefined,
  costPrice: number,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  referenceId?: string,
  batchNumber?: string,
  previousStockOverride?: number
): Promise<StockMutation> => {
  const unitsToAdd = resolveUnits(quantity, isUnit, drug.unitsPerPack);
  
  const previousStock = previousStockOverride !== undefined ? previousStockOverride : drug.stock;
  const newStock = validateStock(previousStock + unitsToAdd);

  // 1. Create Batch
  await batchService.createBatch({
    drugId: drug.id,
    quantity: unitsToAdd,
    expiryDate: expiryDate || drug.expiryDate,
    costPrice,
    purchaseId: referenceId || 'ADJUSTMENT',
    dateReceived: new Date().toISOString(),
    batchNumber: batchNumber || 'MANUAL',
    branchId: ctx.branchId,
    orgId: ctx.orgId,
    version: 1,
  }, ctx.branchId);

  // 2. Log Movement
  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
    orgId: ctx.orgId,
    type,
    quantity: unitsToAdd,
    previousStock,
    newStock,
    reason,
    referenceId,
    performedBy: ctx.performedBy,
    performedByName: ctx.performedByName,
    status: 'approved',
  });

  return {
    drugId: drug.id,
    previousStock,
    newStock,
    unitsChanged: unitsToAdd,
  };
};

/**
 * Restores stock to batches and logs movement (used for cancellations or returns).
 */
export const returnStock = async (
  drug: Drug,
  quantity: number,
  isUnit: boolean,
  allocations: BatchAllocation[] | undefined,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  referenceId?: string
): Promise<StockMutation> => {
  const unitsToRestore = resolveUnits(quantity, isUnit, drug.unitsPerPack);
  const previousStock = drug.stock;
  const newStock = validateStock(previousStock + unitsToRestore);

  // 1. Return to batches if allocations exist
  if (allocations && allocations.length > 0) {
    let remainingToReturn = unitsToRestore;
    const returnsToMake: BatchAllocation[] = [];
    
    for (const alloc of allocations) {
       if (remainingToReturn <= 0) break;
       const returnQty = Math.min(alloc.quantity, remainingToReturn);
       returnsToMake.push({...alloc, quantity: returnQty});
       remainingToReturn -= returnQty;
    }
    
    if (returnsToMake.length > 0) {
      const quantityCoveredByAllocations = returnsToMake.reduce((sum, alloc) => sum + alloc.quantity, 0);
      await batchService.returnStock(returnsToMake, quantityCoveredByAllocations, drug.id, ctx.branchId);
    }
  }

  // 2. Log Movement
  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
    orgId: ctx.orgId,
    type,
    quantity: unitsToRestore,
    previousStock,
    newStock,
    reason,
    referenceId,
    performedBy: ctx.performedBy,
    performedByName: ctx.performedByName,
    status: 'approved',
  });

  return {
    drugId: drug.id,
    previousStock,
    newStock,
    unitsChanged: unitsToRestore,
  };
};

/**
 * Removes stock (e.g. for supplier returns) and logs movement.
 */
export const deductStockSimple = (
  drug: Drug,
  quantity: number,
  isUnit: boolean,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  referenceId?: string
): StockMutation => {
  const unitsToRemove = resolveUnits(quantity, isUnit, drug.unitsPerPack);
  
  // BUG-S3: Assert stock sufficiency before deduction (purchase returns path)
  assertStockSufficient(drug.stock, unitsToRemove, drug.name);
  
  const previousStock = drug.stock;
  const newStock = validateStock(previousStock - unitsToRemove);

  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
    orgId: ctx.orgId,
    type,
    quantity: -unitsToRemove,
    previousStock,
    newStock,
    reason,
    referenceId,
    performedBy: ctx.performedBy,
    performedByName: ctx.performedByName,
    status: 'approved',
  });

  return {
    drugId: drug.id,
    previousStock,
    newStock,
    unitsChanged: unitsToRemove,
  };
};

/**
 * Adjusts stock for inventory counts or manual edits.
 */
export const adjustStock = async (
  drug: Drug,
  newStockUnits: number,
  reason: string,
  ctx: StockOperationContext,
  options?: {
    batchId?: string;
    notes?: string;
    transactionId?: string;
    status?: 'approved' | 'pending';
    expiryDate?: string;
  }
): Promise<StockMutation | null> => {
  const previousStock = drug.stock;
  const newStock = validateStock(newStockUnits);
  const diff = newStock - previousStock;

  if (diff === 0) return null;

  const status = options?.status || 'approved';

  // 1. Update Batch logic
  if (status === 'approved') {
    if (options?.batchId) {
      // Direct batch update
      await batchService.updateBatchQuantity(options.batchId, diff);
    } else {
      // Generic adjustment: create or deduct
      if (diff > 0) {
        // Increase: Create a new manual adjustment batch
        await batchService.createBatch({
          drugId: drug.id,
          quantity: diff,
          expiryDate: options?.expiryDate || drug.expiryDate,
          costPrice: drug.costPrice,
          purchaseId: options?.transactionId || 'ADJUSTMENT',
          dateReceived: new Date().toISOString(),
          batchNumber: 'MANUAL-ADJUST',
          branchId: ctx.branchId,
          orgId: ctx.orgId,
          version: 1,
        }, ctx.branchId);
      } else {
        // Decrease: Deduct from existing batches (FEFO)
        const unitsToDeduct = Math.abs(diff);
        await batchService.allocateStock(drug.id, unitsToDeduct, ctx.branchId, true);
      }
    }
  }

  // 2. Log Movement
  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
    orgId: ctx.orgId,
    type: 'adjustment',
    quantity: diff,
    previousStock,
    newStock,
    reason,
    notes: options?.notes,
    transactionId: options?.transactionId,
    batchId: options?.batchId,
    expiryDate: options?.expiryDate || drug.expiryDate,
    performedBy: ctx.performedBy,
    performedByName: ctx.performedByName,
    status,
  });

  return {
    drugId: drug.id,
    previousStock,
    newStock,
    unitsChanged: Math.abs(diff),
  };
};

/**
 * Deducts from a specific batch (used for damage/returns in Expiry Module).
 */
export const deductFromBatch = async (
  drug: Drug,
  batchId: string,
  quantityUnits: number,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  options?: { notes?: string; expiryDate?: string; referenceId?: string }
): Promise<StockMutation> => {
  const previousStock = drug.stock;
  const newStock = validateStock(previousStock - quantityUnits);

  // 1. Target specific batch
  await batchService.updateBatchQuantity(batchId, -quantityUnits);

  // 2. Log Movement
  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
    orgId: ctx.orgId,
    type,
    quantity: -quantityUnits,
    previousStock,
    newStock,
    reason,
    notes: options?.notes,
    referenceId: options?.referenceId,
    batchId,
    expiryDate: options?.expiryDate || drug.expiryDate,
    performedBy: ctx.performedBy,
    performedByName: ctx.performedByName,
    status: 'approved',
  });

  return {
    drugId: drug.id,
    previousStock,
    newStock,
    unitsChanged: quantityUnits,
  };
};

/**
 * Logs an 'initial' movement for new product creation.
 */
export const logInitialStock = (
  drug: Drug,
  ctx: StockOperationContext
): void => {
  if (drug.stock <= 0) return;

  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
    orgId: ctx.orgId,
    type: 'initial',
    quantity: drug.stock,
    previousStock: 0,
    newStock: drug.stock,
    reason: 'Initial Inventory Setup',
    performedBy: ctx.performedBy,
    performedByName: ctx.performedByName,
    status: 'approved',
  });
};

/**
 * Validates if adding a specific quantity of a drug (in packs or units) 
 * would exceed the current total stock.
 * Used in POS to prevent adding more than available.
 */
export const isStockConstraintMet = (
  drugId: string,
  stock: number,
  unitsPerPack: number | undefined,
  currentCart: CartItem[],
  delta: number,
  isUnit: boolean
): boolean => {
  // Calculate existing units in cart for this drug
  const existingUnits = currentCart
    .filter((item) => item.id === drugId)
    .reduce((sum, item) => {
      return sum + resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack || unitsPerPack);
    }, 0);

  // Calculate new units to be added
  const newUnits = resolveUnits(delta, isUnit, unitsPerPack);

  return existingUnits + newUnits <= stock;
};

/**
 * Resolves stock value for display based on mode (pack vs unit).
 * Packs are shown as fractional values (e.g. 1.5 packs).
 */
export const resolveDisplayStock = (stock: number, unitsPerPack: number = 1, mode: 'pack' | 'unit'): number => {
  if (mode === 'unit') return stock;
  const packs = stock / (unitsPerPack || 1);
  return parseFloat(packs.toFixed(2));
};
