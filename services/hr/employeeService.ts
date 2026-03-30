import { StorageKeys } from '../../config/storageKeys';
import type { Employee } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { employeeCacheService } from './employeeCacheService';
import { supabase } from '../../lib/supabase';

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

const mapEmployeeToDb = (e: Partial<Employee>): any => {
  const db: any = {};
  if (e.id !== undefined) db.id = e.id;
  if (e.branchId !== undefined) db.branch_id = e.branchId;
  if (e.employeeCode !== undefined) db.employee_code = e.employeeCode;
  if (e.name !== undefined) db.name = e.name;
  if (e.nameArabic !== undefined) db.name_arabic = e.nameArabic;
  if (e.phone !== undefined) db.phone = e.phone;
  if (e.email !== undefined) db.email = e.email;
  if (e.position !== undefined) db.position = e.position;
  if (e.department !== undefined) db.department = e.department;
  if (e.role !== undefined) db.role = e.role;
  if (e.startDate !== undefined) db.start_date = e.startDate;
  if (e.status !== undefined) db.status = e.status;
  if (e.salary !== undefined) db.salary = e.salary;
  if (e.notes !== undefined) db.notes = e.notes;
  if (e.username !== undefined) db.username = e.username;
  if (e.userId !== undefined) db.user_id = e.userId;
  return db;
};

const mapDbToEmployee = (db: any): Employee => ({
  id: db.id,
  branchId: db.branch_id,
  employeeCode: db.employee_code,
  name: db.name,
  nameArabic: db.name_arabic || undefined,
  phone: db.phone,
  email: db.email || undefined,
  position: db.position,
  department: db.department,
  role: db.role,
  startDate: db.start_date,
  status: db.status,
  salary: db.salary || undefined,
  notes: db.notes || undefined,
  username: db.username || undefined,
  userId: db.user_id || undefined,
});

const getRawAll = async (): Promise<Employee[]> => {
  try {
    // Try to fetch from Supabase
    const { data, error } = await supabase.from('employees').select('*');
    if (!error && data) {
      const mapped = data.map(mapDbToEmployee);
      
      // Preserve biometric and image data from cache
      const cached = await employeeCacheService.loadAll();
      const cachedMap = new Map(cached.map(e => [e.id, e]));
      
      const finalMapped = mapped.map(e => {
        const c = (cachedMap.get(e.id) || {}) as Partial<Employee>;
        return {
          ...e,
          biometricCredentialId: c.biometricCredentialId,
          biometricPublicKey: c.biometricPublicKey,
          password: c.password,
          image: c.image,
          nationalIdCard: c.nationalIdCard,
          nationalIdCardBack: c.nationalIdCardBack,
          mainSyndicateCard: c.mainSyndicateCard,
          subSyndicateCard: c.subSyndicateCard,
        };
      });
      
      await employeeCacheService.saveAll(finalMapped);
      return finalMapped;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('Failed to fetch employees from Supabase, falling back to cache', err);
    }
  }

  // Fallback to load from IndexedDB
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
    try {
      const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
      if (!error && data) {
        const mapped = mapDbToEmployee(data);
        const cached = await employeeCacheService.getById(id);
        const finalEmployee = { ...cached, ...mapped } as Employee;
        await employeeCacheService.upsert(finalEmployee);
        return finalEmployee;
      }
    } catch {}
    
    return employeeCacheService.getById(id);
  },

  create: async (employee: Employee, branchId?: string): Promise<Employee> => {
    const all = await getRawAll();
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

    try {
      const dbEmployee = mapEmployeeToDb(employee);
      // Ensure we don't send local-only fields
      delete dbEmployee.password;
      delete dbEmployee.auth_user_id;

      const { error } = await supabase.from('employees').insert(dbEmployee);
      if (error && import.meta.env.DEV) {
        console.warn('Supabase insert failed, operating in offline mode', error);
      }
    } catch {}

    await employeeCacheService.upsert(employee);
    return employee;
  },

  update: async (id: string, updates: Partial<Employee>): Promise<Employee> => {
    const employee = await employeeCacheService.getById(id);
    if (!employee) throw new Error('Employee not found');

    const updated = { ...employee, ...updates };

    try {
      const dbUpdates = mapEmployeeToDb(updates);
      // Don't sync password changes this way
      delete dbUpdates.password;
      
      const { error } = await supabase.from('employees').update(dbUpdates).eq('id', id);
      if (error && import.meta.env.DEV) {
        console.warn('Supabase update failed, operating in offline mode', error);
      }
    } catch {}

    await employeeCacheService.upsert(updated);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const employee = await employeeCacheService.getById(id);
    if (!employee) return false;

    try {
      await supabase.from('employees').delete().eq('id', id);
    } catch {}

    await employeeCacheService.remove(id);
    return true;
  },

  save: async (employees: Employee[], branchId?: string): Promise<void> => {
    const all = await employeeService.getAll('ALL');
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings?.activeBranchId || settings?.branchCode;
    const otherBranchItems = all.filter((e) => e.branchId && e.branchId !== effectiveBranchId);
    
    const merged = [...otherBranchItems, ...employees];
    const uniqueMerged = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    
    try {
      const dbEmployees = employees.map(mapEmployeeToDb).map(e => {
        delete e.password;
        return e;
      });
      // Upsert to Supabase
      if (dbEmployees.length > 0) {
        await supabase.from('employees').upsert(dbEmployees, { onConflict: 'id' });
      }
    } catch {}
    
    await employeeCacheService.saveAll(uniqueMerged);
  },
});

export const employeeService = createEmployeeService();

