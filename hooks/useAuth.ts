import { useCallback, useEffect, useState } from 'react';
import { ROUTES, TEST_ROUTES } from '../config/routes';
import { useAlert } from '../context';
import { authService, type UserSession } from '../services/auth/authService';
import type { ViewState } from '../types';

export interface AuthState {
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  user: UserSession | null;
  handleLogout: () => Promise<void>;
  resolveView: (targetView: ViewState) => ViewState;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UseAuthParams {
  view: ViewState;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
}

/**
 * Hook for managing authentication state and route guards.
 * Handles login/logout state, auth checking, and view resolution.
 */
export function useAuth({ view, setView }: UseAuthParams): AuthState {
  // Use Alert Hook
  const { error } = useAlert();

  // Optimistic Init: Check session synchronously to prevent "flash of loading"
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.hasSession());
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem('branch_pilot_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      // Set view directly to skip route guard checks for this specific action
      setView(ROUTES.LOGIN);
    } catch (e) {
      // Even if API fails, client should logout
      setIsAuthenticated(false);
      setView(ROUTES.LOGIN);
    }
  }, [setView]);

  // Centralized Guard Function
  const resolveView = useCallback(
    (targetView: ViewState): ViewState => {
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
    },
    [isAuthenticated]
  );

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        const isUserAuth = !!user;
        setUser(user);
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
        if (import.meta.env.PROD && TEST_ROUTES.includes(view)) {
          error('Access Denied: Developer routes are disabled.');
        }
      }
      setView(correctView);
    }
  }, [view, isAuthChecking, resolveView, setView, error]);

  return {
    isAuthenticated,
    isAuthChecking,
    user,
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
