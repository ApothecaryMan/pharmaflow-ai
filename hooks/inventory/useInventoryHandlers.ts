import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAlert } from '../../context';
import { queryKeys } from '../../lib/queryKeys';
import { auditService } from '../../services/audit/auditService';
import { permissionsService } from '../../services/auth/permissionsService';
import { batchService } from '../../services/inventory/batchService';
import { inventoryService } from '../../services/inventory/inventoryService';
import { stockMovementService } from '../../services/inventory/stockMovement/stockMovementService';
import { idGenerator } from '../../utils/idGenerator';
import type { Drug, Employee, StockBatch } from '../../types';
import { getFullDisplayName } from '../../utils/drugDisplayName';
import { resolveUnits } from '../../utils/stockUtils';
import { validateDrug } from '../../utils/validation';

export interface UseInventoryHandlersParams {
  currentEmployeeId: string | null;
  employees: Employee[];
  activeBranchId: string;
}

export function useInventoryHandlers({
  currentEmployeeId,
  employees,
  activeBranchId,
}: UseInventoryHandlersParams) {
  const queryClient = useQueryClient();
  const { success, error } = useAlert();

  const handleAddDrug = useCallback(
    async (drug: Drug) => {
      if (!currentEmployeeId) {
        error('Permission denied: Login required to add items');
        return;
      }

      const employee = employees?.find((e) => e.id === currentEmployeeId);
      if (!permissionsService.can('inventory.add')) {
        error(`Permission denied: ${employee?.role || 'User'} cannot add items`);
        return;
      }

      const validation = validateDrug(drug);
      if (!validation.success) {
        error(validation.message || 'Invalid drug data');
        return;
      }

      try {
        const result = await inventoryService.create(drug, activeBranchId);

        queryClient.setQueryData<Drug[]>(queryKeys.inventory.all(activeBranchId), (old) => {
          if (!old) return old;
          return [...old, result];
        });

        if (result.stock > 0) {
          await stockMovementService.logMovement({
            drugId: result.id,
            drugName: getFullDisplayName(result),
            branchId: activeBranchId,
            orgId: result.orgId,
            type: 'initial',
            quantity: result.stock,
            previousStock: 0,
            newStock: result.stock,
            reason: 'Initial Inventory Setup',
            performedBy: currentEmployeeId,
            performedByName: employee?.name,
            status: 'approved',
          });
        }

        queryClient.setQueryData<StockBatch[]>(queryKeys.batches.all(activeBranchId), (old) => {
          if (!old) return old;
          return [
            ...old,
            {
              id: idGenerator.uuid(),
              branchId: activeBranchId,
              orgId: result.orgId,
              drugId: result.id,
              quantity: result.stock,
              expiryDate: result.expiryDate,
              costPrice: result.costPrice,
              dateReceived: new Date().toISOString(),
              batchNumber: 'INITIAL',
              version: 1,
            },
          ];
        });

        auditService.log('inventory.add', {
          userId: currentEmployeeId,
          details: `Added drug: ${result.name}`,
          entityId: result.id,
          branchId: activeBranchId,
        });

        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', activeBranchId] });

        success(`${result.name} added to inventory successfully!`);
      } catch (err) {
        error(`Failed to add product: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [currentEmployeeId, employees, activeBranchId, error, success, queryClient]
  );

  const handleUpdateDrug = useCallback(
    async (drug: Drug) => {
      if (!currentEmployeeId) {
        error('Permission denied: Login required to update items');
        return;
      }
      const employee = employees?.find((e) => e.id === currentEmployeeId);
      if (!permissionsService.can('inventory.update')) {
        error(`Permission denied: ${employee?.role || 'User'} cannot update items`);
        return;
      }

      try {
        const cachedInventory = queryClient.getQueryData<Drug[]>(queryKeys.inventory.all(activeBranchId));
        const oldDrug = cachedInventory?.find((d) => d.id === drug.id);
        const result = await inventoryService.update(drug.id, drug);

        queryClient.setQueryData<Drug[]>(queryKeys.inventory.all(activeBranchId), (old) => {
          if (!old) return old;
          return old.map((d) => (d.id === drug.id ? result : d));
        });

        if (oldDrug && oldDrug.stock !== result.stock) {
          const diff = result.stock - oldDrug.stock;
          await inventoryService.processStockAdjustment({
            branchId: activeBranchId,
            performerId: currentEmployeeId,
            performerName: employee?.name,
            adjustments: [
              {
                drugId: drug.id,
                quantity: diff,
                reason: 'Manual Edit',
                notes: 'Pharmacist manual stock correction',
              },
            ],
          });

          queryClient.setQueryData<StockBatch[]>(queryKeys.batches.all(activeBranchId), (old) => {
            if (!old) return old;
            return old.map((b) =>
              b.drugId === drug.id
                ? { ...b, quantity: result.stock, expiryDate: result.expiryDate, costPrice: result.costPrice }
                : b
            );
          });
        }

        queryClient.setQueryData<Drug>(queryKeys.inventory.detail(drug.id), result);

        auditService.log('inventory.update', {
          userId: currentEmployeeId,
          details: `Updated drug: ${drug.name}`,
          entityId: drug.id,
          branchId: activeBranchId,
        });

        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', activeBranchId] });

        success(`${drug.name} updated successfully!`);
      } catch (err) {
        error(`Failed to update product: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [currentEmployeeId, employees, activeBranchId, error, success, queryClient]
  );

  const handleDeleteDrug = useCallback(
    async (id: string) => {
      if (!currentEmployeeId) {
        error('Permission denied: Login required to delete items');
        return;
      }
      const employee = employees?.find((e) => e.id === currentEmployeeId);
      if (!permissionsService.can('inventory.delete')) {
        error(`Permission denied: ${employee?.role || 'User'} cannot delete items`);
        return;
      }

      try {
        const cachedInventory = queryClient.getQueryData<Drug[]>(queryKeys.inventory.all(activeBranchId));
        const drug = cachedInventory?.find((d) => d.id === id);
        if (drug && drug.stock > 0) {
          stockMovementService.logMovement({
            drugId: drug.id,
            drugName: drug.name,
            branchId: activeBranchId,
            type: 'adjustment',
            quantity: -drug.stock,
            previousStock: drug.stock,
            newStock: 0,
            reason: 'Product Deleted',
            performedBy: currentEmployeeId,
            performedByName: employee?.name,
            status: 'approved',
          });
        }

        await batchService.deleteBatchesByDrugId(id);
        await inventoryService.delete(id);

        queryClient.setQueryData<Drug[]>(queryKeys.inventory.all(activeBranchId), (old) => {
          if (!old) return old;
          return old.filter((d) => d.id !== id);
        });

        queryClient.setQueryData<StockBatch[]>(queryKeys.batches.all(activeBranchId), (old) => {
          if (!old) return old;
          return old.filter((b) => b.drugId !== id);
        });

        auditService.log('inventory.delete', {
          userId: currentEmployeeId,
          details: `Deleted drug ID: ${id}`,
          entityId: id,
          branchId: activeBranchId,
        });

        queryClient.removeQueries({ queryKey: queryKeys.inventory.detail(id), exact: true });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', activeBranchId] });

        success('Product deleted successfully!');
      } catch (err) {
        error(`Failed to delete product: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [currentEmployeeId, employees, activeBranchId, error, success, queryClient]
  );

  const handleRestock = useCallback(
    async (id: string, qty: number, isUnit: boolean = false) => {
      if (!currentEmployeeId) {
        error('Permission denied: Login required to restock items');
        return;
      }
      const employee = employees?.find((e) => e.id === currentEmployeeId);
      if (!permissionsService.can('inventory.update')) {
        error('Permission denied: Role cannot restock items');
        return;
      }

      const cachedInventory = queryClient.getQueryData<Drug[]>(queryKeys.inventory.all(activeBranchId));
      const drug = cachedInventory?.find((d) => d.id === id);
      if (!drug) return;

      try {
        const unitsToAdd = resolveUnits(qty, !!isUnit, drug.unitsPerPack);

        await inventoryService.processStockAdjustment({
          branchId: activeBranchId,
          performerId: currentEmployeeId!,
          performerName: employee?.name,
          adjustments: [
            {
              drugId: drug.id,
              quantity: unitsToAdd,
              reason: 'Manual Restock / Adjustment',
              notes: 'MANUAL_RESTOCK',
              expiryDate: drug.expiryDate,
            },
          ],
        });

        const updatedDrug = await inventoryService.getById(id);
        if (updatedDrug) {
          queryClient.setQueryData<Drug[]>(queryKeys.inventory.all(activeBranchId), (old) => {
            if (!old) return old;
            return old.map((d) => (d.id === id ? updatedDrug : d));
          });

          queryClient.setQueryData<StockBatch[]>(queryKeys.batches.all(activeBranchId), (old) => {
            if (!old) return old;
            return old.map((b) =>
              b.drugId === id
                ? { ...b, quantity: updatedDrug.stock, expiryDate: updatedDrug.expiryDate, costPrice: updatedDrug.costPrice }
                : b
            );
          });
        }

        auditService.log('inventory.update', {
          userId: currentEmployeeId,
          details: `Restocked drug ID: ${id} with qty: ${qty}`,
          entityId: id,
          branchId: activeBranchId,
        });

        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', activeBranchId] });

        success('Restock completed successfully!');
      } catch (err) {
        error(`Failed to restock product: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [currentEmployeeId, employees, activeBranchId, error, success, queryClient]
  );

  return {
    handleAddDrug,
    handleUpdateDrug,
    handleDeleteDrug,
    handleRestock,
  };
}
