import React, { useState, useRef, useEffect } from 'react';
import { MenuItem } from '../../config/menuData';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { Avatar } from '@mui/material';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { ThemeColor, Language } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { SidebarDropdown } from './SidebarDropdown';
import { Switch } from '../common/Switch';
import { DashboardIcon } from './DashboardIcon';
import { PrinterSettings } from '../settings/PrinterSettings';

interface NavbarProps {
  menuItems: MenuItem[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  theme: string;
  darkMode: boolean;
  appTitle: string;
  onMobileMenuToggle: () => void;
  isMobile?: boolean;
  language: 'EN' | 'AR';
  setTheme: (theme: ThemeColor) => void;
  setDarkMode: (mode: boolean) => void;
  setLanguage: (lang: Language) => void;
  availableThemes: ThemeColor[];
  availableLanguages: { code: Language; label: string }[];
  currentTheme: ThemeColor;
  profileImage: string | null;
  setProfileImage: (image: string | null) => void;
  textTransform: 'normal' | 'uppercase';
  setTextTransform: (transform: 'normal' | 'uppercase') => void;
  onLogoClick?: () => void;
  hideInactiveModules?: boolean;
  setHideInactiveModules?: (hide: boolean) => void;
  navStyle?: 1 | 2 | 3;
  setNavStyle?: (style: 1 | 2 | 3) => void;
  currentView?: string;
  onNavigate?: (view: string) => void;
  developerMode?: boolean;
  setDeveloperMode?: (mode: boolean) => void;
}

const NavbarComponent: React.FC<NavbarProps> = ({
  menuItems,
  activeModule,
  onModuleChange,
  theme,
  darkMode,
  appTitle,
  onMobileMenuToggle,
  isMobile = false,
  language,
  setTheme,
  setDarkMode,
  setLanguage,
  availableThemes,
  availableLanguages,
  currentTheme,
  profileImage,
  setProfileImage,
  textTransform,
  setTextTransform,
  onLogoClick,
  hideInactiveModules,
  setHideInactiveModules,
  navStyle = 1,
  setNavStyle,
  currentView,
  onNavigate,
  developerMode = false,
  setDeveloperMode
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
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

  const getInitials = (name: string) => {
    if (!name) return '';
    // Remove titles like Dr, Dr., Doctor, Phd, match Arabic titles too
    const cleaned = name.replace(/\b(Dr|Dr\.|Doctor|دكتور|د\.?)\b/gi, '').trim();
    const words = cleaned.split(/\s+/);
    if (words.length === 0) return '';
    // Get first letter of every word, cap at 3 chars
    return words.map(word => word[0]).join('').toUpperCase().substring(0, 3);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (dropdownRef.current) {
      dropdownRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <nav 
      className="h-16 flex items-center px-4 sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      {/* Logo & Title */}
      <div 
        className="flex items-center gap-3 ltr:mr-6 rtl:ml-6 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onLogoClick}
      >
        <img 
          src={darkMode ? "/logo_full_dark.svg" : "/logo_full.svg"} 
          alt={appTitle} 
          className="h-10 w-auto" 
        />
      </div>

      {/* Desktop: Horizontal Module Tabs */}
      <div 
        className={`hidden md:flex items-center gap-1 flex-1 scrollbar-hide ${activeDropdown && navStyle === 2 ? 'overflow-hidden' : 'overflow-x-auto'}`} 
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
          
          const isEffectivelyDisabled = navStyle === 2 
                ? !hasPage && !hasImplementedSubItems 
                : !hasPage;

          return (
            <div key={module.id} className="relative group/item">
                <button
                onClick={(e) => handleModuleClick(module.id, hasPage, e)}
                disabled={isEffectivelyDisabled}
                className={`main-nav-tab flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap relative type-interactive
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
            <span className={`transition-transform flex items-center justify-center ${(isActive || isDropdownOpen) && hasPage ? 'icon-filled scale-110' : hasPage ? 'group-hover/item:scale-105' : ''}`}>
                {module.id === 'dashboard' ? (
                  <DashboardIcon className="w-5 h-5" />
                ) : (
                  <span className="material-symbols-rounded text-[20px]">
                    {module.icon}
                  </span>
                )}
            </span>

                <span className="text-sm font-medium">
                    {getMenuTranslation(module.label, language)}
                </span>
                
                {/* Chevron for Dropdown Style */}
                {navStyle === 2 && module.submenus && module.submenus.length > 0 && (
                     <span className={`material-symbols-rounded text-[16px] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                        expand_more
                     </span>
                )}

                {isActive && hasPage && navStyle !== 2 && (
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-${theme}-600 rounded-full`}></div>
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
                        anchorEl={activeAnchor}
                    />
                )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Hamburger Menu */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden ltr:ml-auto rtl:mr-auto p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <span className="material-symbols-rounded text-[24px]">menu</span>
      </button>

      {/* Right Side Actions (Desktop) */}
      <div className="hidden md:flex items-center gap-2 ltr:ml-4 rtl:mr-4">
        {/* Notifications */}
        <button className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative">
          <span className="material-symbols-rounded text-[22px]">notifications</span>
          <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900"></div>
        </button>

        {/* Settings Module (Relocated) */}
        {menuItems.find(m => m.id === 'settings') && (() => {
            const settingsModule = menuItems.find(m => m.id === 'settings')!;
            const isActive = activeModule === settingsModule.id;
            const isDropdownOpen = activeDropdown === settingsModule.id;
            const hasPage = settingsModule.hasPage !== false;
            const hasImplementedSubItems = settingsModule.submenus?.some(submenu => 
              submenu.items.some(item => typeof item === 'object' && !!item.view)
            ) ?? false;
            
            const isEffectivelyDisabled = navStyle === 2 
                ? !hasPage && !hasImplementedSubItems 
                : !hasPage;

            return (
                <div className="relative group/settings">
                    <button
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
                            hideInactiveModules={hideInactiveModules}
                            anchorEl={activeAnchor}
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
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    {getInitials("Dr Mohamed Rezk")}
                </Avatar>
            )}
            <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-none mb-0.5">Dr Mohamed Rezk</span>
                <span className="text-[10px] text-gray-400 leading-none">{t.profile.role}</span>
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
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            {getInitials("Dr Mohamed Rezk")}
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
                      className="absolute bottom-0 right-0 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors shadow-sm"
                      title="Change Photo"
                    >
                      <span className="material-symbols-rounded text-[12px]">edit</span>
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Dr Mohamed Rezk</h3>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t.profile.role}</p>
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

              {/* Settings */}
              <div className="p-4 space-y-4">
                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">{t.settings.theme}</label>
                  <div className="flex gap-2 flex-wrap">
                    {availableThemes.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => setTheme(t)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${currentTheme.name === t.name ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-110' : ''}`}
                        style={{ backgroundColor: t.hex }}
                        title={t.name}
                      >
                        {currentTheme.name === t.name && (
                          <span className="material-symbols-rounded text-white text-[16px] drop-shadow-md">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-gray-400">dark_mode</span>
                    {t.settings.darkMode}
                  </label>
                  <Switch 
                    checked={darkMode}
                    onChange={setDarkMode}
                    theme={theme}
                  />
                </div>

                {/* Language Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">{t.settings.language}</label>
                  <SegmentedControl
                    value={language}
                    onChange={(val) => setLanguage(val as Language)}
                    color={currentTheme.name}
                    size="xs"
                    options={availableLanguages.map(lang => ({
                      label: lang.label,
                      value: lang.code
                    }))}
                  />
                </div>

                {/* Text Transform Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-gray-400">text_fields</span>
                    {t.settings.textTransform}
                  </label>
                  <Switch 
                    checked={textTransform === 'uppercase'}
                    onChange={() => setTextTransform(textTransform === 'normal' ? 'uppercase' : 'normal')}
                    theme={theme}
                  />
                </div>

                {/* Hide Inactive Tabs Toggle (Renamed to Focus Mode) */}
                {setHideInactiveModules && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-gray-400">filter_center_focus</span>
                    {t.settings.focusMode}
                  </label>
                  <Switch 
                    checked={hideInactiveModules}
                    onChange={(val) => setHideInactiveModules && setHideInactiveModules(val)}
                    theme={theme}
                  />
                </div>
                )}

                {/* Navbar/Sidebar Style Switch */}
                {setNavStyle && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      {t.settings.designStyle}
                    </label>
                    <SegmentedControl
                      value={navStyle}
                      onChange={(val) => setNavStyle && setNavStyle(val as 1 | 2 | 3)}
                      color={currentTheme.name}
                      size="xs"
                      options={[
                        { label: t.settings.designStyleFull, value: 1 },
                        { label: t.settings.designStyleNavbar, value: 2 }
                      ]}
                    />
                  </div>
                )}

                {/* Developer Mode Toggle */}
                {setDeveloperMode && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-gray-400">science</span>
                    {t.settings.developerMode}
                  </label>
                  <Switch 
                    checked={developerMode}
                    onChange={(newMode) => {
                      setDeveloperMode(newMode);
                      if (!newMode && activeModule === 'test') {
                        onModuleChange('dashboard');
                      }
                    }}
                    theme={theme}
                  />
                </div>
                )}
              </div>

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
                <button className="w-full p-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">logout</span>
                  {t.profile.signOut}
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
