import React, { useEffect, useState, useCallback } from 'react';
import { ViewState } from './types';
import { TRANSLATIONS } from './i18n/translations';
import { SidebarContent } from './components/layout/SidebarContent';
import { Navbar } from './components/layout/Navbar';
import { StatusBar, useStatusBar } from './components/layout/StatusBar';
import { LandingPage } from './components/layout/LandingPage';
import { PAGE_REGISTRY } from './config/pageRegistry';
import { useTheme } from './hooks/useTheme';
import { useData } from './services';
import { useSettings, THEMES, LANGUAGES } from './context';
import { ROUTES } from './config/routes';
import { ContextMenuProvider, useContextMenu } from './components/common/ContextMenu';

// App State Hooks
import { useAppState } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import { useNavigation } from './hooks/useNavigation';
import { useEntityHandlers } from './hooks/useEntityHandlers';
import { batchService } from './services/inventory/batchService';
import { ShiftProvider, useShift } from './hooks/useShift';
import { DataProvider } from './services';
import { CSV_INVENTORY } from './data/sample-inventory';
import { Supplier } from './types';
import { Login } from './components/auth/Login';
import { authService } from './services/auth/authService';
import { AppState } from './hooks/useAppState';
import { AuthState } from './hooks/useAuth';
import { DashboardSkeleton } from './components/dashboard/DashboardSkeletons';
import { UserRole, canPerformAction } from './config/permissions';
import { PageSkeletonRegistry } from './components/skeletons/PageSkeletonRegistry';


const INITIAL_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'B2B', contactPerson: 'B2B', phone: '', email: '', address: '' },
];

