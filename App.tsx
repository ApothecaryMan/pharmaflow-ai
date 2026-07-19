import React, { lazy, Suspense, useCallback, useEffect } from 'react';
import { StorageKeys } from './config/storageKeys';
import { storage } from './utils/storage';

// EmployeeDashboard loaded lazily (only for employee portal users)
const EmployeeDashboard = lazy(() =>
  import('./components/employee-portal/EmployeeDashboard').then((m) => ({
    default: m.EmployeeDashboard,
  }))
);
const AuthPage = lazy(() =>
  import('./components/auth/AuthPage').then((m) => ({
    default: m.AuthPage,
  }))
);

import { AppLoadingScreen } from './components/common/AppLoadingScreen';
import { AuthenticatedContent } from './components/layout/AuthenticatedContent';
import { preloadPage } from './hooks/layout/usePreloadPage';

// Preload the first page chunk synchronously at module init
// to overlap chunk fetch with React's initial render.
const hasSession = authService.hasSession();
const persistedView = storage.get<string>(StorageKeys.VIEW, '');
const initialView = persistedView || (hasSession ? 'landing' : '');
if (initialView) preloadPage(initialView);

const OrgSetupScreen = lazy(() =>
  import('./components/onboarding/OrgSetupScreen').then((m) => ({
    default: m.OrgSetupScreen,
  }))
);
const BranchSetupScreen = lazy(() =>
  import('./components/onboarding/BranchSetupScreen').then((m) => ({
    default: m.BranchSetupScreen,
  }))
);
const EmployeeSetupScreen = lazy(() =>
  import('./components/onboarding/EmployeeSetupScreen').then((m) => ({
    default: m.EmployeeSetupScreen,
  }))
);

import { NotificationOverlay } from './components/features/alerts/NotificationOverlay';

import { ROUTES } from './config/routes';
import { useAlert, useSettings } from './context';
import { useAuth } from './hooks/auth/useAuth';
import { useOnboardingStatus } from './hooks/auth/useOnboardingStatus';
import { useClockSkew } from './hooks/common/useClockSkew';
import { usePreventZoom } from './hooks/infrastructure/usePreventZoom';
import { useSessionHeartbeat } from './hooks/infrastructure/useSessionHeartbeat';
// App State Hooks
import { useAppState } from './hooks/layout/useAppState';
import { useTheme } from './hooks/layout/useTheme';
import { useUrlSync } from './hooks/layout/useUrlSync';
import { ROOT_STRINGS } from './i18n/rootStrings';
import { authService } from './services/auth/authService';
import { useAuthStore } from './stores/authStore';
import type { ViewState } from './types';
import { useAutoSystemBarColor } from './utils/systemBars';

// --- ARCHITECTURAL NOTE: THE ORCHESTRATOR PATTERN ---
/**
 * App.tsx now serves as a high-level orchestrator.
 * Logic is decentralized into specialized hooks and components:
 *
 * [App] (Root - Session & Provider Setup)
 *   └── [AuthenticatedContent] (Logic Orchestration)
 *         ├── useAuthenticatedData    (Data enrichment & Roles)
 *         ├── useGlobalEventHandlers  (Global effects & Shortcuts)
 *         ├── useSessionHandlers      (Logout & Audit logging)
 *         └── [MainLayout]            (Global Shell: Navbar, Sidebar, StatusBar)
 *               └── [PageRouter]      (Dynamic View Rendering & RBAC)
 *                     └── [Pages]     (Individual Module Views)
 */

// --- Authenticated Component ---
const _STANDALONE_VIEWS = [ROUTES.LOGIN];

