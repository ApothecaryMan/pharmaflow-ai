/**
 * Data Context - Unified state management using services
 * 
 * This context provides a single source of truth for all app data,
 * syncing between React state and the service layer.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Drug, Sale, Supplier, Purchase, PurchaseReturn, Return, Customer } from '../types';
import { inventoryService } from './inventory';
import { salesService } from './sales';
import { supplierService } from './suppliers';
import { purchaseService } from './purchases';
import { returnService } from './returns';
import { customerService } from './customers';

export interface DataState {
  inventory: Drug[];
  sales: Sale[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  returns: Return[];
  customers: Customer[];
  isLoading: boolean;
}

export interface DataActions {
  // Inventory
  setInventory: (inventory: Drug[]) => void;
  addProduct: (product: Omit<Drug, 'id'>) => Promise<Drug>;
  updateProduct: (id: string, updates: Partial<Drug>) => Promise<Drug>;
  updateStock: (id: string, quantity: number) => Promise<void>;
  
  // Sales
  setSales: (sales: Sale[]) => void;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale>;
  
  // Suppliers
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier>;
  
  // Purchases
  setPurchases: (purchases: Purchase[]) => void;
  addPurchase: (purchase: Omit<Purchase, 'id'>) => Promise<Purchase>;
  approvePurchase: (id: string, approver: string) => Promise<void>;
  rejectPurchase: (id: string) => Promise<void>;
  
  // Returns
  setReturns: (returns: Return[]) => void;
  setPurchaseReturns: (returns: PurchaseReturn[]) => void;
  addReturn: (ret: Omit<Return, 'id'>) => Promise<Return>;
  
  // Customers
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  
  // Refresh all data from storage
  refreshAll: () => Promise<void>;
}

export type DataContextType = DataState & DataActions;

const DataContext = createContext<DataContextType | null>(null);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
  initialInventory?: Drug[];
  initialSuppliers?: Supplier[];
}

export const DataProvider: React.FC<DataProviderProps> = ({ 
  children, 
  initialInventory = [], 
  initialSuppliers = [] 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventoryState] = useState<Drug[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [suppliers, setSuppliersState] = useState<Supplier[]>([]);
  const [purchases, setPurchasesState] = useState<Purchase[]>([]);
  const [purchaseReturns, setPurchaseReturnsState] = useState<PurchaseReturn[]>([]);
  const [returns, setReturnsState] = useState<Return[]>([]);
  const [customers, setCustomersState] = useState<Customer[]>([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [inv, sal, sup, pur, pRet, ret, cust] = await Promise.all([
          inventoryService.getAll(),
          salesService.getAll(),
          supplierService.getAll(),
          purchaseService.getAll(),
          returnService.getAllPurchaseReturns(),
          returnService.getAllSalesReturns(),
          customerService.getAll()
        ]);
        
        // Use initial data if localStorage is empty
        setInventoryState(inv.length > 0 ? inv : initialInventory);
        setSalesState(sal);
        setSuppliersState(sup.length > 0 ? sup : initialSuppliers);
        setPurchasesState(pur);
        setPurchaseReturnsState(pRet);
        setReturnsState(ret);
        setCustomersState(cust);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [initialInventory, initialSuppliers]);

  // Sync to localStorage when state changes
  useEffect(() => { inventoryService.save(inventory); }, [inventory]);
  useEffect(() => { salesService.save(sales); }, [sales]);
  useEffect(() => { supplierService.save(suppliers); }, [suppliers]);
  useEffect(() => { purchaseService.save(purchases); }, [purchases]);
  useEffect(() => { returnService.savePurchaseReturns(purchaseReturns); }, [purchaseReturns]);
  useEffect(() => { returnService.saveSalesReturns(returns); }, [returns]);
  useEffect(() => { customerService.save(customers); }, [customers]);

  // Actions
  const setInventory = useCallback((data: Drug[]) => setInventoryState(data), []);
  const setSales = useCallback((data: Sale[]) => setSalesState(data), []);
  const setSuppliers = useCallback((data: Supplier[]) => setSuppliersState(data), []);
  const setPurchases = useCallback((data: Purchase[]) => setPurchasesState(data), []);
  const setReturns = useCallback((data: Return[]) => setReturnsState(data), []);
  const setPurchaseReturns = useCallback((data: PurchaseReturn[]) => setPurchaseReturnsState(data), []);
  const setCustomers = useCallback((data: Customer[]) => setCustomersState(data), []);

  const addProduct = useCallback(async (product: Omit<Drug, 'id'>) => {
    const newProduct = await inventoryService.create(product);
    setInventoryState(prev => [...prev, newProduct]);
    return newProduct;
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Drug>) => {
    const updated = await inventoryService.update(id, updates);
    setInventoryState(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }, []);

  const updateStock = useCallback(async (id: string, quantity: number) => {
    await inventoryService.updateStock(id, quantity);
    setInventoryState(prev => prev.map(p => 
      p.id === id ? { ...p, stock: p.stock + quantity } : p
    ));
  }, []);

  const addSale = useCallback(async (sale: Omit<Sale, 'id'>) => {
    const newSale = await salesService.create(sale);
    setSalesState(prev => [...prev, newSale]);
    return newSale;
  }, []);

  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier = await supplierService.create(supplier);
    setSuppliersState(prev => [...prev, newSupplier]);
    return newSupplier;
  }, []);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    const updated = await supplierService.update(id, updates);
    setSuppliersState(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  }, []);

  const addPurchase = useCallback(async (purchase: Omit<Purchase, 'id'>) => {
    const newPurchase = await purchaseService.create(purchase);
    setPurchasesState(prev => [...prev, newPurchase]);
    return newPurchase;
  }, []);

  const approvePurchase = useCallback(async (id: string, approver: string) => {
    await purchaseService.approve(id, approver);
    setPurchasesState(prev => prev.map(p => 
      p.id === id ? { ...p, status: 'completed' as const, approvedBy: approver } : p
    ));
  }, []);

  const rejectPurchase = useCallback(async (id: string) => {
    await purchaseService.reject(id, '');
    setPurchasesState(prev => prev.map(p => 
      p.id === id ? { ...p, status: 'rejected' as const } : p
    ));
  }, []);

  const addReturn = useCallback(async (ret: Omit<Return, 'id'>) => {
    const newReturn = await returnService.createSalesReturn(ret);
    setReturnsState(prev => [...prev, newReturn]);
    return newReturn;
  }, []);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>) => {
    const newCustomer = await customerService.create(customer);
    setCustomersState(prev => [...prev, newCustomer]);
    return newCustomer;
  }, []);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const updated = await customerService.update(id, updates);
    setCustomersState(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await customerService.delete(id);
    setCustomersState(prev => prev.filter(c => c.id !== id));
  }, []);

  const refreshAll = useCallback(async () => {
    const [inv, sal, sup, pur, pRet, ret, cust] = await Promise.all([
      inventoryService.getAll(),
      salesService.getAll(),
      supplierService.getAll(),
      purchaseService.getAll(),
      returnService.getAllPurchaseReturns(),
      returnService.getAllSalesReturns(),
      customerService.getAll()
    ]);
    setInventoryState(inv);
    setSalesState(sal);
    setSuppliersState(sup);
    setPurchasesState(pur);
    setPurchaseReturnsState(pRet);
    setReturnsState(ret);
    setCustomersState(cust);
  }, []);

  const value: DataContextType = {
    // State
    inventory,
    sales,
    suppliers,
    purchases,
    purchaseReturns,
    returns,
    customers,
    isLoading,
    // Actions
    setInventory,
    addProduct,
    updateProduct,
    updateStock,
    setSales,
    addSale,
    setSuppliers,
    addSupplier,
    updateSupplier,
    setPurchases,
    addPurchase,
    approvePurchase,
    rejectPurchase,
    setReturns,
    setPurchaseReturns,
    addReturn,
    setCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refreshAll
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
