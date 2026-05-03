/**
 * Stock Batch Service - FEFO (First Expiry First Out) Inventory Management
 * Business logic layer that orchestrates data access via BatchRepository.
 */

import { money } from '../../utils/money';
import * as stockOps from '../../utils/stockOperations';
import type { BatchAllocation, StockBatch, Drug, GroupedDrug, GroupingKey, CartItem } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { settingsService } from '../settings/settingsService';
import { batchRepository } from './repositories/batchRepository';

/**
 * Canonical grouping key strategy: barcode || (name|dosageForm|manufacturer)
 * This is the SINGLE source of truth for drug identity across the system.
 */
export const getGroupingKey = (drug: Drug | Partial<Drug>): GroupingKey => {
  if (drug.barcode) return `BARCODE|${drug.barcode}`;
  const name = drug.name || '';
  const form = drug.dosageForm || '';
  const mfr = drug.manufacturer || '';
  return `NAME|${name}|${form}|${mfr}`;
};

export const batchService = {
  async getAllBatches(branchId?: string, drugId?: string, drugIds?: string[]): Promise<StockBatch[]> {
    return batchRepository.getAll(branchId, drugId, drugIds);
  },

  async getBatchById(batchId: string): Promise<StockBatch | null> {
    return batchRepository.getById(batchId);
  },

  async createBatch(batch: Omit<StockBatch, 'id'>, branchId?: string): Promise<StockBatch> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || batch.branchId || settings.activeBranchId;
    
    // 1. Check for existing batch with same drug, branch, and expiry
    const existing = await batchRepository.findExistingBatch(batch.drugId, effectiveBranchId, batch.expiryDate || null);

    if (existing) {
      // Merge into the matching batch
      const oldQty = existing.quantity || 0;
      const oldCost = existing.costPrice || 0;
      const addedQty = batch.quantity || 0;
      const addedCost = batch.costPrice || 0;
      
      const newQty = oldQty + addedQty;
      let newCost = oldCost;
      
      if (newQty > 0) {
         // Weighted average cost using precision money engine
         const oldTotalValue = money.multiply(oldCost, oldQty, 0);
         const addedTotalValue = money.multiply(addedCost, addedQty, 0);
         const totalValue = money.add(oldTotalValue, addedTotalValue);
         newCost = money.divide(totalValue, newQty);
      }
      
      // Use atomic increment for safety during merging
      const success = await batchRepository.atomicIncrement(existing.id, addedQty);
      if (!success) throw new Error(`Failed to merge into batch: ${existing.id}`);
      
      // Update the cost price separately since RPC only updates quantity
      await batchRepository.update(existing.id, { 
        costPrice: newCost, 
        dateReceived: new Date().toISOString() 
      });
        
      const updatedBatch = await batchRepository.getById(existing.id);
      return updatedBatch!;
    }

    const newBatch: StockBatch = {
      ...batch,
      id: idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: settings.orgId,
      version: 1, 
    };

    await batchRepository.insert(newBatch);
    return newBatch;
  },

  async updateBatchQuantity(batchId: string, delta: number, skipFetch: boolean = false): Promise<StockBatch | null> {
    const success = await batchRepository.atomicIncrement(batchId, delta);
    if (!success) {
      throw new Error(`Insufficient batch stock or missing batch: ${batchId}`);
    }
    
    if (skipFetch) return null;
    return batchRepository.getById(batchId);
  },

  async updateBatch(batchId: string, updates: Partial<StockBatch>): Promise<StockBatch | null> {
    await batchRepository.update(batchId, updates);
    return batchRepository.getById(batchId);
  },

  async allocateStockBulk(
    requests: { drugId: string; quantity: number; name?: string; preferredBatchId?: string }[],
    branchId: string,
    referenceDate: Date = new Date()
  ): Promise<{ drugId: string; allocations: BatchAllocation[] }[]> {
    const validRequests = requests.filter(req => req.quantity > 0);
    const drugIds = [...new Set(validRequests.map(r => r.drugId))];

    // --- Optimization: Fetch all batches for all requested drugs in ONE query ---
    const allBatches = await this.getAllBatches(branchId, undefined, drugIds);
    const batchesByDrug = drugIds.reduce((acc, id) => {
      acc[id] = allBatches.filter(b => b.drugId === id);
      return acc;
    }, {} as Record<string, StockBatch[]>);
    
    // Process all allocation requests in parallel for maximum speed
    const results = await Promise.all(validRequests.map(async (req) => {
      const drugBatches = batchesByDrug[req.drugId] || [];
      const allocs = await this.allocateStock(req.drugId, req.quantity, branchId, true, req.preferredBatchId, drugBatches, referenceDate);
      if (!allocs) throw new Error(`Insufficient stock for: ${req.name || req.drugId}`);
      return { drugId: req.drugId, allocations: allocs };
    }));
    
    return results;
  },

  async allocateStock(
    drugId: string,
    quantityNeeded: number,
    branchId: string,
    commitChanges: boolean = true,
    preferredBatchId?: string,
    preFetchedBatches?: StockBatch[],
    referenceDate: Date = new Date()
  ): Promise<BatchAllocation[] | null> {
    if (quantityNeeded <= 0) return null;

    const batches = preFetchedBatches || await this.getAllBatches(branchId, drugId);
    
    let validBatches = [...batches]
      .filter((b) => {
        const exp = parseExpiryEndOfMonth(b.expiryDate);
        return !isNaN(exp.getTime()) && exp > referenceDate;
      });
      
    // Sort logic: if preferredBatchId matches, it comes first. Otherwise sort by expiry.
    validBatches.sort((a, b) => {
      if (preferredBatchId) {
        if (a.id === preferredBatchId) return -1;
        if (b.id === preferredBatchId) return 1;
      }
      return parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime();
    });

    const totalAvailable = validBatches.reduce((sum, b) => sum + b.quantity, 0);
    if (totalAvailable < quantityNeeded) return null;

    const allocations: BatchAllocation[] = [];
    let remaining = quantityNeeded;

    for (const batch of validBatches) {
      if (remaining <= 0) break;
      const allocateFromThis = Math.min(batch.quantity, remaining);
      if (allocateFromThis > 0) {
        allocations.push({
          batchId: batch.id,
          quantity: allocateFromThis,
          expiryDate: batch.expiryDate,
          batchNumber: batch.batchNumber,
        });
        remaining -= allocateFromThis;
      }
    }

    if (commitChanges && allocations.length > 0) {
      const committedAllocations: BatchAllocation[] = [];
      try {
        for (const alloc of allocations) {
          await this.updateBatchQuantity(alloc.batchId, -alloc.quantity, true);
          committedAllocations.push(alloc);
        }
      } catch (err) {
        for (let i = committedAllocations.length - 1; i >= 0; i--) {
          const alloc = committedAllocations[i];
          await this.updateBatchQuantity(alloc.batchId, alloc.quantity, true);
        }
        throw err;
      }
    }
    return allocations;
  },

  async returnStock(
    allocations: BatchAllocation[],
    quantityToReturn: number,
    drugId: string,
    branchId: string,
    referenceDate: Date = new Date()
  ): Promise<void> {
    if (!allocations || allocations.length === 0 || quantityToReturn <= 0) return;

    let remainingToReturn = quantityToReturn;
    const sortedAllocations = [...allocations].sort((a, b) => b.quantity - a.quantity);

    for (const alloc of sortedAllocations) {
      if (remainingToReturn <= 0) break;
      const canReturnToThis = Math.min(alloc.quantity, remainingToReturn);
      if (canReturnToThis <= 0) continue;

      const success = await batchRepository.atomicIncrement(alloc.batchId, canReturnToThis);

      if (!success) {
        // Recreate batch if it was deleted but we are returning to it
        await this.createBatch({
          drugId,
          quantity: canReturnToThis,
          expiryDate: alloc.expiryDate,
          costPrice: 0,
          dateReceived: referenceDate.toISOString(),
          batchNumber: alloc.batchNumber || 'RECREATED',
          branchId: branchId,
          orgId: (await settingsService.getAll()).orgId,
          version: 1,
        });
      }
      
      remainingToReturn -= canReturnToThis;
    }
  },

  async getTotalStock(drugId: string, branchId?: string): Promise<number> {
    const batches = await this.getAllBatches(branchId, drugId);
    return batches.reduce((sum, b) => sum + b.quantity, 0);
  },

  async getEarliestExpiry(drugId: string, branchId?: string): Promise<string | null> {
    const batches = await this.getAllBatches(branchId, drugId);
    const valid = batches
      .filter((b) => b.quantity > 0)
      .sort((a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime());
    return valid.length > 0 ? valid[0].expiryDate : null;
  },

  async calculateGlobalWAC(drugId: string, branchId?: string): Promise<number> {
    const batches = await this.getAllBatches(branchId, drugId);
    const activeBatches = batches.filter((b) => b.quantity > 0);
    if (activeBatches.length === 0) return 0;

    let totalValue = 0;
    let totalQuantity = 0;

    for (const b of activeBatches) {
      totalValue = money.add(totalValue, money.multiply(b.costPrice, b.quantity, 0));
      totalQuantity += b.quantity;
    }

    return totalQuantity > 0 ? money.divide(totalValue, totalQuantity) : 0;
  },

  async hasStock(drugId: string, quantityNeeded: number, branchId: string): Promise<boolean> {
    const total = await this.getTotalStock(drugId, branchId);
    return total >= quantityNeeded;
  },

  async getStockSummary(drugId: string, branchId?: string) {
    const batches = await this.getAllBatches(branchId, drugId);
    const activeBatches = batches.filter((b) => b.quantity > 0);
    return {
      totalStock: activeBatches.reduce((sum, b) => sum + b.quantity, 0),
      batchCount: activeBatches.length,
      earliestExpiry: await this.getEarliestExpiry(drugId, branchId),
      batches: activeBatches.sort(
        (a, b) => parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime()
      ),
    };
  },

  groupInventory(drugs: Drug[]): GroupedDrug[] {
    const groups: Record<GroupingKey, (Drug & { batches?: Drug[] })[]> = {};

    drugs.forEach((drug) => {
      const key = getGroupingKey(drug);
      if (!groups[key]) groups[key] = [];
      groups[key].push(drug);
    });

    return Object.entries(groups).map(([key, items]) => {
      const allBatchesInGroup: Drug[] = [];
      items.forEach(d => {
        if (d.batches && d.batches.length > 0) {
          allBatchesInGroup.push(...d.batches);
        } else {
          allBatchesInGroup.push(d);
        }
      });

      const sortedBatches = [...allBatchesInGroup].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        const dateA = parseExpiryEndOfMonth(a.expiryDate).getTime();
        const dateB = parseExpiryEndOfMonth(b.expiryDate).getTime();
        return isNaN(dateA) ? 1 : isNaN(dateB) ? -1 : dateA - dateB;
      });

      const earliest = sortedBatches[0];
      const totalStock = sortedBatches.reduce((sum, b) => sum + (b.stock || 0), 0);

      return {
        ...earliest,
        groupId: key,
        totalStock,
        batches: sortedBatches,
        id: earliest.id,
        stock: totalStock, // Compatibility
      } as GroupedDrug;
    });
  },

  autoDistributeQuantities(
    totalPacks: number,
    totalUnits: number,
    batches: Drug[],
    preferredBatchId?: string
  ): { batchId: string; packQty: number; unitQty: number }[] {
    const unitsPerPack = batches[0]?.unitsPerPack || 1;
    const totalRequestedUnits = totalPacks * unitsPerPack + totalUnits;
    let remainingUnits = totalRequestedUnits;

    const sortedBatches = [...batches].sort((a, b) => {
      if (preferredBatchId) {
        if (a.id === preferredBatchId) return -1;
        if (b.id === preferredBatchId) return 1;
      }
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime();
    });

    const results: { batchId: string; packQty: number; unitQty: number }[] = [];

    for (const batch of sortedBatches) {
      if (remainingUnits <= 0) break;
      const batchMaxUnits = (batch.stock || 0);
      const takeUnits = Math.min(batchMaxUnits, remainingUnits);

      if (takeUnits > 0) {
        const pQty = Math.floor(takeUnits / unitsPerPack);
        const uQty = takeUnits % unitsPerPack;
        results.push({ batchId: batch.id, packQty: pQty, unitQty: uQty });
        remainingUnits -= takeUnits;
      }
    }

    return results;
  },

  findTargetBatch(
    group: GroupedDrug,
    currentCart: CartItem[],
    selectedBatchId?: string
  ): Drug | null {
    if (selectedBatchId) {
      const selected = group.batches.find((b) => b.id === selectedBatchId);
      if (selected) return selected;
    }

    for (const batch of group.batches) {
      const inCartUnits = currentCart
        .filter((item) => item.id === batch.id)
        .reduce((sum, item) => {
          const units = item.isUnit ? item.quantity : item.quantity * (item.unitsPerPack || 1);
          return sum + units;
        }, 0);

      if ((batch.stock || 0) > inCartUnits) {
        return batch;
      }
    }

    return group.batches[0] || null;
  },

  async deleteBatchById(batchId: string): Promise<boolean> {
    return batchRepository.delete(batchId);
  },

  async deleteBatchesByDrugId(drugId: string): Promise<boolean> {
    return batchRepository.deleteByDrugId(drugId);
  },

  validateCartStock: async (cart: CartItem[], branchId: string): Promise<{ drugId: string, name: string, available: number, required: number }[]> => {
    const groupedRequirements = new Map<string, number>();
    
    cart.forEach(item => {
      const units = stockOps.resolveUnits(item.quantity, !!item.isUnit, item.unitsPerPack);
      groupedRequirements.set(item.id, (groupedRequirements.get(item.id) || 0) + units);
    });

    const issues: { drugId: string, name: string, available: number, required: number }[] = [];

    for (const [drugId, required] of groupedRequirements.entries()) {
      const drugBatches = await batchService.getAllBatches(branchId, drugId);
      const totalAvailable = drugBatches.reduce((sum, b) => sum + b.quantity, 0);
      
      if (totalAvailable < required) {
        const first = cart.find(i => i.id === drugId);
        issues.push({
          drugId,
          name: first?.name || 'Unknown',
          available: totalAvailable,
          required
        });
      }
    }

    return issues;
  }
};