const App: React.FC = () => {
  // 0. Storage Version Validation
  React.useEffect(() => {
    storage.validateVersion();
  }, []);

  // 0.1 Prevent accidental pinch-to-zoom (touchpads)
  usePreventZoom();

  // 1. Initialize App State (View, Toast, etc.)

  const appState = useAppState();

  // 2. Initialize Auth State
  const authState = useAuth({
    view: appState.view,
    setView: appState.setView,
  });

  // 3. Settings Hook (for Language)
  const { theme, darkMode, language, showNotificationOverlay, vividBg } = useSettings();
  const t = ROOT_STRINGS[language];

  // 3.01 Sync System Tray Language
  React.useEffect(() => {
    import('./utils/platform').then(({ isTauri }) => {
      if (isTauri()) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('update_tray_language', { lang: language }).catch(console.warn);
        });
      }
    });
  }, [language]);

  // 3.1 Storage Quota Monitoring & Events
  const alert = useAlert();
  const hasShownWarningRef = React.useRef(false);

  const checkQuota = React.useCallback(() => {
    try {
      const info = storage.getQuotaInfo();
      if (info.isCloseToLimit) {
        if (!hasShownWarningRef.current) {
          const limitMb = (info.limit / (1024 * 1024)).toFixed(0);
          const message = t.settings.storageQuota.warningMessage
            .replace('{{percentage}}', info.percentage.toString())
            .replace('{{limit}}', limitMb);

          alert.warning(message, t.settings.storageQuota.warningTitle);
          hasShownWarningRef.current = true;
        }
      } else {
        hasShownWarningRef.current = false;
      }
    } catch (e) {
      console.error('[Storage] Error checking quota:', e);
    }
  }, [alert, t]);

  React.useEffect(() => {
    checkQuota();

    const handleFocus = () => {
      checkQuota();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkQuota();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleQuotaExceeded = (_e: Event) => {
      alert.error(t.settings.storageQuota.criticalMessage, t.settings.storageQuota.criticalTitle);
    };
    window.addEventListener('pharma_storage_quota_exceeded', handleQuotaExceeded);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pharma_storage_quota_exceeded', handleQuotaExceeded);
    };
  }, [checkQuota, t, alert]);

  // 3.2 Global Unhandled Error Toast
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Global Error Handler] Unhandled Promise Rejection:', event.reason);

      const reason = event.reason;

      // Don't show toast for intentional aborts
      if (reason?.name === 'AbortError') return;

      const title = language === 'AR' ? 'خطأ في النظام' : 'System Error';
      let message =
        language === 'AR'
          ? 'حدث خطأ غير متوقع. جرب مرة أخرى.'
          : 'An unexpected error occurred. Please try again.';

      if (
        reason?.message?.includes('FetchError') ||
        reason?.message?.includes('Network Error') ||
        reason?.message?.includes('Failed to fetch')
      ) {
        message =
          language === 'AR'
            ? 'خطأ في الاتصال بالخادم. تأكد من اتصالك بالإنترنت.'
            : 'Server connection error. Please check your internet connection.';
      } else if (reason?.code === '42501') {
        message =
          language === 'AR'
            ? 'ليس لديك صلاحية لإتمام هذه العملية.'
            : 'You do not have permission to perform this action.';
      } else if (reason instanceof Error && reason.message) {
        message = reason.message;
      }

      alert.error(message, title);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [alert, language]);

  // 4. Onboarding Status Hook (Architectural Abstraction)
  const {
    activeStep,
    setActiveStep,
    isChecking: isCheckingOnboarding,
    error: _onboardingError,
  } = useOnboardingStatus(authState.isAuthenticated);

  // 5. Dynamic Theme Hook - Handles CSS variables & Global Dark Mode
  // System bars are handled separately by the automatic top-surface sampler.
  useTheme(theme.primary, darkMode, !authState.isAuthenticated, theme.hex, vividBg);
  useAutoSystemBarColor(
    [
      authState.isAuthenticated,
      authState.isLoggingOut,
      authState.logoutReason,
      isCheckingOnboarding,
      activeStep,
      appState.view,
      theme.hex,
      darkMode,
      language,
    ].join(':'),
    authState.isAuthenticated ? '--bg-navbar' : '--bg-page-surface'
  );

  // 5.1 Clock skew detection
  const { hasClockSkew } = useClockSkew();

  // 5.2 Global Session Heartbeat — pings last_seen_at every 2 minutes for online detection
  useSessionHeartbeat(authState.isAuthenticated);

  // 6. Stable Login Callbacks
  const { setIsAuthenticated } = authState;
  const { setActiveModule: _setActiveModule, setView } = appState;
  const reinitialize = useAuthStore((s) => s.reinitialize);

  // 6.1 Initialize auth data on mount only if not already hydrated
  const isInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (authState.isAuthenticated && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const existingOrg = useAuthStore.getState().activeOrgId;
      if (!existingOrg) {
        reinitialize();
      }
    }
  }, [authState.isAuthenticated, reinitialize]);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    // Clear stale employee session from previous login — currentEmployeeId is persisted
    // in localStorage via usePersistedState, so it survives logout→login cycles
    // and causes a ghost employee to appear in the StatusBar.
    appState.setCurrentEmployeeId(null);
    reinitialize();
  }, [setIsAuthenticated, reinitialize, appState]);

  // --- URL Synchronization ---
  // Synchronize browser hash with authentication state & current view
  const currentUser = authService.getCurrentUserSync();

  // Global routing is based on account type, not the local employee role.
  // A staff member can be pharmacist_owner/admin inside a pharmacy and still
  // belongs in the Employee Portal after normal auth login.
  const isEmployeePortalUser =
    authState.isAuthenticated &&
    !!currentUser &&
    authService.getAccountDestination(currentUser) === 'employee_portal';

  useUrlSync(
    authState.isAuthenticated,
    appState.view,
    appState.currentEmployeeId,
    currentUser?.userId,
    isEmployeePortalUser
  );

  // 10. Eagerly preload the first page component on mount
  useEffect(() => {
    if (authState.isAuthenticated && appState.view) {
      preloadPage(appState.view);
    }
  }, [authState.isAuthenticated, appState.view]);

  const isOnboardingReady = !isCheckingOnboarding;

  const content = authState.isAuthenticated ? (
    isEmployeePortalUser ? (
      <Suspense fallback={<AppLoadingScreen message={t.global?.loading} />}>
        <EmployeeDashboard
          view={appState.view as 'profile' | 'requests'}
          onViewChange={appState.setView}
          onLogout={authState.handleLogout}
        />
      </Suspense>
    ) : (
      <AuthenticatedContent {...appState} {...authState} />
    )
  ) : (
    <AuthPage onLoginSuccess={handleLoginSuccess} />
  );

  // Handle Onboarding Steps and Loading State
  let finalContent: React.ReactNode;

  if (authState.isAuthenticated && !isOnboardingReady) {
    finalContent = <AppLoadingScreen message={t.global?.loading} />;
  } else {
    // Once onboarding is ready, render the appropriate content
    finalContent = content;

    if (authState.isAuthenticated && isOnboardingReady && !isEmployeePortalUser) {
      if (activeStep === 1) {
        finalContent = <OrgSetupScreen language={language} onComplete={() => setActiveStep(2)} />;
      } else if (activeStep === 2) {
        finalContent = (
          <BranchSetupScreen
            language={language}
            color={theme.primary}
            onBack={() => setActiveStep(1)}
            onComplete={() => setActiveStep(3)}
          />
        );
      } else if (activeStep === 3) {
        finalContent = (
          <EmployeeSetupScreen
            language={language}
            color={theme.primary}
            onBack={() => setActiveStep(2)}
            onComplete={async () => {
              await reinitialize();
              setActiveStep(0);
              setView('landing' as ViewState);
            }}
          />
        );
      }
    }
  }

  const showClockSkewOverlay = hasClockSkew && authState.isAuthenticated && !authState.isLoggingOut;

  return (
    <div className='h-dvh flex flex-col overflow-hidden bg-[var(--bg-page-surface)]'>
      <div className='flex-1 overflow-hidden relative'>
        {showNotificationOverlay !== false && <NotificationOverlay />}
        {finalContent}
      </div>

      {showClockSkewOverlay && (
        <div className='fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm'>
          <div
            className='flex flex-col items-center text-center max-w-md px-6'
            dir={language === 'AR' ? 'rtl' : 'ltr'}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='48'
              height='48'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='text-amber-400 mb-6'
            >
              <title>Clock</title>
              <circle cx='12' cy='12' r='10' />
              <polyline points='12 6 12 12 16 14' />
            </svg>
            <h2 className='text-xl font-bold text-white mb-3 tracking-wide'>
              {language === 'AR' ? 'ساعة الجهاز غير متزامنة' : 'System clock out of sync'}
            </h2>
            <p className='text-zinc-400 text-sm leading-relaxed'>
              {language === 'AR'
                ? 'وقت جهازك غير صحيح. يرجى تحديث التاريخ والوقت والمنطقة الزمنية لجهازك. سيستأنف التطبيق تلقائياً بمجرد تصحيح الساعة.'
                : 'Your device time is incorrect. Please update your system date, time, and timezone. The app will automatically continue once your clock is correct.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
