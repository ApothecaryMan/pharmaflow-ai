/**
 * Employee Service - Staff management operations
 * Business logic layer that orchestrates data access via EmployeeRepository.
 */

import { BaseDomainService } from '../core/baseDomainService';
import type { Employee } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { orgService } from '../org/orgService';
import { employeeRepository } from './repositories/employeeRepository';

class EmployeeServiceImpl extends BaseDomainService<Employee> {
  protected tableName = 'employees';

  public mapFromDb(db: any): Employee {
    return employeeRepository.mapFromDb(db);
  }

  public mapToDb(e: Partial<Employee>): any {
    return employeeRepository.mapToDb(e);
  }

  async getAll(branchId?: string | 'ALL', orgId?: string): Promise<Employee[]> {
    const settings = await settingsService.getAll();
    const effectiveOrgId = orgId !== undefined ? orgId : (orgService.getActiveOrgId() || settings.orgId);
    
    if (!effectiveOrgId) return [];
    
    const isAll = typeof branchId === 'string' && branchId.toLowerCase() === 'all';
    const effectiveBranchId = isAll ? undefined : (branchId || settings.activeBranchId || settings.branchCode);
    
    return employeeRepository.getAll(effectiveOrgId, effectiveBranchId);
  }

  async getById(id: string): Promise<Employee | null> {
    return employeeRepository.getById(id);
  }

  async create(employee: Employee, branchId?: string, orgId?: string): Promise<Employee> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || employee.branchId || settings.activeBranchId || settings.branchCode;
    const effectiveOrgId = orgId || employee.orgId || settings.orgId;
    
    const newEmployee: Employee = {
      ...employee,
      id: employee.id || idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: effectiveOrgId,
    } as Employee;

    if (!newEmployee.employeeCode) {
      const all = await this.getAll('all', effectiveOrgId);
      const maxSerial = all.reduce((max, emp) => {
        const num = parseInt((emp.employeeCode || '').replace('EMP-', '') || '0');
        return Math.max(max, isNaN(num) ? 0 : num);
      }, 0);
      newEmployee.employeeCode = `EMP-${String(maxSerial + 1).padStart(3, '0')}`;
    }

    await employeeRepository.insert(newEmployee);
    return newEmployee;
  }

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    return employeeRepository.update(id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return employeeRepository.delete(id);
  }

  async save(employees: Employee[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const processedEmployees = employees.map(e => ({
      ...e,
      branchId: e.branchId || effectiveBranchId,
      orgId: e.orgId || settings.orgId
    }));

    await employeeRepository.upsert(processedEmployees);
  }
}

export const employeeService = new EmployeeServiceImpl();
