import type React from 'react';
import { getContentContainerClasses, LAYOUT_CONFIG } from '../../config/layoutConfig';
import { type UserRole } from '../../config/permissions';
import { ROUTES } from '../../config/routes';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { THEMES, useSettings } from '../../context';
import { ContextMenuProvider } from '../common/ContextMenu';
import { MobileNavigation } from './MobileNavigation';
import { Navbar } from './Navbar';
import { SidebarContent } from './SidebarContent';
import { StatusBar } from './StatusBar';

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
  onOpenInWindow: (view: string) => void;
}

const STANDALONE_VIEWS = [ROUTES.LOGIN];

import { useContextMenu } from '../common/ContextMenu';

// --- Global Context Menu Wrapper ---
const GlobalContextMenuWrapper: React.FC<{
  children: React.ReactNode;
  t: any;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleFullscreen: () => void;
}> = ({ children, t, darkMode, setDarkMode, toggleFullscreen }) => {
  const { showMenu } = useContextMenu();

  return (
    <div
      className='w-full h-full'
      onContextMenu={(e) => {
        if (e.defaultPrevented) return;
        e.preventDefault();
        showMenu(e.clientX, e.clientY, [
          {
            label: darkMode ? t.settings.lightMode : t.settings.darkMode,
            icon: darkMode ? 'light_mode' : 'dark_mode',
            action: () => setDarkMode(!darkMode),
          },
          { label: t.global.actions.fullscreen, icon: 'fullscreen', action: toggleFullscreen },
          { separator: true },
          {
            label: t.global.actions.reload,
            icon: 'refresh',
            action: () => window.location.reload(),
          },
          {
            label: t.global.actions.help,
            icon: 'help',
            action: () => alert('Help & Support\n\nContact support@zinc.ai for assistance.'),
          },
        ]);
      }}
    >
      {children}
    </div>
  );
};

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  view,
  activeModule,
  t,
  userRole,
  onLogout,
  mobileMenuOpen,
  setMobileMenuOpen,
  filteredMenuItems,
  handleModuleChange,
  handleNavigate,
  handleViewChange,
  profileImage,
  setProfileImage,
  currentEmployeeId,
  setCurrentEmployeeId,
  employees,
  dashboardSubView,
  onOpenInWindow,
}) => {
  const {
    theme,
    setTheme,
    language,
    darkMode,
    setDarkMode,
    sidebarVisible,
    setSidebarVisible,
    sidebarBlur,
    menuBlur,
    navStyle,
    hideInactiveModules,
  } = useSettings();

  const isStandalone = STANDALONE_VIEWS.includes(view);


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
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        toggleFullscreen={toggleFullscreen}
      >
        <div
          className='h-screen flex flex-col transition-colors duration-200 select-none overflow-hidden'
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
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
              currentView={
                activeModule === 'dashboard' && view === 'dashboard' ? dashboardSubView : view
              }
              onNavigate={handleNavigate}
              employees={employees.map((e) => ({
                id: e.id,
                name: e.name,
                employeeCode: e.employeeCode,
              }))}
              currentEmployeeId={currentEmployeeId}
              setCurrentEmployeeId={setCurrentEmployeeId}
              onLogout={onLogout}
              userRole={userRole}
              onOpenInWindow={onOpenInWindow}
            />
          )}

          {/* Main Content Area */}
          <div
            className='flex flex-1 overflow-hidden'
            style={{ backgroundColor: 'var(--bg-navbar)' }}
          >
            {/* Sidebar */}
            {!isStandalone && (
              <aside
                className={`hidden ${sidebarVisible && navStyle !== 2 ? 'md:flex' : ''} flex-col ${LAYOUT_CONFIG.SIDEBAR_WIDTH} ${sidebarBlur ? 'backdrop-blur-xl' : ''} transition-all duration-300 ease-in-out`}
                style={{ backgroundColor: 'var(--bg-navbar)' }}
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
                  hideInactiveModules={hideInactiveModules}
                />
              </aside>
            )}

            {/* Mobile Navigation (Drawer & Bottom Bar) */}
            <MobileNavigation
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              filteredMenuItems={filteredMenuItems}
              activeModule={activeModule}
              handleModuleChange={handleModuleChange}
              view={view}
              dashboardSubView={dashboardSubView}
              handleNavigate={handleNavigate}
              handleViewChange={handleViewChange}
              theme={theme}
              t={t}
              language={language}
              hideInactiveModules={hideInactiveModules}
              userRole={userRole}
              isStandalone={isStandalone}
              profileImage={profileImage}
              currentEmployeeId={currentEmployeeId}
              onSelectEmployee={setCurrentEmployeeId}
              employees={employees}
            />

            {/* Actual Page Surface */}
            <main
              className={`flex-1 h-full overflow-hidden relative ${isStandalone ? '' : 'rounded-tl-3xl rounded-tr-3xl border-t border-l border-r bg-(--bg-page-surface) shadow-inner'}`}
              style={{ borderColor: 'var(--border-divider)' }}
            >
              <div className={getContentContainerClasses(PAGE_REGISTRY[view]?.layout, isStandalone)}>
                <div className='h-full w-full'>{children}</div>
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
        </div>
      </GlobalContextMenuWrapper>
    </ContextMenuProvider>
  );
};
