import { useState, useEffect } from 'react';
import { orgService } from '../services/org/orgService';
import { branchService } from '../services/branchService';
import { authService } from '../services/auth/authService';

export type OnboardingStep = 1 | 2 | 3 | 0;

export const useOnboardingStatus = () => {
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
      const { employeeCacheService } = await import('../services/hr/employeeCacheService');
      const all = await employeeCacheService.loadAll();
      const superAdminId = import.meta.env.VITE_SUPER_ADMIN_ID as string;
      const hasRealEmployees = all.some(
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
    checkStatus();
  }, []);

  return {
    activeStep,
    setActiveStep,
    isChecking,
    error,
    refreshStatus: checkStatus,
  };
};
