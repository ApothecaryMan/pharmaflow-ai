import React, { useCallback, useMemo } from 'react';
import { type MenuItem, PHARMACY_MENU, MODULE_VIEW_MAPPING } from '../config/menuData';
import { PAGE_REGISTRY } from '../config/pageRegistry';
import { type UserRole } from '../config/permissions';
import { permissionsService } from '../services/auth/permissionsService';
import { useAlert } from '../context';
import type { ViewState } from '../types';

/**
 * Helper function to filter menu items based on activity status AND permissions.
 * Returns empty when no employee is logged in (dock-level gatekeeper).
 */
function filterMenuItems(
  menu: MenuItem[],
  hideInactiveModules: boolean,
  developerMode: boolean,
  currentEmployeeId?: string | null
): MenuItem[] {
  // No employee logged in at dock level → hide all navigation
  if (!currentEmployeeId) return [];

  return menu
    .filter((module) => {
      // 1. Permission Check
      if (module.permission && !permissionsService.can(module.permission)) {
        return false;
      }

      // 2. Activity Check (if enabled)
      if (hideInactiveModules) {
        return (
          module.hasPage !== false ||
          module.submenus?.some((submenu) =>
            submenu.items.some((item) => typeof item === 'object' && !!item.view)
          )
        );
      }
      return true;
    })
    .map((module) => ({
      ...module,
      submenus: module.submenus
        ?.filter((submenu) => {
          // Filter submenus by permission
          if (submenu.permission && !permissionsService.can(submenu.permission)) {
            return false;
          }
          return true;
        })
        .map((submenu) => ({
          ...submenu,
          items: submenu.items.filter((item) => {
            // Filter items by permission
            if (
              typeof item === 'object' &&
              item.permission &&
              !permissionsService.can(item.permission)
            ) {
              return false;
            }
            return true;
          }),
        })),
    }));
}

export interface NavigationHandlers {
  handleViewChange: (viewId: string, params?: Record<string, any>) => void;
  handleNavigate: (viewId: string, params?: Record<string, any>) => void;
  handleModuleChange: (moduleId: string) => void;
  filteredMenuItems: MenuItem[];
}

interface UseNavigationParams {
  view: ViewState;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
  activeModule: string;
  setActiveModule: React.Dispatch<React.SetStateAction<string>>;
  dashboardSubView: string;
  setDashboardSubView: React.Dispatch<React.SetStateAction<string>>;
  resolveView: (targetView: ViewState) => ViewState;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hideInactiveModules: boolean;
  developerMode: boolean;
  setNavigationParams: React.Dispatch<React.SetStateAction<Record<string, any> | null>>;
  onProtectedNavigation?: (viewId: string, params?: Record<string, any>) => void;
  currentEmployeeId?: string | null;
  activeBranchId?: string | null;
  activeOrgId?: string | null;
}

/**
 * Hook for managing navigation and menu filtering.
 * Provides handlers for view changes, module changes, and filtered menu items.
 */
export function useNavigation({
  view,
  setView,
  activeModule,
  setActiveModule,
  dashboardSubView,
  setDashboardSubView,
  resolveView,
  setMobileMenuOpen,
  hideInactiveModules,
  developerMode,
  setNavigationParams,
  onProtectedNavigation,
  currentEmployeeId,
  activeBranchId,
  activeOrgId,
}: UseNavigationParams): NavigationHandlers {
  const { error } = useAlert();

  // Handle view change with dashboard sub-view logic
  const handleViewChange = useCallback(
    (viewId: string, params?: Record<string, any>) => {
      const pageConfig = PAGE_REGISTRY[viewId];
      
      // Check for Protection
      if (pageConfig?.isProtected && onProtectedNavigation) {
        const isAlreadyUnlocked = sessionStorage.getItem(pageConfig.storageKey || 'area_unlocked') === 'true';
        if (!isAlreadyUnlocked) {
          onProtectedNavigation(viewId, params);
          return;
        }
      }

      const targetView = viewId as ViewState;
      const resolvedView = resolveView(targetView);

      if (resolvedView !== targetView) {
        error('Access denied. Please login first.');
        setView(resolvedView);
        return;
      }

      // Set params if provided, otherwise clear them
      setNavigationParams(params || null);

      if (activeModule === 'dashboard') {
        // Check if this viewId exists in PAGE_REGISTRY (meaning it's a real page)
        // If yes, navigate to it. If no, it's a dashboard sub-view.
        if (PAGE_REGISTRY[viewId]) {
          setView(targetView);
        } else {
          setDashboardSubView(viewId);
          setView('dashboard');
        }
      } else {
        setView(targetView);
      }
      setMobileMenuOpen(false);
    },
    [activeModule, resolveView, setView, setDashboardSubView, setMobileMenuOpen, setNavigationParams, error, onProtectedNavigation]
  );

  // Handle direct navigation
  const handleNavigate = useCallback(
    (viewId: string, params?: Record<string, any>) => {
      const pageConfig = PAGE_REGISTRY[viewId];
      
      // Check for Protection
      if (pageConfig?.isProtected && onProtectedNavigation) {
        const isAlreadyUnlocked = sessionStorage.getItem(pageConfig.storageKey || 'area_unlocked') === 'true';
        if (!isAlreadyUnlocked) {
          onProtectedNavigation(viewId, params);
          return;
        }
      }

      const targetView = viewId as ViewState;
      const resolvedView = resolveView(targetView);

      if (resolvedView !== targetView) {
        error('Access denied.');
        setView(resolvedView);
      } else {
        setNavigationParams(params || null);
        setView(targetView);
      }
      setMobileMenuOpen(false);
    },
    [resolveView, setView, setMobileMenuOpen, setNavigationParams, error, onProtectedNavigation]
  );

  // Handle module change
  const handleModuleChange = useCallback(
    (moduleId: string) => {
      setActiveModule(moduleId);
      const newView = MODULE_VIEW_MAPPING[moduleId] || 'dashboard';
      setView(newView);
    },
    [setActiveModule, setView]
  );

  // Filter menu items based on permissions and settings
  const filteredMenuItems = useMemo(
    () => filterMenuItems(PHARMACY_MENU, hideInactiveModules, developerMode, currentEmployeeId),
    [hideInactiveModules, developerMode, currentEmployeeId]
  );

  return {
    handleViewChange,
    handleNavigate,
    handleModuleChange,
    filteredMenuItems,
  };
}
