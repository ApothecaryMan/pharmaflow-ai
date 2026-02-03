import type React from 'react';
import { getContentContainerClasses, LAYOUT_CONFIG } from '../../config/layoutConfig';
import { canPerformAction, type UserRole } from '../../config/permissions';
import { ROUTES } from '../../config/routes';
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
  toggleTheme: () => void;
  toggleFullscreen: () => void;
}> = ({ children, t, toggleTheme, toggleFullscreen }) => {
  const { showMenu } = useContextMenu();

  return (
    <div
      className='w-full h-full'
      onContextMenu={(e) => {
        if (e.defaultPrevented) return;
        e.preventDefault();
        showMenu(e.clientX, e.clientY, [
          { label: t.global.actions.theme, icon: 'palette', action: toggleTheme },
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
    sidebarVisible,
    setSidebarVisible,
    sidebarBlur,
    menuBlur,
    navStyle,
    hideInactiveModules,
  } = useSettings();

  const isStandalone = STANDALONE_VIEWS.includes(view);

  const toggleTheme = () => {
    const currentIndex = THEMES.findIndex((th) => th.name === theme.name);
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
      <GlobalContextMenuWrapper t={t} toggleTheme={toggleTheme} toggleFullscreen={toggleFullscreen}>
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
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            {/* Sidebar */}
            {!isStandalone && (
              <aside
                className={`hidden ${sidebarVisible && navStyle !== 2 ? 'md:flex' : ''} flex-col ${LAYOUT_CONFIG.SIDEBAR_WIDTH} ${sidebarBlur ? 'backdrop-blur-xl' : ''} transition-all duration-300 ease-in-out`}
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
            />

            {/* Actual Page Surface */}
            <main
              className={`flex-1 h-full overflow-hidden relative ${isStandalone ? '' : 'rounded-tl-3xl rounded-tr-3xl border-t border-l border-r border-gray-200 dark:border-gray-800 bg-[#f3f4f6] dark:bg-black shadow-inner'}`}
            >
              <div
                className={getContentContainerClasses(view, isStandalone)}
                style={
                  {
                    '--mobile-sides': LAYOUT_CONFIG.SPACING.MOBILE,
                    '--mobile-bottom': LAYOUT_CONFIG.SPACING.MOBILE_BOTTOM,
                    '--desktop-top': LAYOUT_CONFIG.SPACING.DESKTOP_TOP,
                    '--desktop-sides':
                      activeModule === 'dashboard'
                        ? LAYOUT_CONFIG.SPACING.DASHBOARD_DESKTOP_SIDES
                        : LAYOUT_CONFIG.SPACING.DESKTOP_SIDES,
                    '--desktop-bottom': LAYOUT_CONFIG.SPACING.DESKTOP_BOTTOM,
                  } as React.CSSProperties
                }
              >
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                    /* Mobile Styles (Base) */
                    .main-content-surface {
                      padding-left: var(--mobile-sides) !important;
                      padding-right: var(--mobile-sides) !important;
                      padding-bottom: var(--mobile-bottom) !important;
                      padding-top: 0 !important;
                    }
                    
                    /* Desktop Styles (768px+) */
                    @media (min-width: 768px) {
                      .main-content-surface {
                        padding-top: var(--desktop-top) !important;
                        padding-left: var(--desktop-sides) !important;
                        padding-right: var(--desktop-sides) !important;
                        padding-bottom: var(--desktop-bottom) !important;
                      }
                    }

                    /* Small Desktop / Tablet Landscape (768px to 900px) */
                    @media (min-width: 768px) and (max-width: 900px) {
                      .main-content-surface {
                        padding-left: 10px !important;
                        padding-right: 10px !important;
                      }
                    }
                  `,
                  }}
                />
                <div className='main-content-surface h-full w-full'>{children}</div>
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
