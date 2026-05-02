import { useMemo } from 'react';
import type { Drug, StockBatch } from '../types';
import { permissionsService } from '../services/auth/permissions';
import { getGroupingKey } from '../services/inventory/batchService';
import { parseExpiryEndOfMonth } from '../utils/expiryUtils';

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
    const filteredBatches = (activeBranchId && activeBranchId !== 'all')
      ? batches.filter(b => b.branchId === activeBranchId)
      : batches;

    // 0b. Double Guard: Filter rawInventory to only show this branch's products
    const filteredInventory = (activeBranchId && activeBranchId !== 'all')
      ? rawInventory.filter(d => d.branchId === activeBranchId)
      : rawInventory;

    // 1. Group batches by Unified Grouping Key for efficient lookup
    const drugDataMap = new Map<string, { 
      total: number; 
      earliestExpiry: string;
      batches: Drug[];
      template: Drug;
    }>();
 
    filteredBatches.forEach((batch) => {
      // Find the template drug for this batch to inherit properties (name, price, etc)
      const drugTemplate = filteredInventory.find(d => d.id === batch.drugId);
      if (!drugTemplate) return;

      const groupKey = getGroupingKey(drugTemplate);
      const existing = drugDataMap.get(groupKey);
      
      // Create a virtual drug object for this specific batch
      const batchAsDrug: Drug = {
        ...drugTemplate,
        id: batch.id, // Use batch ID as the unique ID for this instance
        stock: batch.quantity,
        expiryDate: batch.expiryDate,
        costPrice: batch.costPrice,
        // Preserve original ID for reference if needed
        dbId: batch.drugId 
      };

      if (existing) {
        drugDataMap.set(groupKey, {
          ...existing,
          total: existing.total + batch.quantity,
          earliestExpiry: batch.expiryDate < existing.earliestExpiry ? batch.expiryDate : existing.earliestExpiry,
          batches: [...existing.batches, batchAsDrug]
        });
      } else {
        drugDataMap.set(groupKey, {
          total: batch.quantity,
          earliestExpiry: batch.expiryDate,
          batches: [batchAsDrug],
          template: drugTemplate
        });
      }
    });
 
    const canViewFinancials = permissionsService.can('reports.view_financial');
 
    // 2. Map the groups to a final array of Drugs
    const results: Drug[] = Array.from(drugDataMap.values()).map(({ total, earliestExpiry, batches, template }) => {
      let processedDrug: Drug = {
        ...template,
        stock: total,
        expiryDate: earliestExpiry,
        batches: batches.sort((a, b) => 
          parseExpiryEndOfMonth(a.expiryDate).getTime() - parseExpiryEndOfMonth(b.expiryDate).getTime()
        )
      };

      if (!canViewFinancials) {
        processedDrug = {
          ...processedDrug,
          costPrice: 0,
          unitCostPrice: 0,
          batches: processedDrug.batches?.map(b => ({
            ...b,
            costPrice: 0,
            unitCostPrice: 0
          }))
        };
      }
      return processedDrug;
    });

    // 3. Add zero-stock drugs that weren't in any batch group
    const processedKeys = new Set(Array.from(drugDataMap.keys()));
    filteredInventory.forEach(drug => {
      const key = getGroupingKey(drug);
      if (!processedKeys.has(key)) {
        let emptyDrug: Drug = {
          ...drug,
          stock: 0,
          batches: []
        };
        if (!canViewFinancials) {
          emptyDrug = { ...emptyDrug, costPrice: 0, unitCostPrice: 0 };
        }
        results.push(emptyDrug);
        processedKeys.add(key);
      }
    });

    return results;
  }, [rawInventory, batches, activeBranchId]);
};
