import { useCallback } from 'react';
import { useAlert } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { auditService } from '../../services/auditService';
import { purchaseService } from '../../services/purchases/purchaseService';
import type { 
  ActionContext, 
  Employee, 
  Purchase, 
  PurchaseReturn, 
  Shift
} from '../../types';

export interface UsePurchaseHandlersParams {
  currentEmployeeId: string | null;
  employees: Employee[];
  activeBranchId: string;
  activeOrgId: string;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: React.Dispatch<React.SetStateAction<PurchaseReturn[]>>;
  currentShift: Shift | null;
  addPurchase?: (purchase: Omit<Purchase, 'id'>, context?: ActionContext) => Promise<Purchase>;
  approvePurchase?: (id: string, context: ActionContext) => Promise<void>;
  markAsReceived?: (id: string, receiverId: string, receiverName: string) => Promise<void>;
  createPurchaseReturn: (ret: Omit<PurchaseReturn, 'id'>, context: ActionContext) => Promise<PurchaseReturn>;
}

export function usePurchaseHandlers({
  currentEmployeeId,
  employees,
  activeBranchId,
  activeOrgId,
  purchases,
  setPurchases,
  purchaseReturns,
  setPurchaseReturns,
  currentShift,
  addPurchase,
  approvePurchase,
  markAsReceived,
  createPurchaseReturn,
}: UsePurchaseHandlersParams) {
  const { success, error, info } = useAlert();

  const handlePurchaseComplete = useCallback(
    async (purchase: Purchase): Promise<boolean> => {
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!currentUser) {
        error('Authentication required: Please log in to complete purchases');
        return false;
      }

      if (!permissionsService.can('purchase.create')) {
        error('Permission denied: Cannot create purchase orders');
        return false;
      }

      try {
        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: currentUser?.name || 'Unknown',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: new Date().toISOString(),
        };

        if (addPurchase) {
          const result = await addPurchase(purchase, context);
          
          if (result.status === 'completed' || result.status === 'received') {
            success(`Direct Purchase PO #${result.invoiceId} completed and inventory updated`);
          } else {
            info(`Purchase Order PO #${result.invoiceId} saved as pending`);
          }
          return true;
        } else {
          throw new Error('Add purchase action not initialized');
        }
      } catch (err) {
        error(`Failed to process purchase: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }
    },
    [addPurchase, currentEmployeeId, employees, activeBranchId, activeOrgId, currentShift, error, success, info]
  );

  const handleApprovePurchase = useCallback(
    async (purchaseId: string) => {
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!currentUser) {
        error('Authentication required: Please log in to approve purchases');
        return;
      }

      if (!permissionsService.can('purchase.approve')) {
        error('Permission denied: Cannot approve purchases');
        return;
      }
      const purchase = purchases.find((p) => p.id === purchaseId);
      if (!purchase) {
        error('Purchase Order not found. It may have already been approved or deleted.');
        return;
      }

      if (purchase.status === 'completed') {
        error('This purchase has already been approved and received.');
        return;
      }

      if (purchase.paymentMethod === 'cash' && !currentShift) {
        error('Shift must be open to process cash purchase');
        return;
      }

      try {
        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: currentUser?.name || 'Unknown',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: new Date().toISOString(),
        };

        if (approvePurchase) {
          await approvePurchase(purchaseId, context);
          success(`PO #${purchase.invoiceId} Approved Successfully`);
        } else {
          throw new Error('Purchase approval action not initialized');
        }
      } catch (err) {
        error(`Failed to approve: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [purchases, approvePurchase, success, currentEmployeeId, employees, error, currentShift, activeBranchId, activeOrgId]
  );

  const handleMarkAsReceived = useCallback(
    async (purchaseId: string) => {
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!currentUser) {
        error('Authentication required: Please log in to mark as received');
        return;
      }

      if (!permissionsService.can('purchase.receive')) {
        error('Permission denied: Cannot mark as received');
        return;
      }
      
      const purchase = purchases.find((p) => p.id === purchaseId);
      if (!purchase) {
        error('Purchase Order not found');
        return;
      }

      try {
        if (markAsReceived) {
          await markAsReceived(purchaseId, currentEmployeeId!, currentUser.name);
          success(`PO #${purchase.invoiceId} marked as received. Batches created.`);
          auditService.log('purchase.receive', {
            userId: currentEmployeeId,
            details: `Received PO ID: ${purchaseId}`,
            entityId: purchaseId,
            branchId: activeBranchId,
          });
        }
      } catch (err) {
        error(`Failed to mark as received: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [purchases, markAsReceived, success, currentEmployeeId, employees, error, activeBranchId]
  );

  const handleRejectPurchase = useCallback(
    async (purchaseId: string, reason?: string) => {
      if (!permissionsService.can('purchase.reject')) {
        error('Permission denied: Cannot reject purchases');
        return;
      }
      
      const purchase = purchases.find((p) => p.id === purchaseId);
      if (purchase?.status === 'completed') {
        error('Cannot reject a completed purchase. Use Purchase Returns to reverse stock.');
        return;
      }

      try {
        await purchaseService.reject(purchaseId, reason || '');

        setPurchases((prev) => 
          prev.map((p) => (p.id === purchaseId ? { ...p, status: 'rejected' } : p))
        );
        
        info('Purchase Order Rejected');
        auditService.log('purchase.reject', {
          userId: currentEmployeeId,
          details: `Rejected PO ID: ${purchaseId}`,
          entityId: purchaseId,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to reject purchase: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [purchases, setPurchases, info, currentEmployeeId, employees, error, activeBranchId]
  );

  const handleCreatePurchaseReturn = useCallback(
    async (returnData: PurchaseReturn) => {
      if (!permissionsService.can('purchase.return')) {
        error('Permission denied: Cannot create purchase returns');
        return;
      }

      const originalPurchase = purchases.find((p) => p.id === returnData.purchaseId);
      if (originalPurchase?.paymentMethod === 'cash' && !currentShift) {
        error('Shift must be open to process cash purchase return');
        return;
      }

      if (originalPurchase) {
        for (const returnItem of returnData.items) {
          const purchaseItem = originalPurchase.items.find((i) => i.drugId === returnItem.drugId);
          if (!purchaseItem) {
            error(`Item ${returnItem.name || returnItem.drugId} not found in original purchase`);
            return;
          }
          const alreadyReturned = purchaseReturns
            .filter((r) => r.purchaseId === returnData.purchaseId)
            .reduce((sum, r) => {
              const ri = r.items.find((i) => i.drugId === returnItem.drugId);
              return sum + (ri?.quantityReturned || 0);
            }, 0);
          const maxReturnable = purchaseItem.quantity - alreadyReturned;
          if (returnItem.quantityReturned > maxReturnable) {
            error(`Cannot return ${returnItem.quantityReturned} of ${returnItem.name}. Max returnable: ${maxReturnable}`);
            return;
          }
        }
      }

      try {
        const { id: _, ...returnInput } = returnData;
        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: employees?.find(e => e.id === currentEmployeeId)?.name || 'System',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: new Date().toISOString()
        };

        const savedReturn = await createPurchaseReturn(returnInput as any, context);
        setPurchaseReturns((prev) => [savedReturn, ...prev]);
        success('Purchase return created successfully');
      } catch (err) {
        error(`Failed to create return: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [
      purchases,
      purchaseReturns,
      setPurchaseReturns,
      success,
      currentEmployeeId,
      employees,
      error,
      activeBranchId,
      activeOrgId,
      currentShift,
      createPurchaseReturn,
    ]
  );

  return {
    handlePurchaseComplete,
    handleApprovePurchase,
    handleMarkAsReceived,
    handleRejectPurchase,
    handleCreatePurchaseReturn,
  };
}
