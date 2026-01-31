import React, { useState, useCallback } from 'react';
import { ViewState } from './types';
import { TRANSLATIONS } from './i18n/translations';
import { MainLayout } from './components/layout/MainLayout';
import { PageRouter } from './components/layout/PageRouter';
import { PAGE_REGISTRY } from './config/pageRegistry';
import { useTheme } from './hooks/useTheme';
import { useData } from './services';
import { useSettings, THEMES, LANGUAGES } from './context';
import { ROUTES } from './config/routes';

// App State Hooks
import { useAppState } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import { useNavigation } from './hooks/useNavigation';
import { useEntityHandlers } from './hooks/useEntityHandlers';
import { useAuthenticatedData } from './hooks/useAuthenticatedData';
import { useGlobalEventHandlers } from './hooks/useGlobalEventHandlers';
import { useSessionHandlers } from './hooks/useSessionHandlers';
import { useStatusBar } from './components/layout/StatusBar';
import { ShiftProvider, useShift } from './hooks/useShift';
import { DataProvider } from './services';
import { CSV_INVENTORY } from './data/sample-inventory';
import { Supplier } from './types';
import { Login } from './components/auth/Login';
import { authService } from './services/auth/authService';
import { AppState } from './hooks/useAppState';
import { AuthState } from './hooks/useAuth';
import { UserRole, canPerformAction } from './config/permissions';
import { PageSkeletonRegistry } from './components/skeletons/PageSkeletonRegistry';


