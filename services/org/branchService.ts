/**
 * Branch Service - Handles CRUD operations for pharmacy branches.
 * Business logic layer that orchestrates data access via BranchRepository.
 */

import { BaseDomainService } from '../core/baseDomainService';
import type { Branch } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { storage } from '../../utils/storage';
import { employeeService } from '../hr/employeeService';
import { orgService } from './orgService';
import { branchRepository } from './repositories/branchRepository';

const ACTIVE_BRANCH_KEY = 'pharma_active_branch_id';

class BranchServiceImpl extends BaseDomainService<Branch> {
  protected tableName = 'branches';

  public mapFromDb(db: any): Branch {
    return branchRepository.mapFromDb(db);
  }

  public mapToDb(b: Partial<Branch>): any {
    return branchRepository.mapToDb(b);
  }

  async getAll(orgId?: string): Promise<Branch[]> {
    try {
      const effectiveOrgId = orgId !== undefined ? orgId : orgService.getActiveOrgId();
      if (!effectiveOrgId) return [];

      return branchRepository.getAll(effectiveOrgId);
    } catch (err) {
      console.error('[BranchService] getAll failed:', err);
      return [];
    }
  }

  async getAllByOrg(orgId: string): Promise<Branch[]> {
    return this.getAll(orgId);
  }

  async getActive(): Promise<Branch | null> {
    const activeId = storage.get(ACTIVE_BRANCH_KEY, '');
    
    if (!activeId) {
      return await this.ensureDefaultBranch();
    }
    const branch = await this.getById(activeId);
    return branch || await this.ensureDefaultBranch();
  }

  setActive(branchId: string): void {
    storage.set(ACTIVE_BRANCH_KEY, branchId);
  }

  async generateCode(orgId?: string): Promise<string> {
    const effectiveOrgId = orgId || orgService.getActiveOrgId();
    if (!effectiveOrgId) return '';

    const branches = await this.getAllByOrg(effectiveOrgId);
    const maxSerial = branches.reduce((max, b) => {
      const match = (b.code || '').match(/BR-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return Math.max(max, num);
      }
      return max;
    }, 0);
    
    return `BR-${String(maxSerial + 1).padStart(3, '0')}`;
  }

  async create(data: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): Promise<Branch> {
    const code = data.code || await this.generateCode(data.orgId);
    
    const newBranch: Branch = {
      ...data,
      id: idGenerator.uuid(),
      code,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Branch;

    await branchRepository.insert(newBranch);
    return newBranch;
  }

  async delete(id: string): Promise<boolean> {
    await branchRepository.delete(id);

    const activeId = storage.get(ACTIVE_BRANCH_KEY, '');
    if (activeId === id) {
      storage.remove(ACTIVE_BRANCH_KEY);
    }
    return true;
  }

  async assignEmployees(branchId: string, employeeIds: string[]): Promise<void> {
    const allEmployees = await employeeService.getAll('ALL');
    
    const employeesToUpdate = allEmployees.filter(emp => {
      // If it's in the list, set its branchId to target
      if (employeeIds.includes(emp.id)) {
        return emp.branchId !== branchId;
      } 
      // If it's not in the list but was in this branch, clear it
      else if (emp.branchId === branchId) {
        return true;
      }
      return false;
    });

    for (const emp of employeesToUpdate) {
      const newBranchId = employeeIds.includes(emp.id) ? branchId : null;
      await employeeService.update(emp.id, { branchId: newBranchId as any });
    }
  }

  async ensureDefaultBranch(orgId?: string): Promise<Branch | null> {
    const branches = orgId ? await this.getAllByOrg(orgId) : await this.getAll();
    
    if (branches.length === 0) {
      return null;
    }

    const activeId = storage.get(ACTIVE_BRANCH_KEY, '');
    const activeExists = activeId && branches.some(b => b.id === activeId);
    
    if (!activeExists) {
      const firstBranch = branches[0];
      this.setActive(firstBranch.id);
      return firstBranch;
    }

    return branches.find(b => b.id === activeId) || null;
  }
}

export const branchService = new BranchServiceImpl();
