/**
 * Branch Service - Handles CRUD operations for pharmacy branches.
 * Online-Only implementation using Supabase.
 */

import { BaseDomainService } from './core/BaseDomainService';
import type { Branch } from '../types';
import { idGenerator } from '../utils/idGenerator';
import { supabase } from '../lib/supabase';
import { employeeService } from './hr/employeeService';
import { orgService } from './org/orgService';

const ACTIVE_BRANCH_KEY = 'pharma_active_branch_id';

class BranchServiceImpl extends BaseDomainService<Branch> {
  protected tableName = 'branches';

  protected mapDbToDomain(db: any): Branch {
    return {
      id: db.id,
      orgId: db.org_id,
      code: db.code,
      name: db.name,
      phone: db.phone || undefined,
      address: db.address || undefined,
      governorate: db.governorate || undefined,
      city: db.city || undefined,
      area: db.area || undefined,
      status: db.status || 'active',
      createdAt: db.created_at || new Date().toISOString(),
      updatedAt: db.updated_at || new Date().toISOString(),
    };
  }

  protected mapDomainToDb(b: Partial<Branch>): any {
    const db: any = {};
    if (b.id !== undefined) db.id = b.id;
    if (b.orgId !== undefined) db.org_id = b.orgId;
    if (b.code !== undefined) db.code = b.code;
    if (b.name !== undefined) db.name = b.name;
    if (b.phone !== undefined) db.phone = b.phone;
    if (b.address !== undefined) db.address = b.address;
    if (b.governorate !== undefined) db.governorate = b.governorate;
    if (b.city !== undefined) db.city = b.city;
    if (b.area !== undefined) db.area = b.area;
    if (b.status !== undefined) db.status = b.status;
    return db;
  }

  async getAll(orgId?: string): Promise<Branch[]> {
    try {
      // If orgId is provided as an empty string, return empty immediately.
      // This prevents fetching ALL branches from the database if the caller passes an empty ID.
      const effectiveOrgId = orgId !== undefined ? orgId : orgService.getActiveOrgId();
      if (!effectiveOrgId) return [];

      let query = supabase.from(this.tableName).select('*');
      query = query.eq('org_id', effectiveOrgId);
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => this.mapDbToDomain(item));
    } catch (err) {
      console.error('[BranchService] getAll failed:', err);
      return [];
    }
  }

  async getAllByOrg(orgId: string): Promise<Branch[]> {
    return this.getAll(orgId);
  }

  async getActive(): Promise<Branch | null> {
    const activeId = localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (!activeId) {
      return await this.ensureDefaultBranch();
    }
    const branch = await this.getById(activeId);
    return branch || await this.ensureDefaultBranch();
  }

  setActive(branchId: string): void {
    localStorage.setItem(ACTIVE_BRANCH_KEY, branchId);
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

    const dbBranch = this.mapDomainToDb(newBranch);
    const { error } = await supabase.from(this.tableName).insert(dbBranch);
    if (error) throw error;

    return newBranch;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;

    const activeId = localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (activeId === id) {
      localStorage.removeItem(ACTIVE_BRANCH_KEY);
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

    const activeId = localStorage.getItem(ACTIVE_BRANCH_KEY);
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
