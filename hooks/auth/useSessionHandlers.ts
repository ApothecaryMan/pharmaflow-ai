import { useCallback, useState } from 'react';
import { MODULE_VIEW_MAPPING, PHARMACY_MENU } from '../../config/menuData';
import { ROUTES } from '../../config/routes';
import { StorageKeys } from '../../config/storageKeys';
import { authService } from '../../services/auth/authService';
import { permissionsService } from '../../services/auth/permissionsService';
import type { Branch, Employee, UserSession, ViewState } from '../../types';
import { storage } from '../../utils/storage';

interface ExtendedSession extends UserSession {
  _originalRole?: UserSession['role'];
  _originalDepartment?: UserSession['department'];
  _originalOrgRole?: UserSession['orgRole'];
  _originalUsername?: UserSession['username'];
}

interface SessionHandlersProps {
  employees: Employee[];
  currentEmployeeId: string | null;
  setCurrentEmployeeId: (id: string | null) => void;
  setView: (view: ViewState) => void;
  setActiveModule: (module: string) => void;
  setNavigationParams: (params: Record<string, unknown> | null) => void;
  handleLogout: () => Promise<void>;
  switchBranch: (branchId: string, skipClearEmployee?: boolean) => Promise<void>;
  branches: Branch[];
}

/**
 * useSessionHandlers centralizes logic for logout and employee management.
 */
export const useSessionHandlers = ({
  employees,
  currentEmployeeId,
  setCurrentEmployeeId,
  setView,
  setActiveModule,
  setNavigationParams,
  handleLogout,
  switchBranch,
  branches,
}: SessionHandlersProps) => {
  // State removed since useAuth handles isLoggingOut

  // --- Employee Selection Wrapper (Audit Logging) ---
  const handleSelectEmployee = useCallback(
    async (id: string | null) => {
      const session = authService.getCurrentUserSync();

      if (session) {
        if (!id) {
          // Log Employee Logout
          const currentEmp = employees.find((e) => e.id === currentEmployeeId);
          authService.logAuditEvent({
            username: currentEmp?.name || session.username,
            role: currentEmp?.role || session.role,
            branchId: session.branchId,
            action: 'logout',
            employeeId: currentEmployeeId || undefined,
            employeeCode: session.employeeCode,
            details: `Employee signed out`,
          });

          // --- Restore the original system role on employee logout ---
          const storedSession = storage.get<ExtendedSession>(StorageKeys.SESSION, null);
          if (storedSession) {
            if (storedSession._originalRole) {
              storedSession.role = storedSession._originalRole;
              storedSession.department = storedSession._originalDepartment;
              storedSession.orgRole = storedSession._originalOrgRole;
              storedSession.username = storedSession._originalUsername;
              delete storedSession._originalRole;
              delete storedSession._originalDepartment;
              delete storedSession._originalOrgRole;
              delete storedSession._originalUsername;
            }
            delete storedSession.employeeId;
            delete storedSession.employeeCode;
            delete storedSession.employeeName;
            storage.set(StorageKeys.SESSION, storedSession);
          }
        } else {
          const selectedEmployee = employees.find((e) => e.id === id);
          if (selectedEmployee) {
            // --- Sync employee role to session for permissionsService ---
            const storedSession = storage.get<ExtendedSession>(StorageKeys.SESSION, null);
            if (storedSession) {
              // Save original credentials & sync employee's role
              if (!storedSession._originalRole) {
                storedSession._originalRole = storedSession.role;
                storedSession._originalDepartment = storedSession.department;
                storedSession._originalOrgRole = storedSession.orgRole;
                storedSession._originalUsername = storedSession.username;
              }
              storedSession.role = selectedEmployee.role;
              storedSession.department = selectedEmployee.department;
              storedSession.orgRole = selectedEmployee.orgRole || 'member';
              storedSession.username = selectedEmployee.username || selectedEmployee.name;
              storedSession.employeeId = selectedEmployee.id;
              storedSession.employeeCode = selectedEmployee.employeeCode;
              storedSession.employeeName = selectedEmployee.name;
              storedSession.accountType = 'pharmacy';
              storedSession.destination = 'pharmacy';
              storage.set(StorageKeys.SESSION, storedSession);
            }

            const isFirstSelection = !currentEmployeeId;
            const previousEmployee = employees.find((e) => e.id === currentEmployeeId);
            const previousName = previousEmployee?.name || (currentEmployeeId ? 'unknown' : null);

            authService.logAuditEvent({
              username: selectedEmployee.name,
              role: selectedEmployee.role,
              branchId: session.branchId,
              action: isFirstSelection ? 'login' : 'switch_user',
              employeeId: selectedEmployee.id,
              employeeCode: selectedEmployee.employeeCode,
              details: isFirstSelection
                ? `Employee session started`
                : `Switched from ${previousName || 'unknown'}`,
            });

            // --- Automatic Branch Redirection ---
            let targetBranchId = selectedEmployee.branchId;

            // Check if user is manager or admin to use "last visited" logic
            const isManagerOrAdmin =
              permissionsService.isManager() || permissionsService.isOrgAdmin();

            if (isManagerOrAdmin) {
              const lastBranchKey = `pharma_last_branch_${session.userId}_${selectedEmployee.id}`;
              const lastBranchId = storage.get<string | null>(lastBranchKey, null);

              if (lastBranchId && branches.some((b) => b.id === lastBranchId)) {
                targetBranchId = lastBranchId;
              }
            }

            // Fallback to first branch if no branch is assigned or found (Managers/Admins only)
            if (!targetBranchId && branches.length > 0 && isManagerOrAdmin) {
              targetBranchId = branches[0].id;
            }

            // Perform branch switch if necessary
            if (targetBranchId) {
              if (targetBranchId !== session.branchId) {
                await switchBranch(targetBranchId, true);
              }
            } else {
              // Employee has no branch assigned! Clear active branch context
              await switchBranch('', true);
            }

            // --- Smart Redirection: Find first allowed module ---
            const firstAllowedModule = PHARMACY_MENU.find((m) => {
              if (!m.permission) return true;
              return permissionsService.can(m.permission, {
                role: selectedEmployee.role,
                orgRole: selectedEmployee.orgRole,
              });
            });

            const targetView = (
              firstAllowedModule ? MODULE_VIEW_MAPPING[firstAllowedModule.id] : 'dashboard'
            ) as ViewState;
            const targetModule = firstAllowedModule?.id || 'dashboard';

            setNavigationParams(null); // Ensure no residual data from previous user
            setView(targetView);
            setActiveModule(targetModule);
          }
        }
      }
      setCurrentEmployeeId(id);
    },
    [
      employees,
      currentEmployeeId,
      setCurrentEmployeeId,
      setNavigationParams,
      setView,
      setActiveModule,
      switchBranch,
      branches,
    ]
  );

  // --- Optimized Logout Handler ---
  const onLogoutClick = useCallback(async () => {
    try {
      console.log('[Session] Clearing session states');
      await handleSelectEmployee(null);
      setView(ROUTES.DASHBOARD);
      setActiveModule(ROUTES.DASHBOARD);

      await handleLogout();
    } catch (error) {
      console.error('[Session] Logout error:', error);
    }
  }, [handleLogout, handleSelectEmployee, setView, setActiveModule]);

  return {
    onLogoutClick,
    handleSelectEmployee,
  };
};
