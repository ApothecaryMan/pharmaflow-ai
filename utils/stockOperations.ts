import { batchService } from '../services/inventory/batchService';
import { stockMovementService } from '../services/inventory/stockMovement/stockMovementService';
import type { BatchAllocation, CartItem, Drug, StockBatch, StockMovementType } from '../types';
import { getFullDisplayName } from './drugDisplayName';
import { assertStockSufficient, validateStock } from './inventory';
import { money } from './money';
import { convertToPacks, resolveDisplayStock, resolvePrice, resolveUnits } from './stockUtils';

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

  // 1. Set Context for Trigger
  await stockMovementService.setContext(
    type,
    referenceId,
    ctx.performedBy,
    ctx.performedByName,
    reason
  );

  const allocations = await batchService.allocateStock(drug.id, unitsToDeduct, ctx.branchId, true);

  if (!allocations) return null;

  const previousStock = drug.stock;
  const newStock = validateStock(previousStock - unitsToDeduct);

  // Note: Manual logMovement removed (handled by DB trigger)

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

  // 1. Set Context for Trigger
  await stockMovementService.setContext(
    type,
    referenceId,
    ctx.performedBy,
    ctx.performedByName,
    reason
  );

  // 2. Create Batch
  await batchService.createBatch(
    {
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
    },
    ctx.branchId
  );

  // Note: Manual logMovement removed (handled by DB trigger)

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

  // 1. Set Context for Trigger
  await stockMovementService.setContext(
    type,
    referenceId,
    ctx.performedBy,
    ctx.performedByName,
    reason
  );

  // 2. Return to batches if allocations exist
  if (allocations && allocations.length > 0) {
    let remainingToReturn = unitsToRestore;
    const returnsToMake: BatchAllocation[] = [];

    for (const alloc of allocations) {
      if (remainingToReturn <= 0) break;
      const returnQty = Math.min(alloc.quantity, remainingToReturn);
      returnsToMake.push({ ...alloc, quantity: returnQty });
      remainingToReturn -= returnQty;
    }

    if (returnsToMake.length > 0) {
      const quantityCoveredByAllocations = returnsToMake.reduce(
        (sum, alloc) => sum + alloc.quantity,
        0
      );
      await batchService.returnStock(
        returnsToMake,
        quantityCoveredByAllocations,
        drug.id,
        ctx.branchId
      );
    }
  }

  // Note: Manual logMovement removed (handled by DB trigger)

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
export const deductStockSimple = async (
  drug: Drug,
  quantity: number,
  isUnit: boolean,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  referenceId?: string
): Promise<StockMutation> => {
  const unitsToRemove = resolveUnits(quantity, isUnit, drug.unitsPerPack);

  // BUG-S3: Assert stock sufficiency before deduction (purchase returns path)
  assertStockSufficient(drug.stock, unitsToRemove, drug.name);

  // 1. Set Context for Trigger
  await stockMovementService.setContext(
    type,
    referenceId,
    ctx.performedBy,
    ctx.performedByName,
    reason
  );

  const previousStock = drug.stock;
  const newStock = validateStock(previousStock - unitsToRemove);

  // Note: Manual logMovement removed (handled by DB trigger)

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

  // 1. Set Context for Trigger (Database Audit)
  await stockMovementService.setContext(
    'adjustment',
    options?.transactionId,
    ctx.performedBy,
    ctx.performedByName,
    reason,
    options?.notes
  );

  const status = options?.status || 'approved';

  // 2. Update Batch logic
  if (status === 'approved') {
    if (options?.batchId) {
      // Direct batch update
      await batchService.updateBatchQuantity(options.batchId, diff);
    } else {
      // Generic adjustment: create or deduct
      if (diff > 0) {
        // Increase: Create a new manual adjustment batch
        await batchService.createBatch(
          {
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
          },
          ctx.branchId
        );
      } else {
        // Decrease: Deduct from existing batches (FEFO)
        const unitsToDeduct = Math.abs(diff);
        await batchService.allocateStock(drug.id, unitsToDeduct, ctx.branchId, true);
      }
    }
  }

  // Note: Manual logMovement removed because it is handled by the unified DB trigger
  // For offline/IndexedDB support, we might need a different sync strategy later.

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

  // 1. Set Context for Trigger
  await stockMovementService.setContext(
    type,
    options?.referenceId,
    ctx.performedBy,
    ctx.performedByName,
    reason,
    options?.notes
  );

  // 2. Target specific batch
  await batchService.updateBatchQuantity(batchId, -quantityUnits);

  // Note: Manual logMovement removed (handled by DB trigger)

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
export const logInitialStock = async (drug: Drug, ctx: StockOperationContext): Promise<void> => {
  if (drug.stock <= 0) return;

  await stockMovementService.logMovement({
    drugId: drug.id,
    drugName: getFullDisplayName(drug), // Use full display name snapshot
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
  drugName: string,
  dosageForm: string,
  totalStockUnits: number,
  unitsPerPack: number | undefined,
  currentCart: CartItem[],
  delta: number,
  isUnit: boolean
): boolean => {
  // Calculate existing units in cart for this drug (all batches/modes)
  const existingUnits = currentCart
    .filter((item) => item.name === drugName && (item.dosageForm || '') === (dosageForm || ''))
    .reduce((sum, item) => {
      return sum + resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack || unitsPerPack);
    }, 0);

  // Calculate new units to be added
  const newUnits = resolveUnits(delta, isUnit, unitsPerPack);

  return existingUnits + newUnits <= totalStockUnits;
};
