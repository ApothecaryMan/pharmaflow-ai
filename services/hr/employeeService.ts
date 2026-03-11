import { StorageKeys } from '../../config/storageKeys';
import type { Employee } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { employeeCacheService } from './employeeCacheService';

const MIGRATED_KEY = 'pharma_employees_indexeddb_migrated';

// Export interface so it can be used if needed
export interface EmployeeService {
  getAll(branchId?: string | 'ALL'): Promise<Employee[]>;
  getById(id: string): Promise<Employee | null>;
  create(employee: Employee, branchId?: string): Promise<Employee>;
  update(id: string, employee: Partial<Employee>): Promise<Employee>;
  delete(id: string): Promise<boolean>;
  save(employees: Employee[], branchId?: string): Promise<void>;
}

const getRawAll = async (): Promise<Employee[]> => {
  // Try to load from IndexedDB
  let employees = await employeeCacheService.loadAll();

  // Migration Logic: If empty and not migrated, check localStorage
  if (employees.length === 0 && !storage.get<boolean>(MIGRATED_KEY, false)) {
    const oldData = storage.get<Employee[]>(StorageKeys.EMPLOYEES, []);
    if (oldData.length > 0) {
      console.log(`👤 Migrating ${oldData.length} employees from localStorage to IndexedDB...`);
      await employeeCacheService.saveAll(oldData);
      employees = oldData;
    }
    storage.set(MIGRATED_KEY, true);
  }

  return employees;
};

export const createEmployeeService = (): EmployeeService => ({
  getAll: async (branchId?: string | 'ALL'): Promise<Employee[]> => {
    const all = await getRawAll();
    if (branchId === 'ALL') return all;
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    return all.filter((e) => e.branchId === effectiveBranchId);
  },

  getById: async (id: string): Promise<Employee | null> => {
    return employeeCacheService.getById(id);
  },

  create: async (employee: Employee, branchId?: string): Promise<Employee> => {
    const all = await getRawAll();
    // Priority: explicit param > entity's own branchId > settingsService fallback
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || employee.branchId || settings.activeBranchId || settings.branchCode;
    
    // Assign ID if missing
    if (!employee.id) {
      employee.id = idGenerator.generate('employees', effectiveBranchId);
    }

    // Assign employeeCode if missing
    if (!employee.employeeCode) {
      const maxSerial = all.reduce((max, emp) => {
        const num = parseInt((emp.employeeCode || '').replace('EMP-', '') || '0');
        return Math.max(max, isNaN(num) ? 0 : num);
      }, 0);
      employee.employeeCode = `EMP-${String(maxSerial + 1).padStart(3, '0')}`;
    }
    
    // Inject branchId
    employee.branchId = effectiveBranchId;

    await employeeCacheService.upsert(employee);
    return employee;
  },

  update: async (id: string, updates: Partial<Employee>): Promise<Employee> => {
    const employee = await employeeCacheService.getById(id);
    if (!employee) throw new Error('Employee not found');

    // Merge updates
    const updated = { ...employee, ...updates };
    await employeeCacheService.upsert(updated);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const employee = await employeeCacheService.getById(id);
    if (!employee) return false;

    await employeeCacheService.remove(id);
    return true;
  },

  save: async (employees: Employee[], branchId?: string): Promise<void> => {
    const all = await employeeService.getAll('ALL');
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings?.activeBranchId || settings?.branchCode;
    const otherBranchItems = all.filter((e) => e.branchId && e.branchId !== effectiveBranchId);
    
    // Merge and deduplicate by ID
    const merged = [...otherBranchItems, ...employees];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    await employeeCacheService.saveAll(uniqueMerged);
  },
});

export const employeeService = createEmployeeService();
