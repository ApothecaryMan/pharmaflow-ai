import React, { useState, useRef, useEffect } from 'react';
import { authService } from '../../services/auth/authService';
import { MenuItem } from '../../config/menuData';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { Avatar } from '@mui/material';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { ThemeColor, Language } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { SidebarDropdown } from './SidebarDropdown';
import { Switch } from '../common/Switch';
import { UserRole } from '../../config/permissions';
import { SettingsMenu } from './StatusBar/items/SettingsMenu';

import { PrinterSettings } from '../settings/PrinterSettings';

import { useSettings } from '../../context';
import { ContextMenuTrigger } from '../common/ContextMenu';

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
  currentView?: string;
  onNavigate?: (view: string) => void;
  employees?: Array<{ id: string; name: string; employeeCode: string }>;
  currentEmployeeId?: string | null;
  setCurrentEmployeeId?: (id: string | null) => void;
  onLogout?: () => void;
  userRole?: UserRole;
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
  userRole
}) => {
  const {
    language,
    theme: currentTheme,
    darkMode,
    navStyle = 1,
    sidebarBlur,
    hideInactiveModules,
    developerMode
  } = useSettings();
  
  const theme = currentTheme.primary;

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleModuleClick = (moduleId: string, hasPage: boolean, event: React.MouseEvent<HTMLButtonElement>) => {
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
       if (hasPage) {
           onModuleChange(moduleId);
       }
    }
  };

  const handleMouseEnter = (moduleId: string, event: React.MouseEvent) => {
    if (navStyle === 2 && typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
       if (closeTimeoutRef.current) {
         clearTimeout(closeTimeoutRef.current);
         closeTimeoutRef.current = null;
       }
       setActiveDropdown(moduleId);
       setActiveAnchor(event.currentTarget as HTMLElement);
    }
  };

  const handleMouseLeave = () => {
    if (navStyle === 2 && typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
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
    return words.map(word => word[0]).join('').toUpperCase().substring(0, 3);
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
      className="h-12 flex items-center px-4 sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      {/* Logo & Title */}
      <div 
        className="flex items-center gap-2 ltr:mr-6 rtl:ml-6 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onLogoClick}
      >
        {/* Dynamic Logo based on darkMode prop */}
        <img 
          src={darkMode ? "/logo_icon_white.svg" : "/logo_icon_black.svg"} 
          alt={appTitle} 
          className="h-8 w-auto" 
        />
        <img 
          src={darkMode ? "/logo_word_white.svg" : "/logo_word_black.svg"}
          alt="Zinc"
          className="h-5 w-auto hidden md:block"
        />
      </div>

      {/* Desktop: Horizontal Module Tabs */}
      <div 
        className={`hidden md:flex items-center gap-0.5 flex-1 scrollbar-hide ${activeDropdown && navStyle === 2 ? 'overflow-hidden' : 'overflow-x-auto'}`} 
        ref={dropdownRef}
        onWheel={handleWheel}
      >
        {menuItems.filter(m => m.id !== 'settings' && (m.id !== 'test' || developerMode)).map((module) => {
          const isActive = activeModule === module.id;
          const isDropdownOpen = activeDropdown === module.id;
          const hasPage = module.hasPage !== false; // Default to true if not specified
          const hasImplementedSubItems = module.submenus?.some(submenu => 
              submenu.items.some(item => typeof item === 'object' && !!item.view)
          ) ?? false;
          
          const isEffectivelyDisabled = (!developerMode) && (navStyle === 2 
                ? !hasPage && !hasImplementedSubItems 
                : !hasPage);

          return (
            <div key={module.id} className="relative group/item" onMouseLeave={handleMouseLeave}>
                <ContextMenuTrigger
                  actions={[
                    { 
                      label: t.global.actions.openInWindow, 
                      icon: 'open_in_new', 
                      action: () => { /* Placeholder */ } 
                    }
                  ]}
                >
                  <button
                    onMouseEnter={(e) => handleMouseEnter(module.id, e)}
                    onClick={(e) => handleModuleClick(module.id, hasPage, e)}
                    disabled={isEffectivelyDisabled}
                    className={`main-nav-tab flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-200 whitespace-nowrap relative type-interactive
                      ${isEffectivelyDisabled
                              ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600'
                              : isActive 
                                  ? `bg-${theme}-100 dark:bg-${theme}-900/30 text-${theme}-700 dark:text-${theme}-400 font-semibold shadow-sm`
                                  : isDropdownOpen
                                      ? `bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 font-medium`
                                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-800 dark:hover:text-gray-200'
                      }
                    `}
                    title={!hasPage && navStyle !== 2 ? t.settings.comingSoon : ''}
                  >
                    <span className={`flex items-center justify-center ${(isActive || isDropdownOpen) && hasPage ? 'icon-filled' : ''}`}>
                      <span className={`material-symbols-rounded text-[20px] ${module.id === 'dashboard' ? 'text-[22px]' : ''}`}>
                        {module.icon}
                      </span>
                    </span>

                    <span className="text-sm font-medium">
                      {getMenuTranslation(module.label, language)}
                    </span>

                    {isActive && hasPage && navStyle !== 2 && (
                      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-${theme}-600 rounded-full`}></div>
                    )}
                  </button>
                </ContextMenuTrigger>

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
                        hideInactiveModules={hideInactiveModules && !developerMode}
                        blur={sidebarBlur}
                        anchorEl={activeAnchor}
                        onMouseEnter={cancelClose}
                        onMouseLeave={handleMouseLeave}
                    />
                )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Hamburger Menu & Settings */}
      <div className="md:hidden ltr:ml-auto rtl:mr-auto flex items-center gap-1">
        <SettingsMenu 
          userRole={userRole} 
          dropDirection="down" 
          align="end" 
          triggerVariant="navbar" 
          triggerSize={26} 
        />
        <button
          onClick={onMobileMenuToggle}
          className="flex items-center justify-center w-10 h-10 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <span className="material-symbols-rounded text-[28px]">menu</span>
        </button>
      </div>

      {/* Right Side Actions (Desktop) */}
      <div className="hidden md:flex items-center gap-2 ltr:ml-4 rtl:mr-4">


        {/* Settings Module (Relocated) */}
        {menuItems.find(m => m.id === 'settings') && (() => {
            const settingsModule = menuItems.find(m => m.id === 'settings')!;
            const isActive = activeModule === settingsModule.id;
            const isDropdownOpen = activeDropdown === settingsModule.id;
            const hasPage = settingsModule.hasPage !== false;
            const hasImplementedSubItems = settingsModule.submenus?.some(submenu => 
              submenu.items.some(item => typeof item === 'object' && !!item.view)
            ) ?? false;
            
            const isEffectivelyDisabled = (!developerMode) && (navStyle === 2 
                ? !hasPage && !hasImplementedSubItems 
                : !hasPage);

            return (
                <div className="relative group/settings" onMouseLeave={handleMouseLeave}>
                    <ContextMenuTrigger
                      actions={[
                        { 
                          label: t.global.actions.openInWindow, 
                          icon: 'open_in_new', 
                          action: () => { /* Placeholder */ } 
                        }
                      ]}
                    >
                      <button
                          onMouseEnter={(e) => handleMouseEnter(settingsModule.id, e)}
                          onClick={(e) => handleModuleClick(settingsModule.id, hasPage, e)}
                          disabled={isEffectivelyDisabled}
                          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors relative
                              ${isActive 
                                  ? `bg-${theme}-100 dark:bg-${theme}-900/30 text-${theme}-600 dark:text-${theme}-400`
                                  : isDropdownOpen
                                      ? `bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200`
                                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }
                          `}
                          title={getMenuTranslation(settingsModule.label, language)}
                      >
                          <span className={`material-symbols-rounded text-[22px] ${isActive || isDropdownOpen ? 'icon-filled' : ''}`}>
                              {settingsModule.icon}
                          </span>
                      </button>
                    </ContextMenuTrigger>

                     {/* Dropdown Menu for Settings */}
                    {isDropdownOpen && navStyle === 2 && (
                        <SidebarDropdown 
                            module={settingsModule}
                            currentView={activeModule === settingsModule.id ? currentView || '' : ''}
                            onNavigate={(viewId) => {
                                onModuleChange(settingsModule.id);
                                if (onNavigate) onNavigate(viewId);
                                setActiveDropdown(null);
                                setActiveAnchor(null);
                            }}
                            onClose={() => {
                                setActiveDropdown(null);
                                setActiveAnchor(null);
                            }}
                            theme={theme}
                            language={language}
                            hideInactiveModules={hideInactiveModules && !developerMode}
                            blur={sidebarBlur}
                            anchorEl={activeAnchor}
                            onMouseEnter={cancelClose}
                            onMouseLeave={handleMouseLeave}
                        />
                    )}
                </div>
            );
        })()}
        
        {/* User Profile & Settings */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-3 p-1 ltr:pr-3 rtl:pl-3 rounded-full transition-all ring-1 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${showProfileMenu ? 'ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800' : ''}`}
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
            ) : (
                <Avatar 
                    sx={{ 
                        bgcolor: currentTheme.hex,
                        width: 32, 
                        height: 32,
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <span className="material-symbols-rounded text-white text-[18px]">store</span>
                </Avatar>
            )}
            <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-none mb-0.5">
                    {language === 'AR' ? 'Zinc' : 'Zinc'}
                </span>
                <span className="text-[10px] text-gray-400 leading-none">
                    {language === 'AR' ? 'الفرع الرئيسي' : 'Main Branch'}
                </span>
            </div>
            <span className="hidden md:block material-symbols-rounded text-gray-400 text-[16px]">expand_more</span>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fade-in">
              {/* User Info */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    {profileImage ? (
                       <img src={profileImage} alt="Profile" className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                    ) : (
                       <Avatar 
                            sx={{ 
                                bgcolor: currentTheme.hex,
                                width: 48, 
                                height: 48,
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            <span className="material-symbols-rounded text-white text-[24px]">store</span>
                        </Avatar>
                    )}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      style={{ 
                        WebkitAppearance: 'none', 
                        appearance: 'none',
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        minHeight: '20px'
                      }}
                      className="absolute bottom-0 right-0 w-5 h-5 bg-black/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors shadow-sm"
                      title="Change Photo"
                    >
                      <span className="material-symbols-rounded text-[12px]">edit</span>
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                        {language === 'AR' ? 'Zinc' : 'Zinc'}
                    </h3>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {language === 'AR' ? 'الفرع الرئيسي' : 'Main Branch'}
                        </p>
                        {profileImage && (
                        <button 
                            onClick={() => setProfileImage(null)} 
                            className="text-[10px] text-red-500 hover:text-red-600 hover:underline"
                            title="Remove Photo"
                        >
                            {t.profile.reset}
                        </button>
                        )}
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>
              </div>



              {/* Settings have been moved to StatusBar Settings Menu */}

              {/* Printer Settings Button */}
              <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={() => {
                    setShowPrinterSettings(true);
                    setShowProfileMenu(false);
                  }}
                  className={`w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-${theme}-50 dark:hover:bg-${theme}-900/20 rounded-lg transition-colors flex items-center justify-center gap-2`}
                >
                  <span className="material-symbols-rounded text-[18px]">print</span>
                  {(t as any).printerSettings?.title || 'Printer Settings'}
                </button>
              </div>

              {/* Sign Out */}
              <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
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
                  className="w-full p-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                      <>
                        <span className="material-symbols-rounded text-[18px] animate-spin">progress_activity</span>
                        {t.profile.signOut}...
                      </>
                  ) : (
                      <>
                        <span className="material-symbols-rounded text-[18px]">logout</span>
                        {t.profile.signOut}
                      </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
