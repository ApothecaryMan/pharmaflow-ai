import { useState, useEffect } from 'react';
import { orgService } from '../services/org/orgService';
import { branchService } from '../services/branchService';
import { authService } from '../services/auth/authService';

export type OnboardingStep = 1 | 2 | 3 | 0;

export const useOnboardingStatus = (isAuthenticated?: boolean) => {
  const [activeStep, setActiveStep] = useState<OnboardingStep>(0);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // 1. Check Organizations
      const user = authService.getCurrentUserSync();
      const devOwnerId = import.meta.env.VITE_DEV_OWNER_ID as string;
      const ownerId = user?.userId || devOwnerId;
      
      // Only check orgs if we have a real ID or if we're in local mode.
      const isDevPlaceholder = ownerId === devOwnerId;
      const orgs = isDevPlaceholder ? [] : await orgService.getUserOrgs(ownerId);
      const activeOrgId = orgService.getActiveOrgId();

      if (orgs.length === 0 && !activeOrgId) {
        setActiveStep(1);
        return;
      }

      // 2. Check Branches
      const branches = await branchService.getAll();
      if (branches.length === 0) {
        setActiveStep(2);
        return;
      }

      // 3. Check Employees
      const { employeeService } = await import('../services/hr/employeeService');
      const all = await employeeService.getAll('ALL', activeOrgId || undefined);
      const superAdminId = import.meta.env.VITE_SUPER_ADMIN_ID as string;
      const hasRealEmployees = !!user?.employeeId || all.some(
        (e) => e.id !== superAdminId && e.employeeCode !== 'EMP-000'
      );

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
    }
  };

  useEffect(() => {
    if (isAuthenticated === true || isAuthenticated === undefined) {
      checkStatus();
    } else {
      // Not authenticated, no need to check onboarding, clearing checking state
      setIsChecking(false);
    }
  }, [isAuthenticated]);

  return {
    activeStep,
    setActiveStep,
    isChecking,
    error,
    refreshStatus: checkStatus,
  };
};
