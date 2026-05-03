import { useCallback } from 'react';
import { useAlert } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { auditService } from '../../services/auditService';
import { batchService } from '../../services/inventory/batchService';
import { inventoryService } from '../../services/inventory/inventoryService';
import { stockMovementService } from '../../services/inventory/stockMovement/stockMovementService';
import * as stockOps from '../../utils/stockOperations';
import type { Drug, Employee, StockBatch } from '../../types';

export interface UseInventoryHandlersParams {
  inventory: Drug[];
  setInventory: React.Dispatch<React.SetStateAction<Drug[]>>;
  setBatches: (batches: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => void;
  currentEmployeeId: string | null;
  employees: Employee[];
  activeBranchId: string;
}

export function useInventoryHandlers({
  inventory,
  setInventory,
  setBatches,
  currentEmployeeId,
  employees,
  activeBranchId,
}: UseInventoryHandlersParams) {
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

      try {
        const result = await inventoryService.create(drug, activeBranchId);
        setInventory((prev) => [...prev, result]);
        
        if (result.stock > 0) {
          stockOps.logInitialStock(result, {
            branchId: activeBranchId,
            performedBy: currentEmployeeId,
            performedByName: employee?.name,
          });
        }

        const updatedBatches = await batchService.getAllBatches(activeBranchId);
        setBatches(updatedBatches);

        auditService.log('inventory.add', {
          userId: currentEmployeeId,
          details: `Added drug: ${result.name}`,
          entityId: result.id,
          branchId: activeBranchId,
        });

        success(`${result.name} added to inventory successfully!`);
      } catch (err) {
        error(`Failed to add product: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setInventory, setBatches, currentEmployeeId, employees, activeBranchId, error, success]
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
        const oldDrug = inventory.find((d) => d.id === drug.id);
        const result = await inventoryService.update(drug.id, drug);
        setInventory((prev) => prev.map((d) => (d.id === drug.id ? result : d)));
        
        if (oldDrug && oldDrug.stock !== result.stock) {
          await stockOps.adjustStock(
            oldDrug,
            result.stock,
            'Manual Edit',
            {
              branchId: activeBranchId,
              performedBy: currentEmployeeId,
              performedByName: employee?.name,
            },
            {
              notes: 'Pharmacist manual stock correction',
              status: 'approved',
            }
          );
          const updatedBatches = await batchService.getAllBatches(activeBranchId);
          setBatches(updatedBatches);
        }

        auditService.log('inventory.update', {
          userId: currentEmployeeId,
          details: `Updated drug: ${drug.name}`,
          entityId: drug.id,
          branchId: activeBranchId,
        });

        success(`${drug.name} updated successfully!`);
      } catch (err) {
        error(`Failed to update product: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setInventory, inventory, currentEmployeeId, employees, activeBranchId, error, success]
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
        const drug = inventory.find((d) => d.id === id);
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
        
        setInventory((prev) => prev.filter((d) => d.id !== id));
        const updatedBatches = await batchService.getAllBatches(activeBranchId);
        setBatches(updatedBatches);
        
        auditService.log('inventory.delete', {
          userId: currentEmployeeId,
          details: `Deleted drug ID: ${id}`,
          entityId: id,
          branchId: activeBranchId,
        });

        success('Product deleted successfully!');
      } catch (err) {
        error(`Failed to delete product: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setInventory, setBatches, inventory, currentEmployeeId, employees, activeBranchId, error, success]
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

      const drug = inventory.find((d) => d.id === id);
      if (!drug) return;

      try {
        const mutation = await stockOps.addStock(
          drug,
          qty,
          !!isUnit,
          drug.expiryDate,
          drug.costPrice,
          'adjustment',
          'Manual Restock / Adjustment',
          {
            branchId: activeBranchId,
            performedBy: currentEmployeeId!,
            performedByName: employee?.name,
          },
          'RESTOCK',
          'MANUAL_RESTOCK'
        );
        if (mutation) {
          setInventory((prev) => prev.map((d) => (d.id === id ? { ...d, stock: mutation.newStock } : d)));
          const updatedBatches = await batchService.getAllBatches(activeBranchId);
          setBatches(updatedBatches);
        }

        auditService.log('inventory.update', {
          userId: currentEmployeeId,
          details: `Restocked drug ID: ${id} with qty: ${qty}`,
          entityId: id,
          branchId: activeBranchId,
        });

        success('Restock completed successfully!');
      } catch (err) {
        error(`Failed to restock product: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setInventory, setBatches, inventory, currentEmployeeId, employees, activeBranchId, error, success]
  );

  return {
    handleAddDrug,
    handleUpdateDrug,
    handleDeleteDrug,
    handleRestock,
  };
}
