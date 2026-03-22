import { useCallback, useEffect, useMemo, useRef } from 'react';
import { canPerformAction } from '../config/permissions';
import { StorageKeys } from '../config/storageKeys';
import { useAlert } from '../context';
import { auditService } from '../services/auditService';
import { batchService } from '../services/inventory/batchService';
import { inventoryService } from '../services/inventory/inventoryService';
import { employeeService } from '../services/hr/employeeService';
import { stockMovementService } from '../services/inventory/stockMovement/stockMovementService';
import { transactionService } from '../services/transactions/transactionService';
import { migrationService } from '../services/migration';
import { restoreStockForCancelledSale } from '../services/salesHelpers';
import * as stockOps from '../utils/stockOperations';
import type { AppSettings } from '../services/settings/types';
import type {
  BatchAllocation,
  CartItem,
  Customer,
  Drug,
  Employee,
  OrderModification,
  OrderModificationRecord,
  Purchase,
  PurchaseReturn,
  Return,
  Sale,
  StockBatch,
  Supplier,
} from '../types';
import { idGenerator } from '../utils/idGenerator';
import { validateStock } from '../utils/inventory';
import { calculateLoyaltyPoints } from '../utils/loyaltyPoints';
import { measurePerformance } from '../utils/monitoring';
import { addTransactionToOpenShift } from '../utils/shiftHelpers'; // Deprecated - replaced by useShift context
import { storage } from '../utils/storage';
import { validateDrug, validateSaleData, validateStockAvailability } from '../utils/validation';
import { useShift } from './useShift';

// --- Constants ---
const SENIOR_CASHIER_CANCEL_LIMIT = 500;

// Helper to get current branchCode synchronously from storage (DEPRECATED: Use activeBranchId from props)
// Removed getBranchCode as everything now uses activeBranchId

export interface EntityHandlers {
  // Drug/Inventory handlers
  handleAddDrug: (drug: Drug) => Promise<void>;
  handleUpdateDrug: (drug: Drug) => Promise<void>;
  handleDeleteDrug: (id: string) => Promise<void>;
  handleRestock: (id: string, qty: number, isUnit?: boolean) => void;

  // Supplier handlers
  handleAddSupplier: (supplier: Supplier) => void;
  handleUpdateSupplier: (supplier: Supplier) => void;
  handleDeleteSupplier: (id: string) => void;

  // Customer handlers
  handleAddCustomer: (customer: Customer) => void;
  handleUpdateCustomer: (customer: Customer) => void;
  handleDeleteCustomer: (id: string) => void;

  // Purchase handlers
  handlePurchaseComplete: (purchase: Purchase) => void;
  handleApprovePurchase: (purchaseId: string, approverName: string) => void;
  handleRejectPurchase: (purchaseId: string, reason?: string) => void;

  // Sale handlers
  handleCompleteSale: (saleData: SaleData) => Promise<boolean>;
  handleUpdateSale: (saleId: string, updates: Partial<Sale>) => void;
  handleProcessReturn: (returnData: Return) => void;

  // Purchase Return handlers
  handleCreatePurchaseReturn: (returnData: PurchaseReturn) => Promise<void>;

  // Employee handlers
  handleAddEmployee: (employee: Employee) => Promise<void>;
  handleUpdateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  handleDeleteEmployee: (id: string) => Promise<void>;

  // Computed data
  enrichedCustomers: Customer[];
}

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

