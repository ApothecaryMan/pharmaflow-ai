import React, { useCallback, useEffect, useState } from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { StorageKeys } from '../../config/storageKeys';
import { useSettings } from '../../context';
import type { AuthState } from '../../hooks/auth/useAuth';
import { useSessionHandlers } from '../../hooks/auth/useSessionHandlers';
import { KeyboardProvider } from '../../hooks/keyboard';
import type { AppState } from '../../hooks/layout/useAppState';
import { useNavigation } from '../../hooks/layout/useNavigation';
import { useRealtimeChannel } from '../../hooks/infrastructure/useRealtimeChannel';
import { useRealtimeDispatcher } from '../../services/realtime/useRealtimeDispatcher';
import { TRANSLATIONS } from '../../i18n/translations';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { ViewState } from '../../types';
import { storage } from '../../utils/storage';
import { Modal } from '../common/Modal';
import { SecureGate } from '../common/SecureGate';
import { WidgetUpdateEmitter } from '../dashboard/WidgetUpdateEmitter';
import { LogoutOverlay } from './LogoutOverlay';
import { MainLayout } from './MainLayout';
import { PageRouter } from './PageRouter';

export interface AuthenticatedContentProps extends AppState, AuthState {}

export const AuthenticatedContent: React.FC<AuthenticatedContentProps> = ({
  // App State
  view,
  setView,
  activeModule,
  setActiveModule,
  dashboardSubView,
  setDashboardSubView,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentEmployeeId,
  setCurrentEmployeeId,
  navigationParams,
  setNavigationParams,
  windowedView,
  setWindowedView,

  // Auth State
  isAuthenticated: _isAuthenticated,
  isAuthChecking: _isAuthChecking,
  isLoggingOut,
  logoutReason,
  terminatorName,
  isRecoveringPassword,
  handleLogout,
  resolveView,
  setIsAuthenticated: _setIsAuthenticated,
  user: _user,
}) => {
  // --- Global Secure Gate State ---
  const [pendingNavigation, setPendingNavigation] = useState<{
    viewId: string;
    params?: any;
  } | null>(null);

  // --- Session ID from storage ---
  const getSessionId = () => storage.get<string | null>(StorageKeys.ACTIVE_SESSION_ID, null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(getSessionId);

  // Sync session ID on cross-tab storage changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storage.getScopedKey(StorageKeys.ACTIVE_SESSION_ID)) {
        setCurrentSessionId(getSessionId());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // --- Settings from Context ---
  const {
    theme: _theme,
    setTheme: _setTheme,
    darkMode,
    setDarkMode: _setDarkMode,
    language,
    textTransform: _textTransform,
    sidebarVisible: _sidebarVisible,
    setSidebarVisible: _setSidebarVisible,
    hideInactiveModules,
    setHideInactiveModules: _setHideInactiveModules,
    developerMode,
    setDeveloperMode: _setDeveloperMode,
    navStyle: _navStyle,
    setNavStyle: _setNavStyle,
  } = useSettings();

  // --- Auth State ---
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const branches = useAuthStore((s) => s.branches);
  const isLoading = useAuthStore((s) => s.isLoading);
  const switchBranch = useAuthStore((s) => s.switchBranch);

  // --- Domain Data from React Query ---
  // Components fetch their own data internally.

  // --- Central realtime dispatcher — single org-scoped Supabase channel ---
  // Handles all registered tables (inventory, batches, sales, returns, purchases,
  // shifts, cash_transactions, expenses) via per-table patchers that surgically
  // update React Query caches. Also handles online recovery.
  useRealtimeDispatcher({ activeBranchId, activeOrgId });

  // --- Navigation Hook ---
  const { handleViewChange, handleNavigate, handleModuleChange, filteredMenuItems } = useNavigation(
    {
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
      setNavigationParams: (params: any) => setNavigationParams(params),
      onProtectedNavigation: (viewId: string, params?: any) =>
        setPendingNavigation({ viewId, params }),
      currentEmployeeId,
      activeBranchId,
      activeOrgId,
    }
  );

  // --- Translations ---
  const t = TRANSLATIONS[language];

  // --- Session Handlers Hook ---
  const { onLogoutClick, handleSelectEmployee } = useSessionHandlers({
    currentEmployeeId,
    setCurrentEmployeeId,
    setView,
    setActiveModule,
    setNavigationParams,
    handleLogout,
    switchBranch,
    branches,
  });

  // --- Session Channel (POS lock: broadcast + postgres_changes + reconnect DB check) ---
  const channelName = isSupabaseConfigured && currentSessionId ? `session-${currentSessionId}` : null;

  useRealtimeChannel(channelName, (ch) => {
    if (!currentSessionId) return;

    ch
      .on('broadcast', { event: 'remote-employee-logout' }, (payload) => {
        if (payload.payload?.sessionId === currentSessionId) {
          console.log('[AuthenticatedContent] Locking POS due to remote employee logout');
          setCurrentEmployeeId(null);
        }
      })
      .on('broadcast', { event: 'remote-logout-named' }, (payload) => {
        if (payload.payload?.sessionId === currentSessionId) {
          console.warn('[AuthenticatedContent] Session terminated remotely by:', payload.payload.terminatorName);
          handleLogout('remote');
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_active_sessions',
        filter: `id=eq.${currentSessionId}`,
      }, (payload) => {
        if (payload.new.employee_id === null) {
          console.log('[AuthenticatedContent] Locking POS — employee removed from session');
          setCurrentEmployeeId(null);
        }
        if (payload.new.is_active === false) {
          console.warn('[AuthenticatedContent] Session terminated remotely via DB update.');
          handleLogout('remote');
        }
      });
  }, {
    onReconnected: async () => {
      if (!currentSessionId) return;

      const { data } = await supabase
        .from('user_active_sessions')
        .select('employee_id, is_active')
        .eq('id', currentSessionId)
        .single();

      if (!data || data.employee_id === null) {
        console.log('[AuthenticatedContent] Locking POS — session ended while offline');
        setCurrentEmployeeId(null);
        return;
      }
      if (data.is_active === false) {
        console.warn('[AuthenticatedContent] Session terminated (detected on reconnect).');
        handleLogout('remote');
      }
    },
  });

  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
  }, [language]);

  // --- Global Navigation Event Listener ---
  React.useEffect(() => {
    const handleGlobalNavigate = (e: any) => {
      const { detail } = e;
      if (detail) {
        handleViewChange(detail);
      }
    };
    window.addEventListener('navigate-to-view', handleGlobalNavigate);
    return () => window.removeEventListener('navigate-to-view', handleGlobalNavigate);
  }, [handleViewChange]);

  // --- Login Success Handler ---
  const handleLoginSuccess = useCallback(() => {
    _setIsAuthenticated(true);
    setView('landing' as ViewState);
    setActiveModule('');
  }, [_setIsAuthenticated, setActiveModule, setView]);

  // --- TRANSITION SKELETON STATE ---
  if (isLoggingOut) {
    return (
      <LogoutOverlay
        language={language}
        darkMode={darkMode}
        logoutReason={logoutReason}
        terminatorName={terminatorName}
      />
    );
  }

  return (
    <KeyboardProvider onNavigate={handleViewChange} currentScope={view}>
      <MainLayout
        view={view}
        activeModule={activeModule}
        t={t}
        onLogout={onLogoutClick}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        filteredMenuItems={filteredMenuItems}
        handleModuleChange={handleModuleChange}
        handleNavigate={handleNavigate}
        handleViewChange={handleViewChange}
        currentEmployeeId={currentEmployeeId}
        setCurrentEmployeeId={handleSelectEmployee}
        dashboardSubView={dashboardSubView}
        onOpenInWindow={setWindowedView}
        isRecoveringPassword={isRecoveringPassword}
      >
        <PageRouter
          view={view}
          currentEmployeeId={currentEmployeeId}
          isLoading={isLoading}
          t={t}
          setView={setView}
          handleNavigate={handleNavigate}
          handleLoginSuccess={handleLoginSuccess}
          navigationParams={navigationParams}
          onSelectEmployee={handleSelectEmployee}
          onLogout={onLogoutClick}
        />

        <WidgetUpdateEmitter />

        {/* Windowed Mode Modal */}
        <Modal
          isOpen={!!windowedView}
          onClose={() => setWindowedView(null)}
          size='full'
          disabled={isLoading}
          title={
            windowedView
              ? (t.nav as any)[windowedView.replace(/-/, '_')] ||
                t.nav[windowedView as keyof typeof t.nav] ||
                windowedView
              : ''
          }
          icon={windowedView ? PAGE_REGISTRY[windowedView]?.icon : 'window'}
          className='bg-[#f3f4f6]! dark:bg-black!'
        >
          <div className='h-[80vh]'>
            {windowedView && (
              <PageRouter
                view={windowedView}
                currentEmployeeId={currentEmployeeId}
                isLoading={false}
                t={t}
                setView={(v) => {
                  setWindowedView(null);
                  setView(v);
                }}
                handleNavigate={(v) => {
                  setWindowedView(null);
                  handleNavigate(v);
                }}
                handleLoginSuccess={handleLoginSuccess}
                navigationParams={null}
                onSelectEmployee={handleSelectEmployee}
                onLogout={onLogoutClick}
              />
            )}
          </div>
        </Modal>

        {/* Global Secure Gate */}
        <SecureGate
          standalone={true}
          isOpen={!!pendingNavigation}
          language={language}
          storageKey={
            pendingNavigation
              ? PAGE_REGISTRY[pendingNavigation.viewId]?.storageKey
              : 'area_unlocked'
          }
          onUnlock={() => {
            if (pendingNavigation) {
              handleViewChange(pendingNavigation.viewId, pendingNavigation.params);
              setPendingNavigation(null);
            }
          }}
          onClose={() => setPendingNavigation(null)}
        />
      </MainLayout>
    </KeyboardProvider>
  );
};
