import React from 'react';
import { Navbar } from './Navbar';
import { SidebarContent } from './SidebarContent';
import { StatusBar } from './StatusBar';
import { ContextMenuProvider } from '../common/ContextMenu';
import { useSettings, THEMES } from '../../context';
import { ROUTES } from '../../config/routes';
import { UserRole, canPerformAction } from '../../config/permissions';

interface MainLayoutProps {
  children: React.ReactNode;
  view: string;
  activeModule: string;
  t: any;
  userRole: UserRole;
  // Handlers
  onLogout: () => void;
  // UI State
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  // Navigation
  filteredMenuItems: any[];
  handleModuleChange: (id: string) => void;
  handleNavigate: (path: string) => void;
  handleViewChange: (view: string) => void;
  // Other
  profileImage: string | null;
  setProfileImage: (img: string | null) => void;
  currentEmployeeId: string | null;
  setCurrentEmployeeId: (id: string | null) => void;
  employees: any[];
  dashboardSubView: string;
  tip: string;
}

const STANDALONE_VIEWS = [ROUTES.LOGIN];

import { useContextMenu } from '../common/ContextMenu';

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

export const MainLayout: React.FC<MainLayoutProps> = ({
  children, view, activeModule, t, userRole,
  onLogout, 
  mobileMenuOpen, setMobileMenuOpen,
  filteredMenuItems, handleModuleChange, handleNavigate, handleViewChange,
  profileImage, setProfileImage,
  currentEmployeeId, setCurrentEmployeeId,
  employees, dashboardSubView, tip
}) => {
  const { 
    theme, setTheme, language, darkMode, 
    sidebarVisible, setSidebarVisible, sidebarBlur,
    menuBlur, navStyle, hideInactiveModules
  } = useSettings();

  const isStandalone = STANDALONE_VIEWS.includes(view);

  const toggleTheme = () => {
    const currentIndex = THEMES.findIndex(th => th.name === theme.name);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex]);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <ContextMenuProvider enableGlassEffect={menuBlur}>
      <GlobalContextMenuWrapper 
        t={t} 
        toggleTheme={toggleTheme} 
        toggleFullscreen={toggleFullscreen}
      >
        <div 
          className="h-screen flex flex-col transition-colors duration-200 select-none overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)'
          }}
          dir={language === 'AR' ? 'rtl' : 'ltr'}
        >
          {/* Navbar */}
          {!isStandalone && (
            <Navbar 
              menuItems={filteredMenuItems}
              activeModule={activeModule}
              onModuleChange={handleModuleChange}
              appTitle={t.appTitle}
              onMobileMenuToggle={() => setMobileMenuOpen(true)}
              profileImage={profileImage}
              setProfileImage={setProfileImage}
              onLogoClick={() => setSidebarVisible(!sidebarVisible)}
              currentView={activeModule === 'dashboard' && view === 'dashboard' ? dashboardSubView : view}
              onNavigate={handleNavigate}
              employees={employees.map(e => ({ id: e.id, name: e.name, employeeCode: e.employeeCode }))}
              currentEmployeeId={currentEmployeeId}
              setCurrentEmployeeId={setCurrentEmployeeId}
              onLogout={onLogout}
            />
          )}

          {/* Main Content Area */}
          <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* Sidebar */}
            {!isStandalone && (
               <aside 
                 className={`hidden ${sidebarVisible && navStyle !== 2 ? 'md:flex' : ''} flex-col w-72 ${sidebarBlur ? 'backdrop-blur-xl' : ''} transition-all duration-300 ease-in-out`}
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

            {/* Mobile Side Drawer Area */}
            {mobileMenuOpen && !isStandalone && (
               <div className="fixed inset-0 z-[60] flex md:hidden">
                 <div 
                   className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                   onClick={() => setMobileMenuOpen(false)}
                 ></div>
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
                            onClick={() => handleModuleChange(module.id)}
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

            {/* Actual Page Surface */}
            <main className={`flex-1 h-full overflow-hidden relative ${isStandalone ? '' : 'rounded-tl-3xl rounded-tr-3xl border-t border-l border-r border-gray-200 dark:border-gray-800 bg-[#f3f4f6] dark:bg-black shadow-inner'}`}>
               <div className={`h-full overflow-y-auto scrollbar-hide ${isStandalone ? 'w-full' : (view.includes('pos') || view.includes('purchases')) ? 'w-full px-[50px] pt-8 pb-[2px]' : 'max-w-[90rem] mx-auto px-[50px] pt-5 pb-[3px]'}`}>
                  {children}
               </div>
            </main>
          </div>

          {/* Status Bar */}
          {!isStandalone && (
            <StatusBar 
              t={t.statusBar}
              currentEmployeeId={currentEmployeeId}
              userRole={userRole}
              onSelectEmployee={setCurrentEmployeeId}
            />
          )}

          {/* Mobile Bottom Nav */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-3 z-50 overflow-x-auto">
            {canPerformAction(userRole, 'reports.view_inventory') && (
              <button onClick={() => handleViewChange('dashboard')} className={`p-2 rounded-xl shrink-0 ${view === 'dashboard' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}>
                <span className="material-symbols-rounded">dashboard</span>
              </button>
            )}
            {canPerformAction(userRole, 'sale.create') && (
              <button onClick={() => handleViewChange('pos')} className={`p-2 rounded-xl shrink-0 ${view === 'pos' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}>
                <span className="material-symbols-rounded">point_of_sale</span>
              </button>
            )}
            {canPerformAction(userRole, 'inventory.view') && (
              <button onClick={() => handleViewChange('inventory')} className={`p-2 rounded-xl shrink-0 ${view === 'inventory' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}>
                <span className="material-symbols-rounded">inventory_2</span>
              </button>
            )}
            {canPerformAction(userRole, 'purchase.view') && (
              <button onClick={() => handleViewChange('purchases')} className={`p-2 rounded-xl shrink-0 ${view === 'purchases' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}>
                <span className="material-symbols-rounded">shopping_cart_checkout</span>
              </button>
            )}
          </div>
        </div>
      </GlobalContextMenuWrapper>
    </ContextMenuProvider>
  );
};
