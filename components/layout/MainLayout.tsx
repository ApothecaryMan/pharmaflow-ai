import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getContentContainerClasses, LAYOUT_CONFIG } from '../../config/layoutConfig';
import { type UserRole } from '../../config/permissions';
import { ROUTES } from '../../config/routes';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { type ViewState } from '../../types';
import { THEMES, useSettings } from '../../context';
import { ContextMenuProvider } from '../common/ContextMenu';
import { MobileNavigation } from './MobileNavigation';
import { Navbar } from './Navbar';
import { SidebarContent } from './SidebarContent';
import { StatusBar } from './StatusBar';
import { DynamicEventLayer } from './DynamicEventLayer';

interface MainLayoutProps {
  children: React.ReactNode;
  view: ViewState;
  activeModule: string;
  t: any;
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
  onOpenInWindow: (view: ViewState) => void;
  isRecoveringPassword?: boolean;
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
  isRecoveringPassword,
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
    sidebarStyle,
  } = useSettings();

  const isStandalone = STANDALONE_VIEWS.includes(view);

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Determine actual sidebar state (considering hover expansion)
  // 1: Normal (Fixed), 2: Mini (Always), 3: Auto-Expand (Mini but expands on hover)
  const isActuallyCollapsed = sidebarStyle === 2 || (sidebarStyle === 3 && !isSidebarHovered);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <ContextMenuProvider enableGlassEffect={menuBlur}>
      <DynamicEventLayer />
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
              onOpenInWindow={onOpenInWindow}
            />
          )}

          {/* Main Content Area */}
          <div
            className='flex flex-1 overflow-hidden'
            style={{ backgroundColor: 'var(--bg-navbar)' }}
          >
            {/* Layout Wrapper with Static Curves */}
            <div
              className={`flex-1 flex overflow-hidden ${isStandalone || !currentEmployeeId ? '' : 'rounded-tl-3xl rounded-tr-3xl border-t border-l border-r bg-(--bg-page-surface) shadow-inner m-0'}`}
              style={{ borderColor: 'var(--border-divider)' }}
            >
              {/* Sidebar */}
              {!isStandalone && currentEmployeeId && (
                <motion.aside
                  initial={false}
                  animate={{ 
                    width: isActuallyCollapsed ? 80 : 256,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 28,
                    mass: 0.8
                  }}
                  className={`hidden ${sidebarVisible && navStyle !== 2 ? 'md:flex' : ''} flex-col overflow-hidden`}
                  onMouseEnter={() => setIsSidebarHovered(true)}
                  onMouseLeave={() => setIsSidebarHovered(false)}
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
                    sidebarCollapsed={isActuallyCollapsed}
                  />
                </motion.aside>
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
              isStandalone={isStandalone}
              profileImage={profileImage}
              currentEmployeeId={currentEmployeeId}
              onSelectEmployee={setCurrentEmployeeId}
              employees={employees}
            />

              {/* Actual Page Surface */}
              <main className='flex-1 h-full overflow-hidden relative'>
                <div
                  className={getContentContainerClasses(PAGE_REGISTRY[view]?.layout, isStandalone)}
                >
                  <div className='h-full w-full'>{children}</div>
                </div>
              </main>
            </div>
          </div>

          {/* Status Bar */}
          {!isStandalone && (
            <StatusBar
              t={t.statusBar}
              currentEmployeeId={currentEmployeeId}
              onSelectEmployee={setCurrentEmployeeId}
              isRecoveringPassword={isRecoveringPassword}
            />
          )}
        </div>
      </GlobalContextMenuWrapper>
    </ContextMenuProvider>
  );
};
