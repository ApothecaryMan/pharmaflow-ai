import React, { useCallback, useState } from 'react';
import { storage } from './utils/storage';
import { StorageKeys } from './config/storageKeys';
import { branchService } from './services/branchService';
import { AuthPage } from './components/auth/AuthPage';
import { Modal } from './components/common/Modal';
import { MainLayout } from './components/layout/MainLayout';
import { PageRouter } from './components/layout/PageRouter';
import { useStatusBar } from './components/layout/StatusBar';
import { OrgSetupScreen } from './components/onboarding/OrgSetupScreen';
import { BranchSetupScreen } from './components/onboarding/BranchSetupScreen';
import { EmployeeSetupScreen } from './components/onboarding/EmployeeSetupScreen';
import { PageSkeletonRegistry } from './components/skeletons/PageSkeletonRegistry';
import { PAGE_REGISTRY } from './config/pageRegistry';
import { UserRole } from './config/permissions';
import { SecureGate } from './components/common/SecureGate';
import { ROUTES } from './config/routes';
import { LANGUAGES, THEMES, useSettings } from './context';
import { CSV_INVENTORY } from './data/sample-inventory';
// App State Hooks
import { type AppState, useAppState } from './hooks/useAppState';
import { type AuthState, useAuth } from './hooks/useAuth';
import { useAuthenticatedData } from './hooks/useAuthenticatedData';
import { useEntityHandlers } from './hooks/useEntityHandlers';
import { useGlobalEventHandlers } from './hooks/useGlobalEventHandlers';
import { useNavigation } from './hooks/useNavigation';
import { useSessionHandlers } from './hooks/useSessionHandlers';
import { ShiftProvider, useShift } from './hooks/useShift';
import { useTheme } from './hooks/useTheme';
import { TRANSLATIONS } from './i18n/translations';
import { DataProvider, useData } from './services/DataContext';
import { authService } from './services/auth/authService';
import { type Supplier, ViewState } from './types';
import { useOnboardingStatus } from './hooks/useOnboardingStatus';

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: '1', branchId: '1', name: 'B2B', contactPerson: 'B2B', phone: '', email: '', address: '', status: 'active' },
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
    sidebarBlur,
    hideInactiveModules,
    setHideInactiveModules,
    developerMode,
    setDeveloperMode,
    navStyle,
    setNavStyle,
    menuBlur,
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
    employees,
    setEmployees, // Added setEmployees
    isLoading,
    batches,
    setBatches,
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
    handleLogout,
  });

  // --- Global Event Handlers ---
  useGlobalEventHandlers({
    language,
    inventory,
    isLoading,
    onToggleSidebar: () => setSidebarVisible(!sidebarVisible),
    onNavigate: (targetView) => handleViewChange(targetView),
  });

  // --- Login Success Handler ---
  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setActiveModule(ROUTES.DASHBOARD);
    setView(ROUTES.DASHBOARD);
  }, [setIsAuthenticated, setActiveModule, setView]);

  // --- URL Synchronization ---
  React.useEffect(() => {
    if (isAuthenticated && activeOrgId && activeBranchId) {
      const activeBranch = branches.find(b => b.id === activeBranchId);
      if (activeBranch) {
        const currentHash = window.location.hash;
        const newHash = `#/${activeOrgId}/${activeBranch.code}/${view}`;
        if (currentHash !== newHash) {
          window.history.replaceState(null, '', newHash);
        }
      }
    }

    const handleHashChange = () => {
      // If user manually changes hash, we might want to reload to trigger DataContext/AppState init
      // or we can just let it be for now since full deep-linking requires more complex state management
      // But at least if they refresh, the URL will work because of our parsing logic.
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, activeOrgId, activeBranchId, view]);

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
      <div className='h-screen bg-(--bg-primary) p-4 overflow-hidden'>
        <PageSkeletonRegistry view={view} />
      </div>
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
  // 1. Initialize App State (View, Toast, etc.)
  const appState = useAppState();

  // 2. Initialize Auth State
  const authState = useAuth({
    view: appState.view,
    setView: appState.setView,
  });

  // 3. Settings Hook (for Language)
  const { theme, darkMode, language } = useSettings();

  // 4. Onboarding Status Hook (Architectural Abstraction)
  const { activeStep, setActiveStep, isChecking: isCheckingOnboarding, error: onboardingError } = useOnboardingStatus();

  // 5. Dynamic Theme Hook - Handles PWA Title Bar & Global Dark Mode
  // When not authenticated, we force isLoginView=true for the black theme color override
  useTheme(theme.primary, darkMode, !authState.isAuthenticated);

  // 6. Stable Login Callbacks
  const handleLoginSuccess = useCallback(() => {
    authState.setIsAuthenticated(true);
    appState.setActiveModule(ROUTES.DASHBOARD);
    appState.setView(ROUTES.DASHBOARD);
  }, [authState, appState]);

  const handleViewChange = useCallback(
    (view: string) => {
      if (view === 'dashboard') {
        authState.setIsAuthenticated(true);
        appState.setView(ROUTES.DASHBOARD);
      }
    },
    [authState, appState]
  );

  // 7. Loading State for Auth/Onboarding Check
  if ((authState.isAuthChecking && !authState.isAuthenticated) || isCheckingOnboarding) {
    return (
      <div
        className='min-h-screen flex items-center justify-center'
        style={{ backgroundColor: '#000000' }}
      >
        <div className='text-white'>
          <svg className='animate-spin h-8 w-8 mx-auto' viewBox='0 0 24 24'>
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
              fill='none'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
            />
          </svg>
          <p className='mt-2 text-sm text-zinc-400'>
            {isCheckingOnboarding 
              ? (TRANSLATIONS[language].global?.loading || 'Loading...') 
              : (TRANSLATIONS[language].global?.checkingAuth || 'Checking authentication...')}
          </p>
        </div>
      </div>
    );
  }

  // 8. Not Authenticated -> Show Login
  if (!authState.isAuthenticated) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        language={language}
      />
    );
  }

  // 9. ONBOARDING GATE (Explicit Step State)
  if (activeStep === 1) {
    return (
      <OrgSetupScreen 
        language={language} 
        onComplete={() => setActiveStep(2)} 
      />
    );
  }

  if (activeStep === 2) {
    return (
      <BranchSetupScreen 
        language={language} 
        color={theme.primary} 
        onBack={() => setActiveStep(1)}
        onComplete={() => setActiveStep(3)} 
      />
    );
  }

  if (activeStep === 3) {
    return (
      <EmployeeSetupScreen 
        language={language} 
        color={theme.primary} 
        onBack={() => setActiveStep(2)}
      />
    );
  }

  // 10. Authenticated & Setup Done -> Show Secure Content wrapped in Providers
  return (
    <DataProvider initialInventory={CSV_INVENTORY} initialSuppliers={INITIAL_SUPPLIERS}>
      <ShiftProvider>
        <AuthenticatedContent {...appState} {...authState} />
      </ShiftProvider>
    </DataProvider>
  );
};

export default App;
