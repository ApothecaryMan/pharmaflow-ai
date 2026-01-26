import { useCallback, useMemo } from 'react';
import { ViewState } from '../types';
import { PAGE_REGISTRY } from '../config/pageRegistry';
import { PHARMACY_MENU, MenuItem } from '../config/menuData';
import { useToast } from '../context';

/**
 * Module ID to ViewState mapping.
 * Defined outside the hook to avoid re-creation on each render.
 */
const MODULE_VIEW_MAPPING: Record<string, ViewState> = {
  'dashboard': 'dashboard',
  'inventory': 'inventory',
  'sales': 'pos',
  'purchase': 'purchases',
  'customers': 'customers',
  'customer-overview': 'customer-overview',
  'prescriptions': 'dashboard',
  'finance': 'dashboard',
  'reports': 'dashboard',
  'hr': 'dashboard',
  'compliance': 'dashboard',
  'settings': 'dashboard',
  'return-history': 'return-history',
} as const;

/**
 * Helper function to filter menu items based on activity status.
 * A module is considered active if it has a page or has submenus with navigable items.
 */
function filterActiveMenuItems(menu: MenuItem[]): MenuItem[] {
  return menu.filter(module => 
    module.hasPage !== false || 
    module.submenus?.some(submenu => 
      submenu.items.some(item => 
        typeof item === 'object' && !!item.view
      )
    )
  );
}

export interface NavigationHandlers {
  handleViewChange: (viewId: string) => void;
  handleNavigate: (viewId: string) => void;
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
}: UseNavigationParams): NavigationHandlers {
  const { error } = useToast();
  
  // Handle view change with dashboard sub-view logic
  const handleViewChange = useCallback((viewId: string) => {
    const targetView = viewId as ViewState;
    const resolvedView = resolveView(targetView);
    
    if (resolvedView !== targetView) {
      error('Access denied. Please login first.');
      setView(resolvedView);
      return;
    }

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
  }, [activeModule, resolveView, setView, setDashboardSubView, setMobileMenuOpen, error]);

  // Handle direct navigation
  const handleNavigate = useCallback((viewId: string) => {
    const targetView = viewId as ViewState;
    const resolvedView = resolveView(targetView);
    
    if (resolvedView !== targetView) {
      error('Access denied.');
      setView(resolvedView);
    } else {
      setView(targetView);
    }
    setMobileMenuOpen(false);
  }, [resolveView, setView, setMobileMenuOpen, error]);

  // Handle module change
  const handleModuleChange = useCallback((moduleId: string) => {
    setActiveModule(moduleId);
    const newView = MODULE_VIEW_MAPPING[moduleId] || 'dashboard';
    setView(newView);
  }, [setActiveModule, setView]);

  // Filter menu items based on settings
  const filteredMenuItems = useMemo(() => 
    (!hideInactiveModules || developerMode) 
      ? PHARMACY_MENU 
      : filterActiveMenuItems(PHARMACY_MENU), 
    [hideInactiveModules, developerMode]
  );

  return {
    handleViewChange,
    handleNavigate,
    handleModuleChange,
    filteredMenuItems,
  };
}
