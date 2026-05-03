import React, { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '../../config/menuData';
import { motion } from 'framer-motion';
import type { UserRole } from '../../config/permissions';
import { useSettings } from '../../context';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { TRANSLATIONS } from '../../i18n/translations';
import { authService } from '../../services/auth/authService';
import { Language, ThemeColor, ViewState } from '../../types';
import { ContextMenuTrigger } from '../common/ContextMenu';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';

import { useData } from '../../context/DataContext';
import { branchService } from '../../services/branchService';
import { orgService } from '../../services/org/orgService';
import { permissionsService } from '../../services/auth/permissionsService';
import type { Organization } from '../../types';

import { PrinterSettings } from '../settings/PrinterSettings';
import { SidebarDropdown } from './SidebarDropdown';
import { SettingsMenu } from './StatusBar/items/SettingsMenu';
import { Icons, getIconByName } from '../common/Icons';

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
    sidebarBlur,
    hideInactiveModules,
    developerMode,
  } = useSettings();

  const currentEmployee = employees.find(e => e.id === currentEmployeeId);

  const { activeBranchId, switchBranch, activeOrgId, switchOrg, branches, isLoading: isDataLoading } = useData();
  
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
      const current = userOrgs.find(o => o.id === activeOrgId) || userOrgs[0];
      setActiveOrg(current);
    }
  }, [userOrgs, activeOrgId]);

  const activeBranch = branches.find(b => b.id === activeBranchId);
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

  const handleModuleClick = (
    moduleId: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
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
        const module = menuItems.find(m => m.id === moduleId);
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
          src={darkMode ? '/logo_icon_white.svg' : '/logo_icon_black.svg'}
          alt={appTitle}
          className='h-8 w-auto'
          id="navbar-logo-icon"
        />
        <div className='hidden md:flex items-center' id="navbar-app-title" dir="ltr">
          {"Zinc".split('').map((char, index) => (
            <span 
              key={index} 
              id={`nav-char-${char}-${index}`}
              className="text-lg font-bold tracking-tight text-gray-900 dark:text-white transition-transform hover:scale-125 hover:text-primary-500 cursor-default"
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      {/* Desktop: Horizontal Module Tabs */}
      <div
        className={`hidden md:flex items-center gap-0.5 flex-1 scrollbar-hide ${activeDropdown && navStyle === 2 ? 'overflow-hidden' : 'overflow-x-auto'}`}
        ref={dropdownRef}
        onWheel={handleWheel}
      >
        {menuItems
          .filter((m) => (m.id !== 'test' || developerMode))
          .map((module) => {
            const isActive = activeModule === module.id;
            const isDropdownOpen = activeDropdown === module.id;
            const hasPage = module.hasPage !== false; // Default to true if not specified
            const hasImplementedSubItems =
              module.submenus?.some((submenu) =>
                submenu.items.some((item) => typeof item === 'object' && !!item.view)
              ) ?? false;

            const isEffectivelyDisabled =
              !developerMode && !hasPage && !hasImplementedSubItems;

            return (
              <div 
                key={module.id} 
                id={`navbar-tab-${module.id}`}
                className='relative group/item' 
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onMouseEnter={(e) => handleMouseEnter(module.id, e)}
                  onClick={(e) => handleModuleClick(module.id, e)}
                  disabled={isEffectivelyDisabled}
                  className={`main-nav-tab flex items-center gap-2 px-2.5 py-1 rounded-lg whitespace-nowrap relative type-interactive transition-all duration-200
                      ${
                        isEffectivelyDisabled
                          ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600'
                          : isActive
                            ? `bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400 font-bold shadow-xs border-(--border-divider)`
                            : isDropdownOpen
                              ? `bg-(--bg-navbar-hover) text-gray-800 dark:text-gray-200 font-medium`
                              : 'text-gray-600 dark:text-gray-400 hover:bg-(--bg-navbar-hover) hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  title={!hasPage && !hasImplementedSubItems && navStyle !== 2 ? t.settings.comingSoon : ''}
                >
                  <span
                    className={`flex items-center justify-center`}
                  >
                    {(() => {
                      const iconName = module.icon || module.id;
                      const IconComponent = getIconByName(iconName);
                      return (
                        <IconComponent 
                          size={22} 
                          active={isActive || isDropdownOpen}
                          className="transition-all duration-200" 
                        />
                      );
                    })()}
                  </span>

                  <span className='text-sm font-medium'>
                    {getMenuTranslation(module.label, language)}
                  </span>

                  {isActive && (hasPage || hasImplementedSubItems) && navStyle !== 2 && (
                    <motion.div
                      layoutId="nav-indicator"
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1.5px] bg-primary-600 rounded-full`}
                    />
                  )}
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && navStyle === 2 && (
                  <SidebarDropdown
                    module={module}
                    currentView={activeModule === module.id ? currentView || '' : ''}
                    onNavigate={(viewId) => {
                      // Update active module to ensure highlighting works
                      onModuleChange(module.id);

                      if (onNavigate) {
                        onNavigate(viewId);
                      }

                      setActiveDropdown(null);
                      setActiveAnchor(null);
                    }}
                    onClose={() => {
                      setActiveDropdown(null);
                      setActiveAnchor(null);
                    }}
                    theme={theme}
                    language={language}
                    hideInactiveModules={hideInactiveModules}
                    blur={sidebarBlur}
                    anchorEl={activeAnchor}
                    onMouseEnter={cancelClose}
                    onMouseLeave={handleMouseLeave}
                    onOpenInWindow={onOpenInWindow}
                  />
                )}
              </div>
            );
          })}
      </div>

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
            <Icons.Menu size="var(--icon-navbar-mobile)" />
          </button>
        </div>
      )}

      {/* Right Side Actions (Desktop) */}
      {authService.getCurrentUserSync() && (
      <div className='hidden md:flex items-center gap-2 ltr:ml-4 rtl:mr-4'>


        {/* User Profile & Settings */}
        <div className='relative' ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-3 p-1 ltr:pr-3 rtl:pl-3 rounded-full border border-transparent hover:border-(--border-divider) hover:bg-(--bg-navbar-hover) ${showProfileMenu ? 'border-(--border-divider) bg-(--bg-navbar-hover)' : ''}`}
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt='Profile'
                className='w-8 h-8 rounded-full object-cover border border-(--border-divider)'
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-full border border-white/20"
                style={{
                  backgroundColor: currentTheme.hex,
                  width: '32px',
                  height: '32px',
                }}
              >
                <Icons.Store size="var(--icon-md)" stroke={2.5} color="white" />
              </div>
            )}
            <div className='hidden md:flex flex-col items-start'>
                <span className='text-xs font-bold text-gray-700 dark:text-gray-200 leading-none mb-0.5'>
                  {currentEmployeeId 
                    ? (currentEmployee?.name || authService.getCurrentUserSync()?.username || (language === 'AR' ? 'Zinc' : 'Zinc'))
                    : (language === 'AR' ? 'تسجيل دخول الموظف' : 'Employee Login')
                  }
                </span>
                {currentEmployeeId && (
                  <span className='text-[10px] text-gray-400 leading-none h-2.5 flex items-center'>
                    {isDataLoading || !activeBranch ? (
                      <span className="w-16 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full" />
                    ) : (
                      activeBranch.name
                    )}
                  </span>
                )}
            </div>
            <Icons.ExpandMore size="var(--icon-base)" className="hidden md:block text-gray-400" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className='absolute ltr:right-0 rtl:left-0 mt-2 w-72 bg-(--bg-menu) rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.15)] dark:shadow-[0_0_15px_rgba(0,0,0,0.4)] border border-(--border-divider) overflow-hidden z-50 animate-fade-in'>
              {/* User Info */}
              <div className='p-4 border-b border-(--border-divider) bg-(--bg-page-surface)'>
                <div className='flex items-center gap-3'>
                  <div className='relative group'>
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt='Profile'
                        className='w-12 h-12 rounded-full object-cover border border-(--border-divider)'
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center rounded-full border border-white/10"
                        style={{
                          backgroundColor: currentTheme.hex,
                          width: '48px',
                          height: '48px',
                        }}
                      >
                        <Icons.Store size="var(--icon-lg)" stroke={2} color="white" />
                      </div>
                    )}
                    {currentEmployeeId && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          width: '20px',
                          height: '20px',
                          minWidth: '20px',
                          minHeight: '20px',
                        }}
                        className='absolute bottom-0 right-0 w-5 h-5 bg-black/30 backdrop-blur-xs text-white rounded-full flex items-center justify-center hover:bg-black/50 shadow-xs'
                        title='Change Photo'
                      >
                        <Icons.Edit size="var(--icon-xs)" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-900 dark:text-white'>
                      {currentEmployeeId 
                        ? (currentEmployee?.name || authService.getCurrentUserSync()?.username || (language === 'AR' ? 'Zinc' : 'Zinc'))
                        : (language === 'AR' ? 'تسجيل دخول الموظف' : 'Employee Login')
                      }
                    </h3>
                    <div className='flex items-center gap-2'>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {isDataLoading || !activeOrg ? (
                          <span className="inline-block w-20 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full" />
                        ) : (
                          activeOrg.name
                        )}
                      </p>
                      {currentEmployeeId && (
                        <>
                          <span className='w-1 h-1 bg-gray-300 rounded-full' />
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {isDataLoading || !activeBranch ? (
                              <span className="inline-block w-12 h-2 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full" />
                            ) : (
                              activeBranch.name
                            )}
                          </p>
                        </>
                      )}
                      {profileImage && (
                        <button
                          onClick={() => setProfileImage(null)}
                          className='text-[10px] text-red-500 hover:text-red-600 hover:underline'
                          title='Remove Photo'
                        >
                          {t.profile.reset}
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type='file'
                    ref={fileInputRef}
                    className='hidden'
                    accept='image/*'
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Branch Management & Switcher (Only show if employee is logged in) */}
              {currentEmployeeId && (
                <div className='p-2 border-t border-(--border-divider)'>
                  <div className='flex items-center justify-between px-2 mb-2'>
                    <div className='flex items-center gap-1.5'>
                      <Icons.Branch size={16} className="text-gray-400" />
                      <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>
                        {language === 'AR' ? 'فروع الصيدلية' : 'Pharmacy Branches'}
                      </p>
                    </div>
                    {permissionsService.isOrgAdmin() && (
                      <button
                        onClick={() => {
                          if (onNavigate) onNavigate('branch-management');
                          setShowProfileMenu(false);
                        }}
                        className='text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:bg-(--bg-menu-hover) flex items-center gap-1 py-1 px-3 rounded-full border border-primary-100 dark:border-primary-900/50 hover:shadow-sm active:scale-95'
                      >
                        <Icons.Settings size={13} />
                        {language === 'AR' ? 'الإدارة' : 'Manage'}
                      </button>
                    )}
                  </div>

                  {branches.length > 1 ? (
                    <div className='space-y-1 max-h-[200px] overflow-y-auto scrollbar-hide'>
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={async () => {
                            if (activeBranchId === branch.id) return;
                            await switchBranch(branch.id);                           
                            setShowProfileMenu(false);
                          }}
                          className={`w-full p-2 text-sm font-medium rounded-lg flex items-center justify-between transition-colors
                            ${
                              activeBranchId === branch.id
                                ? 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-(--bg-menu-hover)'
                            }
                          `}
                        >
                          <div className='flex items-center gap-2'>
                            {activeBranchId === branch.id ? <Icons.Success size="var(--icon-md)" /> : <Icons.Circle size="var(--icon-md)" />}
                            {branch.name}
                          </div>
                          {branch.code && <span className='text-[10px] opacity-60'>{branch.code}</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className='px-2.5 py-2 mt-1 mx-1 text-xs text-gray-500 dark:text-gray-400 bg-(--bg-page-surface) rounded-lg border border-(--border-divider) flex items-center gap-2'>
                      <Icons.Info size={16} className="text-gray-400" />
                      {language === 'AR' ? 'فرع واحد متاح.' : 'One branch available.'}
                    </div>
                  )}
                </div>
              )}

              {/* Management & Settings (Combined) */}
              {currentEmployeeId && (permissionsService.isOrgAdmin() || permissionsService.can('settings.view')) && (
                <div className='flex flex-col gap-1 p-2 border-t border-(--border-divider)'>
                  {permissionsService.isOrgAdmin() && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        if (onNavigate) onNavigate('org-settings');
                      }}
                      className='flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-(--bg-menu-hover) w-full'
                    >
                      <Icons.Organization size="var(--icon-md)" />
                      {language === 'AR' ? 'إدارة المنظمة' : 'Manage Organization'}
                    </button>
                  )}
                  {permissionsService.can('settings.view') && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        if (onNavigate) onNavigate('branch-management');
                      }}
                      className='flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-(--bg-menu-hover) w-full'
                    >
                      <Icons.Settings size="var(--icon-md)" />
                      {language === 'AR' ? 'إعدادات الفرع' : 'Branch Settings'}
                    </button>
                  )}
                </div>
              )}

              {/* Settings have been moved to StatusBar Settings Menu */}

              {/* Printer Settings Button */}
              {currentEmployeeId && (
                <div className='p-2 border-t border-(--border-divider)'>
                  <button
                    onClick={() => {
                      setShowPrinterSettings(true);
                      setShowProfileMenu(false);
                    }}
                    className={`w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-(--bg-menu-hover) rounded-lg flex items-center justify-center gap-2`}
                  >
                    <Icons.Print size="var(--icon-md)" />
                    {(t as any).printerSettings?.title || 'Printer Settings'}
                  </button>
                </div>
              )}



              {/* Sign Out */}
              <div className='p-2 border-t border-(--border-divider) bg-(--bg-page-surface)'>
                <button
                  onClick={async () => {
                    if (isLoggingOut) return;
                    setIsLoggingOut(true);
                    try {
                      if (onLogout) {
                        await onLogout();
                      } else {
                        await authService.logout();
                        if (onNavigate) {
                          onNavigate('login-test');
                        } else {
                          window.location.reload();
                        }
                      }
                      setShowProfileMenu(false);
                    } catch (error) {
                      console.error('Logout failed', error);
                    } finally {
                      // We might unmount, so this is just for safety if we don't navigate
                      setIsLoggingOut(false);
                    }
                  }}
                  disabled={isLoggingOut}
                  className='w-full p-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isLoggingOut ? (
                    <>
                      <Icons.Loading size="var(--icon-md)" className="animate-spin" />
                      {t.profile.signOut}...
                    </>
                  ) : (
                    <>
                      <Icons.Logout size="var(--icon-md)" />
                      {t.profile.signOut}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