// --- Global Context Menu Wrapper ---
const GlobalContextMenuWrapper: React.FC<{ 
  children: React.ReactNode; 
  t: any; 
  toggleTheme: () => void; 
  toggleFullscreen: () => void;
}> = ({ children, t, toggleTheme, toggleFullscreen }) => {
  const { showMenu } = useContextMenu();
  
  return (
    <div 
      className="w-full h-full"
      onContextMenu={(e) => {
        if (e.defaultPrevented) return;
        e.preventDefault();
        showMenu(e.clientX, e.clientY, [
          { label: t.global.actions.theme, icon: 'palette', action: toggleTheme },
          { label: t.global.actions.fullscreen, icon: 'fullscreen', action: toggleFullscreen },
          { separator: true },
          { label: t.global.actions.reload, icon: 'refresh', action: () => window.location.reload() },
          { label: t.global.actions.help, icon: 'help', action: () => alert('Help & Support\n\nContact support@zinc.ai for assistance.') }
        ]);
      }}
    >
      {children}
    </div>
  );
};

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
    language, setLanguage,
    textTransform, setTextTransform,
    sidebarVisible, setSidebarVisible,
    hideInactiveModules, setHideInactiveModules,
    developerMode, setDeveloperMode,
    navStyle, setNavStyle,
    dropdownBlur, setDropdownBlur,
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

  // Determine current user role for RBAC
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const userRole = (currentEmployee?.role || 'officeboy') as UserRole;

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
    role: userRole, // Pass the role for menu filtering
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
    enrichedCustomers,
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

  // --- Language Direction ---
  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
  }, [language]);

  // --- Inventory Migration to Batches ---
  useEffect(() => {
    if (!isLoading && inventory.length > 0) {
      const count = batchService.migrateInventoryToBatches(inventory);
      if (count > 0) {
        console.log(`[Batch System] Migrated ${count} items to batches.`);
      }
    }
  }, [isLoading, inventory]);

  // --- Logout Transition State ---
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  


  // Optimized Logout Handler
  // Optimized Logout Handler with Timing Control and Error Handling
  const onLogoutClick = useCallback(async () => {
    const startTime = Date.now();
    const MIN_DISPLAY_TIME = 1500; // Minimum splash screen time


    setIsLoggingOut(true);

    try {
      // Perform logout logic
      console.log('[App] Clearing all session states');
      await handleSelectEmployee(null); // Use wrapper to log audit event
      setProfileImage(null);
      setView(ROUTES.DASHBOARD);
      setActiveModule(ROUTES.DASHBOARD);
      
      await handleLogout();
      
      // Calculate elapsed time
      const elapsed = Date.now() - startTime;
      const remaining = MIN_DISPLAY_TIME - elapsed;

      // Ensure splash shows for at least MIN_DISPLAY_TIME
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
    } catch (error) {

      // Force logout visually even on error
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_DISPLAY_TIME) {
          await new Promise(r => setTimeout(r, MIN_DISPLAY_TIME - elapsed));
      }
    } finally {

      setIsLoggingOut(false);
    }
  }, [handleLogout]);

  // --- Employee Selection Wrapper (Audit Logging) ---
  const handleSelectEmployee = useCallback(async (id: string | null) => {
    const session = await authService.getCurrentUser();
    
    if (session) {
      if (!id) {
        // Log Employee Logout
        const currentEmp = employees.find(e => e.id === currentEmployeeId);
        authService.logAuditEvent({
          username: currentEmp?.name || session.username,
          role: currentEmp?.role || session.role,
          branchId: session.branchId,
          action: 'logout',
          details: `Employee signed out`
        });
      } else {
        const selectedEmployee = employees.find(e => e.id === id);
        if (selectedEmployee) {
          const isFirstSelection = !currentEmployeeId;
          const previousEmployee = employees.find(e => e.id === currentEmployeeId);
          const previousName = previousEmployee?.name || (currentEmployeeId ? 'unknown' : null);

          authService.logAuditEvent({
            username: selectedEmployee.name,
            role: selectedEmployee.role,
            branchId: session.branchId,
            action: isFirstSelection ? 'login' : 'switch_user',
            employeeId: selectedEmployee.id,
            details: isFirstSelection 
              ? `Employee session started` 
              : `Switched from ${previousName || 'unknown'}`
          });
        }
      }
    }
    setCurrentEmployeeId(id);
  }, [employees, currentEmployeeId, setCurrentEmployeeId]);

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
    <ContextMenuProvider enableGlassEffect={dropdownBlur}>
    <GlobalContextMenuWrapper 
      t={t} 
      toggleTheme={() => {
        const currentIndex = THEMES.findIndex(th => th.name === theme.name);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        setTheme(THEMES[nextIndex]);
      }}
      toggleFullscreen={() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }}
    >
      <div 
        className="h-screen flex flex-col transition-colors duration-200 select-none"
        style={{ 
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        }}
        dir={language === 'AR' ? 'rtl' : 'ltr'}
      >
        
        {/* Navbar */}
        {!STANDALONE_VIEWS.includes(view) && (
          <Navbar 
            menuItems={filteredMenuItems}
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            theme={theme.primary}
            darkMode={darkMode}
            appTitle={t.appTitle}
            onMobileMenuToggle={() => setMobileMenuOpen(true)}
            language={language}
            setTheme={setTheme}
            setDarkMode={setDarkMode}
            setLanguage={setLanguage}
            availableThemes={THEMES}
            availableLanguages={LANGUAGES}
            currentTheme={theme}
            profileImage={profileImage}
            setProfileImage={setProfileImage}
            textTransform={textTransform}
            setTextTransform={setTextTransform}
            onLogoClick={() => setSidebarVisible(!sidebarVisible)}
            hideInactiveModules={hideInactiveModules}
            setHideInactiveModules={setHideInactiveModules}
            navStyle={navStyle}
            setNavStyle={setNavStyle}
            developerMode={developerMode}
            setDeveloperMode={setDeveloperMode}
            dropdownBlur={dropdownBlur}
            setDropdownBlur={setDropdownBlur}
            currentView={activeModule === 'dashboard' && view === 'dashboard' ? dashboardSubView : view}
            onNavigate={handleNavigate}
            employees={employees.map(e => ({ id: e.id, name: e.name, employeeCode: e.employeeCode }))}
            currentEmployeeId={currentEmployeeId}
            setCurrentEmployeeId={setCurrentEmployeeId}
            onLogout={onLogoutClick}
          />
        )}

        {/* Main Layout: Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {/* Desktop Sidebar */}
          {!STANDALONE_VIEWS.includes(view) && (
            <aside 
              className={`hidden ${sidebarVisible && navStyle !== 2 ? 'md:flex' : ''} flex-col w-72 backdrop-blur-xl transition-all duration-300 ease-in-out`}
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <SidebarContent 
                menuItems={filteredMenuItems}
                activeModule={activeModule}
                view={view}
                dashboardSubView={dashboardSubView}
                onNavigate={handleNavigate}
                onViewChange={handleViewChange}
                theme={theme}
                t={t}
                language={language}
                tip={tip}
                hideInactiveModules={hideInactiveModules}
              />
            </aside>
          )}

          {/* Mobile Drawer */}
          {mobileMenuOpen && !STANDALONE_VIEWS.includes(view) && (
            <div className="fixed inset-0 z-[60] flex md:hidden">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                onClick={() => setMobileMenuOpen(false)}
              ></div>
              {/* Panel */}
              <aside className="relative w-80 max-w-[85vw] flex flex-col bg-white dark:bg-gray-900 h-full shadow-2xl overflow-y-auto">
                {/* Mobile Module Selector */}
                <div className="p-4 border-b border-gray-200 dark:border-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.menu.modules}</h3>
                    <button 
                      onClick={() => setMobileMenuOpen(false)} 
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-rounded text-[20px]">close</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredMenuItems.map(module => (
                      <button
                        key={module.id}
                        onClick={() => setActiveModule(module.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                          activeModule === module.id
                            ? `bg-${theme.primary}-100 dark:bg-${theme.primary}-900/30 text-${theme.primary}-700 dark:text-${theme.primary}-400`
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="material-symbols-rounded text-[20px]">{module.icon}</span>
                        <span className="text-[10px] font-medium text-center line-clamp-2">{module.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <SidebarContent 
                  menuItems={filteredMenuItems}
                  activeModule={activeModule}
                  view={view}
                  dashboardSubView={dashboardSubView}
                  onNavigate={handleNavigate}
                  onViewChange={handleViewChange}
                  isMobile={true}
                  theme={theme}
                  t={t}
                  language={language}
                  tip={tip}
                  hideInactiveModules={hideInactiveModules}
                />
              </aside>
            </div>
          )}

          {/* Main Content */}
          <main className={`flex-1 h-full overflow-hidden relative ${STANDALONE_VIEWS.includes(view) ? '' : 'rounded-tl-3xl rounded-tr-3xl border-t border-l border-r border-gray-200 dark:border-gray-800 bg-[#f3f4f6] dark:bg-black shadow-inner'}`}>
            <div className={`h-full overflow-y-auto scrollbar-hide ${STANDALONE_VIEWS.includes(view) ? 'w-full' : (view === 'pos' || view === 'purchases' || view === 'pos-test'|| view === 'purchases-test') ? 'w-full px-[50px] pt-8 pb-[2px]' : 'max-w-[90rem] mx-auto px-[50px] pt-5 pb-[3px]'}`}>
              {/* Dynamic Page Rendering */}
              {(() => {
                if (!currentEmployeeId) {
                  return <LandingPage color={theme.primary} language={language} darkMode={darkMode} />;
                }

                // Global Data Loading State: Show skeleton while employees/data are loading
                // to prevent "Access Restricted" flash (since userRole depends on loaded employees)
                if (isLoading) {
                  return <PageSkeletonRegistry view={view} />;
                }

                const pageConfig = PAGE_REGISTRY[view];
                
                if (!pageConfig) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <span className="material-symbols-rounded text-6xl text-gray-300 dark:text-gray-600 mb-4 block">error</span>
                        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">{t.global?.pageNotFound || 'Page not found'}</p>
                      </div>
                    </div>
                  );
                }

                // RBAC: Check Page Permissions
                if (pageConfig.permission && !canPerformAction(userRole, pageConfig.permission)) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                        <div className="w-24 h-24 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 border-4 border-red-100 dark:border-red-900/30">
                            <span className="material-symbols-rounded text-5xl text-red-500">lock</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {language === 'AR' ? 'وصول مقيد' : 'Access Restricted'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                            {language === 'AR' 
                                ? 'عذراً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول.' 
                                : "Sorry, you don't have the necessary permissions to access this page. Please contact your administrator."}
                        </p>
                        <button 
                            onClick={() => setView('dashboard')}
                            className="mt-8 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity active:scale-95"
                        >
                            {language === 'AR' ? 'العودة للرئيسية' : 'Back to Dashboard'}
                        </button>
                    </div>
                  );
                }
                
                const PageComponent = pageConfig.component;
                
                // Build props object based on required props
                const props: any = {};
                
                // Always include these common props
                props.color = theme.primary;
                props.t = t;
                props.language = language;
                props.textTransform = textTransform;
                props.userRole = userRole;
                props.currentEmployeeId = currentEmployeeId;
                
                // Conditionally add props based on page requirements
                const requiredProps = pageConfig.requiredProps || [];
                
                if (requiredProps.includes('sales')) props.sales = sales;
                if (requiredProps.includes('inventory')) props.inventory = inventory;
                if (requiredProps.includes('customers')) props.customers = enrichedCustomers;
                if (requiredProps.includes('products')) props.products = inventory;
                if (requiredProps.includes('suppliers')) props.suppliers = suppliers;
                if (requiredProps.includes('purchases')) props.purchases = purchases;
                if (requiredProps.includes('purchaseReturns')) props.purchaseReturns = purchaseReturns;
                if (requiredProps.includes('returns')) props.returns = returns;
                if (requiredProps.includes('drugs')) props.drugs = inventory;
                
                // Handler functions
                if (requiredProps.includes('setInventory')) props.setInventory = setInventory;
                if (requiredProps.includes('setDrugs')) props.setDrugs = setInventory;
                if (requiredProps.includes('setPurchases')) props.setPurchases = setPurchases;
                if (requiredProps.includes('setPurchaseReturns')) props.setPurchaseReturns = setPurchaseReturns;
                if (requiredProps.includes('onAddDrug')) props.onAddDrug = handleAddDrug;
                if (requiredProps.includes('onUpdateDrug')) props.onUpdateDrug = handleUpdateDrug;
                if (requiredProps.includes('onDeleteDrug')) props.onDeleteDrug = handleDeleteDrug;
                if (requiredProps.includes('onUpdateInventory')) props.onUpdateInventory = setInventory;
                if (requiredProps.includes('onCompleteSale')) props.onCompleteSale = handleCompleteSale;
                if (requiredProps.includes('onUpdateSale')) props.onUpdateSale = handleUpdateSale;
                if (requiredProps.includes('employees')) props.employees = employees;
                if (requiredProps.includes('onProcessReturn')) props.onProcessReturn = handleProcessReturn;
                if (requiredProps.includes('onAddCustomer')) props.onAddCustomer = handleAddCustomer;
                if (requiredProps.includes('onUpdateCustomer')) props.onUpdateCustomer = handleUpdateCustomer;
                if (requiredProps.includes('onDeleteCustomer')) props.onDeleteCustomer = handleDeleteCustomer;
                if (requiredProps.includes('currentShift')) props.currentShift = currentShift;
                if (requiredProps.includes('setSuppliers')) props.setSuppliers = setSuppliers;
                if (requiredProps.includes('onAddSupplier')) props.onAddSupplier = handleAddSupplier;
                if (requiredProps.includes('onUpdateSupplier')) props.onUpdateSupplier = handleUpdateSupplier;
                if (requiredProps.includes('onDeleteSupplier')) props.onDeleteSupplier = handleDeleteSupplier;
                if (requiredProps.includes('onCompletePurchase')) props.onPurchaseComplete = handlePurchaseComplete;
                if (requiredProps.includes('onApprovePurchase')) props.onApprovePurchase = handleApprovePurchase;
                if (requiredProps.includes('onRejectPurchase')) props.onRejectPurchase = handleRejectPurchase;
                if (requiredProps.includes('onAddProduct')) props.onAddProduct = () => setView('add-product');
                if (requiredProps.includes('onRestock')) props.onRestock = handleRestock;
                
                // New Handlers
                if (requiredProps.includes('onAddEmployee')) props.onAddEmployee = handleAddEmployee;
                if (requiredProps.includes('onUpdateEmployee')) props.onUpdateEmployee = handleUpdateEmployee;
                if (requiredProps.includes('onDeleteEmployee')) props.onDeleteEmployee = handleDeleteEmployee;
                if (requiredProps.includes('onCreatePurchaseReturn')) props.onCreatePurchaseReturn = handleCreatePurchaseReturn;
                
                // Navigation Handlers
                if (requiredProps.includes('onViewChange')) props.onViewChange = handleNavigate;
                if (requiredProps.includes('onLoginSuccess')) props.onLoginSuccess = handleLoginSuccess;
                if (requiredProps.includes('navigationParams')) props.navigationParams = navigationParams;
                
                // Allow all components to receive theme props by default
                props.darkMode = darkMode;
                props.color = theme.primary;
                props.employees = employees;
                props.currentEmployeeId = currentEmployeeId;
                
                // Special handling for specific pages
                if (view === 'dashboard') {
                  props.t = t.dashboard;
                } else if (view === 'inventory') {
                  props.t = t.inventory;
                } else if (view === 'pos') {
                  props.t = t.pos;
                } else if (view === 'pos-test') {
                  props.t = t.pos;
                } else if (view === 'sales-history') {
                  props.t = t.salesHistory;
                  props.datePickerTranslations = t.global.datePicker;
                } else if (view === 'return-history') {
                  props.t = t.returnHistory;
                  props.datePickerTranslations = t.global.datePicker;
                } else if (view === 'suppliers') {
                  props.t = t.suppliers;
                } else if (view === 'purchases') {
                  props.t = t.purchases;
                } else if (view === 'purchases-test') {
                  props.t = t.purchases;
                } else if (view === 'pending-approval') {
                  props.t = t.pendingApproval;
                } else if (view === 'barcode-studio') {
                  props.t = t.barcodeStudio;
                } else if (view === 'customers') {
                  props.t = t.customers;
                } else if (view === 'customer-history') {
                  props.t = t.customers;
                } else if (view === 'customer-overview') {
                  props.t = t.customerOverview;
                } else if (view === 'employees') {
                  props.t = t.employeeList;
                } else if (view === 'add-product') {
                  props.t = t.inventory;
                  props.initialMode = 'add';
                }
                
                return <PageComponent {...props} />;
              })()}
            </div>
          </main>
        </div>

        {/* StatusBar - Desktop Only */}
        {!STANDALONE_VIEWS.includes(view) && (
          <StatusBar 
            t={t.statusBar}
            currentEmployeeId={currentEmployeeId}
            userRole={userRole}
            onSelectEmployee={handleSelectEmployee}
          />
        )}

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-3 z-50 overflow-x-auto">
          {canPerformAction(userRole, 'reports.view_inventory') && (
            <button onClick={() => setView('dashboard')} className={`p-2 rounded-xl shrink-0 ${view === 'dashboard' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}>
              <span className="material-symbols-rounded">dashboard</span>
            </button>
          )}
          {canPerformAction(userRole, 'sale.create') && (
            <button onClick={() => setView('pos')} className={`p-2 rounded-xl shrink-0 ${view === 'pos' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}>
              <span className="material-symbols-rounded">point_of_sale</span>
            </button>
          )}
          {canPerformAction(userRole, 'inventory.view') && (
            <button onClick={() => setView('inventory')} className={`p-2 rounded-xl shrink-0 ${view === 'inventory' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}>
              <span className="material-symbols-rounded">inventory_2</span>
            </button>
          )}
          {canPerformAction(userRole, 'purchase.view') && (
            <button onClick={() => setView('purchases')} className={`p-2 rounded-xl shrink-0 ${view === 'purchases' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}>
              <span className="material-symbols-rounded">shopping_cart_checkout</span>
            </button>
          )}
        </div>
      </div>
    
      {/* Toast Notifications */}
    </GlobalContextMenuWrapper>
    </ContextMenuProvider>
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