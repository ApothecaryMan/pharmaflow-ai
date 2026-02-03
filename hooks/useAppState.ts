import { useEffect, useState } from 'react';
import { ROUTES } from '../config/routes';
import { StorageKeys } from '../config/storageKeys';
import type { ViewState } from '../types';
import { usePersistedState } from './usePersistedState';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface AppState {
  // View state
  view: ViewState;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
  activeModule: string;
  setActiveModule: React.Dispatch<React.SetStateAction<string>>;
  dashboardSubView: string;
  setDashboardSubView: React.Dispatch<React.SetStateAction<string>>;
  navigationParams: Record<string, any> | null;
  setNavigationParams: React.Dispatch<React.SetStateAction<Record<string, any> | null>>;

  // UI state
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // User state
  profileImage: string | null;
  setProfileImage: React.Dispatch<React.SetStateAction<string | null>>;
  currentEmployeeId: string | null;
  setCurrentEmployeeId: React.Dispatch<React.SetStateAction<string | null>>;
  windowedView: string | null;
  setWindowedView: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Hook for managing application UI state including view navigation,
 * toast notifications, mobile menu, and user preferences.
 */
export function useAppState(): AppState {
  // --- View State ---
  const [view, setView] = usePersistedState<ViewState>(StorageKeys.VIEW, ROUTES.DASHBOARD);
  const [activeModule, setActiveModule] = usePersistedState<string>(
    StorageKeys.ACTIVE_MODULE,
    ROUTES.DASHBOARD
  );
  const [dashboardSubView, setDashboardSubView] = useState<string>('dashboard');
  const [navigationParams, setNavigationParams] = useState<Record<string, any> | null>(null);

  // --- UI State ---
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- User/Session State ---
  const [profileImage, setProfileImage] = usePersistedState<string | null>(
    StorageKeys.PROFILE_IMAGE,
    null
  );
  const [currentEmployeeId, setCurrentEmployeeId] = usePersistedState<string | null>(
    StorageKeys.CURRENT_EMPLOYEE_ID,
    null
  );
  const [windowedView, setWindowedView] = useState<string | null>(null);

  return {
    // View state
    view,
    setView,
    activeModule,
    setActiveModule,
    dashboardSubView,
    setDashboardSubView,
    navigationParams,
    setNavigationParams,

    // UI state
    mobileMenuOpen,
    setMobileMenuOpen,

    // User state
    profileImage,
    setProfileImage,
    currentEmployeeId,
    setCurrentEmployeeId,
    windowedView,
    setWindowedView,
  };
}
