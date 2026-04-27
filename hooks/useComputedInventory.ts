import { useMemo } from 'react';
import type { Drug, StockBatch } from '../types';
import { permissionsService } from '../services/auth/permissions';

/**
 * Hook to derive computed inventory properties (stock, expiry) from batches.
 * This ensures that the drug list always reflects the sum of its batches,
 * eliminating divergence between the two data sources.
 */
export const useComputedInventory = (
  rawInventory: Drug[],
  batches: StockBatch[],
  activeBranchId?: string
): Drug[] => {
  return useMemo(() => {
    // 0. Filter batches by branchId if provided (Double Guard)
    const filteredBatches = activeBranchId 
      ? batches.filter(b => b.branchId === activeBranchId)
      : batches;

    // 0b. Double Guard: Filter rawInventory to only show this branch's products
    const filteredInventory = activeBranchId
      ? rawInventory.filter(d => d.branchId === activeBranchId)
      : rawInventory;

    // 1. Group batches by Drug ID for efficient lookup
    const batchSums = new Map<string, { total: number; earliestExpiry: string }>();

    filteredBatches.forEach((batch) => {
      const existing = batchSums.get(batch.drugId);
      if (existing) {
        batchSums.set(batch.drugId, {
          total: existing.total + batch.quantity,
          earliestExpiry: batch.expiryDate < existing.earliestExpiry ? batch.expiryDate : existing.earliestExpiry,
        });
      } else {
        batchSums.set(batch.drugId, {
          total: batch.quantity,
          earliestExpiry: batch.expiryDate,
        });
      }
    });

    const canViewFinancials = permissionsService.can('reports.view_financial');

    // 2. Map inventory items with computed values
    return filteredInventory.map((drug) => {
      const computed = batchSums.get(drug.id);
      
      let processedDrug: Drug;

      // If we have batches, use them.
      if (computed) {
        processedDrug = {
          ...drug,
          stock: computed.total,
          expiryDate: computed.earliestExpiry,
        };
      } else {
        // Products with no batches should have 0 stock
        processedDrug = {
          ...drug,
          stock: 0,
          expiryDate: drug.expiryDate,
        };
      }

      // Security Strip: Remove cost information if not authorized
      if (!canViewFinancials) {
        return {
          ...processedDrug,
          costPrice: 0,
          unitCostPrice: 0,
        };
      }

      return processedDrug;
    });
  }, [rawInventory, batches, activeBranchId]);
};
