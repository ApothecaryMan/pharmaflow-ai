import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { permissionsService } from '../services/auth/permissions';
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
import { salesService } from '../services/sales/salesService';
import { purchaseService } from '../services/purchases/purchaseService';
import { customerService } from '../services/customers/customerService';
import { supplierService } from '../services/suppliers/supplierService';
import { returnService } from '../services/returns/returnService';
import * as stockOps from '../utils/stockOperations';
import type { AppSettings } from '../services/settings/types';
import type {
  ActionContext,
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
// BUG-C3: Removed dead import of addTransactionToOpenShift (deprecated, replaced by useShift context)
import { storage } from '../utils/storage';
import { getShardKey } from '../utils/sharding';
import { validateDrug, validateSaleData, validateStockAvailability } from '../utils/validation';
import { useShift } from './useShift';
import { formatCurrency } from '../utils/currency';

// --- Constants ---
const SENIOR_CASHIER_CANCEL_LIMIT = 500; // 500.00 EGP

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
  handleApprovePurchase: (purchaseId: string) => Promise<void>;
  handleMarkAsReceived: (purchaseId: string) => Promise<void>;
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
  activeOrgId: string;
  isLoading: boolean;

  // Actions
  addPurchase?: (purchase: Omit<Purchase, 'id'>, context?: ActionContext) => Promise<Purchase>;
  approvePurchase?: (id: string, context: ActionContext) => Promise<void>;
  markAsReceived?: (id: string, receiverName: string) => Promise<void>;

  completeSale: (saleData: any, context: ActionContext) => Promise<Sale>;
  processSalesReturn: (returnData: any, sale: Sale, context: ActionContext) => Promise<void>;
  createPurchaseReturn: (ret: Omit<PurchaseReturn, 'id'>, context: ActionContext) => Promise<PurchaseReturn>;
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
  activeOrgId,
  isLoading,
  batches,
  setBatches,
  addPurchase,
  approvePurchase,
  markAsReceived,
  completeSale,
  processSalesReturn,
  createPurchaseReturn,
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
          const updatedBatches = await batchService.getAllBatches(activeBranchId); setBatches(updatedBatches);
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
          'RESTOCK', // referenceId
          'MANUAL_RESTOCK' // batchNumber
        );
        if (mutation) {
          setInventory((prev) => prev.map((d) => (d.id === id ? { ...d, stock: mutation.newStock } : d)));
          const updatedBatches = await batchService.getAllBatches(activeBranchId); setBatches(updatedBatches);
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

  // --- Supplier Management ---
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
    [setSuppliers, currentEmployeeId, employees, activeBranchId, error, success]
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
    [setSuppliers, currentEmployeeId, employees, activeBranchId, error, success]
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

      //Delete Guard: Check for orphaned foreign keys
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
    [setSuppliers, purchases, success, currentEmployeeId, employees, error, activeBranchId]
  );

  // --- Customer Management ---
  const handleAddCustomer = useCallback(
    async (customer: Customer) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to add customers');
        return;
      }
      if (!permissionsService.can('customer.add')) {
        error('Permission denied: Cannot add customers');
        return;
      }

      try {
        // Persist to database via customerService
        const result = await customerService.create({
          ...customer,
          createdAt: customer.createdAt || getVerifiedDate().toISOString(),
          registeredByEmployeeId: customer.registeredByEmployeeId || currentEmployeeId || undefined,
        }, activeBranchId);

        setCustomers((prev) => [...prev, result]);
        success('Customer added successfully');
        auditService.log('customer.add', {
          userId: currentEmployeeId || 'System',
          details: `Added customer: ${result.name}`,
          entityId: result.id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to add customer: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    },
    [setCustomers, success, currentEmployeeId, employees, error, getVerifiedDate, activeBranchId]
  );

  const handleUpdateCustomer = useCallback(
    async (customer: Customer) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to update customers');
        return;
      }
      if (!permissionsService.can('customer.update')) {
        error('Permission denied: Cannot update customers');
        return;
      }

      try {
        const result = await customerService.update(customer.id, customer);
        setCustomers((prev) => prev.map((c) => (c.id === customer.id ? result : c)));
        success('Customer updated successfully');
        auditService.log('customer.update', {
          userId: currentEmployeeId,
          details: `Updated customer: ${customer.name}`,
          entityId: customer.id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to update customer: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    },
    [setCustomers, success, currentEmployeeId, employees, error, activeBranchId]
  );

  const handleDeleteCustomer = useCallback(
    async (id: string) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to delete customers');
        return;
      }
      if (!permissionsService.can('customer.delete')) {
        error('Permission denied: Cannot delete customers');
        return;
      }

      // 🔴 Delete Guard: Check for orphaned foreign keys
      const hasSales = sales.some((s) => s.customerCode === id);
      if (hasSales) {
        error('Cannot delete customer with existing sales records');
        return;
      }

      try {
        await customerService.delete(id);
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        success('Customer removed successfully');
        auditService.log('customer.delete', {
          userId: currentEmployeeId || 'System',
          details: `Deleted customer ID: ${id}`,
          entityId: id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to delete customer: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setCustomers, sales, success, currentEmployeeId, employees, error, activeBranchId]
  );

  // --- Purchase Management ---
  const applyPurchaseToInventory = useCallback(
    async (purchase: Purchase) => {
      const performer = employees?.find((e) => e.id === currentEmployeeId);
      const branchCode = activeBranchId;
      
      let currentInventory = [...inventory];
      const newEntries: Drug[] = [];

      for (const purchasedItem of purchase.items) {
        const sourceDrug = currentInventory.find((d) => d.id === purchasedItem.drugId);
        if (!sourceDrug) {
          // BUG-P5: Log warning instead of silently skipping
          console.warn(`[Purchase] Item ${purchasedItem.drugId} (${purchasedItem.name}) not found in inventory — skipped during stock update`);
          continue;
        }

        // BUG-008: Validate received quantity is reasonable (prevents inflation)
        if (purchasedItem.quantity <= 0) {
          console.warn(`[Purchase] Skipping item with zero/negative quantity: ${purchasedItem.drugId}`);
          continue;
        }

        const purchaseExpiry = purchasedItem.expiryDate || sourceDrug.expiryDate;

        const sameExpiryEntry = currentInventory.find(
          (d) =>
            d.name === sourceDrug.name &&
            d.dosageForm === sourceDrug.dosageForm &&
            d.expiryDate === purchaseExpiry
        );

        const isNewEntry = !sameExpiryEntry;
        const targetId = isNewEntry ? idGenerator.generateSync('inventory', branchCode) : sameExpiryEntry.id;
        const targetDrug = isNewEntry ? sourceDrug : sameExpiryEntry;

        const mutation = await stockOps.addStock(
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
          // --- PERSISTENCE: Immediate update ---
          await inventoryService.updateStock(targetId, mutation.unitsChanged, true);
          currentInventory = currentInventory.map((d) => {
            if (d.id === targetId) {
              return {
                ...d,
                stock: mutation.newStock,
                costPrice: purchasedItem.costPrice,
              };
            }
            return d;
          });
        }
      }

      const updatedBatches = await batchService.getAllBatches(activeBranchId); setBatches(updatedBatches);
      setInventory(currentInventory);
    },
    [inventory, setInventory, setBatches, currentEmployeeId, employees, activeBranchId]
  );

  const handlePurchaseComplete = useCallback(
    async (purchase: Purchase) => {
      const currentUser = employees?.find((e) => e.id === currentEmployeeId);
      if (!currentUser) {
        error('Authentication required: Please log in to complete purchases');
        return;
      }

      if (!permissionsService.can('purchase.create')) {
        error('Permission denied: Cannot create purchase orders');
        return;
      }

      try {
        // 1. Build Action Context (Required if status is completed)
        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: currentUser?.name || 'Unknown',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: new Date().toISOString(),
        };

        // 2. Execute via DataContext
        if (addPurchase) {
          const result = await addPurchase(purchase, context);
          
          if (result.status === 'completed') {
            success(`Direct Purchase PO #${result.invoiceId} completed and inventory updated`);
          } else {
            info(`Purchase Order PO #${result.invoiceId} saved as pending`);
          }
        } else {
          throw new Error('Add purchase action not initialized');
        }
      } catch (err) {
        error(`Failed to process purchase: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [
      addPurchase,
      currentEmployeeId,
      employees,
      activeBranchId,
      activeOrgId,
      currentShift,
      error,
      success,
      info
    ]
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

      // BUG-P1: Guard against re-approving an already completed purchase (double stock)
      if (purchase.status === 'completed') {
        error('This purchase has already been approved and received.');
        return;
      }

      // 0. Shift Check for Cash Purchases
      if (purchase.paymentMethod === 'cash' && !currentShift) {
        error('Shift must be open to process cash purchase');
        return;
      }

      try {
        // 1. Build Standard Action Context
        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: currentUser?.name || 'Unknown',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: new Date().toISOString(),
        };

        // 2. Execute Atomic Transaction via DataContext -> TransactionService
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
    [
      purchases,
      approvePurchase,
      success,
      currentEmployeeId,
      employees,
      error,
      currentShift,
      activeBranchId,
      activeOrgId,
    ]
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
          await markAsReceived(purchaseId, currentUser.name);
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
      // BUG-P4: Block rejection of completed purchases (stock already added, no reversal)
      if (purchase?.status === 'completed') {
        error('Cannot reject a completed purchase. Use Purchase Returns to reverse stock.');
        return;
      }

      try {
        // --- PERSISTENCE: Update status in Service layer ---
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
        // 5. PROCESS TRANSACTION (ATOMIC)
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
      setInventory,
      setBatches,
      success,
      currentEmployeeId,
      employees,
      error,
      activeBranchId,
      activeOrgId,
      currentShift,
      addTransaction,
      createPurchaseReturn,
    ]
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
      if (!permissionsService.can('users.manage')) {
        error('Permission denied: Cannot add employees');
        return;
      }

      // 3. Persist to Supabase
      // The service will assign ID/Code if missing and inject branchId/orgId
      const newEmployee = await employeeService.create(
        employee,
        employee.branchId || activeBranchId,
        activeOrgId
      );

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

      if (!isSelf && !permissionsService.can('users.manage')) {
        error('Permission denied: Cannot update employees');
        return;
      }

      // Extra Hardening: Prevent self-elevation or salary tampering even if it's "Self"
      if (isSelf && !permissionsService.can('users.manage')) {
        const sensitiveFields: (keyof Employee)[] = ['role', 'salary', 'employeeCode', 'status', 'department'];
        const hasSensitiveUpdates = sensitiveFields.some(field => field in updates);
        
        if (hasSensitiveUpdates) {
          error('Permission denied: You cannot update your own role, salary, or status. Contact an administrator.');
          return;
        }
      }

      // Persist to Supabase
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
      if (!permissionsService.can('users.manage')) {
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

      // 4. Persist to Supabase
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
        if (!permissionsService.can('sale.create')) {
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
        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: currentUser?.name || 'System',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: saleDate.toISOString()
        };

        const newSale = await completeSale(saleData, context);

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
      activeOrgId,
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
      completeSale,
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
        // Block cancellation of completed deliveries - must use Return flow for them
        // Walk-in sales are also 'completed', but we allow cancelling (voiding) them if necessary
        if (sale.status === 'completed' && sale.saleType === 'delivery') {
          error('Cannot cancel a completed delivery order. Please use the Return flow instead.');
          return;
        }

        if (!permissionsService.can('sale.cancel')) {
          error('Permission denied: Cannot cancel orders');
          return;
        }

        // Limit for senior_cashier
        if (employee?.role === 'senior_cashier' && sale.total > SENIOR_CASHIER_CANCEL_LIMIT) {
          error(
            `Permission denied: Senior Cashiers cannot cancel sales exceeding ${formatCurrency(SENIOR_CASHIER_CANCEL_LIMIT)} (Sale Total: ${formatCurrency(sale.total)}). Manager approval required.`
          );
          return;
        }

        // 1.5. Shift Requirement Guard for Cash Refunds
        // BUG-SH-02: Block cancellations of paid/completed sales if no shift is open
        const needsShift = sale.saleType === 'walk-in' || sale.status === 'completed';
        if (needsShift && !currentShift) {
          error('Permission denied: An active shift must be open to cancel a completed or walk-in sale and issue a refund.');
          return;
        }

        const performer = employee;
        for (const item of sale.items) {
          const drug = inventory.find((d) => d.id === item.id && d.branchId === activeBranchId);
          if (drug) {
            const returnedAllocations = item.batchAllocations || [];
            await stockOps.returnStock(
              drug,
              item.quantity,
              !!item.isUnit,
              returnedAllocations,
              'correction',
              'Sale Cancellation',
              {
                branchId: activeBranchId,
                performedBy: currentEmployeeId!,
                performedByName: employees.find((e) => e.id === currentEmployeeId)?.name,
              },
              saleId
            );
          }
        }
        
        // Update inventory state
        const updatedInventory = await restoreStockForCancelledSale(inventory, sale.items);
        setInventory(updatedInventory);
        const updatedBatches = await batchService.getAllBatches(activeBranchId); setBatches(updatedBatches);

        // --- PERSISTENCE: Return items to Supabase ---
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

        // --- SHIFT BALANCING: Add correction if it was a walk-in or paid sale ---
        // Walk-in sales are always 'completed' and recorded in the shift balance.
        // Delivery sales are only recorded in the shift balance when their status changes to 'completed'.
        if (currentShift && (sale.saleType === 'walk-in' || sale.status === 'completed')) {
           const type = sale.paymentMethod === 'visa' ? 'card_return' : 'return';
           addTransaction(currentShift.id, {
             id: idGenerator.generateSync('transactions', activeBranchId),
             branchId: activeBranchId,
             shiftId: currentShift.id,
             time: new Date().toISOString(),
             type: type, 
             amount: sale.total,
             reason: `Cancellation of Sale #${sale.serialId || sale.id}`,
             userId: employee?.name || 'System',
             relatedSaleId: sale.serialId?.toString() || sale.id
           });
        }

        success(`Order #${saleId} cancelled and stock returned.`);
      }

      // Handle item modifications (for delivery orders)
      if (updates.items && sale.saleType === 'delivery' && sale.status !== 'cancelled') {
        if (!permissionsService.can('sale.modify')) {
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
            await stockOps.returnStock(
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
            const drugForOld = inventory.find((d) => d.id === oldItem.id);
            if (drugForOld) {
              const unitsToRestore = stockOps.resolveUnits(oldItem.quantity, !!oldItem.isUnit, drugForOld.unitsPerPack);
              // --- PERSISTENCE: Immediate update ---
              await inventoryService.updateStock(oldItem.id, unitsToRestore);
              
              setInventory((prev) =>
                prev.map((drug) => {
                  if (drug.id === oldItem.id) {
                    return { ...drug, stock: validateStock(drug.stock + unitsToRestore) };
                  }
                  return drug;
                })
              );
            }

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
                await stockOps.returnStock(
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
                
                const updatedBatches = await batchService.getAllBatches(activeBranchId);
                setBatches(updatedBatches);

                // --- PERSISTENCE: Immediate update ---
                await inventoryService.updateStock(oldItem.id, diff);

                setInventory((prev) =>
                  prev.map((d) => {
                    if (d.id === oldItem.id) {
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
                const mutation = await stockOps.deductStock(
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
                  const updatedBatches = await batchService.getAllBatches(activeBranchId);
                  setBatches(updatedBatches);

                  // --- PERSISTENCE: Immediate update ---
                  await inventoryService.updateStock(oldItem.id, -Math.abs(diff));

                  setInventory((prev) =>
                    prev.map((d) => {
                      if (d.id === oldItem.id) {
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
              const mutation = await stockOps.deductStock(
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
                const updatedBatches = await batchService.getAllBatches(activeBranchId);
                setBatches(updatedBatches);

                // --- PERSISTENCE: Immediate update ---
                await inventoryService.updateStock(newItem.id, -mutation.unitsChanged);

                setInventory((prev) =>
                  prev.map((d) => {
                    if (d.id === newItem.id) {
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
            id: idGenerator.generateSync('generic', activeBranchId),
            timestamp,
            modifiedBy: modifierName,
            modifications,
          };

          updates.modificationHistory = [...(sale.modificationHistory || []), historyRecord];
        }
        success(`Order #${saleId} modified and history updated.`);
      }

      // Handle Delivery Completion (Status changed to completed)
      // BUG-011: Only fire for delivery orders — walk-in sales already record shift tx at checkout time
      // BUG-C1: Idempotency guard — check shiftTransactionRecorded flag to prevent double recording
      if (updates.status === 'completed' && sale.status !== 'completed' && sale.saleType === 'delivery' && currentShift && !sale.shiftTransactionRecorded) {
        // Now we add the money to the shift
        const isCash = sale.paymentMethod === 'cash';
        // BUG-C5: Use updated total if available (order may have been edited)
        const txAmount = (updates as any).total ?? sale.total;
        addTransaction(currentShift.id, {
          id: idGenerator.generateSync('transactions', activeBranchId),
          branchId: activeBranchId,
          shiftId: currentShift.id,
          time: new Date().toISOString(),
          type: isCash ? 'sale' : 'card_sale',
          amount: txAmount,
          reason: `Delivery Finalized #${saleId}`,
          userId: employee?.name || 'System',
          relatedSaleId: saleId.toString(),
        });
        // Mark as recorded to prevent duplicate on rapid double-click
        updates.shiftTransactionRecorded = true;
        success(`Delivery #${saleId} completed and payment recorded.`);
      }

      const finalUpdates: Partial<Sale> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      setSales((prev) => prev.map((s) => (s.id === saleId ? { ...s, ...finalUpdates } : s)));

      // --- PERSISTENCE: Save modified/completed/cancelled sale to Supabase via salesService ---
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
        // 1. Authentication & Permission Guard
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

        // 1.5. Shift Requirement Guard
        // BUG-SH-01: Block returns if no shift is open to ensure financial tracking
        if (!currentShift) {
          error('Permission denied: An active shift must be open to process returns and issue refunds.');
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

        // BUG-004: Block returns on cancelled sales (stock already restored during cancellation)
        if (sale.status === 'cancelled') {
          error('Cannot process return for a cancelled sale. Stock was already restored during cancellation.');
          return false;
        }

        // 3. PROCESS TRANSACTION (ATOMIC)
        const context: ActionContext = {
          performerId: currentEmployeeId,
          performerName: employee?.name || 'System',
          branchId: activeBranchId,
          orgId: activeOrgId,
          shiftId: currentShift?.id,
          timestamp: returnDate.toISOString()
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
      processSalesReturn,
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
    handleMarkAsReceived,
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
