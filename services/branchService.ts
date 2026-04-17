import type { Branch, Employee } from '../types';
import { StorageKeys } from '../config/storageKeys';
import { storage } from '../utils/storage';
import { idGenerator } from '../utils/idGenerator';
import { supabase } from '../lib/supabase';
import { syncQueueService } from './syncQueueService';
import { employeeService } from './hr/employeeService';

const ACTIVE_BRANCH_KEY = 'pharma_active_branch_id';

const mapBranchToDb = (b: Partial<Branch>): any => {
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
};

const mapDbToBranch = (db: any): Branch => ({
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
});

/**
 * Branch Service - Handles CRUD operations for pharmacy branches.
 * Org-aware: branches are scoped to organizations via orgId.
 */
export const branchService = {
  /**
   * Get all branches from storage.
   * If orgId is provided, filters to only that org's branches.
   */
  async getAll(orgId?: string): Promise<Branch[]> {
    try {
      const { data, error } = await supabase.from('branches').select('*');
      if (!error && data) {
        const mapped = data.map(mapDbToBranch);
        storage.set(StorageKeys.BRANCHES, mapped);
        return orgId ? mapped.filter(b => b.orgId === orgId) : mapped;
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('Failed to fetch branches from Supabase, falling back to cache', err);
      }
    }
    
    const branches = storage.get<Branch[]>(StorageKeys.BRANCHES, []);
    if (orgId) {
      return branches.filter((b) => b.orgId === orgId);
    }
    return branches;
  },

  /**
   * Get all branches belonging to a specific organization
   */
  async getAllByOrg(orgId: string): Promise<Branch[]> {
    return this.getAll(orgId);
  },

  /**
   * Get a single branch by ID
   */
  async getById(id: string): Promise<Branch | null> {
    const branches = await this.getAll();
    return branches.find((b) => b.id === id) || null;
  },

  /**
   * Get the currently active branch
   */
  async getActive(): Promise<Branch | null> {
    const activeId = localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (!activeId) {
      return await this.ensureDefaultBranch();
    }
    return (await this.getById(activeId)) || await this.ensureDefaultBranch();
  },

  /**
   * Set the active branch ID
   */
  setActive(branchId: string): void {
    localStorage.setItem(ACTIVE_BRANCH_KEY, branchId);
  },

  /**
   * Generate a unique branch code
   */
  generateCode(): string {
    const branches = storage.get<Branch[]>(StorageKeys.BRANCHES, []);
    const maxSerial = branches.reduce((max, b) => {
      const match = b.code.match(/BR-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return Math.max(max, num);
      }
      return max;
    }, 0);
    return `BR-${String(maxSerial + 1).padStart(3, '0')}`;
  },

  /**
   * Create a new branch. Requires orgId for tenant association.
   */
  async create(data: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>, skipSync = false): Promise<Branch> {
    const branches = await this.getAll();
    
    // Auto-generate code if missing
    const code = data.code || this.generateCode();

    // Validate unique code per organization
    const duplicate = branches.find(
      (b) => b.orgId === data.orgId && b.code.toLowerCase() === code.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`كود الفرع "${code}" مستخدم بالفعل في هذه الشركة.`);
    }

    const now = new Date().toISOString();
    const newBranch: Branch = {
      ...data,
      code,
      id: idGenerator.generate('branches'),
      createdAt: now,
      updatedAt: now,
    };

    try {
      const dbBranch = mapBranchToDb(newBranch);
      const { error } = await supabase.from('branches').insert(dbBranch);
      if (error && import.meta.env.DEV) console.warn('Supabase branch insert failed', error);
    } catch {}

    const updatedBranches = [...branches, newBranch];
    storage.set(StorageKeys.BRANCHES, updatedBranches);

    if (!skipSync) {
      await syncQueueService.enqueue('DRUG', { action: 'CREATE_BRANCH', branch: newBranch }); 
    }

    return newBranch;
  },

  /**
   * Update an existing branch
   */
  async update(id: string, data: Partial<Branch>, skipSync = false): Promise<Branch> {
    const branches = await this.getAll();
    const index = branches.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Branch with ID ${id} not found`);

    const currentBranch = branches[index];

    // Validate unique code if it's being updated
    if (data.code && data.code.toLowerCase() !== currentBranch.code.toLowerCase()) {
      const orgId = data.orgId || currentBranch.orgId;
      const duplicate = branches.find(
        (b) => b.id !== id && b.orgId === orgId && b.code.toLowerCase() === data.code?.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`كود الفرع "${data.code}" مستخدم بالفعل في هذه الشركة.`);
      }
    }

    const updatedBranch: Branch = {
      ...currentBranch,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    try {
      const dbUpdates = mapBranchToDb(data);
      const { error } = await supabase.from('branches').update(dbUpdates).eq('id', id);
      if (error && import.meta.env.DEV) console.warn('Supabase branch update failed', error);
    } catch {}

    branches[index] = updatedBranch;
    storage.set(StorageKeys.BRANCHES, branches);

    if (!skipSync) {
      await syncQueueService.enqueue('DRUG', { action: 'UPDATE_BRANCH', id, updates: data });
    }

    return updatedBranch;
  },

  /**
   * Delete a branch by ID
   */
  async delete(id: string, skipSync = false): Promise<void> {
    const branches = (await this.getAll()).filter((b) => b.id !== id);
    
    try {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error && import.meta.env.DEV) console.warn('Supabase branch delete failed', error);
    } catch {}

    storage.set(StorageKeys.BRANCHES, branches);
    
    if (!skipSync) {
      await syncQueueService.enqueue('DRUG', { action: 'DELETE_BRANCH', id });
    }

    // Clear active branch if it was the one deleted
    const activeId = localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (activeId === id) {
      localStorage.removeItem(ACTIVE_BRANCH_KEY);
    }
  },

  /**
   * Assign employees to a branch
   */
  async assignEmployees(branchId: string, employeeIds: string[]): Promise<void> {
    const allEmployees = await employeeService.getAll('ALL');
    
    const updatedEmployees = allEmployees.map(emp => {
      if (employeeIds.includes(emp.id)) {
        return { ...emp, branchId };
      } else if (emp.branchId === branchId) {
        return { ...emp, branchId: 'UNASSIGNED' };
      }
      return emp;
    }).filter(emp => {
      const original = allEmployees.find(e => e.id === emp.id);
      return original?.branchId !== emp.branchId;
    });

    if (updatedEmployees.length > 0) {
      await employeeService.save(updatedEmployees, 'ALL');
    }
  },

  /**
   * Migration helper: ensures an active branch is selected if any exist.
   * Optionally scoped by orgId for multi-tenant context.
   * Returns null if no branches exist (triggers onboarding).
   */
  async ensureDefaultBranch(orgId?: string): Promise<Branch | null> {
    const branches = orgId ? await this.getAllByOrg(orgId) : await this.getAll();
    
    if (branches.length === 0) {
      return null;
    }

    // If active branch is missing or invalid, pick the first one
    const activeId = localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (!activeId || !branches.some(b => b.id === activeId)) {
      const firstBranch = branches[0];
      this.setActive(firstBranch.id);
      return firstBranch;
    }

    return branches.find(b => b.id === activeId) || null;
  },
};