const INITIAL_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'B2B', contactPerson: 'B2B', phone: '', email: '', address: '' },
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
    view, setView,
    activeModule, setActiveModule,
    dashboardSubView, setDashboardSubView,
    mobileMenuOpen, setMobileMenuOpen,
    tip,
    profileImage, setProfileImage,
    currentEmployeeId, setCurrentEmployeeId,
    navigationParams, setNavigationParams,
    
    // Auth State
    isAuthenticated, isAuthChecking, handleLogout, resolveView, setIsAuthenticated, user
}) => {
  // --- Shifts ---
  const { currentShift } = useShift();

  // --- Settings from Context ---
  const {
    theme, setTheme,
    darkMode, setDarkMode,
    language,
    textTransform,
    sidebarVisible, setSidebarVisible,
    sidebarBlur,
    hideInactiveModules, setHideInactiveModules,
    developerMode, setDeveloperMode,
    navStyle, setNavStyle,
    menuBlur,
  } = useSettings();

  // --- Data from Context ---
  const { 
    inventory, setInventory, 
    sales, setSales,
    suppliers, setSuppliers,
    purchases, setPurchases,
    purchaseReturns, setPurchaseReturns,
    returns, setReturns,
    customers, setCustomers,
    employees, setEmployees, // Added setEmployees
    isLoading
  } = useData();

  // --- StatusBar Utilities ---
  const { getVerifiedDate, validateTransactionTime, updateLastTransactionTime } = useStatusBar();

  // --- Authenticated Data (Role & Enrichment) ---
  const { userRole, enrichedCustomers } = useAuthenticatedData({ 
    employees, 
    currentEmployeeId, 
    customers, 
    sales 
  });

  // --- Navigation Hook ---
  const { handleViewChange, handleNavigate, handleModuleChange, filteredMenuItems } = useNavigation({
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
    role: userRole, // Pass the extracted role
    setNavigationParams,
  });

  // --- Entity Handlers Hook ---
  const {
    handleAddDrug, handleUpdateDrug, handleDeleteDrug, handleRestock,
    handleAddSupplier, handleUpdateSupplier, handleDeleteSupplier,
    handleAddCustomer, handleUpdateCustomer, handleDeleteCustomer,
    handlePurchaseComplete, handleApprovePurchase, handleRejectPurchase, handleCreatePurchaseReturn,
    handleCompleteSale, handleUpdateSale, handleProcessReturn,
    handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee,
  } = useEntityHandlers({
    inventory, setInventory,
    sales, setSales,
    suppliers, setSuppliers,
    purchases, setPurchases,
    returns, setReturns,
    customers, setCustomers,
    currentEmployeeId,
    employees, setEmployees, // Added setEmployees
    isLoading,
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
    handleLogout
  });

  // --- Global Event Handlers ---
  useGlobalEventHandlers({ 
    language, 
    inventory, 
    isLoading,
    onToggleSidebar: () => setSidebarVisible(!sidebarVisible),
    onNavigate: (targetView) => handleViewChange(targetView)
  });

  // --- Login Success Handler ---
  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setActiveModule(ROUTES.DASHBOARD);
    setView(ROUTES.DASHBOARD);
  }, [setIsAuthenticated, setActiveModule, setView]);



  // --- Not Authenticated (Login) ---

  if (!isAuthenticated) {
      return (
          <Login 
              onLoginSuccess={() => {
                  setIsAuthenticated(true);
                  setActiveModule(ROUTES.DASHBOARD);
                  setView(ROUTES.DASHBOARD);
              }}
              language={language}
              onViewChange={(view) => {
                   if (view === 'dashboard') {
                       setIsAuthenticated(true);
                       setView(ROUTES.DASHBOARD);
                   }
              }}
          />
      );
  }

  // --- TRANSITION SKELETON STATE ---
  if (isLoggingOut) {
      return (
        <div className="h-screen bg-[var(--bg-primary)] p-4 overflow-hidden">
             <PageSkeletonRegistry view={view} />
        </div>
      );
  }


  return (
    <MainLayout
      view={view}
      activeModule={activeModule}
      t={t}
      userRole={userRole}
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
      tip={tip}
    >
      <PageRouter 
        view={view}
        currentEmployeeId={currentEmployeeId}
        userRole={userRole}
        isLoading={isLoading}
        t={t}
        setView={setView}
        handleNavigate={handleNavigate}
        handleLoginSuccess={handleLoginSuccess}
        navigationParams={navigationParams}
        currentShift={currentShift}
        handlers={{
          setInventory, setPurchases, setPurchaseReturns, handleAddDrug, handleUpdateDrug,
          handleDeleteDrug, handleCompleteSale, handleUpdateSale, handleProcessReturn,
          handleAddCustomer, handleUpdateCustomer, handleDeleteCustomer, setSuppliers,
          handleAddSupplier, handleUpdateSupplier, handleDeleteSupplier, handlePurchaseComplete,
          handleApprovePurchase, handleRejectPurchase, handleRestock, handleAddEmployee,
          handleUpdateEmployee, handleDeleteEmployee, handleCreatePurchaseReturn
        }}
        data={{
          sales, inventory, enrichedCustomers, suppliers, purchases,
          purchaseReturns, returns, employees
        }}
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
        setView: appState.setView
    });
    
    // 3. Settings Hook (for Language)
    const { theme, darkMode, language } = useSettings();

    // 4. Dynamic Theme Hook - Handles PWA Title Bar & Global Dark Mode
    // When not authenticated, we force isLoginView=true for the black theme color override
    useTheme(theme.primary, darkMode, !authState.isAuthenticated);

    // 5. Loading State for Auth Check (Only if we don't have an optimistic session)
    if (authState.isAuthChecking && !authState.isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
                <div className="text-white">
                    <svg className="animate-spin h-8 w-8 mx-auto" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <p className="mt-2 text-sm text-zinc-400">{TRANSLATIONS[language].global?.checkingAuth || 'Checking authentication...'}</p>
                </div>
            </div>
        );
    }

    // 5. Not Authenticated -> Show Login
    if (!authState.isAuthenticated) {
        return (
            <Login 
                onLoginSuccess={() => {
                    authState.setIsAuthenticated(true);
                    appState.setActiveModule(ROUTES.DASHBOARD);
                    appState.setView(ROUTES.DASHBOARD);
                }}
                language={language}
                onViewChange={(view) => {
                     // Handle view changes from Login if needed (usually just dashboard)
                     if (view === 'dashboard') {
                         authState.setIsAuthenticated(true);
                         appState.setView(ROUTES.DASHBOARD);
                     }
                }}
            />
        );
    }
    
    // 6. Authenticated -> Show Secure Content wrapped in Providers
    return (
        <ShiftProvider>
            <DataProvider initialInventory={CSV_INVENTORY} initialSuppliers={INITIAL_SUPPLIERS}>
                <AuthenticatedContent 
                    {...appState}
                    {...authState}
                />
            </DataProvider>
        </ShiftProvider>
    );
};

export default App;