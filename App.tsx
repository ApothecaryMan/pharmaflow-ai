import React, { useCallback, useState } from 'react';
import { storage } from './utils/storage';
import { StorageKeys } from './config/storageKeys';
import { branchService } from './services/org/branchService';
import { AuthPage } from './components/auth/AuthPage';
import { Modal } from './components/common/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from './components/layout/MainLayout';
import { LogoutOverlay } from './components/layout/LogoutOverlay';
import { PageRouter } from './components/layout/PageRouter';
import { useStatusBar } from './components/layout/StatusBar';
import { OrgSetupScreen } from './components/onboarding/OrgSetupScreen';
import { BranchSetupScreen } from './components/onboarding/BranchSetupScreen';
import { EmployeeSetupScreen } from './components/onboarding/EmployeeSetupScreen';
import { EmployeeDashboard } from './components/employee-portal/EmployeeDashboard';
import { PAGE_REGISTRY } from './config/pageRegistry';
import { UserRole } from './config/permissions';
import { SecureGate } from './components/common/SecureGate';
import { ROUTES } from './config/routes';
import { LANGUAGES, THEMES, useSettings, useAlert } from './context';
// App State Hooks
import { type AppState, useAppState } from './hooks/layout/useAppState';
import { type AuthState, useAuth } from './hooks/auth/useAuth';
import { useAuthenticatedData } from './hooks/auth/useAuthenticatedData';
import { useOnboardingStatus } from './hooks/auth/useOnboardingStatus';
import { useEntityHandlers } from './hooks/useEntityHandlers';
import { useGlobalEventHandlers } from './hooks/infrastructure/useGlobalEventHandlers';
import { usePreventZoom } from './hooks/infrastructure/usePreventZoom';
import { useNavigation } from './hooks/layout/useNavigation';
import { useSessionHandlers } from './hooks/auth/useSessionHandlers';
import { ShiftProvider, useShift } from './hooks/sales/useShift';
import { useTheme } from './hooks/layout/useTheme';
import { useUrlSync } from './hooks/layout/useUrlSync';
import { TRANSLATIONS } from './i18n/translations';
import { DataProvider, useData } from './context/DataContext';
import { authService } from './services/auth/authService';
import { type Supplier, ViewState } from './types';
import { TitleBar } from './components/layout/TitleBar';
import { isTauri } from './utils/platform';
import { NotificationOverlay } from './components/features/alerts/NotificationOverlay';

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: '1', orgId: '', branchId: '1', name: 'B2B', contactPerson: 'B2B', phone: '', email: '', address: '', status: 'active' },
];

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

// Interface for the AuthenticatedContent props
// It combines AppState and AuthState to pass everything down
interface AuthenticatedContentProps extends AppState, AuthState {}