interface UseEntityHandlersParams {
  // Data
  inventory: Drug[];
  setInventory: React.Dispatch<React.SetStateAction<Drug[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: React.Dispatch<React.SetStateAction<PurchaseReturn[]>>;
  returns: Return[];
  setReturns: React.Dispatch<React.SetStateAction<Return[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;

  // Employees
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;

  // Batches
  batches: StockBatch[];
  setBatches: (batches: StockBatch[] | ((prev: StockBatch[]) => StockBatch[])) => void;

  // Utilities
  currentEmployeeId: string | null;
  activeBranchId: string;
  isLoading: boolean;

  // Time utilities from StatusBar
  getVerifiedDate: () => Date;
  validateTransactionTime: (date: Date) => { valid: boolean; message?: string };
  updateLastTransactionTime: (time: number) => void;
}

/**
 * Hook for managing all entity CRUD operations.
 * Centralizes handlers for drugs, suppliers, customers, purchases, sales, and returns.
 */
export function useEntityHandlers({
  inventory,
  setInventory,
  sales,
  setSales,
  suppliers,
  setSuppliers,
  purchases,
  setPurchases,
  purchaseReturns,
  setPurchaseReturns,
  returns,
  setReturns,
  customers,
  setCustomers,
  employees,
  setEmployees,
  currentEmployeeId,
  activeBranchId,
  isLoading,
  batches,
  setBatches,
  getVerifiedDate,
  validateTransactionTime,
  updateLastTransactionTime,
}: UseEntityHandlersParams): EntityHandlers {
  const { success, error, info, warning } = useAlert();
  const { addTransaction, currentShift } = useShift();

  const migrationAttempted = useRef(false);

  // Run migrations on mount
  // Run migrations on mount
  useEffect(() => {
    let cancelled = false;

    if (isLoading || migrationAttempted.current) return;
    if (!inventory || inventory.length === 0) return;

    const runMigrations = async () => {
      migrationAttempted.current = true;
      // Simulate async if needed, or structured like this for future async support
      const { hasUpdates, migratedInventory } = migrationService.runMigrations(inventory);

      if (!cancelled && hasUpdates) {
        setInventory(migratedInventory);
      }
    };

    runMigrations();

    return () => {
      cancelled = true;
    };
  }, [isLoading, inventory, setInventory]);

  // --- Drug Management ---
  const handleAddDrug = useCallback(
    async (drug: Drug) => {
      // 1. Authentication Guard
      if (!currentEmployeeId) {
        error('Permission denied: Login required to add items');
        return;
      }

      // 2. Permission Guard
      const employee = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(employee?.role, 'inventory.add')) {
        error(`Permission denied: ${employee?.role || 'User'} cannot add items`);
        return;
      }

      const validation = validateDrug(drug);
      if (!validation.success) {
        error(validation.message || 'Invalid drug data');
        return;
      }

      try {
        const result = await inventoryService.create(drug);
        setInventory((prev) => [...prev, result]);
        
        // Log initial stock movement
        if (result.stock > 0) {
          stockOps.logInitialStock(result, {
            branchId: activeBranchId,
            performedBy: currentEmployeeId,
            performedByName: employee?.name,
          });
        }

        // Update batches state
        setBatches(batchService.getAllBatches(activeBranchId));

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
      if (!canPerformAction(employee?.role, 'inventory.update')) {
        error(`Permission denied: ${employee?.role || 'User'} cannot update items`);
        return;
      }

      const validation = validateDrug(drug);
      if (!validation.success) {
        error(validation.message || 'Invalid drug data');
        return;
      }

      try {
        const oldDrug = inventory.find(d => d.id === drug.id);
        const result = await inventoryService.update(drug.id, drug);
        setInventory((prev) => prev.map((d) => (d.id === drug.id ? result : d)));
        
        // Detect and log stock changes (Manual Edit)
        if (oldDrug && oldDrug.stock !== result.stock) {
          stockOps.adjustStock(
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
      if (!canPerformAction(employee?.role, 'inventory.delete')) {
        error(`Permission denied: ${employee?.role || 'User'} cannot delete items`);
        return;
      }

      try {
        // Log deletion movement for remaining stock
        const drug = inventory.find(d => d.id === id);
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

        // Clean up orphaned batches
        batchService.deleteBatchesByDrugId(id);

        await inventoryService.delete(id);
        setInventory((prev) => prev.filter((d) => d.id !== id));
        setBatches(batchService.getAllBatches(activeBranchId));
        
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
    (id: string, qty: number, isUnit: boolean = false) => {
      if (!currentEmployeeId) {
        error('Permission denied: Login required to restock items');
        return;
      }
      const employee = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(employee?.role, 'inventory.update')) {
        error('Permission denied: Role cannot restock items');
        return;
      }
      setInventory((prev) =>
        prev.map((d) => {
          if (d.id === id) {
            const mutation = stockOps.addStock(
              d,
              qty,
              !!isUnit,
              d.expiryDate,
              d.costPrice,
              'adjustment',
              'Manual Restock / Adjustment',
              {
                branchId: activeBranchId,
                performedBy: currentEmployeeId,
                performedByName: employee?.name,
              },
              'RESTOCK', // referenceId
              'MANUAL_RESTOCK' // batchNumber
            );

            setTimeout(() => setBatches(batchService.getAllBatches(activeBranchId)), 0);

            return { ...d, stock: mutation.newStock };
          }
          return d;
        })
      );

      auditService.log('inventory.update', {
        userId: currentEmployeeId,
        details: `Restocked drug ID: ${id} with qty: ${qty}`,
        entityId: id,
        branchId: activeBranchId,
      });

      success('Restock completed successfully!');
    },
    [setInventory, setBatches, currentEmployeeId, employees, activeBranchId, error, success]
  );

  // --- Supplier Management ---
  const handleAddSupplier = useCallback(
    (supplier: Supplier) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to add suppliers');
        return;
      }
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(currentUser?.role, 'supplier.add')) {
        error('Permission denied: Cannot add suppliers');
        return;
      }
      setSuppliers((prev) => [...prev, { ...supplier, branchId: activeBranchId, status: 'active' }]);
      success('Supplier added successfully');
      auditService.log('supplier.add', {
        userId: currentEmployeeId,
        details: `Added supplier: ${supplier.name}`,
        entityId: supplier.id,
        branchId: activeBranchId,
      });
    },
    [setSuppliers, currentEmployeeId, employees, error]
  );

  const handleUpdateSupplier = useCallback(
    (supplier: Supplier) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to update suppliers');
        return;
      }
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(currentUser?.role, 'supplier.update')) {
        error('Permission denied: Cannot update suppliers');
        return;
      }
      setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? supplier : s)));
      success('Supplier updated successfully');
      auditService.log('supplier.update', {
        userId: currentEmployeeId,
        details: `Updated supplier: ${supplier.name}`,
        entityId: supplier.id,
        branchId: activeBranchId,
      });
    },
    [setSuppliers, currentEmployeeId, employees, error]
  );

  const handleDeleteSupplier = useCallback(
    (id: string) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to delete suppliers');
        return;
      }
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(currentUser?.role, 'supplier.delete')) {
        error('Permission denied: Cannot delete suppliers');
        return;
      }

      //Delete Guard: Check for orphaned foreign keys
      const hasPurchases = purchases.some((p) => p.supplierId === id);
      if (hasPurchases) {
        error('Cannot delete supplier with existing purchase orders. Set status to inactive instead.');
        return;
      }

      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      success('Supplier deleted successfully');
      auditService.log('supplier.delete', {
        userId: currentEmployeeId || 'System',
        details: `Deleted supplier ID: ${id}`,
        entityId: id,
        branchId: activeBranchId,
      });
    },
    [setSuppliers, purchases, success, currentEmployeeId, employees, error, activeBranchId]
  );

  // --- Customer Management ---
  const handleAddCustomer = useCallback(
    (customer: Customer) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to add customers');
        return;
      }
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(currentUser?.role, 'customer.add')) {
        error('Permission denied: Cannot add customers');
        return;
      }

      // Ensure critical tracking fields are present
      const enhancedCustomer: Customer = {
        ...customer,
        branchId: activeBranchId,
        createdAt: customer.createdAt || getVerifiedDate().toISOString(),
        registeredByEmployeeId: customer.registeredByEmployeeId || currentEmployeeId || undefined,
      };

      setCustomers((prev) => [...prev, enhancedCustomer]);
      success('Customer added successfully');
      auditService.log('customer.add', {
        userId: currentEmployeeId || 'System',
        details: `Added customer: ${customer.name}`,
        entityId: customer.id,
        branchId: activeBranchId,
      });
    },
    [setCustomers, success, currentEmployeeId, employees, error, getVerifiedDate]
  );

  const handleUpdateCustomer = useCallback(
    (customer: Customer) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to update customers');
        return;
      }
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(currentUser?.role, 'customer.update')) {
        error('Permission denied: Cannot update customers');
        return;
      }
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)));
      success('Customer updated successfully');
      auditService.log('customer.update', {
        userId: currentEmployeeId,
        details: `Updated customer: ${customer.name}`,
        entityId: customer.id,
        branchId: activeBranchId,
      });
    },
    [setCustomers, success, currentEmployeeId, employees, error]
  );

  const handleDeleteCustomer = useCallback(
    (id: string) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to delete customers');
        return;
      }
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(currentUser?.role, 'customer.delete')) {
        error('Permission denied: Cannot delete customers');
        return;
      }

      // 🔴 Delete Guard: Check for orphaned foreign keys
      const hasSales = sales.some((s) => s.customerCode === id);
      if (hasSales) {
        error('Cannot delete customer with existing sales records');
        return;
      }

      setCustomers((prev) => prev.filter((c) => c.id !== id));
      success('Customer removed successfully');
      auditService.log('customer.delete', {
        userId: currentEmployeeId || 'System',
        details: `Deleted customer ID: ${id}`,
        entityId: id,
        branchId: activeBranchId,
      });
    },
    [setCustomers, sales, success, currentEmployeeId, employees, error]
  );

  // --- Purchase Management ---
  const applyPurchaseToInventory = useCallback(
    async (purchase: Purchase) => {
      const performer = employees?.find((e) => e.id === currentEmployeeId);
      const branchCode = activeBranchId;
      
      let currentInventory = [...inventory];
      const newEntries: Drug[] = [];

      purchase.items.forEach((purchasedItem) => {
        const sourceDrug = currentInventory.find((d) => d.id === purchasedItem.drugId);
        if (!sourceDrug) return;

        const purchaseExpiry = purchasedItem.expiryDate || sourceDrug.expiryDate;

        const sameExpiryEntry = currentInventory.find(
          (d) =>
            d.name === sourceDrug.name &&
            d.dosageForm === sourceDrug.dosageForm &&
            d.expiryDate === purchaseExpiry
        );

        const isNewEntry = !sameExpiryEntry;
        const targetId = isNewEntry ? idGenerator.generate('inventory', branchCode) : sameExpiryEntry.id;
        const targetDrug = isNewEntry ? sourceDrug : sameExpiryEntry;

        const mutation = stockOps.addStock(
          { ...targetDrug, id: targetId },
          purchasedItem.quantity,
          !!purchasedItem.isUnit,
          purchaseExpiry,
          purchasedItem.costPrice,
          'purchase',
          `Purchase Order #${purchase.invoiceId}`,
          {
            branchId: branchCode,
            performedBy: currentEmployeeId!,
            performedByName: performer?.name,
          },
          purchase.id,
          purchase.invoiceId,
          isNewEntry ? 0 : undefined
        );

        if (isNewEntry) {
          newEntries.push({
            ...sourceDrug,
            id: targetId,
            stock: mutation.unitsChanged,
            costPrice: purchasedItem.costPrice,
            expiryDate: purchaseExpiry,
            createdAt: new Date().toISOString(),
          });
          currentInventory.push(newEntries[newEntries.length - 1]);
        } else {
          currentInventory = currentInventory.map((d) => {
            if (d.id === targetId) {
              // --- PERSISTENCE: Immediate update ---
              inventoryService.updateStock(targetId, mutation.unitsChanged).catch(console.error);
              return {
                ...d,
                stock: mutation.newStock,
                costPrice: purchasedItem.costPrice,
              };
            }
            return d;
          });
        }
      });

      setBatches(batchService.getAllBatches(activeBranchId));
      setInventory(currentInventory);
    },
    [inventory, setInventory, setBatches, currentEmployeeId, employees, activeBranchId]
  );

  const handlePurchaseComplete = useCallback(
    (purchase: Purchase) => {
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!currentUser) {
        error('Authentication required: Please log in to complete purchases');
        return;
      }

      if (!canPerformAction(currentUser.role, 'purchase.create')) {
        error('Permission denied: Cannot create purchase orders');
        return;
      }
      let finalPurchase = { ...purchase, branchId: activeBranchId };

      if (finalPurchase.status === 'completed') {
        if (!canPerformAction(currentUser.role, 'purchase.approve')) {
          error('Permission denied: Cannot complete/approve purchase (Created as pending instead)');
          finalPurchase.status = 'pending';
        }
      }

      setPurchases((prev) => [finalPurchase, ...prev]);

      // Only update inventory if purchase is actually completed
      if (finalPurchase.status === 'completed') {
        applyPurchaseToInventory(finalPurchase);
        
        auditService.log('purchase.complete', {
          userId: currentEmployeeId,
          details: `Completed PO #${finalPurchase.invoiceId}`,
          entityId: finalPurchase.id,
          branchId: activeBranchId,
        });
      } else {
        info('Purchase Order Saved as Pending');
        auditService.log('purchase.create', {
          userId: currentEmployeeId,
          details: `Created PO #${finalPurchase.invoiceId} (Pending)`,
          entityId: finalPurchase.id,
          branchId: activeBranchId,
        });
      }
    },
    [setPurchases, applyPurchaseToInventory, info, currentEmployeeId, employees, error]
  );

  const handleApprovePurchase = useCallback(
    (purchaseId: string, approverName: string) => {
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!currentUser) {
        error('Authentication required: Please log in to approve purchases');
        return;
      }

      if (!canPerformAction(currentUser.role, 'purchase.approve')) {
        error('Permission denied: Cannot approve purchases');
        return;
      }
      const purchase = purchases.find((p) => p.id === purchaseId);
      if (!purchase) return;

      // 1. Update Purchase Status
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === purchaseId
            ? {
                ...p,
                status: 'completed',
                approvalDate: new Date().toISOString(),
                approvedBy: approverName,
              }
            : p
        )
      );

      // 2. Apply inventory logic (deduped)
      applyPurchaseToInventory({ ...purchase, status: 'completed' });

      auditService.log('purchase.approve', {
        userId: currentEmployeeId,
        details: `Approved PO #${purchase.invoiceId}`,
        entityId: purchase.id,
        branchId: activeBranchId,
      });

      success(`PO #${purchase.invoiceId} Approved Successfully`);
    },
    [purchases, setPurchases, applyPurchaseToInventory, success, currentEmployeeId, employees, error]
  );

  const handleRejectPurchase = useCallback(
    (purchaseId: string, reason?: string) => {
      if (
        !canPerformAction(
          employees?.find((e) => e.id === currentEmployeeId)?.role,
          'purchase.reject'
        )
      ) {
        error('Permission denied: Cannot reject purchases');
        return;
      }
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
    },
    [setPurchases, info, currentEmployeeId, employees, error]
  );

  const handleCreatePurchaseReturn = useCallback(
    async (returnData: PurchaseReturn) => {
      if (
        !canPerformAction(
          employees?.find((e) => e.id === currentEmployeeId)?.role,
          'purchase.return'
        )
      ) {
        error('Permission denied: Cannot create purchase returns');
        return;
      }

      setPurchaseReturns((prev) => [{ ...returnData, branchId: activeBranchId }, ...prev]);

      const performer = employees?.find((e) => e.id === currentEmployeeId);

      // Reduce inventory
      setInventory((prev) =>
        prev.map((drug) => {
          const returnedItem = returnData.items.find((i) => i.drugId === drug.id);
          if (returnedItem) {
            const isUnit = !!returnedItem.isUnit;
            const mutation = stockOps.deductStockSimple(
              drug,
              returnedItem.quantityReturned,
              isUnit,
              'return_supplier',
              `Purchase Return #${returnData.id}`,
              {
                branchId: activeBranchId,
                performedBy: currentEmployeeId!,
                performedByName: performer?.name,
              },
              returnData.id
            );

            // --- PERSISTENCE: Immediate deduction from IndexedDB ---
            const unitsToDeduct = isUnit
              ? returnedItem.quantityReturned
              : returnedItem.quantityReturned * (drug.unitsPerPack || 1);
            inventoryService.updateStock(drug.id, -unitsToDeduct).catch(console.error);

            return {
              ...drug,
              stock: mutation.newStock,
            };
          }
          return drug;
        })
      );

      auditService.log('purchase.return', {
        userId: currentEmployeeId || 'System',
        details: `Created Purchase Return #${returnData.id}`,
        entityId: returnData.id,
        branchId: activeBranchId,
      });

      success('Purchase return created and inventory updated.');
    },
    [currentEmployeeId, employees, error, setPurchaseReturns, setInventory, success, activeBranchId]
  );

  // --- Employee Management ---
  const handleAddEmployee = useCallback(
    async (employee: Employee) => {
      // 1. Auth Guard
      if (!currentEmployeeId) {
        error('Login required: Cannot add employees');
        return;
      }

      // 2. Permission Check
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(currentUser?.role, 'users.manage')) {
        error('Permission denied: Cannot add employees');
        return;
      }

      // 3. Persist to IndexedDB
      // The service will assign ID/Code if missing and inject branchId
      const newEmployee = await employeeService.create({
        ...employee,
        branchId: activeBranchId,
      });

      // 4. Update State with the result from service (to ensure IDs/Codes are present)
      setEmployees((prev) => [...prev, newEmployee]);
      success('Employee added successfully');

      auditService.log('user.create', {
        userId: currentEmployeeId,
        details: `Added Employee: ${newEmployee.name} (${newEmployee.employeeCode})`,
        entityId: newEmployee.id,
        branchId: activeBranchId,
      });
    },
    [setEmployees, success, currentEmployeeId, employees, error, activeBranchId]
  );

  const handleUpdateEmployee = useCallback(
    async (id: string, updates: Partial<Employee>) => {
      // Users can update themselves? Or only admins/managers?
      // 'users.manage' usually implies managing OTHER users.
      // Self-update logic (like profile) might need exception or separate permission.
      // For now, strict 'users.manage' check.

      const currentUserRole = employees?.find((e) => e.id === currentEmployeeId)?.role;
      const isSelf = id === currentEmployeeId;

      if (!isSelf && !canPerformAction(currentUserRole, 'users.manage')) {
        error('Permission denied: Cannot update employees');
        return;
      }

      // Persist to IndexedDB
      await employeeService.update(id, updates);
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      success('Employee updated successfully');
      auditService.log('user.update', {
        userId: currentEmployeeId || 'System',
        details: `Updated Employee ID: ${id}`,
        entityId: id,
        branchId: activeBranchId,
      });
    },
    [setEmployees, success, currentEmployeeId, employees, error]
  );

  const handleDeleteEmployee = useCallback(
    async (id: string) => {
      // 1. Auth Guard
      if (!currentEmployeeId) {
        error('Login required: Cannot delete employees');
        return;
      }

      // 2. Permission Check
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!canPerformAction(currentUser?.role, 'users.manage')) {
        error('Permission denied: Cannot delete employees');
        return;
      }

      if (id === currentEmployeeId) {
        error('Cannot delete your own account');
        return;
      }

      // 3. Delete Guard: Check for orphaned foreign keys
      // Since an employee might have cashier shifts, sales, etc., we prevent hard deletion
      // These checks are already branch-scoped because 'sales', 'purchases', 'customers' state 
      // is already filtered by activeBranchId in DataContext.
      const hasSales = sales.some((s) => s.soldByEmployeeId === id);
      const hasPurchases = purchases.some((p) => p.approvedBy === id);
      const hasCustomers = customers.some((c) => c.registeredByEmployeeId === id);

      if (hasSales || hasPurchases || hasCustomers) {
        error(
          'Cannot delete employee with existing transaction records. Please set their status to "Inactive" in edit mode instead.'
        );
        return;
      }

      // 4. Persist to IndexedDB
      await employeeService.delete(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      success('Employee deleted successfully');

      auditService.log('user.delete', {
        userId: currentEmployeeId,
        details: `Deleted Employee ID: ${id}`,
        entityId: id,
        branchId: activeBranchId,
      });
    },
    [setEmployees, sales, purchases, customers, success, currentEmployeeId, employees, error]
  );

  // --- Sale Management ---
  const handleCompleteSale = useCallback(
    async (saleData: SaleData) => {
      try {
        // 1. Permissions & Guards
        if (!currentEmployeeId) {
          error('Login required to complete sale');
          return false;
        }
        const currentUser = employees?.find((e) => e.id === currentEmployeeId);
        if (!canPerformAction(currentUser?.role, 'sale.create')) {
          error('Permission denied: Cannot process sales');
          return false;
        }

        // 2. Validate Sale Data
        const dataValidation = validateSaleData(saleData);
        if (!dataValidation.success) {
          error(dataValidation.message || 'Invalid sale data');
          return false;
        }

        // 3. Validate Stock Availability (Pre-check)
        const stockValidation = validateStockAvailability(saleData.items, inventory);
        if (!stockValidation.success) {
          error(stockValidation.message || 'Insufficient stock');
          return false;
        }

        // 4. Validate Transaction Time
        const saleDate = getVerifiedDate();
        const timeValidation = validateTransactionTime(saleDate);
        if (!timeValidation.valid) {
          error(`⚠️ ${timeValidation.message || 'Invalid transaction time'}`);
          return false;
        }

        // 5. PROCESS TRANSACTION (ATOMIC)
        const result = await transactionService.processCheckout(
          saleData,
          inventory,
          activeBranchId,
          currentEmployeeId,
          saleDate
        );

        if (!result.success || !result.sale) {
          error(result.error || 'Transaction failed');
          return false;
        }

        const newSale = result.sale;

        // 6. UPDATE STATES
        
        // Update Inventory State (Optimistic mirror)
        const soldItemsMap = new Map<string, CartItem>(
          newSale.items.map((item) => [item.id, item])
        );
        const soldDrugIds = newSale.items.map((item) => item.id);
        const earliestExpiries = batchService.getEarliestExpiriesBulk(soldDrugIds);

        setInventory((prev) =>
          prev.map((drug) => {
            const soldItem = soldItemsMap.get(drug.id);
            if (soldItem) {
              const quantityToDeduct = soldItem.isUnit
                ? soldItem.quantity
                : soldItem.quantity * (drug.unitsPerPack || 1);

              return {
                ...drug,
                stock: validateStock(drug.stock - quantityToDeduct),
                expiryDate: earliestExpiries[drug.id] || drug.expiryDate,
              };
            }
            return drug;
          })
        );

        // Update Sales State
        setSales((prev) => [...prev, newSale]);

        // Update Batches State
        setBatches(batchService.getAllBatches(activeBranchId));

        // Update Customer Points
        if (saleData.customerCode || saleData.customerName !== 'Guest Customer') {
          const pointsEarned = calculateLoyaltyPoints(saleData.total, saleData.items);
          if (pointsEarned > 0) {
            setCustomers((prev) =>
              prev.map((c) => {
                const isMatch =
                  (saleData.customerCode &&
                    (c.code === saleData.customerCode ||
                      c.serialId?.toString() === saleData.customerCode)) ||
                  (!saleData.customerCode && c.name === saleData.customerName);
                if (isMatch) {
                  return { ...c, points: (c.points || 0) + pointsEarned };
                }
                return c;
              })
            );
          }
        }

        // Update Shift
        const isImmediateComplete = !saleData.saleType || saleData.saleType === 'walk-in';
        if (isImmediateComplete && currentShift) {
          addTransaction(currentShift.id, {
            id: Date.now().toString(),
            shiftId: currentShift.id,
            time: new Date().toISOString(),
            type: saleData.paymentMethod === 'cash' ? 'sale' : 'card_sale',
            amount: saleData.total,
            reason: `Sale #${newSale.serialId}`,
            userId: currentUser?.name || 'System',
            relatedSaleId: newSale.serialId.toString(),
          });
        }

        updateLastTransactionTime(saleDate.getTime());
        success(`Order #${newSale.serialId} completed!`);
        return true;

      } catch (err: any) {
        console.error('[handleCompleteSale] Fatal error:', err);
        error('An unexpected error occurred during checkout.');
        return false;
      }
    },
    [
      currentEmployeeId,
      employees,
      activeBranchId,
      inventory,
      getVerifiedDate,
      validateTransactionTime,
      setInventory,
      setSales,
      setBatches,
      setCustomers,
      currentShift,
      addTransaction,
      updateLastTransactionTime,
      success,
      error,
    ]
  );

  // Wrap with Monitoring
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

      // Handle order cancellation - return all items to batches
      if (updates.status === 'cancelled' && sale.status !== 'cancelled') {
        if (!canPerformAction(employee?.role, 'sale.cancel')) {
          error('Permission denied: Cannot cancel orders');
          return;
        }

        // Limit for senior_cashier
        if (employee?.role === 'senior_cashier' && sale.total > SENIOR_CASHIER_CANCEL_LIMIT) {
          error(
            `Permission denied: Senior Cashiers cannot cancel sales exceeding ${SENIOR_CASHIER_CANCEL_LIMIT} EGP (Sale Total: ${sale.total.toFixed(2)}). Manager approval required.`
          );
          return;
        }

        const performer = employee;
        sale.items.forEach((item) => {
          const drug = inventory.find((d) => d.id === item.id && d.branchId === activeBranchId);
          if (drug) {
            stockOps.returnStock(
              drug,
              item.quantity,
              !!item.isUnit,
              item.batchAllocations,
              'correction',
              `Sale Cancellation #${saleId}`,
              {
                branchId: activeBranchId,
                performedBy: currentEmployeeId!,
                performedByName: performer?.name,
              },
              saleId
            );
          }
        });
        
        // Update inventory state
        const updatedInventory = restoreStockForCancelledSale(sale, inventory);
        setInventory(updatedInventory);
        setBatches(batchService.getAllBatches(activeBranchId));

        // --- PERSISTENCE: Return items to IndexedDB ---
        try {
          await Promise.all(
            sale.items.map((item) => {
              const drug = inventory.find((d) => d.id === item.id && d.branchId === activeBranchId);
              if (!drug) return Promise.resolve();
              const unitsToRestore = stockOps.resolveUnits(item.quantity, !!item.isUnit, drug.unitsPerPack);
              return inventoryService.updateStock(item.id, unitsToRestore);
            })
          );
        } catch (e) {
          console.error('[handleUpdateSale] Cancellation Persistence Error:', e);
        }

        success(`Order #${saleId} cancelled and stock returned.`);
      }

      // Handle item modifications (for delivery orders)
      if (updates.items && sale.saleType === 'delivery' && sale.status !== 'completed') {
        if (!canPerformAction(employee?.role, 'sale.modify')) {
          error('Permission denied: Cannot modify orders');
          return;
        }

        const modifications: OrderModification[] = [];
        const timestamp = new Date().toISOString();
        const performer = employee;

        // Compare old items with new items (MUST compare by id AND isUnit)
        for (const oldItem of sale.items) {
          const newItem = updates.items.find(
            (i) => i.id === oldItem.id && i.isUnit === oldItem.isUnit
          );

          if (!newItem) {
            // Item was deleted - return all stock
            stockOps.returnStock(
              inventory.find(d => d.id === oldItem.id)!,
              oldItem.quantity,
              !!oldItem.isUnit,
              oldItem.batchAllocations,
              'correction',
              `Item Removed from Delivery #${sale.id}`,
              {
                branchId: activeBranchId,
                performedBy: currentEmployeeId!,
                performedByName: performer?.name,
              },
              sale.id
            );

            // Update Drug.stock
            setInventory((prev) =>
              prev.map((drug) => {
                if (drug.id === oldItem.id) {
                  const unitsToRestore = stockOps.resolveUnits(oldItem.quantity, !!oldItem.isUnit, drug.unitsPerPack);
                  // --- PERSISTENCE: Immediate update ---
                  inventoryService.updateStock(oldItem.id, unitsToRestore).catch(console.error);
                  return { ...drug, stock: validateStock(drug.stock + unitsToRestore) };
                }
                return drug;
              })
            );

            modifications.push({
              type: 'item_removed',
              itemId: oldItem.id,
              itemName: oldItem.name,
              dosageForm: oldItem.dosageForm,
              previousQuantity: oldItem.quantity,
              newQuantity: 0,
              stockReturned: stockOps.resolveUnits(oldItem.quantity, !!oldItem.isUnit, oldItem.unitsPerPack || 1),
            });
          } else {
            // Check for quantity changes
            if (newItem.quantity !== oldItem.quantity) {
              // Quantity changed
              const drug = inventory.find((d) => d.id === oldItem.id);
              if (!drug) continue;

              const oldUnits = oldItem.isUnit
                ? oldItem.quantity
                : oldItem.quantity * (drug.unitsPerPack || 1);
              const newUnits = newItem.isUnit
                ? newItem.quantity
                : newItem.quantity * (drug.unitsPerPack || 1);
              const diff = oldUnits - newUnits;

              if (diff > 0) {
                // Quantity reduced - return partial stock
                stockOps.returnStock(
                  drug,
                  diff,
                  true, // units
                  oldItem.batchAllocations,
                  'correction',
                  `Quantity Reduced in Delivery #${sale.id}`,
                  {
                    branchId: activeBranchId,
                    performedBy: currentEmployeeId!,
                    performedByName: performer?.name,
                  },
                  sale.id
                );
                
                setBatches(batchService.getAllBatches(activeBranchId));

                setInventory((prev) =>
                  prev.map((d) => {
                    if (d.id === oldItem.id) {
                      // --- PERSISTENCE: Immediate update ---
                      inventoryService.updateStock(oldItem.id, diff).catch(console.error);
                      return { ...d, stock: validateStock(d.stock + diff) };
                    }
                    return d;
                  })
                );

                modifications.push({
                  type: 'quantity_update',
                  itemId: oldItem.id,
                  itemName: oldItem.name,
                  dosageForm: oldItem.dosageForm,
                  previousQuantity: oldItem.quantity,
                  newQuantity: newItem.quantity,
                  stockReturned: diff,
                });
              } else if (diff < 0) {
                // Quantity increased - allocate more
                const mutation = stockOps.deductStock(
                  drug,
                  Math.abs(diff),
                  true, // units
                  'sale',
                  `Quantity Increased in Delivery #${sale.id}`,
                  {
                    branchId: activeBranchId,
                    performedBy: currentEmployeeId!,
                    performedByName: performer?.name,
                  },
                  sale.id
                );

                if (mutation) {
                  // Merge allocations
                  newItem.batchAllocations = [
                    ...(oldItem.batchAllocations || []),
                    ...(mutation.allocations || []),
                  ];
                  setBatches(batchService.getAllBatches(activeBranchId));

                  setInventory((prev) =>
                    prev.map((d) => {
                      if (d.id === oldItem.id) {
                        // --- PERSISTENCE: Immediate update ---
                        inventoryService.updateStock(oldItem.id, -Math.abs(diff)).catch(console.error);
                        return { ...d, stock: mutation.newStock };
                      }
                      return d;
                    })
                  );

                  modifications.push({
                    type: 'quantity_update',
                    itemId: oldItem.id,
                    itemName: oldItem.name,
                    dosageForm: oldItem.dosageForm,
                    previousQuantity: oldItem.quantity,
                    newQuantity: newItem.quantity,
                    stockDeducted: Math.abs(diff),
                  });
                }
              }
            }

            // Check for discount changes (track but no stock impact)
            if ((newItem.discount || 0) !== (oldItem.discount || 0)) {
              modifications.push({
                type: 'discount_update',
                itemId: oldItem.id,
                itemName: oldItem.name,
                dosageForm: oldItem.dosageForm,
                previousDiscount: oldItem.discount || 0,
                newDiscount: newItem.discount || 0,
              });
            }
          }
        }

        // Handle NEW items (items in updates.items that don't exist in sale.items)
        for (const newItem of updates.items) {
          const existsInOld = sale.items.some(
            (old) => old.id === newItem.id && old.isUnit === newItem.isUnit
          );
          if (!existsInOld) {
            // This is a NEW item - allocate stock
            const drug = inventory.find((d) => d.id === newItem.id);
            if (drug) {
              const mutation = stockOps.deductStock(
                drug,
                newItem.quantity,
                !!newItem.isUnit,
                'sale',
                `Item Added to Delivery #${sale.id}`,
                {
                  branchId: activeBranchId,
                  performedBy: currentEmployeeId!,
                  performedByName: performer?.name,
                },
                sale.id
              );

              if (mutation) {
                newItem.batchAllocations = mutation.allocations;
                setBatches(batchService.getAllBatches(activeBranchId));

                setInventory((prev) =>
                  prev.map((d) => {
                    if (d.id === newItem.id) {
                      // --- PERSISTENCE: Immediate update ---
                      inventoryService.updateStock(newItem.id, -mutation.unitsChanged).catch(console.error);
                      return { ...d, stock: mutation.newStock };
                    }
                    return d;
                  })
                );

                modifications.push({
                  type: 'item_added',
                  itemId: newItem.id,
                  itemName: newItem.name,
                  dosageForm: newItem.dosageForm,
                  previousQuantity: 0,
                  newQuantity: newItem.quantity,
                  stockDeducted: mutation.unitsChanged,
                });
              }
            }
          }
        }

        // Add modification history
        if (modifications.length > 0) {
          // Resolve modifier name
          const modifierName = employee?.name || 'System';

          const historyRecord: OrderModificationRecord = {
            id: idGenerator.generate('generic', activeBranchId),
            timestamp,
            modifiedBy: modifierName,
            modifications,
          };

          updates.modificationHistory = [...(sale.modificationHistory || []), historyRecord];
        }
        success(`Order #${saleId} modified and history updated.`);
      }

      // Handle Delivery Completion (Status changed to completed)
      if (updates.status === 'completed' && sale.status !== 'completed' && currentShift) {
        // Now we add the money to the shift
        const isCash = sale.paymentMethod === 'cash';
        addTransaction(currentShift.id, {
          id: Date.now().toString(),
          shiftId: currentShift.id,
          time: new Date().toISOString(),
          type: isCash ? 'sale' : 'card_sale',
          amount: sale.total, // Ensure we use the full total
          reason: `Delivery Finalized #${saleId}`,
          userId: employee?.name || 'System',
          relatedSaleId: saleId.toString(),
        });
        success(`Delivery #${saleId} completed and payment recorded.`);
      }

      const finalUpdates: Partial<Sale> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      setSales((prev) => prev.map((s) => (s.id === saleId ? { ...s, ...finalUpdates } : s)));
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
        // 1. Authentication & Permission Guard
        if (!currentEmployeeId) {
          error('Permission denied: Login required to process returns');
          return false;
        }
        const employee = employees?.find((e) => e.id === currentEmployeeId);
        if (!canPerformAction(employee?.role, 'sale.refund')) {
          error('Permission denied: Cannot process returns');
          return false;
        }

        // 2. Validate Return Data
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

        // 3. PROCESS TRANSACTION (ATOMIC)
        const result = await transactionService.processReturn(
          returnData,
          inventory,
          sale,
          activeBranchId,
          currentEmployeeId
        );

        if (!result.success) {
          error(result.error || 'Return processing failed');
          return false;
        }

        // 4. UPDATE STATES
        
        // Update Returns State
        const returnWithBranch: Return = {
          ...returnData,
          branchId: activeBranchId,
        };
        setReturns((prev) => [returnWithBranch, ...prev]);

        // Update Sales State
        setSales((prev) =>
          prev.map((s) => {
            if (s.id === returnData.saleId) {
              const existingReturns = s.returnIds || [];
              const totalReturned = (s.netTotal !== undefined ? s.total - s.netTotal : 0) + returnData.totalRefund;
              
              const itemReturnedQuantities = { ...(s.itemReturnedQuantities || {}) };
              returnData.items.forEach((item) => {
                itemReturnedQuantities[item.drugId] =
                  (itemReturnedQuantities[item.drugId] || 0) + item.quantityReturned;
              });

              return {
                ...s,
                hasReturns: true,
                returnIds: [...existingReturns, returnData.id],
                netTotal: s.total - totalReturned,
                itemReturnedQuantities,
              };
            }
            return s;
          })
        );

        // Update Inventory State (Optimistic mirror)
        const returnedItemsMap = new Map(returnData.items.map(i => [i.drugId, i]));
        setInventory((prev) =>
          prev.map((drug) => {
            const returnedItem = returnedItemsMap.get(drug.id);
            if (returnedItem) {
              const drugInSale = sale.items.find(i => i.id === drug.id);
              const unitsToRestore = returnedItem.isUnit
                ? returnedItem.quantityReturned
                : returnedItem.quantityReturned * (drug.unitsPerPack || 1);
                
              return {
                ...drug,
                stock: validateStock(drug.stock + unitsToRestore),
              };
            }
            return drug;
          })
        );

        // Update Batches State
        setBatches(batchService.getAllBatches(activeBranchId));

        // Update Shift
        if (currentShift) {
          addTransaction(currentShift.id, {
            id: Date.now().toString(),
            shiftId: currentShift.id,
            time: new Date().toISOString(),
            type: 'return',
            amount: returnData.totalRefund,
            reason: `Return for Sale #${sale.serialId}`,
            userId: employee?.name || 'System',
            relatedSaleId: sale.serialId?.toString() || sale.id,
          });
        }

        updateLastTransactionTime(returnDate.getTime());
        success(`Return processed successfully. Refund: ${returnData.totalRefund.toFixed(2)} L.E`);
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
      sales,
      inventory,
      currentShift,
      validateTransactionTime,
      setReturns,
      setSales,
      setInventory,
      setBatches,
      addTransaction,
      updateLastTransactionTime,
      success,
      error,
    ]
  );

  // --- Computed Data ---
  const enrichedCustomers = useMemo(() => {
    // Optimization: Create a map of sales by customer to avoid O(N*M) complexity
    const salesByCustomer = new Map<string, Sale[]>();

    sales.forEach((sale) => {
      // Key can be customerCode or customerName (fallback)
      // We need to match how we look it up later.
      // Since customers store 'code' and 'name', we can try to index by both if needed,
      // but simpler to iterate sales once and check against a robust key strategy
      // OR just map sales by their identifiers.

      // Strategy:
      // 1. If sale has customerCode, map it to that code.
      // 2. If no code, map it to name.

      if (sale.customerCode) {
        const key = `code:${sale.customerCode}`;
        const existing = salesByCustomer.get(key) || [];
        existing.push(sale);
        salesByCustomer.set(key, existing);
      } else if (sale.customerName) {
        const key = `name:${sale.customerName}`;
        const existing = salesByCustomer.get(key) || [];
        existing.push(sale);
        salesByCustomer.set(key, existing);
      }
    });

    return customers.map((customer) => {
      // Retrieve sales using the same keys
      const salesByCode = customer.code ? salesByCustomer.get(`code:${customer.code}`) || [] : [];
      // Also check serialId as fallback for code match (legacy support)
      const salesBySerial = customer.serialId
        ? salesByCustomer.get(`code:${customer.serialId}`) || []
        : [];
      const salesByName = salesByCustomer.get(`name:${customer.name}`) || [];

      // Merge unique sales
      const allCustomerSales = Array.from(
        new Set([...salesByCode, ...salesBySerial, ...salesByName])
      );

      const totalPurchases = allCustomerSales.reduce(
        (sum, sale) => sum + (sale.netTotal ?? sale.total),
        0
      );

      let lastVisit = customer.lastVisit;
      if (allCustomerSales.length > 0) {
        // Sort only the customer's sales, not the whole array every time
        allCustomerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastVisit = allCustomerSales[0].date;
      }

      return {
        ...customer,
        totalPurchases,
        lastVisit,
      };
    });
  }, [customers, sales]);

  return {
    // Drug handlers
    handleAddDrug,
    handleUpdateDrug,
    handleDeleteDrug,
    handleRestock,

    // Supplier handlers
    handleAddSupplier,
    handleUpdateSupplier,
    handleDeleteSupplier,

    // Customer handlers
    handleAddCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,

    // Purchase handlers
    handlePurchaseComplete,
    handleApprovePurchase,
    handleRejectPurchase,

    // Sale handlers
    handleCompleteSale: monitoredHandleCompleteSale, // Export monitored version
    handleUpdateSale,
    handleProcessReturn,

    // Computed data
    enrichedCustomers,
    handleCreatePurchaseReturn,
    handleAddEmployee,
    handleUpdateEmployee,
    handleDeleteEmployee,
  };
}
