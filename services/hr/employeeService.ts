/**
 * Employee Service - Employee management
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Employee } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';

// Export interface so it can be used if needed
export interface EmployeeService {
  getAll(branchId?: string): Promise<Employee[]>;
  getById(id: string): Promise<Employee | null>;
  create(employee: Employee): Promise<Employee>;
  update(id: string, employee: Partial<Employee>): Promise<Employee>;
  delete(id: string): Promise<boolean>;
  save(employees: Employee[], branchId?: string): Promise<void>;
}

const getRawAll = (): Employee[] => {
  return storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
};

export const createEmployeeService = (): EmployeeService => ({
  getAll: async (branchId?: string): Promise<Employee[]> => {
    const all = getRawAll();
    const effectiveBranchId = branchId || (await settingsService.getAll()).branchCode;
    return all.filter((e) => e.branchId === effectiveBranchId);
  },

  getById: async (id: string): Promise<Employee | null> => {
    const all = await employeeService.getAll();
    return all.find((e) => e.id === id) || null;
  },

  create: async (employee: Employee, branchId?: string): Promise<Employee> => {
    const all = getRawAll();
    const effectiveBranchId = branchId || (await settingsService.getAll()).branchCode;
    
    // Assign ID if missing
    if (!employee.id) {
      employee.id = idGenerator.generate('employees');
    }
    
    // Inject branchId
    employee.branchId = effectiveBranchId;

    all.push(employee);
    storage.set(StorageKeys.EMPLOYEES, all);
    return employee;
  },

  update: async (id: string, updates: Partial<Employee>): Promise<Employee> => {
    const all = getRawAll();
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Employee not found');

    // Merge updates
    const updated = { ...all[index], ...updates };
    all[index] = updated;

    storage.set(StorageKeys.EMPLOYEES, all);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const all = getRawAll();
    const filtered = all.filter((e) => e.id !== id);
    if (filtered.length === all.length) return false;

    storage.set(StorageKeys.EMPLOYEES, filtered);
    return true;
  },

  save: async (employees: Employee[], branchId?: string): Promise<void> => {
    const all = getRawAll();
    const effectiveBranchId = branchId || (await settingsService.getAll()).branchCode;
    const otherBranchItems = all.filter((e) => e.branchId && e.branchId !== effectiveBranchId);
    
    // Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...employees];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    storage.set(StorageKeys.EMPLOYEES, uniqueMerged);
  },
});

export const employeeService = createEmployeeService();
