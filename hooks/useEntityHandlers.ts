import { useCallback, useMemo, useRef, useEffect } from 'react';
import { Drug, Sale, CartItem, Supplier, Purchase, Return, Customer } from '../types';
import { ToastState } from './useAppState';
import { migrationService } from '../services/migration';
import { validateStock } from '../utils/inventory';
import { addTransactionToOpenShift } from '../utils/shiftHelpers';
import { calculateLoyaltyPoints } from '../utils/loyaltyPoints';

export interface EntityHandlers {
  // Drug/Inventory handlers
  handleAddDrug: (drug: Drug) => void;
  handleUpdateDrug: (drug: Drug) => void;
  handleDeleteDrug: (id: string) => void;
  handleRestock: (id: string, qty: number) => void;
  
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
  handleCompleteSale: (saleData: SaleData) => void;
  handleUpdateSale: (saleId: string, updates: Partial<Sale>) => void;
  handleProcessReturn: (returnData: Return) => void;
  
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
  returns: Return[];
  setReturns: React.Dispatch<React.SetStateAction<Return[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  
  // Utilities
  setToast: React.Dispatch<React.SetStateAction<ToastState | null>>;
  currentEmployeeId: string | null;
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
  returns,
  setReturns,
  customers,
  setCustomers,
  setToast,
  currentEmployeeId,
  isLoading,
  getVerifiedDate,
  validateTransactionTime,
  updateLastTransactionTime,
}: UseEntityHandlersParams): EntityHandlers {
  
  const migrationAttempted = useRef(false);
  
  // Run migrations on mount
  useEffect(() => {
    if (isLoading || migrationAttempted.current) return;
    if (!inventory || inventory.length === 0) return;

    migrationAttempted.current = true;
    
    const { hasUpdates, migratedInventory } = migrationService.runMigrations(inventory);
    
    if (hasUpdates) {
      setInventory(migratedInventory);
    }
  }, [isLoading, inventory.length, setInventory]);

  // --- Drug Management ---
  const handleAddDrug = useCallback((drug: Drug) => {
    setInventory(prev => [...prev, drug]);
  }, [setInventory]);

  const handleUpdateDrug = useCallback((drug: Drug) => {
    setInventory(prev => prev.map(d => d.id === drug.id ? drug : d));
  }, [setInventory]);

  const handleDeleteDrug = useCallback((id: string) => {
    setInventory(prev => prev.filter(d => d.id !== id));
  }, [setInventory]);

  const handleRestock = useCallback((id: string, qty: number) => {
    setInventory(prev => prev.map(d => {
      if (d.id === id) {
        // Assume Restock input is in PACKS (Standard)
        const unitsToAdd = qty * (d.unitsPerPack || 1);
        return { ...d, stock: validateStock(d.stock + unitsToAdd) };
      }
      return d;
    }));
  }, [setInventory]);

  // --- Supplier Management ---
  const handleAddSupplier = useCallback((supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
  }, [setSuppliers]);

  const handleUpdateSupplier = useCallback((supplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
  }, [setSuppliers]);

  const handleDeleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, [setSuppliers]);

  // --- Customer Management ---
  const handleAddCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
    setToast({ message: 'Customer added successfully', type: 'success' });
  }, [setCustomers, setToast]);

  const handleUpdateCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    setToast({ message: 'Customer updated successfully', type: 'success' });
  }, [setCustomers, setToast]);

  const handleDeleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setToast({ message: 'Customer removed successfully', type: 'success' });
  }, [setCustomers, setToast]);

  // --- Purchase Management ---
  const handlePurchaseComplete = useCallback((purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
    
    // Only update inventory if purchase is completed immediately
    if (purchase.status === 'completed') {
      setInventory(prev => prev.map(drug => {
        const purchasedItem = purchase.items.find(i => i.drugId === drug.id);
        if (purchasedItem) {
          // Convert purchased packs to units
          const unitsToAdd = purchasedItem.quantity * (drug.unitsPerPack || 1);
          return {
            ...drug,
            stock: validateStock(drug.stock + unitsToAdd),
            costPrice: purchasedItem.costPrice
          };
        }
        return drug;
      }));
    } else {
      setToast({ message: 'Purchase Order Saved as Pending', type: 'info' });
    }
  }, [setPurchases, setInventory, setToast]);

  const handleApprovePurchase = useCallback((purchaseId: string, approverName: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    // 1. Update Purchase Status
    setPurchases(prev => prev.map(p => 
      p.id === purchaseId 
        ? { ...p, status: 'completed', approvalDate: new Date().toISOString(), approvedBy: approverName } 
        : p
    ));

    // 2. Update Inventory
    setInventory(prev => prev.map(drug => {
      const purchasedItem = purchase.items.find(i => i.drugId === drug.id);
      if (purchasedItem) {
        const unitsToAdd = purchasedItem.quantity * (drug.unitsPerPack || 1);
        return {
          ...drug,
          stock: validateStock(drug.stock + unitsToAdd),
          costPrice: purchasedItem.costPrice
        };
      }
      return drug;
    }));

    setToast({ message: `PO #${purchase.invoiceId} Approved Successfully`, type: 'success' });
  }, [purchases, setPurchases, setInventory, setToast]);

  const handleRejectPurchase = useCallback((purchaseId: string, reason?: string) => {
    setPurchases(prev => prev.map(p => 
      p.id === purchaseId ? { ...p, status: 'rejected' } : p
    ));
    setToast({ message: 'Purchase Order Rejected', type: 'info' });
  }, [setPurchases, setToast]);

  // --- Sale Management ---
  const handleCompleteSale = useCallback((saleData: SaleData) => {
    // Get verified date
    const saleDate = getVerifiedDate();
    
    // Validate transaction time (Monotonic Check)
    const validation = validateTransactionTime(saleDate);
    if (!validation.valid) {
      setToast({
        message: `⚠️ ${validation.message || 'Invalid transaction time'}`,
        type: 'error'
      });
      return;
    }

    // Generate Serial ID
    const serialId = (100001 + sales.length).toString();
    
    // Calculate daily order number
    const today = saleDate.toDateString();
    const todaysSales = sales.filter(s => new Date(s.date).toDateString() === today);
    const dailyOrderNumber = todaysSales.length + 1;

    const newSale: Sale = {
      id: serialId,
      date: saleDate.toISOString(),
      soldByEmployeeId: currentEmployeeId || undefined,
      dailyOrderNumber,
      status: 'completed',
      ...saleData
    };
    
    // Update last transaction time
    updateLastTransactionTime(saleDate.getTime());
    
    // Update inventory with pack/unit logic (INTEGER UNITS)
    setInventory(prev => prev.map(drug => {
      const soldItem = saleData.items.find(i => i.id === drug.id);
      if (soldItem) {
        let quantityToDeduct = 0;
        
        if (soldItem.isUnit) {
          quantityToDeduct = soldItem.quantity;
        } else {
          quantityToDeduct = soldItem.quantity * (drug.unitsPerPack || 1);
        }

        const newStock = drug.stock - quantityToDeduct;
        
        if (newStock < 0) {
          console.error(`STOCK ERROR: Negative stock detected for ${drug.name}. Selling ${quantityToDeduct}, Available ${drug.stock}.`);
          return { ...drug, stock: 0 };
        }
        
        return { ...drug, stock: validateStock(newStock) };
      }
      return drug;
    }));

    // Calculate Loyalty Points
    const pointsEarned = calculateLoyaltyPoints(saleData.total, saleData.items);

    // Update customer points if a customer is associated
    if (saleData.customerCode || saleData.customerName !== 'Guest Customer') {
      setCustomers(prev => prev.map(c => {
        if ((saleData.customerCode && (c.code === saleData.customerCode || c.serialId?.toString() === saleData.customerCode)) || 
            (!saleData.customerCode && c.name === saleData.customerName)) {
          return { ...c, points: (c.points || 0) + pointsEarned };
        }
        return c;
      }));
    }

    setSales(prev => [...prev, newSale]);

    // Update Cash Register (Shift)
    const isCash = saleData.paymentMethod === 'cash';
    addTransactionToOpenShift({
      type: isCash ? 'sale' : 'card_sale',
      amount: saleData.total,
      reason: `Sale #${serialId}`,
      userId: currentEmployeeId || 'System',
      relatedSaleId: serialId,
      getVerifiedDate
    });
    
    setToast({
      message: `Order #${serialId} completed! ${pointsEarned > 0 ? `Earned ${pointsEarned} points.` : ''}`,
      type: 'success'
    });
  }, [sales, currentEmployeeId, getVerifiedDate, validateTransactionTime, updateLastTransactionTime, 
      setInventory, setCustomers, setSales, setToast]);

  const handleUpdateSale = useCallback((saleId: string, updates: Partial<Sale>) => {
    // Logic for restoring stock if order is cancelled
    if (updates.status === 'cancelled') {
      const sale = sales.find(s => s.id === saleId);
      if (sale && sale.status !== 'cancelled') {
        // Restore inventory
        setInventory(prev => prev.map(drug => {
          const item = sale.items.find(i => i.id === drug.id);
          if (item) {
            const unitsToRestore = item.isUnit ? item.quantity : item.quantity * (drug.unitsPerPack || 1);
            return { ...drug, stock: validateStock(drug.stock + unitsToRestore) };
          }
          return drug;
        }));
      }
    }

    setSales(prev => prev.map(s => s.id === saleId ? { ...s, ...updates } : s));
  }, [sales, setInventory, setSales]);

  const handleProcessReturn = useCallback((returnData: Return) => {
    // Validate return time
    const returnDate = new Date(returnData.date);
    const validation = validateTransactionTime(returnDate);
    if (!validation.valid) {
      setToast({
        message: `⚠️ ${validation.message || 'Invalid return time'}`,
        type: 'error'
      });
      return;
    }

    // Add return record
    setReturns(prev => [returnData, ...prev]);

    // Update last transaction time
    updateLastTransactionTime(returnDate.getTime());
    
    // Update sale record
    setSales(prev => prev.map(sale => {
      if (sale.id === returnData.saleId) {
        const existingReturns = sale.returnIds || [];
        const totalReturned = returns
          .filter(r => r.saleId === sale.id)
          .reduce((sum, r) => sum + r.totalRefund, 0) + returnData.totalRefund;
        
        const itemReturnedQuantities = { ...(sale.itemReturnedQuantities || {}) };
        returnData.items.forEach(item => {
          itemReturnedQuantities[item.drugId] = 
            (itemReturnedQuantities[item.drugId] || 0) + item.quantityReturned;
        });
        
        const newReturnDetail = {
          date: returnData.date,
          items: returnData.items.map(item => ({
            drugId: item.drugId,
            name: item.name,
            quantity: item.quantityReturned,
            refundAmount: item.refundAmount
          }))
        };
        
        return {
          ...sale,
          hasReturns: true,
          returnIds: [...existingReturns, returnData.id],
          returnDates: [...(sale.returnDates || []), returnData.date],
          returnDetails: [...(sale.returnDetails || []), newReturnDetail],
          netTotal: sale.total - totalReturned,
          itemReturnedQuantities
        };
      }
      return sale;
    }));
    
    // Restore inventory (INTEGER UNITS)
    setInventory(prev => prev.map(drug => {
      const returnedItem = returnData.items.find(i => i.drugId === drug.id);
      if (returnedItem) {
        let quantityToRestore = 0;
        
        if (returnedItem.isUnit) {
          quantityToRestore = returnedItem.quantityReturned;
        } else {
          quantityToRestore = returnedItem.quantityReturned * (drug.unitsPerPack || 1);
        }
        
        return {
          ...drug,
          stock: validateStock(drug.stock + quantityToRestore)
        };
      }
      return drug;
    }));

    // Update Cash Register (Shift) with return record
    addTransactionToOpenShift({
      type: 'return',
      amount: returnData.totalRefund,
      reason: `Return for Sale #${returnData.saleId}`,
      userId: currentEmployeeId || 'System',
      relatedSaleId: returnData.saleId,
      getVerifiedDate
    });
    
    setToast({
      message: `Return processed successfully. Refund: ${returnData.totalRefund.toFixed(2)} L.E`,
      type: 'success'
    });
  }, [returns, validateTransactionTime, updateLastTransactionTime, setReturns, setSales, setInventory, setToast, getVerifiedDate]);

  // --- Computed Data ---
  const enrichedCustomers = useMemo(() => {
    return customers.map(customer => {
      const customerSales = sales.filter(s => 
        (s.customerCode && (s.customerCode === customer.code || s.customerCode === customer.serialId?.toString())) ||
        (!s.customerCode && s.customerName === customer.name)
      );

      const totalPurchases = customerSales.reduce((sum, sale) => sum + (sale.netTotal ?? sale.total), 0);
      
      let lastVisit = customer.lastVisit;
      if (customerSales.length > 0) {
        const sortedSales = [...customerSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastVisit = sortedSales[0].date;
      }

      return {
        ...customer,
        totalPurchases,
        lastVisit
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
    handleCompleteSale,
    handleUpdateSale,
    handleProcessReturn,
    
    // Computed data
    enrichedCustomers,
  };
}
