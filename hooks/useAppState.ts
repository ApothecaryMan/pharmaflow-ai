import { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { usePersistedState } from './usePersistedState';
import { StorageKeys } from '../config/storageKeys';
import { ROUTES } from '../config/routes';

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
  
  // UI state
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tip: string;
  
  // User state
  profileImage: string | null;
  setProfileImage: React.Dispatch<React.SetStateAction<string | null>>;
  currentEmployeeId: string | null;
  setCurrentEmployeeId: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Hook for managing application UI state including view navigation,
 * toast notifications, mobile menu, and user preferences.
 */
export function useAppState(): AppState {
  // --- View State ---
  const [view, setView] = usePersistedState<ViewState>(StorageKeys.VIEW, ROUTES.DASHBOARD);
  const [activeModule, setActiveModule] = usePersistedState<string>(StorageKeys.ACTIVE_MODULE, ROUTES.DASHBOARD);
  const [dashboardSubView, setDashboardSubView] = useState<string>('dashboard');

  // --- UI State ---
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tip, setTip] = useState<string>("Loading tip...");

  // --- User/Session State ---
  const [profileImage, setProfileImage] = usePersistedState<string | null>(StorageKeys.PROFILE_IMAGE, null);
  const [currentEmployeeId, setCurrentEmployeeId] = usePersistedState<string | null>(StorageKeys.CURRENT_EMPLOYEE_ID, null);

  // Generate random tip on mount
  useEffect(() => {
    const tips = [
      "Hydration is key to health.",
      "Check expiry dates regularly.",
      "Organize stock by frequency.",
      "Monitor temperature for meds.",
      "Update software regularly.",
      "Double check prescriptions.",
      "Maintain a clean workspace.",
      "Review sales trends weekly."
    ];
    setTip(tips[Math.floor(Math.random() * tips.length)]);
  }, []);

  return {
    // View state
    view,
    setView,
    activeModule,
    setActiveModule,
    dashboardSubView,
    setDashboardSubView,
    
    // UI state
    mobileMenuOpen,
    setMobileMenuOpen,
    tip,
    
    // User state
    profileImage,
    setProfileImage,
    currentEmployeeId,
    setCurrentEmployeeId,
  };
}
