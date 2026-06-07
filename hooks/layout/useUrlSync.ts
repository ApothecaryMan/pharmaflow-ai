import { useEffect } from 'react';
import { ROUTES } from '../../config/routes';
import { useData } from '../../context/DataContext';
import type { ViewState } from '../../types';

export function useUrlSync(
  isAuthenticated: boolean,
  view: ViewState,
  currentEmployeeId: string | null,
  userId?: string,
  isEmployeePortalUser?: boolean
) {
  const { activeOrgId, activeBranchId, branches } = useData();

  useEffect(() => {
    // Helper to enforce pure HashRouter behavior (removes legacy pathnames like /login)
    const replaceUrl = (hash: string) => {
      const cleanUrl = `/${hash}`;
      if (window.location.hash !== hash || window.location.pathname !== '/') {
        window.history.replaceState(null, '', cleanUrl);
      }
    };

    if (!isAuthenticated) {
      const currentHash = window.location.hash;
      const allowedAuthHashes = [`#/${ROUTES.LOGIN}`, `#/${ROUTES.SIGNUP}`, `#/${ROUTES.FORGOT_PASSWORD}`];
      if (!allowedAuthHashes.includes(currentHash) || window.location.pathname !== '/') {
        replaceUrl(`#/${ROUTES.LOGIN}`);
      }
      return;
    }

    // Authenticated, but no employee profile selected yet
    if (!currentEmployeeId) {
      if (isEmployeePortalUser) {
        // Employee portal user
        const portalView = (view === 'landing' || !view) ? 'requests' : view;
        const newHash = `#/${ROUTES.PORTAL}/${userId || ''}/${portalView}`;
        replaceUrl(newHash);
      } else if (activeOrgId) {
        const newHash = `#/${activeOrgId}/landing`;
        replaceUrl(newHash);
      }
      return;
    }

    // Authenticated, profile selected, but no branch assigned (Pending branch screen)
    if (!activeBranchId) {
      if (activeOrgId) {
        const newHash = `#/${activeOrgId}/pending`;
        replaceUrl(newHash);
      }
      return;
    }

    // Authenticated, profile selected, and branch assigned (Standard dashboard/module routes)
    const activeBranch = branches.find(b => b.id === activeBranchId);
    if (activeBranch) {
      const newHash = `#/${activeOrgId}/${activeBranch.code}/${view}`;
      replaceUrl(newHash);
    } else if (activeOrgId) {
      const newHash = `#/${activeOrgId}/${view}`;
      replaceUrl(newHash);
    }
  }, [isAuthenticated, activeOrgId, activeBranchId, view, branches, currentEmployeeId, userId, isEmployeePortalUser]);
}
