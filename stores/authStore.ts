import { create } from 'zustand';
import { StorageKeys } from '../config/storageKeys';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';
import { authService } from '../services/auth/authService';
import { permissionsService } from '../services/auth/permissionsService';
import { branchService } from '../services/org/branchService';
import { orgService } from '../services/org/orgService';
import { settingsService } from '../services/settings/settingsService';
import type { Branch, Employee, Organization } from '../types';
import { storage } from '../utils/storage';

interface AuthState {
  activeBranchId: string;
  activeOrgId: string;
  activeOrg: Organization | null;
  currentEmployee: Employee | null;
  branches: Branch[];
  isLoading: boolean;
  _switchingBranch: boolean;

  setActiveBranchId: (id: string) => void;
  setActiveOrgId: (id: string) => void;
  setActiveOrg: (org: Organization | null) => void;
  setCurrentEmployee: (emp: Employee | null) => void;
  setBranches: (branches: Branch[]) => void;
  setIsLoading: (loading: boolean) => void;

  switchBranch: (branchId: string, skipClearEmployee?: boolean) => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  reinitialize: () => Promise<void>;
  reset: () => void;
  refreshAll: () => Promise<void>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  activeBranchId: '',
  activeOrgId: '',
  activeOrg: null,
  currentEmployee: null,
  branches: [],
  isLoading: true,
  _switchingBranch: false,

  setActiveBranchId: (id) => set({ activeBranchId: id }),
  setActiveOrgId: (id) => set({ activeOrgId: id }),
  setActiveOrg: (org) => set({ activeOrg: org }),
  setCurrentEmployee: (emp) => set({ currentEmployee: emp }),
  setBranches: (branches) => set({ branches }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  switchBranch: async (branchId, skipClearEmployee) => {
    if (get()._switchingBranch) return;
    const prevLoading = get().isLoading;
    set({ _switchingBranch: true, isLoading: true });
    try {
      const sessionBeforeClear = authService.getCurrentUserSync();
      const isManagerOrAdmin = permissionsService.isManager() || permissionsService.isOrgAdmin();
      const belongsToBranch = get().currentEmployee?.branchId === branchId;

      const shouldSkipClear = skipClearEmployee === true || isManagerOrAdmin || belongsToBranch;

      if (!shouldSkipClear) {
        set({ currentEmployee: null });
        authService.clearEmployeeSession();
      } else if (get().currentEmployee?.id) {
        if (sessionBeforeClear?.userId) {
          const key = `pharma_last_branch_${sessionBeforeClear.userId}_${get().currentEmployee.id}`;
          storage.set(key, branchId);
        }
      }

      await branchService.setActive(branchId);

      const allBranches = await branchService.getAll();
      const newBranch = allBranches.find((b) => b.id === branchId);
      const branchCode = newBranch?.code || '';

      await settingsService.setMultiple({
        activeBranchId: branchId,
        branchCode,
      });

      if (sessionBeforeClear && get().activeBranchId && get().activeBranchId !== branchId) {
        const oldBranch = allBranches.find((b) => b.id === get().activeBranchId);
        authService.logAuditEvent({
          username: sessionBeforeClear.username,
          role: sessionBeforeClear.role,
          branchId: branchId,
          action: 'switch_branch',
          employeeId: sessionBeforeClear.employeeId,
          employeeCode: sessionBeforeClear.employeeCode,
          details: `Switched from ${oldBranch?.name || get().activeBranchId} to ${newBranch?.name || branchId}`,
        });
      }

      const { sessionRepository } = await import('../services/auth/repositories/sessionRepository');
      const activeSessionId = storage.get(StorageKeys.ACTIVE_SESSION_ID, null);
      const currentOrgId = get().activeOrgId;
      if (activeSessionId && currentOrgId) {
        sessionRepository
          .updateSessionWorkspace(activeSessionId, currentOrgId, branchId)
          .catch(console.error);
      }

      set({ activeBranchId: branchId, branches: allBranches });
      authService.updateSession({ branchId });
    } finally {
      set({ _switchingBranch: false, isLoading: prevLoading });
    }
  },

  switchOrg: async (orgId) => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      set({ currentEmployee: null });
      authService.clearEmployeeSession();

      orgService.setActiveOrgId(orgId);

      const { sessionRepository } = await import('../services/auth/repositories/sessionRepository');
      const activeSessionId = storage.get(StorageKeys.ACTIVE_SESSION_ID, null);
      if (activeSessionId) {
        sessionRepository.updateSessionWorkspace(activeSessionId, orgId, null).catch(console.error);
      }

      set({ activeOrgId: orgId });
      const fullOrg = await orgService.getById(orgId);
      set({ activeOrg: fullOrg });
      await settingsService.set('orgId', orgId);
      const branches = await branchService.getAll(orgId);
      set({ branches });
      if (branches.length > 0) {
        await get().switchBranch(branches[0].id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  reinitialize: async () => {
    set({ isLoading: true });
    try {
      const defaultOrgId = orgService.getActiveOrgId() || '';

      let activeOrg = null;
      if (defaultOrgId) {
        activeOrg = await orgService.getById(defaultOrgId);
      }

      const allBranches = await branchService.getAll(defaultOrgId);
      const activeBranch = await branchService.getActive();
      const session = await authService.getCurrentUser();

      const isManagerOrAdmin = permissionsService.isOrgAdmin() || permissionsService.isManager();

      let finalBranchId = session?.branchId || activeBranch?.id || '';

      if (!finalBranchId && allBranches.length > 0) {
        if (isManagerOrAdmin) {
          finalBranchId = allBranches[0].id;
        } else {
          finalBranchId = '';
        }
      }

      if (finalBranchId && !allBranches.some((b) => b.id === finalBranchId)) {
        if (isManagerOrAdmin && allBranches.length > 0) {
          finalBranchId = allBranches[0].id;
          await branchService.setActive(finalBranchId);
        } else {
          finalBranchId = '';
        }
      }

      if (session?.employeeId && finalBranchId) {
        try {
          const { employeeRepository } = await import(
            '../services/hr/repositories/employeeRepository'
          );
          const emp = await employeeRepository.getById(session.employeeId);
          if (emp) set({ currentEmployee: emp });
        } catch {
          // Employee fetch is best-effort during init
        }
      }

      set({
        branches: allBranches,
        activeBranchId: finalBranchId,
        activeOrgId: defaultOrgId,
        activeOrg,
      });

      await settingsService.setMultiple({
        activeBranchId: finalBranchId,
        branchCode: allBranches.find((b) => b.id === finalBranchId)?.code || '',
        orgId: defaultOrgId,
      });
    } catch (error) {
      console.error('[AuthStore] reinitialize error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => {
    set({
      activeBranchId: '',
      activeOrgId: '',
      activeOrg: null,
      currentEmployee: null,
      branches: [],
      isLoading: false,
      _switchingBranch: false,
    });
  },

  refreshAll: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.sales }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.purchases }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.batches }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.returns }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.employees }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.customers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.suppliers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.branches }),
      queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.org }),
    ]);
  },

  updateBranch: async (id: string, updates: Partial<Branch>) => {
    const updated = await branchService.update(id, updates);
    queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.branches });
    set((state) => ({
      branches: state.branches.map((b) => (b.id === id ? updated : b)),
    }));
  },
}));
