import { useCallback } from 'react';
import { useAlert } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { batchService } from '../../services/inventory/batchService';
import { inventoryService } from '../../services/inventory/inventoryService';
import { salesService } from '../../services/sales/salesService';
import { transactionService } from '../../services/transactions/transactionService';
import { validateSaleData, validateStockAvailability } from '../../utils/validation';
import { formatCurrency } from '../../utils/currency';
import { measurePerformance } from '../../utils/monitoring';
import type { 
  ActionContext, 
  CartItem, 
  Drug, 
  Employee, 
  Return, 
  Sale, 
  StockBatch,
  Customer,
  Shift,
  CashTransaction
} from '../../types';

export interface SaleData {
  items: CartItem[];
  customerName: string;
  customerCode?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerStreetAddress?: string;
  paymentMethod: 'cash' | 'visa';
  saleType?: 'walk-in' | 'delivery';
  deliveryFee?: number;
  globalDiscount: number;
  subtotal: number;
  total: number;
  processingTimeMinutes?: number;
}

export interface UseSalesHandlersParams {
  currentEmployeeId: string | null;
  employees: Employee[];
  activeBranchId: string;
  activeOrgId: string;
  inventory: Drug[];
  setInventory: React.Dispatch<React.SetStateAction<Drug[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  setBatches: (batches: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setReturns: React.Dispatch<React.SetStateAction<Return[]>>;
  currentShift: Shift | null;
  addTransaction: (shiftId: string, transaction: Omit<CashTransaction, 'id'>) => Promise<void>;
  getVerifiedDate: () => Date;
  validateTransactionTime: (date: Date) => { valid: boolean; message?: string };
  updateLastTransactionTime: (time: number) => void;
  completeSale: (saleData: any, context: ActionContext) => Promise<Sale>;
  processSalesReturn: (returnData: any, sale: Sale, context: ActionContext) => Promise<void>;
}

const SENIOR_CASHIER_CANCEL_LIMIT = 500; // 500.00 EGP

export function useSalesHandlers({
  currentEmployeeId,
  employees,
  activeBranchId,
  activeOrgId,
  inventory,
  setInventory,
  sales,
  setSales,
  setBatches,
  setCustomers,
  setReturns,
  currentShift,
  addTransaction,
  getVerifiedDate,
  validateTransactionTime,
  updateLastTransactionTime,
  completeSale,
  processSalesReturn,
}: UseSalesHandlersParams) {
  const { success, error } = useAlert();

  const handleCompleteSale = useCallback(
    async (saleData: SaleData) => {
      try {
        if (!currentEmployeeId) {
          error('Login required to complete sale');
          return false;
        }
        const currentUser = employees?.find((e) => e.id === currentEmployeeId);
        if (!permissionsService.can('sale.create')) {
          error('Permission denied: Cannot process sales');
          return false;
        }

        const dataValidation = validateSaleData(saleData);
        if (!dataValidation.success) {
          error(dataValidation.message || 'Invalid sale data');
          return false;
        }

        const stockValidation = validateStockAvailability(saleData.items, inventory);
        if (!stockValidation.success) {
          error(stockValidation.message || 'Insufficient stock');
          return false;
        }

        const saleDate = getVerifiedDate();
        const timeValidation = validateTransactionTime(saleDate);
        if (!timeValidation.valid) {
          error(`⚠️ ${timeValidation.message || 'Invalid transaction time'}`);
          return false;
        }

        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: currentUser?.name || 'System',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: saleDate.toISOString(),
        };

        const newSale = await completeSale(saleData, context);

        updateLastTransactionTime(saleDate.getTime());
        success(`Order #${newSale.serialId} completed!`);
        return true;
      } catch (err: any) {
        console.error('[handleCompleteSale] Fatal error:', err);
        error(err?.message || 'An unexpected error occurred during checkout.');
        return false;
      }
    },
    [
      currentEmployeeId,
      employees,
      activeBranchId,
      activeOrgId,
      inventory,
      getVerifiedDate,
      validateTransactionTime,
      currentShift,
      updateLastTransactionTime,
      success,
      error,
      completeSale,
    ]
  );

  const monitoredHandleCompleteSale = useCallback(
    (saleData: SaleData) => {
      return measurePerformance('handleCompleteSale', () => handleCompleteSale(saleData));
    },
    [handleCompleteSale]
  );

  const handleUpdateSale = useCallback(
    async (saleId: string, updates: Partial<Sale>) => {
      const sale = sales.find((s) => s.id === saleId);
      if (!sale) return;

      if (!currentEmployeeId) {
        error('Permission denied: Login required to update/cancel orders');
        return;
      }
      const employee = employees?.find((e) => e.id === currentEmployeeId);
      const context: ActionContext = {
        branchId: activeBranchId,
        performerId: currentEmployeeId,
        performerName: employee?.name || 'System',
        timestamp: new Date().toISOString(),
        orgId: (window as any).__PHARMA_FLOW_ORG_ID__ || 'default',
        shiftId: currentShift?.id,
      };

      if (updates.status === 'cancelled' && sale.status !== 'cancelled') {
        if (sale.status === 'completed' && sale.saleType === 'delivery') {
          error('Cannot cancel a completed delivery order. Please use the Return flow instead.');
          return;
        }

        if (!permissionsService.can('sale.cancel')) {
          error('Permission denied: Cannot cancel orders');
          return;
        }

        if (employee?.role === 'senior_cashier' && sale.total > SENIOR_CASHIER_CANCEL_LIMIT) {
          error(`Permission denied: Senior Cashiers cannot cancel sales exceeding EGP ${SENIOR_CASHIER_CANCEL_LIMIT}. Manager approval required.`);
          return;
        }

        const result = await transactionService.processCancellation(sale, inventory, context);

        if (!result.success) {
          error(result.error || 'Failed to cancel order');
          return;
        }

        const [updatedBatches] = await Promise.all([batchService.getAllBatches(activeBranchId)]);
        setBatches(updatedBatches);
        const freshInventory = await inventoryService.getAll(activeBranchId);
        setInventory(freshInventory);
        
        setSales((prev) => prev.map((s) => (s.id === saleId ? { ...s, status: 'cancelled', updatedAt: context.timestamp } : s)));
        
        success(`Order #${sale.serialId || sale.id} cancelled and stock returned.`);
        return;
      }

      if (updates.items && sale.saleType === 'delivery' && sale.status !== 'cancelled') {
        if (!permissionsService.can('sale.modify')) {
          error('Permission denied: Cannot modify orders');
          return;
        }

        const result = await transactionService.processOrderModification(sale, updates, inventory, context);

        if (!result.success) {
          error(result.error || 'Failed to modify order');
          return;
        }

        updates.modificationHistory = result.modificationHistory;

        const [updatedBatches] = await Promise.all([batchService.getAllBatches(activeBranchId)]);
        setBatches(updatedBatches);
        const freshInventory = await inventoryService.getAll(activeBranchId);
        setInventory(freshInventory);
        
        success(`Order #${sale.serialId || sale.id} modified successfully.`);
      }

      if (updates.status === 'completed' && sale.status !== 'completed' && sale.saleType === 'delivery' && currentShift && !sale.shiftTransactionRecorded) {
        const isCash = sale.paymentMethod === 'cash';
        const txAmount = (updates as any).total ?? sale.total;
        
        await transactionService.addTransaction(currentShift.id, {
          branchId: activeBranchId,
          shiftId: currentShift.id,
          time: context.timestamp,
          type: isCash ? 'sale' : 'card_sale',
          amount: txAmount,
          reason: `Delivery Finalized #${sale.serialId || sale.id}`,
          userId: context.performerName || 'System',
          relatedSaleId: saleId
        });
        updates.shiftTransactionRecorded = true;
        success(`Delivery #${sale.serialId || sale.id} completed and payment recorded.`);
      }

      const finalUpdates: Partial<Sale> = {
        ...updates,
        updatedAt: context.timestamp,
      };

      setSales((prev) => prev.map((s) => (s.id === saleId ? { ...s, ...finalUpdates } : s)));

      try {
        await salesService.update(saleId, finalUpdates);
      } catch (e) {
        console.error('[handleUpdateSale] Failed to persist sale updates:', e);
      }
    },
    [
      sales,
      inventory,
      currentEmployeeId,
      employees,
      activeBranchId,
      setInventory,
      setBatches,
      setSales,
      currentShift,
      addTransaction,
      error,
      success,
    ]
  );

  const handleProcessReturn = useCallback(
    async (returnData: Return) => {
      try {
        if (!currentEmployeeId) {
          error('Permission denied: Login required to process returns');
          return false;
        }
        const employee = employees?.find((e) => e.id === currentEmployeeId);
        if (!permissionsService.can('sale.refund')) {
          error('Permission denied: Cannot process returns');
          return false;
        }

        const userRole = permissionsService.getEffectiveRole();
        if (userRole === 'pharmacist' && returnData.totalRefund > 100000) {
           error('Permission denied: Pharmacists cannot refund more than 1000.00 EGP per transaction. Please request manager approval.');
           return false;
        }
        if (userRole === 'cashier' && returnData.totalRefund > 50000) {
           error('Permission denied: Cashiers cannot refund more than 500.00 EGP per transaction.');
           return false;
        }

        if (!currentShift) {
          error('Permission denied: An active shift must be open to process returns and issue refunds.');
          return false;
        }

        const returnDate = new Date(returnData.date);
        const validation = validateTransactionTime(returnDate);
        if (!validation.valid) {
          error(`⚠️ ${validation.message || 'Invalid return time'}`);
          return false;
        }

        const sale = sales.find((s) => s.id === returnData.saleId);
        if (!sale) {
          error('Original sale not found');
          return false;
        }

        if (sale.status === 'cancelled') {
          error('Cannot process return for a cancelled sale. Stock was already restored during cancellation.');
          return false;
        }

        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: employee?.name || 'System',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: returnDate.toISOString(),
        };

        await processSalesReturn(returnData, sale, context);

        updateLastTransactionTime(returnDate.getTime());
        success(`Return processed successfully. Refund: ${formatCurrency(returnData.totalRefund)}`);
        return true;
      } catch (err: any) {
        console.error('[handleProcessReturn] Fatal error:', err);
        error('An unexpected error occurred during return processing.');
        return false;
      }
    },
    [
      currentEmployeeId,
      employees,
      activeBranchId,
      activeOrgId,
      sales,
      currentShift,
      validateTransactionTime,
      processSalesReturn,
      updateLastTransactionTime,
      success,
      error,
    ]
  );

  return {
    handleCompleteSale: monitoredHandleCompleteSale,
    handleUpdateSale,
    handleProcessReturn,
  };
}
