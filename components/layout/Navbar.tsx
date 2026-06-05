import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '../../config/menuData';
import type { UserRole } from '../../config/permissions';
import { useSettings } from '../../context';
import { useData } from '../../context/DataContext';
import { useShift } from '../../hooks/sales/useShift';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService } from '../../services/auth/authService';
import { permissionsService } from '../../services/auth/permissionsService';
import { branchService } from '../../services/org/branchService';
import { orgService } from '../../services/org/orgService';
import type { Organization } from '../../types';
import { Language, ThemeColor, type ViewState } from '../../types';
import { EventManager } from '../../utils/events/eventManager';
import { isTauri } from '../../utils/platform';
import { ContextMenuTrigger } from '../common/ContextMenu';
import { getIconByName, Icons } from '../common/Icons';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { Tooltip } from '../common/Tooltip';
import { PrinterSettings } from '../settings/PrinterSettings';
import { AttendanceQuickAction } from './AttendanceQuickAction';
import { NavModules } from './navbar/NavModules';
import { NavUserActions } from './navbar/NavUserActions';
import { SidebarDropdown } from './SidebarDropdown';
import { SettingsMenu } from './StatusBar/items/SettingsMenu';

interface NavbarProps {
  menuItems: MenuItem[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  appTitle: string;
  onMobileMenuToggle: () => void;
  isMobile?: boolean;
  profileImage: string | null;
  setProfileImage: (image: string | null) => void;
  onLogoClick?: () => void;
  currentView?: ViewState;
  onNavigate?: (view: ViewState) => void;
  employees?: Array<{ id: string; name: string; employeeCode: string }>;
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
  onModuleChange,
  appTitle,
  onMobileMenuToggle,
  isMobile = false,
  profileImage,
  setProfileImage,
  onLogoClick,
  currentView,
  onNavigate,
  employees = [],
  currentEmployeeId,
  setCurrentEmployeeId,
  onLogout,
  onOpenInWindow,
}) => {
  const {
    language,
    theme: currentTheme,
    darkMode,
    navStyle = 1,
    hideInactiveModules,
    developerMode,
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

  const currentEmployee = employees.find((e) => e.id === currentEmployeeId);

  const {
    activeBranchId,
    switchBranch,
    activeOrgId,
    switchOrg,
    branches,
    isLoading: isDataLoading,
  } = useData();

  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);

  const theme = currentTheme.primary;

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
  }, [activeOrgId]); // Re-run if org changes or session might have changed

  // Update activeOrg when userOrgs or activeOrgId changes
  useEffect(() => {
    if (userOrgs.length > 0) {
      const current = userOrgs.find((o) => o.id === activeOrgId) || userOrgs[0];
      setActiveOrg(current);
    }
  }, [userOrgs, activeOrgId]);

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 1. Check file size first (limit to 5MB initially to avoid browser crash on memory)
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Please select an image under 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 2. Resize Logic
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // 3. Compress to JPEG with 0.7 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setProfileImage(dataUrl);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

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

  const handleModuleClick = (moduleId: string, event: React.MouseEvent<HTMLButtonElement>) => {
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
      onModuleChange(moduleId);

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

  const getInitials = (name: string) => {
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
      }}
    >
      {/* Logo & Title */}
      <div
        className='flex items-center gap-2 ltr:mr-6 rtl:ml-6 shrink-0 cursor-pointer hover:opacity-80'
        onClick={onLogoClick}
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
        <div className='hidden md:flex items-center gap-[6px] ltr:ml-2 rtl:mr-2' id='navbar-app-title' dir='ltr'>
          {[
            {
              char: 'Z',
              viewBox: '40 75 170 185',
              svgElement: <path d="M 40,75 L 210,75 L 210,110 L 85,225 L 210,225 L 210,260 L 40,260 L 40,225 L 165,110 L 40,110 Z" fill="currentColor" />
            },
            {
              char: 'I',
              viewBox: '290 75 35 185',
              svgElement: <rect x="290" y="75" width="35" height="185" fill="currentColor" />
            },
            {
              char: 'N',
              viewBox: '420 75 140 185',
              svgElement: <path d="M 420,75 L 560,75 L 560,260 L 525,260 L 525,110 L 455,110 L 455,260 L 420,260 Z" fill="currentColor" />
            },
            {
              char: 'C',
              viewBox: '670 75 170 185',
              svgElement: <path d="M 670,75 L 840,75 L 840,110 L 705,110 L 705,225 L 840,225 L 840,260 L 670,260 Z" fill="currentColor" />
            }
          ].map((item, index) => {
            const charKey = item.char;
            const acronym = (t as any).zincAcronym?.[charKey];

            return (
              <Tooltip
                key={index}
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
                  <svg viewBox={item.viewBox} className="h-[15px] w-auto">
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
        onModuleChange={onModuleChange}
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

      {/* Mobile: Hamburger Menu & Settings */}
      {authService.getCurrentUserSync() && (
        <div className='md:hidden flex items-center gap-1'>
          <SettingsMenu
            dropDirection='down'
            align='end'
            triggerVariant='navbar'
            triggerSize={'var(--icon-navbar-mobile)' as any}
          />
          <button
            onClick={onMobileMenuToggle}
            className='flex items-center justify-center w-10 h-10 text-gray-600 dark:text-gray-300'
          >
            <Icons.Menu size='var(--icon-navbar-mobile)' />
          </button>
        </div>
      )}

      {/* Right Side Actions (Desktop) */}
      {authService.getCurrentUserSync() && (
        <NavUserActions
          language={language}
          theme={currentTheme}
          profileImage={profileImage}
          setProfileImage={setProfileImage}
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
          onNavigate={onNavigate}
          onLogout={onLogout}
          isDataLoading={isDataLoading}
          handleFileChange={handleFileChange}
          isLoggingOut={isLoggingOut}
          setIsLoggingOut={setIsLoggingOut}
          setShowPrinterSettings={setShowPrinterSettings}
        />
      )}

      {/* Printer Settings Modal */}
      <PrinterSettings
        isOpen={showPrinterSettings}
        onClose={() => setShowPrinterSettings(false)}
        color={theme}
        t={t}
        language={language}
      />
    </nav>
  );
};

export const Navbar = React.memo(NavbarComponent) as any;
