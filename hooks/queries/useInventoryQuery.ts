import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { batchService, inventoryService } from '../../services/inventory';
import type { Drug, StockBatch } from '../../types';

import { useComputedInventory } from '../inventory/useComputedInventory';

export function useRawInventory(branchId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.inventory.all(branchId),
    queryFn: () => inventoryService.getAll(branchId) as Promise<Drug[]>,
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventory(branchId: string, options?: { enabled?: boolean }) {
  const {
    data: rawInventory = [],
    isLoading: isInvLoading,
    error: invError,
    refetch: refetchInv,
  } = useRawInventory(branchId, { enabled: options?.enabled });
  const {
    data: batches = [],
    isLoading: isBatchesLoading,
    error: batchesError,
    refetch: refetchBatches,
  } = useBatches(branchId, { enabled: options?.enabled });

  const computedInventory = useComputedInventory(rawInventory, batches, branchId);

  return {
    data: computedInventory,
    isLoading: isInvLoading || isBatchesLoading,
    error: invError || batchesError,
    refetch: () => {
      refetchInv();
      refetchBatches();
    },
  };
}

export function useDrug(drugId: string) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(drugId),
    queryFn: () => inventoryService.getById(drugId) as Promise<Drug | null>,
    enabled: !!drugId,
  });
}

export function useLowStock(branchId: string, threshold = 10, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.inventory.lowStock(branchId, threshold),
    queryFn: () => inventoryService.getLowStock(threshold, branchId) as Promise<Drug[]>,
    enabled: !!branchId && (options?.enabled ?? true),
  });
}

export function useBatches(branchId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.batches.all(branchId),
    queryFn: () => batchService.getAllBatches(branchId) as Promise<StockBatch[]>,
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBatch(batchId: string) {
  return useQuery({
    queryKey: queryKeys.batches.detail(batchId),
    queryFn: () => batchService.getBatchById(batchId) as Promise<StockBatch | null>,
    enabled: !!batchId,
  });
}

export function useSuppliers(branchId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.suppliers.all(branchId),
    queryFn: () =>
      import('../../services/suppliers').then((m) => m.supplierService.getAll(branchId)),
    enabled: !!branchId && (options?.enabled ?? true),
    staleTime: 30 * 60 * 1000,
  });
}
