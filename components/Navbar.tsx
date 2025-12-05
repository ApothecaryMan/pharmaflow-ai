import React, { useState, useRef, useEffect } from 'react';
import { MenuItem } from '../menuData';
import { getMenuTranslation } from '../menuTranslations';
import { ThemeColor, Language } from '../types';
import { TRANSLATIONS } from '../translations';

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
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
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
  onLogoClick
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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

  return (
    <nav 
      className="h-16 flex items-center px-4 sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Logo & Title */}
      <div 
        className="flex items-center gap-3 ltr:mr-6 rtl:ml-6 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onLogoClick}
      >
        <div className={`w-10 h-10 rounded-xl bg-${theme}-600 flex items-center justify-center shadow-lg shadow-${theme}-500/30`}>
          <span className="material-symbols-rounded text-white text-[24px]">local_pharmacy</span>
        </div>
        <h1 className="hidden md:block text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 whitespace-nowrap">
          {appTitle}
        </h1>
      </div>

      {/* Desktop: Horizontal Module Tabs */}
      <div className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
        {menuItems.map((module) => {
          const isActive = activeModule === module.id;
          const hasPage = module.hasPage !== false; // Default to true if not specified
          
          return (
            <button
              key={module.id}
              onClick={() => hasPage && onModuleChange(module.id)}
              disabled={!hasPage}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap group relative
                ${!hasPage 
                  ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : isActive
                    ? `bg-${theme}-100 dark:bg-${theme}-900/30 text-${theme}-700 dark:text-${theme}-400 font-semibold shadow-sm`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'}
              `}
              title={!hasPage ? 'قريباً / Coming Soon' : ''}
            >
              <span className={`material-symbols-rounded text-[20px] transition-transform ${isActive && hasPage ? 'icon-filled scale-110' : hasPage ? 'group-hover:scale-105' : ''}`}>
                {module.icon}
              </span>
              <span className="text-sm font-medium">
                {getMenuTranslation(module.label, language)}
              </span>
              {isActive && hasPage && (
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-${theme}-600 rounded-full`}></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: Hamburger Menu */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden ltr:ml-auto rtl:mr-auto p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <span className="material-symbols-rounded text-[24px]">menu</span>
      </button>

      {/* Right Side Actions (Desktop) */}
      <div className="hidden md:flex items-center gap-2 ltr:ml-4 rtl:mr-4">
        {/* Notifications */}
        <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
          <span className="material-symbols-rounded text-[22px]">notifications</span>
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
        </button>
        
        {/* User Profile & Settings */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`p-1 rounded-full transition-all ring-2 ring-transparent hover:ring-slate-200 dark:hover:ring-slate-700 ${showProfileMenu ? 'ring-slate-200 dark:ring-slate-700' : ''}`}
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className={`w-8 h-8 rounded-full bg-${theme}-100 dark:bg-${theme}-900/30 flex items-center justify-center text-${theme}-600 dark:text-${theme}-400 font-bold text-xs border border-${theme}-200 dark:border-${theme}-800`}>
                JD
              </div>
            )}
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-fade-in">
              {/* User Info */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    {profileImage ? (
                       <img src={profileImage} alt="Profile" className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                    ) : (
                       <div className={`w-12 h-12 rounded-full bg-${theme}-100 dark:bg-${theme}-900/30 flex items-center justify-center text-${theme}-600 dark:text-${theme}-400 font-bold text-lg`}>
                         JD
                       </div>
                    )}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shadow-sm"
                      title="Change Photo"
                    >
                      <span className="material-symbols-rounded text-[12px]">edit</span>
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{t.profile.name}</h3>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t.profile.role}</p>
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
                  <label className="text-xs font-bold text-slate-400 uppercase">{t.settings.theme}</label>
                  <div className="flex gap-2 flex-wrap">
                    {availableThemes.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => setTheme(t)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${currentTheme.name === t.name ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600 scale-110' : ''}`}
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
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-slate-400">dark_mode</span>
                    {t.settings.darkMode}
                  </label>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? `bg-${theme}-600` : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 start-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Language Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">{t.settings.language}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${language === lang.code ? `bg-${theme}-100 dark:bg-${theme}-900/30 text-${theme}-700 dark:text-${theme}-400 ring-1 ring-${theme}-500/20` : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Transform Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-slate-400">text_fields</span>
                    {language === 'EN' ? 'Uppercase Names' : 'أسماء بأحرف كبيرة'}
                  </label>
                  <button
                    onClick={() => setTextTransform(textTransform === 'normal' ? 'uppercase' : 'normal')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${textTransform === 'uppercase' ? `bg-${theme}-600` : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 start-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${textTransform === 'uppercase' ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>

              {/* Sign Out */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <button className="w-full p-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">logout</span>
                  {t.profile.signOut}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
});
