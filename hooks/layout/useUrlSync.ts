import { useEffect } from 'react';
import { ROUTES } from '../../config/routes';
import { useData } from '../../context/DataContext';
import type { ViewState } from '../../types';

export function useUrlSync(
  isAuthenticated: boolean,
  view: ViewState,
  currentEmployeeId: string | null,
  userId?: string
) {
  const { activeOrgId, activeBranchId, branches } = useData();

  useEffect(() => {
    if (!isAuthenticated) {
      const currentHash = window.location.hash;
      const allowedAuthHashes = [`#/${ROUTES.LOGIN}`, `#/${ROUTES.SIGNUP}`, `#/${ROUTES.FORGOT_PASSWORD}`];
      if (!allowedAuthHashes.includes(currentHash)) {
        window.history.replaceState(null, '', `#/${ROUTES.LOGIN}`);
      }
      return;
    }

    // Authenticated, but no employee profile selected yet
    if (!currentEmployeeId) {
      if (activeOrgId) {
        const newHash = `#/${activeOrgId}/landing`;
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, '', newHash);
        }
      } else {
        // Zero-affiliation employee portal
        const newHash = `#/${ROUTES.PORTAL}/${userId || ''}`;
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, '', newHash);
        }
      }
      return;
    }

    // Authenticated, profile selected, but no branch assigned (Pending branch screen)
    if (!activeBranchId) {
      if (activeOrgId) {
        const newHash = `#/${activeOrgId}/pending`;
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, '', newHash);
        }
      }
      return;
    }

    // Authenticated, profile selected, and branch assigned (Standard dashboard/module routes)
    const activeBranch = branches.find(b => b.id === activeBranchId);
    if (activeBranch) {
      const newHash = `#/${activeOrgId}/${activeBranch.code}/${view}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    } else if (activeOrgId) {
      const newHash = `#/${activeOrgId}/${view}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    }
  }, [isAuthenticated, activeOrgId, activeBranchId, view, branches, currentEmployeeId, userId]);
}
