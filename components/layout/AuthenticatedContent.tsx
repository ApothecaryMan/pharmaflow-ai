import React, { useCallback, useState, useEffect } from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { StorageKeys } from '../../config/storageKeys';
import { useAlert, useSettings } from '../../context';
import { useData } from '../../context/DataContext';
import type { AuthState } from '../../hooks/auth/useAuth';
import { useAuthenticatedData } from '../../hooks/auth/useAuthenticatedData';
import { useSessionHandlers } from '../../hooks/auth/useSessionHandlers';
import { useGlobalEventHandlers } from '../../hooks/infrastructure/useGlobalEventHandlers';
import type { AppState } from '../../hooks/layout/useAppState';
import { useNavigation } from '../../hooks/layout/useNavigation';
import { useShift } from '../../hooks/sales/useShift';
import { useEntityHandlers } from '../../hooks/useEntityHandlers';
import { TRANSLATIONS } from '../../i18n/translations';
import { supabase } from '../../lib/supabase';
import type { ViewState } from '../../types';
import { storage } from '../../utils/storage';
import { Modal } from '../common/Modal';
import { SecureGate } from '../common/SecureGate';
import { LogoutOverlay } from './LogoutOverlay';
import { MainLayout } from './MainLayout';
import { PageRouter } from './PageRouter';
import { useStatusBar } from './StatusBar';
import { WidgetUpdateEmitter } from '../dashboard/WidgetUpdateEmitter';

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
  // --- Shifts ---
  const { currentShift } = useShift();

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

  // --- Data from Context ---
  const {
    inventory,
    setInventory,
    sales,
    setSales,
    suppliers,
    setSuppliers,
    purchases,
    setPurchases,
    purchaseReturns,
    setPurchaseReturns,
    returns,
    setReturns,
    customers,
    setCustomers,
    employees,
    setEmployees,
    batches,
    setBatches,
    branches,
    isLoading,
    activeBranchId,
    activeOrgId,
    addPurchase,
    approvePurchase,
    completeSale,
    processSalesReturn,
    createPurchaseReturn,
    switchBranch,
  } = useData();

  // --- StatusBar Utilities ---
  const { getVerifiedDate, validateTransactionTime, updateLastTransactionTime } = useStatusBar();

  // --- Authenticated Data (Role & Enrichment) ---
  const { userRole, enrichedCustomers } = useAuthenticatedData({
    employees,
    currentEmployeeId,
    customers,
    sales,
  });

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

  // --- Entity Handlers Hook ---
  const {
    handleAddDrug,
    handleUpdateDrug,
    handleDeleteDrug,
    handleRestock,
    handleAddSupplier,
    handleUpdateSupplier,
    handleDeleteSupplier,
    handleAddCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handlePurchaseComplete,
    handleApprovePurchase,
    handleMarkAsReceived,
    handleRejectPurchase,
    handleCreatePurchaseReturn,
    handleCompleteSale,
    handleUpdateSale,
    handleProcessReturn,
    handleAddEmployee,
    handleUpdateEmployee,
    handleDeleteEmployee,
  } = useEntityHandlers({
    inventory,
    setInventory,
    sales,
    setSales,
    suppliers,
    setSuppliers,
    purchases,
    setPurchases,
    returns,
    setReturns,
    customers,
    setCustomers,
    purchaseReturns,
    setPurchaseReturns,
    currentEmployeeId,
    activeBranchId,
    activeOrgId,
    employees,
    setEmployees,
    isLoading,
    batches,
    setBatches,
    approvePurchase,
    addPurchase,
    completeSale,
    processSalesReturn,
    createPurchaseReturn,
    getVerifiedDate,
    validateTransactionTime,
    updateLastTransactionTime,
  });

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
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
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

  // --- Global Event Handlers ---
  useGlobalEventHandlers({
    language,
    inventory,
    isLoading,
    onToggleSidebar: () => setSidebarVisible(!sidebarVisible),
    onNavigate: (targetView) => handleViewChange(targetView),
  });

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

  // --- Memoized Props for PageRouter ---
  const handlers = React.useMemo(
    () => ({
      setInventory,
      setPurchases,
      setPurchaseReturns,
      handleAddDrug,
      handleUpdateDrug,
      handleDeleteDrug,
      handleCompleteSale,
      handleUpdateSale,
      handleProcessReturn,
      handleAddCustomer,
      handleUpdateCustomer,
      handleDeleteCustomer,
      setSuppliers,
      handleAddSupplier,
      handleUpdateSupplier,
      handleDeleteSupplier,
      handlePurchaseComplete,
      handleApprovePurchase,
      handleMarkAsReceived,
      handleRejectPurchase,
      handleRestock,
      handleAddEmployee,
      handleUpdateEmployee,
      handleDeleteEmployee,
      handleCreatePurchaseReturn,
      getVerifiedDate,
      setBatches,
    }),
    [
      setInventory,
      setPurchases,
      setPurchaseReturns,
      handleAddDrug,
      handleUpdateDrug,
      handleDeleteDrug,
      handleCompleteSale,
      handleUpdateSale,
      handleProcessReturn,
      handleAddCustomer,
      handleUpdateCustomer,
      handleDeleteCustomer,
      setSuppliers,
      handleAddSupplier,
      handleUpdateSupplier,
      handleDeleteSupplier,
      handlePurchaseComplete,
      handleApprovePurchase,
      handleMarkAsReceived,
      handleRejectPurchase,
      handleRestock,
      handleAddEmployee,
      handleUpdateEmployee,
      handleDeleteEmployee,
      handleCreatePurchaseReturn,
      getVerifiedDate,
      setBatches,
    ]
  );

  const data = React.useMemo(
    () => ({
      sales,
      inventory,
      enrichedCustomers,
      suppliers,
      purchases,
      purchaseReturns,
      returns,
      employees,
      batches,
      activeBranchId,
      activeOrgId,
    }),
    [
      sales,
      inventory,
      enrichedCustomers,
      suppliers,
      purchases,
      purchaseReturns,
      returns,
      employees,
      batches,
      activeBranchId,
      activeOrgId,
    ]
  );

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
        currentShift={currentShift}
        handlers={handlers}
        data={data}
        onSelectEmployee={handleSelectEmployee}
        onLogout={onLogoutClick}
      />

      <WidgetUpdateEmitter />

      {/* Windowed Mode Modal */}
      <Modal
        isOpen={!!windowedView}
        onClose={() => setWindowedView(null)}
        size='full'
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
              isLoading={false} // No skeleton for windowed
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
              currentShift={currentShift}
              handlers={handlers}
              data={data}
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
  );
};
