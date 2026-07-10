import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ROUTES } from '../../config/routes';
import { StorageKeys } from '../../config/storageKeys';
import { useAlert } from '../../context';
import { authService } from '../../services/auth/authService';
import type { UserSession, ViewState } from '../../types';
import { storage } from '../../utils/storage';

export interface AuthState {
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  isLoggingOut: boolean;
  logoutReason: 'normal' | 'remote';
  terminatorName: string | null;
  isRecoveringPassword: boolean;
  user: UserSession | null;
  handleLogout: (reason?: 'normal' | 'remote') => Promise<void>;
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
    return storage.get<UserSession | null>(StorageKeys.SESSION, null);
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(() => {
    return (
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    );
  });

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutReason, setLogoutReason] = useState<'normal' | 'remote'>('normal');
  const [terminatorName, setTerminatorName] = useState<string | null>(null);

  // Logout handler
  const handleLogout = useCallback(
    async (reason: 'normal' | 'remote' = 'normal') => {
      try {
        setLogoutReason(reason);
        setIsLoggingOut(true);
        const startTime = Date.now();

        await authService.logout();

        const elapsed = Date.now() - startTime;
        if (elapsed < 2000) {
          await new Promise((r) => setTimeout(r, 2000 - elapsed));
        }

        setIsAuthenticated(false);
        // Set view directly to skip route guard checks for this specific action
        setView(ROUTES.LOGIN);
      } catch (e) {
        // Even if API fails, client should logout
        setIsAuthenticated(false);
        setView(ROUTES.LOGIN);
      } finally {
        setIsLoggingOut(false);
      }
    },
    [setView]
  );

  // Centralized Guard Function
  const resolveView = useCallback(
    (targetView: ViewState): ViewState => {
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

    // Storage Event Listener for cross-tab session synchronization (e.g. logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === StorageKeys.SESSION) {
        if (!e.newValue) {
          // Deletion (logout)
          setIsAuthenticated(false);
          setUser(null);
          setView(ROUTES.LOGIN);
        } else {
          // Changed session (login or switch profile)
          try {
            const newSession = JSON.parse(e.newValue);
            setUser(newSession);
            setIsAuthenticated(true);
          } catch {
            setIsAuthenticated(false);
            setUser(null);
            setView(ROUTES.LOGIN);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Supabase Auth Listener for external logouts (e.g., from another tab)
    const isSupabaseConfigured =
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url';
    let authListener: { unsubscribe: () => void } | null = null;

    if (isSupabaseConfigured) {
      import('../../lib/supabase').then(({ supabase }) => {
        const { data } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsRecoveringPassword(true);
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setUser(null);
            setView(ROUTES.LOGIN);
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            checkAuth();
          }
        });

        // Remote Logout Listener
        let broadcastChannel: ReturnType<typeof supabase.channel> | null = null;
        let pollingInterval: ReturnType<typeof setInterval> | null = null;

        const setupRemoteLogoutDetection = () => {
          const sid = storage.get<string | null>(StorageKeys.ACTIVE_SESSION_ID, null);
          if (!sid) return;

          // --- Broadcast subscription (primary) ---
          const bchannelName = `session-${sid}`;
          const existingBc = supabase
            .getChannels()
            .find((c) => c.topic === `realtime:${bchannelName}`);
          if (existingBc) supabase.removeChannel(existingBc);

          broadcastChannel = supabase
            .channel(bchannelName)
            .on('broadcast', { event: 'remote-logout-named' }, (payload) => {
              if (payload.payload?.sessionId === sid) {
                console.warn('Session terminated remotely by:', payload.payload.terminatorName);
                setTerminatorName(payload.payload.terminatorName || null);
                handleLogout('remote');
              }
            })
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'user_active_sessions',
                filter: `id=eq.${sid}`,
              },
              (payload) => {
                if (payload.new.is_active === false) {
                  console.warn('Session terminated remotely via DB update.');
                  handleLogout('remote');
                }
              }
            )
            .subscribe();

          // --- Fallback polling every 15s ---
          pollingInterval = setInterval(async () => {
            try {
              const currentSid = storage.get<string | null>(StorageKeys.ACTIVE_SESSION_ID, null);
              if (!currentSid) return;
              const { data } = await supabase
                .from('user_active_sessions')
                .select('is_active')
                .eq('id', currentSid)
                .single();
              if (data && data.is_active === false) {
                console.warn('Session terminated (detected via polling).');
                handleLogout('remote');
              }
            } catch {
              // ignore polling errors
            }
          }, 15000);
        };

        setupRemoteLogoutDetection();

        // Re-setup if ACTIVE_SESSION_ID changes (another tab logged in)
        const storageSync = (e: StorageEvent) => {
          if (e.key === storage.getScopedKey(StorageKeys.ACTIVE_SESSION_ID)) {
            if (broadcastChannel) supabase.removeChannel(broadcastChannel);
            if (pollingInterval) clearInterval(pollingInterval);
            setupRemoteLogoutDetection();
          }
        };
        window.addEventListener('storage', storageSync);

        authListener = {
          unsubscribe: () => {
            data.subscription.unsubscribe();
            if (broadcastChannel) supabase.removeChannel(broadcastChannel);
            if (pollingInterval) clearInterval(pollingInterval);
            window.removeEventListener('storage', storageSync);
          },
        };
      });
    }

    return () => {
      if (authListener) authListener.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setView]); // Removed 'view' to prevent re-running on every navigation

  // Watch for view changes and redirect if needed
  useEffect(() => {
    // CRITICAL: Don't redirect while checking auth or if we just found a session
    if (isAuthChecking) return;

    const correctView = resolveView(view);
    if (correctView !== view) {
      // Small safety: If we think we should redirect to LOGIN, check hasSession one last time
      if (correctView === ROUTES.LOGIN && authService.hasSession()) {
        return;
      }

      setView(correctView);
    }
  }, [view, isAuthChecking, resolveView, setView, error, isAuthenticated]);

  return {
    isAuthenticated,
    isAuthChecking,
    isLoggingOut,
    logoutReason,
    terminatorName,
    isRecoveringPassword,
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
