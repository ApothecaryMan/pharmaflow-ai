import { useCallback, useState } from 'react';
import { ROUTES } from '../config/routes';
import { authService } from '../services/auth/authService';
import { PHARMACY_MENU, MODULE_VIEW_MAPPING } from '../config/menuData';
import { permissionsService } from '../services/auth/permissions';
import type { ViewState } from '../types';

interface SessionHandlersProps {
  employees: any[];
  currentEmployeeId: string | null;
  setCurrentEmployeeId: (id: string | null) => void;
  setProfileImage: (img: string | null) => void;
  setView: (view: any) => void;
  setActiveModule: (module: string) => void;
  setNavigationParams: (params: any) => void;
  handleLogout: () => Promise<void>;
  switchBranch: (branchId: string, skipClearEmployee?: boolean) => Promise<void>;
  branches: any[];
}

/**
 * useSessionHandlers centralizes logic for logout and employee management.
 */
export const useSessionHandlers = ({
  employees,
  currentEmployeeId,
  setCurrentEmployeeId,
  setProfileImage,
  setView,
  setActiveModule,
  setNavigationParams,
  handleLogout,
  switchBranch,
  branches,
}: SessionHandlersProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // --- Employee Selection Wrapper (Audit Logging) ---
  const handleSelectEmployee = useCallback(
    async (id: string | null) => {
      const session = await authService.getCurrentUser();

      if (session) {
        if (!id) {
          // Log Employee Logout
          const currentEmp = employees.find((e) => e.id === currentEmployeeId);
          authService.logAuditEvent({
            username: currentEmp?.name || session.username,
            role: currentEmp?.role || session.role,
            branchId: session.branchId,
            action: 'logout',
            details: `Employee signed out`,
          });

          // --- Restore the original system role on employee logout ---
          const stored = localStorage.getItem('branch_pilot_session');
          if (stored) {
            const storedSession = JSON.parse(stored);
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
            localStorage.setItem('branch_pilot_session', JSON.stringify(storedSession));
          }
        } else {
          const selectedEmployee = employees.find((e) => e.id === id);
          if (selectedEmployee) {
            // --- Sync employee role to session for permissionsService ---
            const stored = localStorage.getItem('branch_pilot_session');
            if (stored) {
              const storedSession = JSON.parse(stored);
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
              localStorage.setItem('branch_pilot_session', JSON.stringify(storedSession));
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
              details: isFirstSelection
                ? `Employee session started`
                : `Switched from ${previousName || 'unknown'}`,
            });

            // --- Automatic Branch Redirection ---
            let targetBranchId = selectedEmployee.branchId;

            // Check if user is manager or admin to use "last visited" logic
            const isManagerOrAdmin = permissionsService.isManager() || permissionsService.isOrgAdmin();
            
            if (isManagerOrAdmin) {
              const lastBranchKey = `pharma_last_branch_${session.userId}_${selectedEmployee.id}`;
              const lastBranchId = localStorage.getItem(lastBranchKey);
              
              if (lastBranchId && branches.some(b => b.id === lastBranchId)) {
                targetBranchId = lastBranchId;
              }
            }

            // Fallback to first branch if no branch is assigned or found
            if (!targetBranchId && branches.length > 0) {
              targetBranchId = branches[0].id;
            }

            // Perform branch switch if necessary
            if (targetBranchId && targetBranchId !== session.branchId) {
              await switchBranch(targetBranchId, true);
            }

            // --- Smart Redirection: Find first allowed module ---
            const firstAllowedModule = PHARMACY_MENU.find((m) => {
              if (!m.permission) return true;
              return permissionsService.can(m.permission, {
                role: selectedEmployee.role,
                orgRole: selectedEmployee.orgRole,
              });
            });

            const targetView = (firstAllowedModule
              ? MODULE_VIEW_MAPPING[firstAllowedModule.id]
              : 'dashboard') as ViewState;
            const targetModule = firstAllowedModule?.id || 'dashboard';

            setNavigationParams(null); // Ensure no residual data from previous user
            setView(targetView);
            setActiveModule(targetModule);
          }
        }
      }
      setCurrentEmployeeId(id);
    },
    [employees, currentEmployeeId, setCurrentEmployeeId, setNavigationParams, setView, setActiveModule, switchBranch, branches]
  );

  // --- Optimized Logout Handler ---
  const onLogoutClick = useCallback(async () => {
    const startTime = Date.now();
    const MIN_DISPLAY_TIME = 1500;

    setIsLoggingOut(true);

    try {
      console.log('[Session] Clearing session states');
      await handleSelectEmployee(null);
      setProfileImage(null);
      setView(ROUTES.DASHBOARD);
      setActiveModule(ROUTES.DASHBOARD);

      await handleLogout();

      const elapsed = Date.now() - startTime;
      const remaining = MIN_DISPLAY_TIME - elapsed;

      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
    } catch (error) {
      console.error('[Session] Logout error:', error);
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_DISPLAY_TIME) {
        await new Promise((r) => setTimeout(r, MIN_DISPLAY_TIME - elapsed));
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [handleLogout, handleSelectEmployee, setProfileImage, setView, setActiveModule]);

  return {
    isLoggingOut,
    onLogoutClick,
    handleSelectEmployee,
  };
};
