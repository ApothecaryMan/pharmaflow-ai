import { useState, useEffect, useCallback } from 'react';
import { ViewState } from '../types';
import { authService } from '../services/auth/authService';
import { ROUTES, TEST_ROUTES } from '../config/routes';
import { ToastState } from './useAppState';

export interface AuthState {
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  handleLogout: () => Promise<void>;
  resolveView: (targetView: ViewState) => ViewState;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UseAuthParams {
  view: ViewState;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
  setToast: React.Dispatch<React.SetStateAction<ToastState | null>>;
}

/**
 * Hook for managing authentication state and route guards.
 * Handles login/logout state, auth checking, and view resolution.
 */
export function useAuth({ view, setView, setToast }: UseAuthParams): AuthState {
  // Optimistic Init: Check session synchronously to prevent "flash of loading"
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.hasSession());
  const [isAuthChecking, setIsAuthChecking] = useState(false);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      // Set view directly to skip route guard checks for this specific action
      setView(ROUTES.LOGIN);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Logout failed:', e);
      }
    }
  }, [setView]);

  // Centralized Guard Function
  const resolveView = useCallback((targetView: ViewState): ViewState => {
    // A. Production Guard
    if (import.meta.env.PROD && TEST_ROUTES.includes(targetView)) {
      if (targetView !== ROUTES.LOGIN) return ROUTES.DASHBOARD;
    }

    // B. Auth Guard
    if (!isAuthenticated && targetView !== ROUTES.LOGIN) {
      return ROUTES.LOGIN;
    }

    // C. Already Logged In Guard (Prevent seeing login page)
    if (isAuthenticated && targetView === ROUTES.LOGIN) {
      return ROUTES.DASHBOARD;
    }

    return targetView;
  }, [isAuthenticated]);

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        const isUserAuth = !!user;
        setIsAuthenticated(isUserAuth);
        
        if (!isUserAuth) {
          if (view !== ROUTES.LOGIN) {
            setView(ROUTES.LOGIN);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Auth check failed:', error);
        }
        setIsAuthenticated(false);
        setView(ROUTES.LOGIN);
      } finally {
        setIsAuthChecking(false);
      }
    };
    
    checkAuth();
  }, []); // Only on mount

  // Watch for view changes and redirect if needed
  useEffect(() => {
    if (isAuthChecking) return;
    
    const correctView = resolveView(view);
    if (correctView !== view) {
      if (import.meta.env.DEV) {
        console.warn(`[Auth] Redirecting from ${view} to ${correctView}`);
      }
      if (import.meta.env.PROD && TEST_ROUTES.includes(view)) {
        setToast({ 
          message: 'Access Denied: Developer routes are disabled.', 
          type: 'error' 
        });
      }
      setView(correctView);
    }
  }, [view, isAuthChecking, resolveView, setView, setToast]);

  return {
    isAuthenticated,
    isAuthChecking,
    handleLogout,
    resolveView,
    setIsAuthenticated,
  };
}

/**
 * Helper to set authenticated state from outside (e.g., login success)
 * This is returned as part of the hook for components that need to update auth state
 */
export interface AuthActions {
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}
