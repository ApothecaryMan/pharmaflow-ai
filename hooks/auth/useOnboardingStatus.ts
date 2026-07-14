import { useEffect, useState } from 'react';
import { authService } from '../../services/auth/authService';
import { branchService } from '../../services/org/branchService';
import { orgService } from '../../services/org/orgService';

export type OnboardingStep = 1 | 2 | 3 | 0;

export const useOnboardingStatus = (isAuthenticated?: boolean) => {
  const [activeStep, setActiveStep] = useState<OnboardingStep>(0);
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // 0. Force sync with DB to get the absolute latest orgRole and orgId
      const user = await authService.getCurrentUser(true);
      const devOwnerId = import.meta.env.VITE_DEV_OWNER_ID as string;
      const ownerId = user?.userId || devOwnerId;
      const isDevPlaceholder = ownerId === devOwnerId;

      // 0.1 Check bypass logic using fresh user data
      const isOwnerOrAdmin = user?.orgRole === 'owner' || user?.orgRole === 'admin';

      // Bypass entirely for global employee accounts.
      if (user?.accountType !== 'pharmacy' && !isOwnerOrAdmin) {
        setActiveStep(0);
        return;
      }

      // 1. Check Organizations
      const orgs = isDevPlaceholder ? [] : await orgService.getUserOrgs(ownerId);
      let activeOrgId = orgService.getActiveOrgId();

      if (orgs.length === 0 && !activeOrgId) {
        setActiveStep(1);
        return;
      }

      // Auto-set activeOrgId if we found orgs but none was persisted
      if (!activeOrgId && orgs.length > 0) {
        activeOrgId = orgs[0].id;
        orgService.setActiveOrgId(activeOrgId);
      }

      // 2. Check Branches
      const branches = await branchService.getAll(activeOrgId || undefined);
      const isDummyBranchOnly =
        branches.length === 1 &&
        branches[0].code === 'MAIN-01' &&
        branches[0].name === 'الفرع الرئيسي';

      if (branches.length === 0 || isDummyBranchOnly) {
        setActiveStep(2);
        return;
      }

      // 3. Check Employees
      const { employeeService } = await import('../../services/hr/employeeService');
      const all = await employeeService.getAll('ALL', activeOrgId || undefined);
      const hasRealEmployees = all.some((e) => e.userId !== user?.userId);

      if (!hasRealEmployees) {
        setActiveStep(3);
      } else {
        setActiveStep(0);
      }
    } catch (err) {
      console.error('Onboarding check failed:', err);
      setError('Failed to verify onboarding status');
    } finally {
      setIsChecking(false);
      setHasChecked(true);
    }
  };

  useEffect(() => {
    // Only run check if authenticated and NO error has occurred yet.
    // This prevents infinite loops if the check fails and sets an error state.
    if ((isAuthenticated === true || isAuthenticated === undefined) && !error && !hasChecked) {
      checkStatus();
    } else if (isAuthenticated === false) {
      // Reset state on logout so next login triggers fresh onboarding check
      setHasChecked(false);
      setActiveStep(0);
      setError(null);
    }
  }, [isAuthenticated, error, hasChecked, checkStatus]);

  return {
    activeStep,
    setActiveStep,
    isChecking,
    error,
    refreshStatus: checkStatus,
  };
};
