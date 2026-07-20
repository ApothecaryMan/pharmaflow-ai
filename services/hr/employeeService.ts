/**
 * Employee Service - Staff management operations
 * Business logic layer that orchestrates data access via EmployeeRepository.
 */

import type { Employee } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { BaseDomainService } from '../core/baseDomainService';
import { orgService } from '../org/orgService';
import { settingsService } from '../settings/settingsService';
import { employeeRepository } from './repositories/employeeRepository';

class EmployeeServiceImpl extends BaseDomainService<Employee> {
  protected tableName = 'employees';

  private _getAllPromises = new Map<string, Promise<Employee[]>>();

  public mapFromDb(db: any): Employee {
    return employeeRepository.mapFromDb(db);
  }

  public mapToDb(e: Partial<Employee>): any {
    return employeeRepository.mapToDb(e);
  }

  async getAll(branchId?: string | 'ALL', orgId?: string): Promise<Employee[]> {
    const cacheKey = `${branchId ?? ''}|${orgId ?? ''}`;
    if (this._getAllPromises.has(cacheKey)) {
      return this._getAllPromises.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        const settings = await settingsService.getAll();
        const effectiveOrgId =
          orgId !== undefined ? orgId : orgService.getActiveOrgId() || settings.orgId;

        if (!effectiveOrgId) return [];

        const isAll = typeof branchId === 'string' && branchId.toLowerCase() === 'all';
        const effectiveBranchId = isAll
          ? undefined
          : branchId || settings.activeBranchId || settings.branchCode;

        return employeeRepository.getAll(effectiveOrgId, effectiveBranchId);
      } finally {
        this._getAllPromises.delete(cacheKey);
      }
    })();

    this._getAllPromises.set(cacheKey, promise);
    return promise;
  }

  async getById(id: string): Promise<Employee | null> {
    return employeeRepository.getById(id);
  }

  async getDocuments(id: string): Promise<Partial<Employee> | null> {
    return employeeRepository.getDocuments(id);
  }

  async getDocument(id: string, column: string): Promise<string | null> {
    return employeeRepository.getDocument(id, column);
  }

  async create(employee: Employee, branchId?: string, orgId?: string): Promise<Employee> {
    const settings = await settingsService.getAll();
    const effectiveBranchId =
      branchId || employee.branchId || settings.activeBranchId || settings.branchCode;
    const effectiveOrgId = orgId || employee.orgId || settings.orgId;

    const newEmployee: Employee = {
      ...employee,
      id: employee.id || idGenerator.uuid(),
      branchId: effectiveBranchId || undefined,
      orgId: effectiveOrgId || undefined,
    } as Employee;

    if (!newEmployee.employeeCode) {
      let inserted = false;
      let lastErr = null;
      let loopCount = 0;

      // Loop until we find a free sequence number (self-healing sequences)
      while (!inserted && loopCount < 50) {
        loopCount++;
        // Use increment_sequence RPC which runs with elevated privileges (bypassing RLS)
        const seqValue = await employeeRepository.incrementSequenceRPC(effectiveOrgId, 'employees');

        const employeeCodeValue = `EMP-${seqValue}`;
        newEmployee.employeeCode = employeeCodeValue;
        // Also ensure the Local POS Username is the sequential number (e.g., "1")
        // This is decoupled from the employeeCode ("EMP-1") for faster quick-POS typing.
        if (!newEmployee.username) {
          newEmployee.username = String(seqValue);
        }

        try {
          await employeeRepository.insert(newEmployee);
          inserted = true;
        } catch (err: any) {
          // 23505 is PostgreSQL unique constraint violation
          if (
            err.code === '23505' &&
            (err.message?.includes('employee_code') || err.message?.includes('username'))
          ) {
            lastErr = err;
            continue; // ID taken, loop and increment again
          }
          throw err;
        }
      }
      if (!inserted) throw lastErr;
      return newEmployee;
    } else {
      await employeeRepository.insert(newEmployee);
      return newEmployee;
    }
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

    const processedEmployees = employees.map((e) => ({
      ...e,
      branchId: e.branchId || effectiveBranchId,
      orgId: e.orgId || settings.orgId,
    }));

    await employeeRepository.upsert(processedEmployees);
  }
}

export const employeeService = new EmployeeServiceImpl();
