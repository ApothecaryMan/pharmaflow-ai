import { LogicalPosition } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../hooks/auth/useAuth';
import { useAppState } from '../../hooks/layout/useAppState';
import { useNavigation } from '../../hooks/layout/useNavigation';
import { authService } from '../../services/auth/authService';
import type { ViewState } from '../../types';
import { isTauri } from '../../utils/platform';
import { Icons } from '../common/Icons';
import { Tooltip } from '../common/Tooltip';
import { NavModules } from './navbar/NavModules';
import { NavUserActions } from './navbar/NavUserActions';

const appWindow = isTauri() ? getCurrentWindow() : null;

interface TitleBarProps {
  onLogout?: () => void;
  onOpenInWindow?: (view: ViewState) => void;
  onModuleChange?: (moduleId: string) => void;
  onNavigate?: (view: ViewState) => void;
  onToggleFullscreen?: () => void;
  view?: ViewState;
  activeModule?: string;
  dashboardSubView?: string;
  employees?: any[];
  currentEmployeeId?: string | null;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onLogout,
  onOpenInWindow,
  onModuleChange: propsOnModuleChange,
  onNavigate: propsOnNavigate,
  onToggleFullscreen,
  view: propsView,
  activeModule: propsActiveModule,
  dashboardSubView: propsDashboardSubView,
}) => {
  // Get state and setters from useAppState
  const appState = useAppState();

  // Destructure state from props if available, otherwise fallback to local appState
  // This is critical because useAppState() creates NEW state instances if not shared via Context
  const view = propsView || appState.view;
  const activeModule = propsActiveModule || appState.activeModule;
  const dashboardSubView = propsDashboardSubView || appState.dashboardSubView;

  const {
    currentEmployeeId,
    setCurrentEmployeeId,
    setView,
    setActiveModule,
    setDashboardSubView,
    setMobileMenuOpen,
    setNavigationParams,
  } = appState;

  const auth = useAuth({ view, setView });
  const {
    branches,
    activeBranchId,
    activeOrg,
    switchBranch,
    isLoading: isDataLoading,
    employees,
  } = useData();

  const user = auth.user || authService.getCurrentUserSync();
  const isAuthenticated = auth.isAuthenticated;

  const {
    hideInactiveModules,
    developerMode,
    darkMode,
    language,
    theme: currentTheme,
    setDarkMode,
  } = useSettings();

  // Navigation handlers (Prefer props from MainLayout for total sync)
  const nav = useNavigation({
    view,
    setView,
    activeModule,
    setActiveModule,
    dashboardSubView,
    setDashboardSubView,
    setMobileMenuOpen,
    setNavigationParams,
    resolveView: auth.resolveView,
    hideInactiveModules,
    developerMode,
    currentEmployeeId,
    activeBranchId,
    activeOrgId: activeOrg?.id,
  });

  const handleModuleChange = propsOnModuleChange || nav.handleModuleChange;
  const handleNavigate = propsOnNavigate || nav.handleNavigate;
  const filteredMenuItems = nav.filteredMenuItems;

  // Navigation UI State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<HTMLElement | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [printerReady, setPrinterReady] = useState(true); // Default to true, update later if possible

  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for window resize/maximize events
  useEffect(() => {
    if (!appWindow) return;

    const updateMaximizedState = async () => {
      const maximized = await appWindow.isMaximized();
      setIsWindowMaximized(maximized);
    };

    // Initial check
    updateMaximizedState();

    // Listen for resize events
    const unlisten = appWindow.onResized(() => {
      updateMaximizedState();
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // Monitor online/offline and updates
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let interval: NodeJS.Timeout | undefined;

    if (isTauri()) {
      const checkUpdates = async () => {
        try {
          const update = await check();
          setHasUpdate(!!update);
        } catch (e) {
          console.error('Failed to check for updates', e);
        }
      };
      checkUpdates();
      interval = setInterval(checkUpdates, 1000 * 60 * 60); // Check every hour
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (interval) clearInterval(interval);
    };
  }, []);

  // Unified Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 1. Close Profile Menu if clicking outside
      if (
        showProfileMenu &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }

      // 2. Close Module Dropdowns if clicking outside
      if (
        activeDropdown &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // Also ensure we aren't clicking the button that opens the dropdown
        if (!activeAnchor?.contains(event.target as Node)) {
          setActiveDropdown(null);
          setActiveAnchor(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu, activeDropdown, activeAnchor]);

  if (!isTauri()) return null;

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const orgName = activeOrg?.name || '';
  const branchName = activeBranch?.name || '';
  const currentEmployee = employees.find((e) => e.id === currentEmployeeId);
  const currentView =
    activeModule === 'dashboard' && view === 'dashboard' ? dashboardSubView : view;

  const handleMinimize = () => appWindow?.minimize();
  const handleMaximize = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      appWindow?.toggleMaximize();
    }
  };
  const handleClose = () => appWindow?.close();

  // Handlers for NavModules
  const handleWheel = (e: React.WheelEvent) => {
    if (dropdownRef.current && !activeDropdown) {
      dropdownRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleMouseEnter = (moduleId: string, event: React.MouseEvent) => {
    setActiveDropdown(moduleId);
    setActiveAnchor(event.currentTarget as HTMLElement);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
      setActiveAnchor(null);
    }, 200);
  };

  const cancelClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleSystemMenu = async (e: React.MouseEvent) => {
    // Check if the click was on an interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) {
      return; // Let it bubble to GlobalContextMenuWrapper in MainLayout
    }

    e.preventDefault();
    e.stopPropagation();

    if (!appWindow) return;

    try {
      // Create a LogicalPosition instance for proper scaling handling on Windows
      const position = new LogicalPosition(e.clientX, e.clientY);

      // Use the native system menu provided by the OS
      await appWindow.showSystemMenu(position);
    } catch (err) {
      console.error('Failed to show system menu:', err);
    }
  };

  return (
    <div
      className='h-11 backdrop-blur-md flex items-center justify-between px-1 select-none z-[9999] relative overflow-visible'
      onContextMenu={handleSystemMenu}
      style={{
        backgroundColor: 'var(--bg-navbar)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Background Drag Region - Captures events in empty areas */}
      <div
        data-tauri-drag-region
        className='absolute inset-0 z-0'
        onDoubleClick={handleMaximize}
        onContextMenu={handleSystemMenu} // Added here specifically for Windows compatibility
      />

      {/* Left: Window Controls - Wrapped in z-10 for interactivity */}
      <div className='flex items-center gap-0.5 z-10 relative'>
        <button
          onClick={handleClose}
          className='w-8 h-7 flex items-center justify-center hover:bg-red-500 text-gray-500 hover:text-white transition-all rounded-md'
          title='إغلاق'
        >
          <span className='material-symbols-rounded text-[16px]'>close</span>
        </button>
        <button
          onClick={handleMaximize}
          className='w-8 h-7 flex items-center justify-center hover:bg-gray-500/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all rounded-md'
          title={isWindowMaximized ? 'استعادة' : 'تكبير'}
        >
          <span className='material-symbols-rounded text-[14px]'>
            {isWindowMaximized ? 'filter_none' : 'check_box_outline_blank'}
          </span>
        </button>
        <button
          onClick={handleMinimize}
          className='w-8 h-7 flex items-center justify-center hover:bg-gray-500/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all rounded-md'
          title='تصغير'
        >
          <span className='material-symbols-rounded text-[16px]'>remove</span>
        </button>
      </div>

      {/* Middle: Navigation Modules - Wrapped in z-10 and overflow-visible */}
      <div className='flex-1 flex justify-center items-center px-4 h-full z-10 relative overflow-visible'>
        {isAuthenticated && filteredMenuItems.length > 0 ? (
          <NavModules
            menuItems={filteredMenuItems}
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            currentView={currentView as ViewState}
            onNavigate={handleNavigate}
            onOpenInWindow={onOpenInWindow}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            activeAnchor={activeAnchor}
            setActiveAnchor={setActiveAnchor}
            dropdownRef={dropdownRef}
            handleWheel={handleWheel}
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
            cancelClose={cancelClose}
          />
        ) : (
          <div className='flex items-center gap-2 opacity-50 pointer-events-none'>
            <img
              src={darkMode ? '/logo_icon_white.svg' : '/logo_icon_black.svg'}
              alt='ZINC'
              className='w-4 h-4 object-contain'
            />
            <span className='text-[10px] font-bold tracking-widest uppercase'>ZINC Pharmacy</span>
          </div>
        )}
      </div>

      {/* Right: User Actions & Quick Access - Wrapped in z-10 */}
      <div className='flex items-center gap-1 shrink-0 px-1 z-10 relative'>
        {isAuthenticated && (
          <>
            {/* Desktop Status Indicators */}
            <div className='flex items-center gap-2 px-3 py-1 bg-white/5 dark:bg-black/10 rounded-full border border-white/5 mr-2'>
              {/* Online Status */}
              <Tooltip content={isOnline ? 'متصل بالإنترنت' : 'غير متصل'} position='bottom'>
                <div
                  className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}
                />
              </Tooltip>

              <span className='w-[1px] h-3 bg-white/10' />

              {/* Printer Status */}
              <Tooltip content='الطابعة الحرارية جاهزة' position='bottom'>
                <Icons.Printer
                  size={14}
                  className={printerReady ? 'text-emerald-500' : 'text-gray-400'}
                />
              </Tooltip>

              {/* Update Indicator */}
              {hasUpdate && (
                <>
                  <span className='w-[1px] h-3 bg-white/10' />
                  <Tooltip content='تحديث جديد متاح' position='bottom'>
                    <button
                      onClick={() => handleNavigate('desktop-settings')}
                      className='flex items-center gap-1 text-[10px] font-bold text-emerald-500 animate-pulse'
                    >
                      <Icons.Download size={14} />
                      UPDT
                    </button>
                  </Tooltip>
                </>
              )}
            </div>

            {/* Quick Access Group */}
            <div className='flex items-center gap-0.5'>
              <Tooltip
                content={darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                position='bottom'
                delay={100}
              >
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className='w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200'
                  style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--primary-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <span className='material-symbols-rounded text-[20px]'>
                    {darkMode ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
              </Tooltip>
            </div>

            <NavUserActions
              language={language}
              theme={currentTheme}
              showProfileMenu={showProfileMenu}
              setShowProfileMenu={setShowProfileMenu}
              profileRef={profileRef}
              fileInputRef={fileInputRef}
              currentEmployeeId={currentEmployeeId}
              currentEmployee={currentEmployee}
              activeOrg={activeOrg}
              activeBranch={activeBranch}
              activeBranchId={activeBranchId}
              branches={branches}
              switchBranch={switchBranch}
              onNavigate={handleNavigate}
              onLogout={onLogout}
              isDataLoading={isDataLoading}
              handleFileChange={() => {}}
              isLoggingOut={isLoggingOut}
              setIsLoggingOut={setIsLoggingOut}
            />
          </>
        )}
      </div>
    </div>
  );
};
