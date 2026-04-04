import type { Branch } from '../types';
import { StorageKeys } from '../config/storageKeys';
import { storage } from '../utils/storage';
import { idGenerator } from '../utils/idGenerator';

const ACTIVE_BRANCH_KEY = 'pharma_active_branch_id';

/**
 * Branch Service - Handles CRUD operations for pharmacy branches.
 * Org-aware: branches are scoped to organizations via orgId.
 */
export const branchService = {
  /**
   * Get all branches from storage.
   * If orgId is provided, filters to only that org's branches.
   */
  getAll(orgId?: string): Branch[] {
    const branches = storage.get<Branch[]>(StorageKeys.BRANCHES, []);
    if (orgId) {
      return branches.filter((b) => b.orgId === orgId);
    }
    return branches;
  },

  /**
   * Get all branches belonging to a specific organization
   */
  getAllByOrg(orgId: string): Branch[] {
    return this.getAll(orgId);
  },

  /**
   * Get a single branch by ID
   */
  getById(id: string): Branch | null {
    const branches = this.getAll();
    return branches.find((b) => b.id === id) || null;
  },

  /**
   * Get the currently active branch
   */
  getActive(): Branch | null {
    const activeId = localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (!activeId) {
      return this.ensureDefaultBranch();
    }
    return this.getById(activeId) || this.ensureDefaultBranch();
  },

  /**
   * Set the active branch ID
   */
  setActive(branchId: string): void {
    localStorage.setItem(ACTIVE_BRANCH_KEY, branchId);
  },

  /**
   * Create a new branch. Requires orgId for tenant association.
   */
  create(data: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): Branch {
    const branches = this.getAll();
    const now = new Date().toISOString();
    
    const newBranch: Branch = {
      ...data,
      id: idGenerator.generate('branches'),
      createdAt: now,
      updatedAt: now,
    };

    branches.push(newBranch);
    storage.set(StorageKeys.BRANCHES, branches);
    return newBranch;
  },

  /**
   * Update an existing branch
   */
  update(id: string, data: Partial<Branch>): Branch {
    const branches = this.getAll();
    const index = branches.findIndex((b) => b.id === id);
    
    if (index === -1) {
      throw new Error(`Branch with ID ${id} not found`);
    }

    const updatedBranch: Branch = {
      ...branches[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    branches[index] = updatedBranch;
    storage.set(StorageKeys.BRANCHES, branches);
    return updatedBranch;
  },

  /**
   * Delete a branch by ID
   */
  delete(id: string): void {
    const branches = this.getAll().filter((b) => b.id !== id);
    storage.set(StorageKeys.BRANCHES, branches);
    
    // Clear active branch if it was the one deleted
    const activeId = localStorage.getItem(ACTIVE_BRANCH_KEY);
    if (activeId === id) {
      localStorage.removeItem(ACTIVE_BRANCH_KEY);
    }
  },

  /**
   * Migration helper: ensures an active branch is selected if any exist.
   * Optionally scoped by orgId for multi-tenant context.
   * Returns null if no branches exist (triggers onboarding).
   */
  ensureDefaultBranch(orgId?: string): Branch | null {
    const branches = orgId ? this.getAllByOrg(orgId) : this.getAll();
    
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
