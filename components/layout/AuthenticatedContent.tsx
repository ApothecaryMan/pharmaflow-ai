import React, { useCallback, useEffect, useState } from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { StorageKeys } from '../../config/storageKeys';
import { useAlert, useSettings } from '../../context';
import type { AuthState } from '../../hooks/auth/useAuth';
import { useSessionHandlers } from '../../hooks/auth/useSessionHandlers';

import type { AppState } from '../../hooks/layout/useAppState';
import { useNavigation } from '../../hooks/layout/useNavigation';
import { useInventory } from '../../hooks/queries/useInventoryQuery';
import { useEmployees } from '../../hooks/queries/useEmployeesQuery';
import { useRecentSales } from '../../hooks/queries/useSalesQuery';
import { useRealtimeSync } from '../../hooks/realtime/useRealtimeSync';
import { KeyboardProvider } from '../../hooks/keyboard';
import { TRANSLATIONS } from '../../i18n/translations';
import { supabase } from '../../lib/supabase';
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
  isAuthenticated,
  isAuthChecking,
  isLoggingOut,
  logoutReason,
  terminatorName,
  isRecoveringPassword,
  handleLogout,
  resolveView,
  setIsAuthenticated,
  user,
}) => {
  // --- Global Secure Gate State ---
  const [pendingNavigation, setPendingNavigation] = useState<{
    viewId: string;
    params?: any;
  } | null>(null);

  // --- Settings from Context ---
  const {
    theme,
    setTheme,
    darkMode,
    setDarkMode,
    language,
    textTransform,
    sidebarVisible,
    setSidebarVisible,
    hideInactiveModules,
    setHideInactiveModules,
    developerMode,
    setDeveloperMode,
    navStyle,
    setNavStyle,
  } = useSettings();

  // --- Auth State ---
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const branches = useAuthStore((s) => s.branches);
  const isLoading = useAuthStore((s) => s.isLoading);
  const switchBranch = useAuthStore((s) => s.switchBranch);

  // --- Domain Data from React Query ---
  const { data: inventory = [] } = useInventory(activeBranchId);
  const { data: sales = [] } = useRecentSales(activeBranchId);
  const { data: employees = [] } = useEmployees(activeBranchId);

  // --- Realtime Sync ---
  useRealtimeSync({ activeBranchId });

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
    employees,
    currentEmployeeId,
    setCurrentEmployeeId,
    setView,
    setActiveModule,
    setNavigationParams,
    handleLogout,
    switchBranch,
    branches,
  });

  useEffect(() => {
    // We listen directly to the session broadcast to lock the POS instantly
    const currentSessionId = storage.get<string | null>(StorageKeys.ACTIVE_SESSION_ID, null);
    if (!currentSessionId) return;

    const channelName = `session-${currentSessionId}`;

    // Clean up any existing channel with same name to avoid strict-mode duplication
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'remote-employee-logout' }, (payload) => {
        if (payload.payload?.sessionId === currentSessionId) {
          console.log('[AuthenticatedContent] Locking POS due to remote employee logout');
          setCurrentEmployeeId(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setCurrentEmployeeId]);

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
    setIsAuthenticated(true);
    setView('landing' as ViewState);
    setActiveModule('');
  }, [setIsAuthenticated, setActiveModule, setView]);

  // --- TRANSITION SKELETON STATE ---
  if (isLoggingOut) {
    return (
      <LogoutOverlay
        language={language}
        darkMode={darkMode}
        currentEmployeeId={currentEmployeeId}
        activeBranchId={activeBranchId}
        employees={employees}
        inventory={inventory}
        sales={sales}
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
        employees={employees}
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
            pendingNavigation ? PAGE_REGISTRY[pendingNavigation.viewId]?.storageKey : 'area_unlocked'
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
