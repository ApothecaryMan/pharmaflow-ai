import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { batchService, inventoryService } from '../../services/inventory';
import type { Drug, StockBatch } from '../../types';

import { useComputedInventory } from '../inventory/useComputedInventory';

export function useRawInventory(branchId: string) {
  return useQuery({
    queryKey: queryKeys.inventory.all(branchId),
    queryFn: () => inventoryService.getAll(branchId) as Promise<Drug[]>,
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventory(branchId: string) {
  const { data: rawInventory = [], isLoading: isInvLoading, error: invError, refetch: refetchInv } = useRawInventory(branchId);
  const { data: batches = [], isLoading: isBatchesLoading, error: batchesError, refetch: refetchBatches } = useBatches(branchId);

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

export function useLowStock(branchId: string, threshold = 10) {
  return useQuery({
    queryKey: queryKeys.inventory.lowStock(branchId, threshold),
    queryFn: () => inventoryService.getLowStock(threshold, branchId) as Promise<Drug[]>,
    enabled: !!branchId,
  });
}

export function useBatches(branchId: string) {
  return useQuery({
    queryKey: queryKeys.batches.all(branchId),
    queryFn: () => batchService.getAllBatches(branchId) as Promise<StockBatch[]>,
    enabled: !!branchId,
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

export function useSuppliers(branchId: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.all(branchId),
    queryFn: () =>
      import('../../services/suppliers').then((m) => m.supplierService.getAll(branchId)),
    enabled: !!branchId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useInventoryPage(
  branchId: string,
  page: number,
  pageSize: number,
  search?: string,
  filters?: Record<string, any>
) {
  return useQuery({
    queryKey: [...queryKeys.inventory.all(branchId), 'page', page, pageSize, search, filters],
    queryFn: () =>
      inventoryService.getPage(branchId, { page, pageSize, search, filters }) as Promise<{
        data: Drug[];
        total: number;
      }>,
    enabled: !!branchId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