const AuthenticatedContent: React.FC<AuthenticatedContentProps> = ({
  // App State
  view,
  setView,
  activeModule,
  setActiveModule,
  dashboardSubView,
  setDashboardSubView,
  mobileMenuOpen,
  setMobileMenuOpen,
  profileImage,
  setProfileImage,
  currentEmployeeId,
  setCurrentEmployeeId,
  navigationParams,
  setNavigationParams,
  windowedView,
  setWindowedView,

  // Auth State
  isAuthenticated,
  isAuthChecking,
  isRecoveringPassword,
  handleLogout,
  resolveView,
  setIsAuthenticated,
  user,
}) => {
  // --- Shifts ---
  const { currentShift } = useShift();
  
  // --- Global Secure Gate State ---
  const [pendingNavigation, setPendingNavigation] = useState<{ viewId: string; params?: any } | null>(null);

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
    setEmployees, // Added setEmployees
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
      setNavigationParams: (params: any) => setNavigationParams(params), // Wrap it to match React.Dispatch
      onProtectedNavigation: (viewId: string, params?: any) => setPendingNavigation({ viewId, params }),
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
    setEmployees, // Added setEmployees
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
  const { isLoggingOut, onLogoutClick, handleSelectEmployee } = useSessionHandlers({
    employees,
    currentEmployeeId,
    setCurrentEmployeeId,
    setProfileImage,
    setView,
    setActiveModule,
    setNavigationParams,
    handleLogout,
    switchBranch,
    branches,
  });

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
    [sales, inventory, enrichedCustomers, suppliers, purchases, purchaseReturns, returns, employees, batches, activeBranchId, activeOrgId]
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
      profileImage={profileImage}
      setProfileImage={setProfileImage}
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
        storageKey={pendingNavigation ? PAGE_REGISTRY[pendingNavigation.viewId]?.storageKey : 'area_unlocked'}
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
  const t = TRANSLATIONS[language];

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
      alert.error(
        t.settings.storageQuota.criticalMessage,
        t.settings.storageQuota.criticalTitle
      );
    };
    window.addEventListener('pharma_storage_quota_exceeded', handleQuotaExceeded);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pharma_storage_quota_exceeded', handleQuotaExceeded);
    };
  }, [checkQuota, t, alert]);

  // 4. Onboarding Status Hook (Architectural Abstraction)
  const { activeStep, setActiveStep, isChecking: isCheckingOnboarding, error: onboardingError } = useOnboardingStatus(authState.isAuthenticated);

  // 5. Dynamic Theme Hook - Handles PWA Title Bar & Global Dark Mode
  // When not authenticated, we force isLoginView=true for the black theme color override
  useTheme(theme.primary, darkMode, !authState.isAuthenticated);

  // 6. Stable Login Callbacks
  const { setIsAuthenticated } = authState;
  const { setActiveModule, setView } = appState;
  const { reinitialize } = useData();

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    reinitialize();
  }, [setIsAuthenticated, reinitialize]);

  // --- URL Synchronization ---
  // Synchronize browser hash with authentication state & current view
  const currentUser = authService.getCurrentUserSync();
  useUrlSync(authState.isAuthenticated, appState.view, appState.currentEmployeeId, currentUser?.userId);





  // 10. Authenticated & Setup Done -> Show Secure Content wrapped in Providers
  const isOnboardingReady = !isCheckingOnboarding;



  // Determine if this user should see the Employee Portal (personal dashboard)
  // vs. the full Pharmacy interface (AuthenticatedContent).
  // Employee Portal is shown for:
  //   1. Users with no org affiliation at all (zero affiliation)
  //   2. Regular employees (non-admin, non-owner) who joined via employment requests
  // Full Pharmacy interface is ONLY for org owners/admins.
  const isEmployeePortalUser = authState.isAuthenticated && currentUser && (
    !currentUser.orgId || 
    (currentUser.orgRole !== 'owner' && currentUser.orgRole !== 'admin' && 
     currentUser.role !== 'pharmacist_owner' && currentUser.role !== 'admin')
  );

  const content = authState.isAuthenticated ? (
    isEmployeePortalUser ? (
      <EmployeeDashboard t={t} language={language} />
    ) : (
      <AuthenticatedContent {...appState} {...authState} />
    )
  ) : (
    <AuthPage
      onLoginSuccess={handleLoginSuccess}
      language={language}
    />
  );

  // Handle Onboarding Steps
  let finalContent = content;
  if (authState.isAuthenticated && isOnboardingReady && !isEmployeePortalUser) {
    if (activeStep === 1) finalContent = <OrgSetupScreen language={language} onComplete={() => setActiveStep(2)} />;
    else if (activeStep === 2) finalContent = <BranchSetupScreen language={language} color={theme.primary} onBack={() => setActiveStep(1)} onComplete={() => setActiveStep(3)} />;
    else if (activeStep === 3) finalContent = <EmployeeSetupScreen language={language} color={theme.primary} onBack={() => setActiveStep(2)} onComplete={async () => {
      await reinitialize();
      setActiveStep(0);
      setView('landing' as ViewState);
    }} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-page-surface)]">
      {!authState.isAuthenticated && <TitleBar />}
      <div className="flex-1 overflow-hidden relative">
        <NotificationOverlay />
        {finalContent}
      </div>
    </div>
  );
};

export default App;
