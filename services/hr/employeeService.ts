/**
 * Employee Service - Employee management
 */

import { Employee } from '../../types';

import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { idGenerator } from '../../utils/idGenerator';

// Export interface so it can be used if needed
export interface EmployeeService {
  getAll(): Promise<Employee[]>;
  getById(id: string): Promise<Employee | null>;
  create(employee: Employee): Promise<Employee>;
  update(id: string, employee: Partial<Employee>): Promise<Employee>;
  delete(id: string): Promise<boolean>;
  save(employees: Employee[]): Promise<void>;
}

export const createEmployeeService = (): EmployeeService => ({
  getAll: async (): Promise<Employee[]> => {
    return storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
  },

  getById: async (id: string): Promise<Employee | null> => {
    const all = await employeeService.getAll();
    return all.find(e => e.id === id) || null;
  },

  create: async (employee: Employee): Promise<Employee> => {
    const all = await employeeService.getAll();
    // Assign ID if missing
    if (!employee.id) {
       employee.id = idGenerator.generate('employees');
    }
    all.push(employee);
    storage.set(StorageKeys.EMPLOYEES, all);
    return employee;
  },

  update: async (id: string, updates: Partial<Employee>): Promise<Employee> => {
    const all = await employeeService.getAll();
    const index = all.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    
    // Merge updates
    const updated = { ...all[index], ...updates };
    all[index] = updated;
    
    storage.set(StorageKeys.EMPLOYEES, all);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await employeeService.getAll();
    const filtered = all.filter(e => e.id !== id);
    if (filtered.length === all.length) return false;
    
    storage.set(StorageKeys.EMPLOYEES, filtered);
    return true;
  },

  save: async (employees: Employee[]): Promise<void> => {
    storage.set(StorageKeys.EMPLOYEES, employees);
  }
});

export const employeeService = createEmployeeService();
