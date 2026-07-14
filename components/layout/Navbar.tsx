import React, { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '../../config/menuData';
import { useSettings } from '../../context';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService } from '../../services/auth/authService';
import { orgService } from '../../services/org/orgService';
import { useAuthStore } from '../../stores/authStore';
import type { Organization, ViewState } from '../../types';
import { EventManager } from '../../utils/events/eventManager';
import { Tooltip } from '../common/Tooltip';
import { NavModules } from './navbar/NavModules';
import { NavUserActions } from './navbar/NavUserActions';
import { SettingsMenu } from './StatusBar/items/SettingsMenu';

interface NavbarProps {
  menuItems: MenuItem[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  appTitle: string;
  onMobileMenuToggle: () => void;
  isMobile?: boolean;
  onLogoClick?: () => void;
  currentView?: ViewState;
  onNavigate?: (view: ViewState) => void;
  employees?: Array<{
    id: string;
    name: string;
    employeeCode: string;
    image?: string;
    designSettings?: {
      avatar?: {
        decorationId?: string;
        decorationAnimated?: boolean;
        frameColor?: string | null;
        ringStyle?: string;
        ringThickness?: number;
        ringAnimated?: boolean;
      };
    };
  }>;
  currentEmployeeId?: string | null;
  setCurrentEmployeeId?: (id: string | null) => void;
  onLogout?: () => void;
  onOpenInWindow?: (view: ViewState) => void;
}

/**
 * ARCHITECTURE NOTE:
 * Navbar properties are limited to structural/data items (menuItems, activeModule).
 * Application settings (theme, language, blur, etc.) are consumed internally via `useSettings()`
 * to prevent unnecessary re-renders and property-drilling from App.tsx.
 */
const NavbarComponent: React.FC<NavbarProps> = ({
  menuItems,
  activeModule,
  onModuleChange: _onModuleChange,
  appTitle,
  onMobileMenuToggle: _onMobileMenuToggle,
  isMobile: _isMobile = false,
  onLogoClick,
  currentView,
  onNavigate,
  employees = [],
  currentEmployeeId: _currentEmployeeId,
  setCurrentEmployeeId: _setCurrentEmployeeId,
  onLogout,
  onOpenInWindow,
}) => {
  const {
    language,
    theme: currentTheme,
    darkMode,
    navStyle = 1,
    hideInactiveModules: _hideInactiveModules,
    developerMode: _developerMode,
  } = useSettings();

  // Resolve active dynamic events to see if there is a custom logo or navbar icon set
  const activeEvents = React.useMemo(() => {
    if (typeof window === 'undefined') return [];
    return EventManager.getActiveEvents({
      currentPath: window.location.pathname,
      view: currentView,
    });
  }, [currentView]);

  const navbarIconsEvent = activeEvents.find((e) => e.type === 'NAVBAR_ICONS');
  const customLogo = (navbarIconsEvent?.payload as any)?.logo;

  const currentEmployee = employees.find((e) => e.id === _currentEmployeeId);

  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const switchBranch = useAuthStore((s) => s.switchBranch);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const _switchOrg = useAuthStore((s) => s.switchOrg);
  const branches = useAuthStore((s) => s.branches);
  const isDataLoading = useAuthStore((s) => s.isLoading);

  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [_isSwitchingOrg, _setIsSwitchingOrg] = useState(false);

  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const _theme = currentTheme.primary;

  // Load organizations on mount and when user session changes
  useEffect(() => {
    const loadOrgContext = async () => {
      const currentUser = authService.getCurrentUserSync();
      if (currentUser?.userId) {
        const orgs = await orgService.getUserOrgs(currentUser.userId);
        setUserOrgs(orgs);
      } else {
        setUserOrgs([]);
      }
    };
    loadOrgContext();
  }, []); // Re-run if org changes or session might have changed

  // Update activeOrg when userOrgs or activeOrgId changes
  useEffect(() => {
    if (userOrgs.length > 0) {
      const current = userOrgs.find((o) => o.id === activeOrgId) || userOrgs[0];
      setActiveOrg(current);
    }
  }, [userOrgs, activeOrgId]);

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const profileRef = useRef<HTMLDivElement>(null);
  const _importRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<HTMLElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If click is outside dropdown AND outside the button that triggered it (activeAnchor), close it.
      // But actually, just checking if it is outside dropdownRef (the whole navbar bar) or the dropdown menu itself is tricky because dropdown is fixed now.
      // With fixed dropdown, it is outside navbar DOM hierarchy (visually).
      // But we can check if target is inside navbar OR inside activeAnchor.

      // Let's refine: Close if click is outside the dropdown menu.
      // SidebarDropdown handles its own close? No, currently Navbar handles it via activeDropdown state.
      // Since SidebarDropdown is now fixed, clicks outside it should close.
      // The SidebarDropdown is rendered IN the specific button's conditional, so technically in React tree it is here.
      // BUT event.target might not be contained in dropdownRef if Fixed.
      // No, `contains` works on DOM nodes. Fixed element IS in DOM under the button.

      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setActiveAnchor(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const _handleModuleClick = (moduleId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (navStyle === 2) {
      // Toggle dropdown
      if (activeDropdown === moduleId) {
        setActiveDropdown(null);
        setActiveAnchor(null);
      } else {
        setActiveDropdown(moduleId);
        setActiveAnchor(event.currentTarget);
      }
    } else {
      _onModuleChange(moduleId);

      // Auto-navigate to first implemented sub-page if available
      if (onNavigate) {
        const module = menuItems.find((m) => m.id === moduleId);
        if (module?.submenus) {
          for (const submenu of module.submenus) {
            for (const item of submenu.items) {
              if (typeof item === 'object' && item.view) {
                onNavigate(item.view);
                return;
              }
            }
          }
        }
      }
    }
  };

  const handleMouseEnter = (moduleId: string, event: React.MouseEvent) => {
    if (
      navStyle === 2 &&
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover)').matches
    ) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setActiveDropdown(moduleId);
      setActiveAnchor(event.currentTarget as HTMLElement);
    }
  };

