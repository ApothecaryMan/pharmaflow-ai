import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { getContentContainerClasses, LAYOUT_CONFIG } from '../../config/layoutConfig';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { ROUTES } from '../../config/routes';
import { useSettings } from '../../context';
import type { ViewState } from '../../types';
import { useAutoSystemBarColor } from '../../utils/systemBars';
import { ContextMenuProvider, useContextMenu } from '../common/ContextMenu';
import { DynamicEventLayer } from './DynamicEventLayer';
import { MobileNavigation } from './MobileNavigation';
import { Navbar } from './Navbar';
import { SidebarContent } from './SidebarContent';
import { StatusBar } from './StatusBar';
import { useGlobalHelp } from '../../context/HelpContext';
import { HelpModal } from '../common/HelpModal';

interface MainLayoutProps {
  children: React.ReactNode;
  view: ViewState;
  activeModule: string;
  t: Translations;
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
  currentEmployeeId: string | null;
  setCurrentEmployeeId: (id: string | null) => void;
  employees: any[];
  dashboardSubView: string;
  onOpenInWindow: (view: ViewState) => void;
  isRecoveringPassword?: boolean;
}

const STANDALONE_VIEWS = [ROUTES.LOGIN, 'services'];

// --- Global Context Menu Wrapper ---
const GlobalContextMenuWrapper: React.FC<{
  children: React.ReactNode;
  t: Translations;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleFullscreen: () => void;
}> = ({ children, t, darkMode, setDarkMode, toggleFullscreen }) => {
  const { showMenu } = useContextMenu();
  const { helpContent, setIsHelpOpen } = useGlobalHelp();

  return (
    <div
      className='w-full h-full'
      onContextMenu={(e) => {
        if (e.defaultPrevented) return;

        // Allow default context menu on inputs and textareas
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

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
          ...(helpContent
            ? [
                {
                  label: t.global?.actions?.instructions || 'التعليمات',
                  icon: 'menu_book',
                  action: () => setIsHelpOpen(true),
                },
              ]
            : []),
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
    navStyle,
    hideInactiveModules,
    sidebarStyle,
  } = useSettings();

  const isStandalone = STANDALONE_VIEWS.includes(view);
  useAutoSystemBarColor(
    `${view}:${theme.hex}:${darkMode}:${language}:${currentEmployeeId ?? ''}`,
    isStandalone ? '--bg-page-surface' : '--bg-navbar'
  );

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Determine actual sidebar state (considering hover expansion)
  // 1: Normal (Fixed), 2: Mini (Always), 3: Auto-Expand (Mini but expands on hover)
  const isActuallyCollapsed = sidebarStyle === 2 || (sidebarStyle === 3 && !isSidebarHovered);

  const { isHelpOpen, setIsHelpOpen, helpContent } = useGlobalHelp();


  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <ContextMenuProvider enableGlassEffect={false}>
      <DynamicEventLayer view={view} />
      <GlobalContextMenuWrapper
        t={t}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        toggleFullscreen={toggleFullscreen}
      >
        <div
          className='h-full flex flex-col transition-colors duration-200 select-none overflow-hidden'
          style={
            {
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              ...(isStandalone ? { '--navbar-height': '0px', '--statusbar-height': '0px' } : {}),
            } as React.CSSProperties
          }
          dir={language === 'AR' ? 'rtl' : 'ltr'}
        >
          {/* Navbar (Rendered for both Web and Tauri with native decorations) */}
          {!isStandalone && (
            <Navbar
              menuItems={filteredMenuItems}
              activeModule={activeModule}
              onModuleChange={handleModuleChange}
              appTitle={t.appTitle}
              onMobileMenuToggle={() => setMobileMenuOpen(true)}
              onLogoClick={() => setSidebarVisible(!sidebarVisible)}
              currentView={
                (activeModule === 'dashboard' && view === 'dashboard'
                  ? dashboardSubView
                  : view) as ViewState
              }
              onNavigate={handleNavigate}
              employees={employees.map((e) => ({
                id: e.id,
                name: e.name,
                employeeCode: e.employeeCode,
                image: e.image,
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
                    mass: 0.8,
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
                currentEmployeeId={currentEmployeeId}
                onSelectEmployee={setCurrentEmployeeId}
                employees={employees}
              />

              {/* Actual Page Surface */}
              <main className='flex-1 h-full overflow-hidden relative main-layout-content'>
                <div
                  className={getContentContainerClasses(PAGE_REGISTRY[view]?.layout, isStandalone)}
                >
                  <div className='flex flex-row h-full w-full'>
                    <div className='w-4 shrink-0' />
                    <div className='flex-1 min-w-0'>{children}</div>
                    <div className='w-4 shrink-0' />
                  </div>
                  <div className='h-4 shrink-0' />
                </div>
              </main>
            </div>
          </div>

          {/* Status Bar */}
          <StatusBar
            t={t.statusBar}
            currentEmployeeId={currentEmployeeId}
            onSelectEmployee={setCurrentEmployeeId}
            isRecoveringPassword={isRecoveringPassword}
          />
        </div>
        {isHelpOpen && helpContent && (
          <HelpModal
            show={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
            helpContent={helpContent}
            color={theme.hex}
            language={language}
          />
        )}
      </GlobalContextMenuWrapper>
    </ContextMenuProvider>
  );
};
