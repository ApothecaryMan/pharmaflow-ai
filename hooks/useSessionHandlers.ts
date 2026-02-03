import { useCallback, useState } from 'react';
import { ROUTES } from '../config/routes';
import { authService } from '../services/auth/authService';

interface SessionHandlersProps {
  employees: any[];
  currentEmployeeId: string | null;
  setCurrentEmployeeId: (id: string | null) => void;
  setProfileImage: (img: string | null) => void;
  setView: (view: any) => void;
  setActiveModule: (module: string) => void;
  handleLogout: () => Promise<void>;
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
  handleLogout,
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
        } else {
          const selectedEmployee = employees.find((e) => e.id === id);
          if (selectedEmployee) {
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
          }
        }
      }
      setCurrentEmployeeId(id);
    },
    [employees, currentEmployeeId, setCurrentEmployeeId]
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
