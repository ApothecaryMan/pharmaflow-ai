/**
 * Employee Service - Employee management
 */

import { Employee } from '../../types';

const STORAGE_KEY = 'pharma_employees';

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
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getById: async (id: string): Promise<Employee | null> => {
    const all = await employeeService.getAll();
    return all.find(e => e.id === id) || null;
  },

  create: async (employee: Employee): Promise<Employee> => {
    const all = await employeeService.getAll();
    all.push(employee);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return employee;
  },

  update: async (id: string, updates: Partial<Employee>): Promise<Employee> => {
    const all = await employeeService.getAll();
    const index = all.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    
    // Merge updates
    const updated = { ...all[index], ...updates };
    all[index] = updated;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await employeeService.getAll();
    const filtered = all.filter(e => e.id !== id);
    if (filtered.length === all.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  save: async (employees: Employee[]): Promise<void> => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  }
});

export const employeeService = createEmployeeService();
