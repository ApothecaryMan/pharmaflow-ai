/**
 * Data Context - Unified state management using services
 * 
 * This context provides a single source of truth for all app data,
 * syncing between React state and the service layer.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Drug, Sale, Supplier, Purchase, PurchaseReturn, Return, Customer, Employee } from '../types';
import { inventoryService } from './inventory';
import { salesService } from './sales';
import { supplierService } from './suppliers';
import { purchaseService } from './purchases';
import { returnService } from './returns';
import { customerService } from './customers';
import { employeeService } from './hr';
import { settingsService } from './settings/settingsService';

export interface DataState {
  inventory: Drug[];
  sales: Sale[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  returns: Return[];
  customers: Customer[];
  employees: Employee[];
  isLoading: boolean;
}

export interface DataActions {
  // Inventory
  setInventory: (inventory: Drug[] | ((prev: Drug[]) => Drug[])) => void;
  addProduct: (product: Omit<Drug, 'id'>) => Promise<Drug>;
  updateProduct: (id: string, updates: Partial<Drug>) => Promise<Drug>;
  updateStock: (id: string, quantity: number) => Promise<void>;
  
  // Sales
  setSales: (sales: Sale[] | ((prev: Sale[]) => Sale[])) => void;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale>;
  
  // Suppliers
  setSuppliers: (suppliers: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier>;
  
  // Purchases
  setPurchases: (purchases: Purchase[] | ((prev: Purchase[]) => Purchase[])) => void;
  addPurchase: (purchase: Omit<Purchase, 'id'>) => Promise<Purchase>;
  approvePurchase: (id: string, approver: string) => Promise<void>;
  rejectPurchase: (id: string) => Promise<void>;
  
  // Returns
  setReturns: (returns: Return[] | ((prev: Return[]) => Return[])) => void;
  setPurchaseReturns: (returns: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])) => void;
  addReturn: (ret: Omit<Return, 'id'>) => Promise<Return>;
  
  // Customers
  setCustomers: (customers: Customer[] | ((prev: Customer[]) => Customer[])) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  // Employees
  setEmployees: (employees: Employee[] | ((prev: Employee[]) => Employee[])) => void;
  addEmployee: (employee: Employee) => Promise<Employee>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;
  
  // Refresh all data from storage
  refreshAll: () => Promise<void>;
  
  // Switch to a different branch and reload all data
  switchBranch: (newBranchCode: string) => Promise<void>;
  
  // Get current branch code
  currentBranchCode: string;
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
  const [currentBranchCode, setCurrentBranchCode] = useState('B1'); // Default branch
  const [inventory, setInventoryState] = useState<Drug[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [suppliers, setSuppliersState] = useState<Supplier[]>([]);
  const [purchases, setPurchasesState] = useState<Purchase[]>([]);
  const [purchaseReturns, setPurchaseReturnsState] = useState<PurchaseReturn[]>([]);
  const [returns, setReturnsState] = useState<Return[]>([]);
  const [customers, setCustomersState] = useState<Customer[]>([]);
  const [employees, setEmployeesState] = useState<Employee[]>([]);

  // Load initial data
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Enforce minimum loading time of 1000ms for better UX
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 1000));
        
        const [results, _] = await Promise.all([
            Promise.all([
                inventoryService.getAll(),
                salesService.getAll(),
                supplierService.getAll(),
                purchaseService.getAll(),
                returnService.getAllPurchaseReturns(),
                returnService.getAllSalesReturns(),
                customerService.getAll(),
                employeeService.getAll()
            ]),
            minLoadTime
        ]);

        const [inv, sal, sup, pur, pRet, ret, cust, emp] = results;
        
        // Use initial data if fetched data is empty and initial data is provided
        // We use a stable check here instead of depending on the array reference
        setInventoryState(inv.length > 0 ? inv : (initialInventory.length > 0 ? initialInventory : []));
        setSalesState(sal);
        setSuppliersState(sup.length > 0 ? sup : (initialSuppliers.length > 0 ? initialSuppliers : []));
        setPurchasesState(pur);
        setPurchaseReturnsState(pRet);
        setReturnsState(ret);
        setCustomersState(cust);
        setEmployeesState(emp);

        // Seed SUPER User logic
        const superUser = import.meta.env.VITE_SUPER_USER;
        const superPass = import.meta.env.VITE_SUPER_PASS;

        if (superUser && superPass) {
            const superUserExists = emp.some(e => e.username === superUser);
            if (!superUserExists) {
                import('../services/auth/hashUtils').then(async ({ hashPassword }) => {
                    const passwordHash = await hashPassword(superPass);
                    const superUserObj: Employee = {
                        id: 'SUPER-ADMIN',
                        employeeCode: 'EMP-000',
                        name: 'SUPER',
                        username: superUser,
                        password: passwordHash,
                        role: 'admin' as any,
                        position: 'Super Admin',
                        department: 'it',
                        phone: '00000000000',
                        startDate: new Date().toISOString().split('T')[0],
                        status: 'active'
                    };
                    await employeeService.create(superUserObj);
                    setEmployeesState(prev => [...prev, superUserObj]);
                    console.log('✨ Super Admin seeded successfully from ENV');
                });
            }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

 // Sync to localStorage when state changes (only after initial load)
  useEffect(() => { if (!isLoading) inventoryService.save(inventory); }, [inventory, isLoading]);
  useEffect(() => { if (!isLoading) salesService.save(sales); }, [sales, isLoading]);
  useEffect(() => { if (!isLoading) supplierService.save(suppliers); }, [suppliers, isLoading]);
  useEffect(() => { if (!isLoading) purchaseService.save(purchases); }, [purchases, isLoading]);
  useEffect(() => { if (!isLoading) returnService.savePurchaseReturns(purchaseReturns); }, [purchaseReturns, isLoading]);
  useEffect(() => { if (!isLoading) returnService.saveSalesReturns(returns); }, [returns, isLoading]);
  useEffect(() => { if (!isLoading) customerService.save(customers); }, [customers, isLoading]);
  useEffect(() => { if (!isLoading) employeeService.save(employees); }, [employees, isLoading]);

  // Actions
  const setInventory = useCallback((data: Drug[] | ((prev: Drug[]) => Drug[])) => setInventoryState(data), []);
  const setSales = useCallback((data: Sale[] | ((prev: Sale[]) => Sale[])) => setSalesState(data), []);
  const setSuppliers = useCallback((data: Supplier[] | ((prev: Supplier[]) => Supplier[])) => setSuppliersState(data), []);
  const setPurchases = useCallback((data: Purchase[] | ((prev: Purchase[]) => Purchase[])) => setPurchasesState(data), []);
  const setReturns = useCallback((data: Return[] | ((prev: Return[]) => Return[])) => setReturnsState(data), []);
  const setPurchaseReturns = useCallback((data: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])) => setPurchaseReturnsState(data), []);
  const setCustomers = useCallback((data: Customer[] | ((prev: Customer[]) => Customer[])) => setCustomersState(data), []);
  const setEmployees = useCallback((data: Employee[] | ((prev: Employee[]) => Employee[])) => setEmployeesState(data), []);

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

  const addEmployee = useCallback(async (employee: Employee) => {
    const newEmployee = await employeeService.create(employee);
    setEmployeesState(prev => [...prev, newEmployee]);
    return newEmployee;
  }, []);

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    const updated = await employeeService.update(id, updates);
    setEmployeesState(prev => prev.map(e => e.id === id ? updated : e));
    return updated;
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    await employeeService.delete(id);
    setEmployeesState(prev => prev.filter(e => e.id !== id));
  }, []);

  const refreshAll = useCallback(async () => {
    const [inv, sal, sup, pur, pRet, ret, cust, emp] = await Promise.all([
      inventoryService.getAll(),
      salesService.getAll(),
      supplierService.getAll(),
      purchaseService.getAll(),
      returnService.getAllPurchaseReturns(),
      returnService.getAllSalesReturns(),
      customerService.getAll(),
      employeeService.getAll()
    ]);
    setInventoryState(inv);
    setSalesState(sal);
    setSuppliersState(sup);
    setPurchasesState(pur);
    setPurchaseReturnsState(pRet);
    setReturnsState(ret);
    setCustomersState(cust);
    setEmployeesState(emp);
  }, []);

  // Switch to a different branch and reload all data
  const switchBranch = useCallback(async (newBranchCode: string) => {
    try {
      // Update settings with new branch code
      await settingsService.setMultiple({ branchCode: newBranchCode });
      
      // Update local state
      setCurrentBranchCode(newBranchCode);
      
      // Reload all data (services will now filter by new branchCode)
      await refreshAll();
    } catch (error) {
      console.error('Error switching branch:', error);
      throw error;
    }
  }, [refreshAll]);

  const value = useMemo<DataContextType>(() => ({
    // State
    inventory,
    sales,
    suppliers,
    purchases,
    purchaseReturns,
    returns,
    customers,
    employees,
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
    
    setEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,

    refreshAll,
    switchBranch,
    currentBranchCode
  }), [
    inventory, sales, suppliers, purchases, purchaseReturns, returns, customers, employees, isLoading, currentBranchCode,
    setInventory, addProduct, updateProduct, updateStock, setSales, addSale, setSuppliers, addSupplier,
    updateSupplier, setPurchases, addPurchase, approvePurchase, rejectPurchase, setReturns, setPurchaseReturns,
    addReturn, setCustomers, addCustomer, updateCustomer, deleteCustomer, setEmployees, addEmployee,
    updateEmployee, deleteEmployee, refreshAll, switchBranch
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