  const handleMouseLeave = () => {
    if (
      navStyle === 2 &&
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover)').matches
    ) {
      closeTimeoutRef.current = setTimeout(() => {
        setActiveDropdown(null);
        setActiveAnchor(null);
      }, 200);
    }
  };

  const _getInitials = (name: string) => {
    if (!name) return '';
    // Remove titles like Dr, Dr., Doctor, Phd, match Arabic titles too
    const cleaned = name.replace(/\b(Dr|Dr\.|Doctor|دكتور|د\.?)\b/gi, '').trim();
    const words = cleaned.split(/\s+/);
    if (words.length === 0) return '';
    // Get first letter of every word, cap at 3 chars
    return words
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 3);
  };

  const cancelClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (dropdownRef.current && !activeDropdown) {
      dropdownRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <nav
      className='h-12 flex items-center justify-between w-full px-4 sticky top-0 z-50'
      style={{
        backgroundColor: 'var(--bg-navbar)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(48px + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* Logo & Title */}
      <div
        role="button"
        tabIndex={0}
        className='flex items-center gap-2 ltr:mr-6 rtl:ml-6 shrink-0 cursor-pointer hover:opacity-80'
        onClick={(_e) => {
          onLogoClick?.();
          if (isMobileView) setShowMobileSettings(true);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLogoClick?.(); if (isMobileView) setShowMobileSettings(true); } }}
      >
        {/* Dynamic Logo based on darkMode prop */}
        <img
          src={
            customLogo
              ? darkMode
                ? customLogo.dark
                : customLogo.light
              : darkMode
                ? '/logo_icon_white.svg'
                : '/logo_icon_black.svg'
          }
          alt={appTitle}
          className={
            customLogo ? 'h-9 w-auto filter drop-shadow-md py-0.5 object-contain' : 'h-8 w-auto'
          }
          id='navbar-logo-icon'
        />
        <div
          className='hidden md:flex items-center gap-[6px] ltr:ml-2 rtl:mr-2'
          id='navbar-app-title'
          dir='ltr'
        >
          {[
            {
              char: 'Z',
              viewBox: '40 75 170 185',
              svgElement: (
                <path
                  d='M 40,75 L 210,75 L 210,110 L 85,225 L 210,225 L 210,260 L 40,260 L 40,225 L 165,110 L 40,110 Z'
                  fill='currentColor'
                />
              ),
            },
            {
              char: 'I',
              viewBox: '290 75 35 185',
              svgElement: <rect x='290' y='75' width='35' height='185' fill='currentColor' />,
            },
            {
              char: 'N',
              viewBox: '420 75 140 185',
              svgElement: (
                <path
                  d='M 420,75 L 560,75 L 560,260 L 525,260 L 525,110 L 455,110 L 455,260 L 420,260 Z'
                  fill='currentColor'
                />
              ),
            },
            {
              char: 'C',
              viewBox: '670 75 170 185',
              svgElement: (
                <path
                  d='M 670,75 L 840,75 L 840,110 L 705,110 L 705,225 L 840,225 L 840,260 L 670,260 Z'
                  fill='currentColor'
                />
              ),
            },
          ].map((item, index) => {
            const charKey = item.char;
            const acronym = (t as any).zincAcronym?.[charKey];

            return (
              <Tooltip
                key={item.char}
                position='bottom'
                content={
                  acronym ? (
                    <div
                      className={`flex flex-col gap-0.5 p-0.5 min-w-[180px] max-w-[250px] ${language === 'AR' ? 'text-right' : 'text-left'}`}
                    >
                      <div className='font-bold text-primary-400 dark:text-primary-600 text-[11px]'>
                        {acronym.title}
                      </div>
                      <div className='text-[10px] text-white/70 dark:text-black/70 leading-relaxed whitespace-normal'>
                        {acronym.desc}
                      </div>
                    </div>
                  ) : (
                    charKey
                  )
                }
              >
                <div
                  id={`nav-char-${charKey}-${index}`}
                  className='text-gray-900 dark:text-white transition-transform hover:scale-125 hover:text-primary-500 cursor-default flex items-center justify-center'
                >
                  <svg viewBox={item.viewBox} className='h-[15px] w-auto'>
                    <title>Brand icon</title>
                    {item.svgElement}
                  </svg>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <NavModules
        menuItems={menuItems}
        activeModule={activeModule}
        onModuleChange={_onModuleChange}
        currentView={currentView}
        onNavigate={onNavigate}
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

      {/* Mobile: Settings overlay */}
      {showMobileSettings && (
        <SettingsMenu
          dropDirection='down'
          align='end'
          triggerVariant='navbar'
          showTrigger={false}
          defaultOpen={true}
          onClose={() => setShowMobileSettings(false)}
        />
      )}

      {/* Right Side Actions (Desktop) */}
      {authService.getCurrentUserSync() && (
        <NavUserActions
          language={language}
          theme={currentTheme}
          profileImage={currentEmployee?.image ?? null}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          profileRef={profileRef}
          currentEmployeeId={_currentEmployeeId}
          currentEmployee={currentEmployee}
          activeOrg={activeOrg}
          activeBranch={activeBranch}
          activeBranchId={activeBranchId}
          branches={branches}
          switchBranch={switchBranch}
          onNavigate={onNavigate}
          onLogout={onLogout}
          isDataLoading={isDataLoading}
          isLoggingOut={isLoggingOut}
          setIsLoggingOut={setIsLoggingOut}
        />
      )}
    </nav>
  );
};

export const Navbar = React.memo(NavbarComponent) as any;
