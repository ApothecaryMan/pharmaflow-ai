import { batchService } from '../services/inventory/batchService';
import { stockMovementService } from '../services/inventory/stockMovement/stockMovementService';
import type { Drug, StockBatch, BatchAllocation, StockMovementType, CartItem } from '../types';
import { validateStock } from './inventory';

/**
 * Context for stock operations to ensure accurate movement logging.
 */
export interface StockOperationContext {
  branchId: string;
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
  return isUnit ? qty : qty * unitsPerPack;
};

/**
 * Deducts stock from inventory, handles batch allocation and movement logging.
 * Returns the mutation details for state updates.
 */
export const deductStock = (
  drug: Drug,
  quantity: number,
  isUnit: boolean,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  referenceId?: string
): StockMutation | null => {
  const unitsToDeduct = resolveUnits(quantity, isUnit, drug.unitsPerPack);
  const allocations = batchService.allocateStock(drug.id, unitsToDeduct, ctx.branchId, true);

  if (!allocations) return null;

  const previousStock = drug.stock;
  const newStock = validateStock(previousStock - unitsToDeduct);

  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
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
export const addStock = (
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
): StockMutation => {
  const unitsToAdd = resolveUnits(quantity, isUnit, drug.unitsPerPack);
  
  const previousStock = previousStockOverride !== undefined ? previousStockOverride : drug.stock;
  const newStock = validateStock(previousStock + unitsToAdd);

  // 1. Create Batch
  batchService.createBatch({
    drugId: drug.id,
    quantity: unitsToAdd,
    expiryDate: expiryDate || drug.expiryDate,
    costPrice,
    purchaseId: referenceId || 'ADJUSTMENT',
    dateReceived: new Date().toISOString(),
    batchNumber: batchNumber || 'MANUAL',
    branchId: ctx.branchId,
  });

  // 2. Log Movement
  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
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
 * Bulk deducts stock from inventory atomically (batch-wise).
 * Returns mutations for all items.
 */
export const bulkDeductStock = (
  items: CartItem[],
  inventory: Drug[],
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  referenceId: string
): StockMutation[] => {
  const mutations: StockMutation[] = [];

  items.forEach((item) => {
    const drug = inventory.find((d) => d.id === item.id);
    if (!drug) return;

    const unitsToDeduct = resolveUnits(item.quantity, !!item.isUnit, drug.unitsPerPack);
    const previousStock = drug.stock;
    const newStock = validateStock(previousStock - unitsToDeduct);

    stockMovementService.logMovement({
      drugId: drug.id,
      drugName: drug.name,
      branchId: ctx.branchId,
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

    mutations.push({
      drugId: drug.id,
      previousStock,
      newStock,
      unitsChanged: unitsToDeduct,
      allocations: item.batchAllocations,
    });
  });

  return mutations;
};

/**
 * Restores stock to batches and logs movement (used for cancellations or returns).
 */
export const returnStock = (
  drug: Drug,
  quantity: number,
  isUnit: boolean,
  allocations: BatchAllocation[] | undefined,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  referenceId?: string
): StockMutation => {
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
      batchService.returnStock(returnsToMake, drug.id);
    }
  }

  // 2. Log Movement
  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
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
  const previousStock = drug.stock;
  const newStock = validateStock(previousStock - unitsToRemove);

  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
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
export const adjustStock = (
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
): StockMutation | null => {
  const previousStock = drug.stock;
  const newStock = validateStock(newStockUnits);
  const diff = newStock - previousStock;

  if (diff === 0) return null;

  const status = options?.status || 'approved';

  // 1. Update Batch ONLY if approved AND batchId provided
  if (status === 'approved' && options?.batchId) {
    batchService.updateBatchQuantity(options.batchId, diff);
  }

  // 2. Log Movement
  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
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
export const deductFromBatch = (
  drug: Drug,
  batchId: string,
  quantityUnits: number,
  type: StockMovementType,
  reason: string,
  ctx: StockOperationContext,
  options?: { notes?: string; expiryDate?: string; referenceId?: string }
): StockMutation => {
  const previousStock = drug.stock;
  const newStock = validateStock(previousStock - quantityUnits);

  // 1. Target specific batch
  batchService.updateBatchQuantity(batchId, -quantityUnits);

  // 2. Log Movement
  stockMovementService.logMovement({
    drugId: drug.id,
    drugName: drug.name,
    branchId: ctx.branchId,
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
