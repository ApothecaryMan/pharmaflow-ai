import React, { lazy, Suspense, useCallback } from 'react';
import { StorageKeys } from './config/storageKeys';
import { branchService } from './services/org/branchService';
import { storage } from './utils/storage';

// EmployeeDashboard loaded lazily
const EmployeeDashboard = lazy(() =>
  import('./components/employee-portal/EmployeeDashboard').then((m) => ({
    default: m.EmployeeDashboard,
  }))
);
const AuthenticatedContent = lazy(() =>
  import('./components/layout/AuthenticatedContent').then((m) => ({
    default: m.AuthenticatedContent,
  }))
);
const AuthPage = lazy(() =>
  import('./components/auth/AuthPage').then((m) => ({
    default: m.AuthPage,
  }))
);
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
import { CatalogProvider, LANGUAGES, THEMES, useAlert, useSettings } from './context';
import { DataProvider, useData } from './context/DataContext';
import { type AuthState, useAuth } from './hooks/auth/useAuth';
import { useOnboardingStatus } from './hooks/auth/useOnboardingStatus';
import { usePreventZoom } from './hooks/infrastructure/usePreventZoom';
// App State Hooks
import { type AppState, useAppState } from './hooks/layout/useAppState';
import { useTheme } from './hooks/layout/useTheme';
import { useUrlSync } from './hooks/layout/useUrlSync';
import { useSessionHeartbeat } from './hooks/infrastructure/useSessionHeartbeat';
import { ROOT_STRINGS } from './i18n/rootStrings';
import { authService } from './services/auth/authService';
import type { Supplier, ViewState } from './types';
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
const STANDALONE_VIEWS = [ROUTES.LOGIN];

// AuthenticatedContent was moved to src/components/layout/AuthenticatedContent.tsx

const LogoAsterisk = ({
  color = 'currentColor',
  scale = 1.4,
}: {
  color?: string;
  scale?: number;
}) => (
  <svg
    viewBox='0 0 140 140'
    className='w-12 h-12 text-zinc-900 dark:text-white animate-spin'
    style={{ animationDuration: '2s' }}
  >
    <g transform={`translate(70 70) scale(${scale})`} fill={color}>
      <rect x='-4' y='-35' width='8' height='70' rx='.5' transform='rotate(45)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(-45)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(90)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(135)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(180)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(270)' />
    </g>
  </svg>
);
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
  const { theme, darkMode, language } = useSettings();
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

    const handleQuotaExceeded = (e: Event) => {
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
      let message = language === 'AR' ? 'حدث خطأ غير متوقع. جرب مرة أخرى.' : 'An unexpected error occurred. Please try again.';

      if (reason?.message?.includes('FetchError') || reason?.message?.includes('Network Error') || reason?.message?.includes('Failed to fetch')) {
        message = language === 'AR' 
          ? 'خطأ في الاتصال بالخادم. تأكد من اتصالك بالإنترنت.' 
          : 'Server connection error. Please check your internet connection.';
      } else if (reason?.code === '42501') {
        message = language === 'AR' ? 'ليس لديك صلاحية لإتمام هذه العملية.' : 'You do not have permission to perform this action.';
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
    error: onboardingError,
  } = useOnboardingStatus(authState.isAuthenticated);

  // 5. Dynamic Theme Hook - Handles CSS variables & Global Dark Mode
  // System bars are handled separately by the automatic top-surface sampler.
  useTheme(theme.primary, darkMode, !authState.isAuthenticated, theme.hex);
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

  // 5.1 Global Session Heartbeat — pings last_seen_at every 2 minutes for online detection
  useSessionHeartbeat(authState.isAuthenticated);

  // 6. Stable Login Callbacks
  const { setIsAuthenticated } = authState;
  const { setActiveModule, setView } = appState;
  const { reinitialize } = useData();

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

  // 10. Authenticated & Setup Done -> Show Secure Content wrapped in Providers
  const isOnboardingReady = !isCheckingOnboarding;

  // (Moved isEmployeePortalUser logic above to useUrlSync)

  const content = authState.isAuthenticated ? (
    <Suspense
      fallback={
        <div className='h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-black'>
          <div className='flex flex-col items-center gap-4'>
            <LogoAsterisk />
          <p 
            className='py-2 text-2xl sm:text-3xl !font-["GraphicSansFont"] tracking-tight leading-normal text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-400 to-zinc-900 dark:from-zinc-100 dark:via-zinc-500 dark:to-zinc-100 animate-wave-text text-center'
            style={{ fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1' }}
          >
            {t.global?.loading}
          </p>
          </div>
        </div>
      }
    >
      {isEmployeePortalUser ? (
        <EmployeeDashboard
          view={appState.view as 'profile' | 'requests'}
          onViewChange={appState.setView}
          onLogout={authState.handleLogout}
        />
      ) : (
        <AuthenticatedContent {...appState} {...authState} />
      )}
    </Suspense>
  ) : (
    <AuthPage onLoginSuccess={handleLoginSuccess} />
  );

  // Handle Onboarding Steps and Loading State
  let finalContent;

  if (authState.isAuthenticated && !isOnboardingReady) {
    // Show a clean loading state while checking database for onboarding status
    finalContent = (
      <div className='h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-black'>
        <div className='flex flex-col items-center gap-4'>
          <LogoAsterisk />
          <p 
            className='py-2 text-2xl sm:text-3xl !font-["GraphicSansFont"] tracking-tight leading-normal text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-400 to-zinc-900 dark:from-zinc-100 dark:via-zinc-500 dark:to-zinc-100 animate-wave-text text-center'
            style={{ fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1' }}
          >
            {t.global?.loading}
          </p>
        </div>
      </div>
    );
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

  return (
    <div className='h-screen flex flex-col overflow-hidden bg-[var(--bg-page-surface)]'>
      <div className='flex-1 overflow-hidden relative'>
        <NotificationOverlay />
        {authState.isAuthenticated ? (
          <CatalogProvider>{finalContent}</CatalogProvider>
        ) : (
          finalContent
        )}
      </div>
    </div>
  );
};

export default App;
