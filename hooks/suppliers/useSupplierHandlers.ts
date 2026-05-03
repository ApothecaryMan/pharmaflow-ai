import { useCallback } from 'react';
import { useAlert } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { auditService } from '../../services/auditService';
import { supplierService } from '../../services/suppliers/supplierService';
import type { Purchase, Supplier } from '../../types';

export interface UseSupplierHandlersParams {
  currentEmployeeId: string | null;
  activeBranchId: string;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: Purchase[];
}

export function useSupplierHandlers({
  currentEmployeeId,
  activeBranchId,
  suppliers,
  setSuppliers,
  purchases,
}: UseSupplierHandlersParams) {
  const { success, error } = useAlert();

  const handleAddSupplier = useCallback(
    async (supplier: Supplier) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to add suppliers');
        return;
      }
      if (!permissionsService.can('supplier.add')) {
        error('Permission denied: Cannot add suppliers');
        return;
      }

      try {
        const result = await supplierService.create(supplier, activeBranchId);
        setSuppliers((prev) => [...prev, result]);
        success('Supplier added successfully');
        auditService.log('supplier.add', {
          userId: currentEmployeeId,
          details: `Added supplier: ${result.name}`,
          entityId: result.id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to add supplier: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    },
    [setSuppliers, currentEmployeeId, activeBranchId, error, success]
  );

  const handleUpdateSupplier = useCallback(
    async (supplier: Supplier) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to update suppliers');
        return;
      }
      if (!permissionsService.can('supplier.update')) {
        error('Permission denied: Cannot update suppliers');
        return;
      }

      try {
        const result = await supplierService.update(supplier.id, supplier);
        setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? result : s)));
        success('Supplier updated successfully');
        auditService.log('supplier.update', {
          userId: currentEmployeeId,
          details: `Updated supplier: ${supplier.name}`,
          entityId: supplier.id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to update supplier: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    },
    [setSuppliers, currentEmployeeId, activeBranchId, error, success]
  );

  const handleDeleteSupplier = useCallback(
    async (id: string) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to delete suppliers');
        return;
      }
      if (!permissionsService.can('supplier.delete')) {
        error('Permission denied: Cannot delete suppliers');
        return;
      }

      const hasPurchases = purchases.some((p) => p.supplierId === id);
      if (hasPurchases) {
        error('Cannot delete supplier with existing purchase orders. Set status to inactive instead.');
        return;
      }

      try {
        await supplierService.delete(id);
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        success('Supplier deleted successfully');
        auditService.log('supplier.delete', {
          userId: currentEmployeeId || 'System',
          details: `Deleted supplier ID: ${id}`,
          entityId: id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to delete supplier: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setSuppliers, purchases, success, currentEmployeeId, error, activeBranchId]
  );

  return {
    handleAddSupplier,
    handleUpdateSupplier,
    handleDeleteSupplier,
  };
}
