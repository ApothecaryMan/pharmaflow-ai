/**
 * Employee Service - Employee management
 */

import { Employee } from '../../types';

import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';

// Export interface so it can be used if needed
export interface EmployeeService {
  getAll(): Promise<Employee[]>;
  getById(id: string): Promise<Employee | null>;
  create(employee: Employee): Promise<Employee>;
  update(id: string, employee: Partial<Employee>): Promise<Employee>;
  delete(id: string): Promise<boolean>;
  save(employees: Employee[]): Promise<void>;
}

const getRawAll = (): Employee[] => {
  return storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
};

export const createEmployeeService = (): EmployeeService => ({
  getAll: async (): Promise<Employee[]> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    return all.filter(e => !e.branchId || e.branchId === branchCode);
  },

  getById: async (id: string): Promise<Employee | null> => {
    const all = await employeeService.getAll();
    return all.find(e => e.id === id) || null;
  },

  create: async (employee: Employee): Promise<Employee> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    // Assign ID if missing
    if (!employee.id) {
       employee.id = idGenerator.generate('employees');
    }
    // Inject branchId
    employee.branchId = settings.branchCode;
    
    all.push(employee);
    storage.set(StorageKeys.EMPLOYEES, all);
    return employee;
  },

  update: async (id: string, updates: Partial<Employee>): Promise<Employee> => {
    const all = getRawAll();
    const index = all.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    
    // Merge updates
    const updated = { ...all[index], ...updates };
    all[index] = updated;
    
    storage.set(StorageKeys.EMPLOYEES, all);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const all = getRawAll();
    const filtered = all.filter(e => e.id !== id);
    if (filtered.length === all.length) return false;
    
    storage.set(StorageKeys.EMPLOYEES, filtered);
    return true;
  },

  save: async (employees: Employee[]): Promise<void> => {
    const all = getRawAll();
    const settings = await settingsService.getAll();
    const branchCode = settings.branchCode;
    const otherBranchItems = all.filter(e => e.branchId && e.branchId !== branchCode);
    const merged = [...otherBranchItems, ...employees];
    storage.set(StorageKeys.EMPLOYEES, merged);
  }
});

export const employeeService = createEmployeeService();
