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
      const ownerId = user?.userId || 'DEV-OWNER';
      const orgs = await orgService.getUserOrgs(ownerId);
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
      const hasRealEmployees = all.some(
        (e) => e.id !== 'SUPER-ADMIN' && e.employeeCode !== 'EMP-000'
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
