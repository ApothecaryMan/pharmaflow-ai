import { useQuery } from '@tanstack/react-query';
import { inventoryService, batchService } from '../../services/inventory';
import type { Drug, StockBatch } from '../../types';

export function useInventory(branchId: string) {
  return useQuery({
    queryKey: ['inventory', branchId],
    queryFn: () => inventoryService.getAll(branchId) as Promise<Drug[]>,
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDrug(drugId: string) {
  return useQuery({
    queryKey: ['drug', drugId],
    queryFn: () => inventoryService.getById(drugId) as Promise<Drug | null>,
    enabled: !!drugId,
  });
}

export function useLowStock(branchId: string, threshold = 10) {
  return useQuery({
    queryKey: ['inventory', 'low-stock', branchId, threshold],
    queryFn: () => inventoryService.getLowStock(threshold, branchId) as Promise<Drug[]>,
    enabled: !!branchId,
  });
}

export function useBatches(branchId: string) {
  return useQuery({
    queryKey: ['batches', branchId],
    queryFn: () => batchService.getAllBatches(branchId) as Promise<StockBatch[]>,
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBatch(batchId: string) {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => batchService.getBatchById(batchId) as Promise<StockBatch | null>,
    enabled: !!batchId,
  });
}

export function useSuppliers(branchId: string) {
  return useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: () => import('../../services/suppliers').then((m) => m.supplierService.getAll(branchId)),
    enabled: !!branchId,
    staleTime: 10 * 60 * 1000,
  });
}
