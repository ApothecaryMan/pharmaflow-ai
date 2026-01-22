import React, { useState, useRef, useEffect } from 'react';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { StatusBarItem } from '../StatusBarItem';
import { Switch } from '../../../common/Switch';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { ThemeColor, Language } from '../../../../types';
import { useSmartPosition } from '../../../../hooks/useSmartPosition';
import { AVAILABLE_FONTS_EN, AVAILABLE_FONTS_AR } from '../../../../config/fonts';

export interface SettingsMenuProps {
  language: 'EN' | 'AR';
  // Theme
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  currentTheme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
  availableThemes: ThemeColor[];
  setLanguage: (lang: Language) => void;
  availableLanguages: { code: Language; label: string }[];
  fontFamilyEN: string;
  setFontFamilyEN: (font: string) => void;
  fontFamilyAR: string;
  setFontFamilyAR: (font: string) => void;
  // Text Transform
  textTransform: 'normal' | 'uppercase';
  setTextTransform: (transform: 'normal' | 'uppercase') => void;
  // Focus Mode
  hideInactiveModules?: boolean;
  setHideInactiveModules?: (hide: boolean) => void;
  // Nav Style
  navStyle?: 1 | 2 | 3;
  setNavStyle?: (style: 1 | 2 | 3) => void;
  // Developer Mode
  developerMode?: boolean;
  setDeveloperMode?: (mode: boolean) => void;
  // Dropdown Blur
  dropdownBlur?: boolean;
  setDropdownBlur?: (blur: boolean) => void;
  // Status Bar Settings
  showTicker?: boolean;
  setShowTicker?: (show: boolean) => void;
  showTickerSales?: boolean;
  setShowTickerSales?: (show: boolean) => void;
  showTickerInventory?: boolean;
  setShowTickerInventory?: (show: boolean) => void;
  showTickerCustomers?: boolean;
  setShowTickerCustomers?: (show: boolean) => void;
  showTickerTopSeller?: boolean;
  setShowTickerTopSeller?: (show: boolean) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  language,
  darkMode,
  setDarkMode,
  currentTheme,
  setTheme,
  availableThemes,
  setLanguage,
  availableLanguages,
  fontFamilyEN,
  setFontFamilyEN,
  fontFamilyAR,
  setFontFamilyAR,
  textTransform,
  setTextTransform,
  hideInactiveModules,
  setHideInactiveModules,
  navStyle,
  setNavStyle,
  developerMode,
  setDeveloperMode,
  dropdownBlur,
  setDropdownBlur,
  // Status Bar Settings
  showTicker,
  setShowTicker,
  showTickerSales,
  setShowTickerSales,
  showTickerInventory,
  setShowTickerInventory,
  showTickerCustomers,
  setShowTickerCustomers,
  showTickerTopSeller,
  setShowTickerTopSeller,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusBarExpanded, setStatusBarExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Translations
  const t = TRANSLATIONS[language].settings;

  const [themeExpanded, setThemeExpanded] = useState(false);
  const [typographyExpanded, setTypographyExpanded] = useState(false);
  
  // Use Custom Hook for Themes Position
  const { 
    ref: themesRef, 
    position: themesPos, 
    checkPosition: checkThemesPos,
    resetPosition: resetThemesPos
  } = useSmartPosition({ defaultAlign: 'top' });

  // Use Custom Hook for Quick Statuses Position
  const { 
    ref: quickStatusesRef, 
    position: quickStatusesPos, 
    checkPosition: checkInfoPos,
    resetPosition: resetInfoPos
  } = useSmartPosition({ defaultAlign: 'bottom' });

  // Use Custom Hook for Typography Position
  const { 
    ref: typographyRef, 
    position: typographyPos, 
    checkPosition: checkTypographyPos,
    resetPosition: resetTypographyPos
  } = useSmartPosition({ defaultAlign: 'top' });

  // Reset submenu when main menu is closed
  useEffect(() => {
    if (!isOpen) {
      setStatusBarExpanded(false);
      setThemeExpanded(false);
      setTypographyExpanded(false);
      resetThemesPos();
      resetInfoPos();
      resetTypographyPos();
    }
  }, [isOpen, resetThemesPos, resetInfoPos, resetTypographyPos]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative font-cairo h-full flex items-center" ref={dropdownRef}>
      {/* Settings Button */}
      <StatusBarItem
        icon="settings"
        tooltip={t.settings}
        variant={isOpen ? 'info' : 'default'}
        onClick={() => setIsOpen(!isOpen)}
      />

      {/* Settings Dropdown */}
      {isOpen && (
        <div 
          className="absolute bottom-full start-0 mb-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 backdrop-blur-sm z-40 animate-fade-in origin-bottom-start"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {t.settings}
            </span>
          </div>

          {/* Settings Content */}
          <div className="p-3 space-y-3" style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>
            
            {/* --- Group 1: Appearance --- */}
            
            {/* Themes Nested Menu (Replaces old selector) */}
            <div className="space-y-1 relative" ref={themesRef}>
                {/* Main Row */}
                <div className="w-full flex items-center justify-between py-1 transition-colors">
                {/* Left Side: Icon + Label */}
                <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-[16px]" style={{ color: 'var(--text-secondary)' }}>palette</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t.themesMenu}</span>
                </div>

                {/* Right Side: Arrow */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                          checkThemesPos(); // Check position
                          setThemeExpanded(!themeExpanded);
                          if (!themeExpanded) setStatusBarExpanded(false);
                        }}
                        className="transition-colors"
                        type="button"
                    >
                    <span 
                        className={`material-symbols-rounded text-[16px] transition-transform ${themeExpanded ? 'rotate-180' : ''}`}
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        {themesPos.side === 'left' ? 'chevron_left' : 'chevron_right'}
                    </span>
                    </button>
                </div>
                </div>

                {/* Submenu (Side Pop-out) */}
                {themeExpanded && (
                <div 
                    className={`absolute w-48 rounded-lg shadow-xl border z-40 p-3 space-y-3 ${themesPos.align === 'top' ? 'top-0' : 'bottom-0'}`}
                    style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-primary)',
                        // Dynamic Horizontal
                        [themesPos.side === 'left' ? 'right' : 'left']: '100%',
                        [themesPos.side === 'left' ? 'marginRight' : 'marginLeft']: '12px',
                    }}
                >
                    {/* Theme Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>{t.theme}</label>
                        <div className="flex gap-1.5 flex-wrap">
                            {availableThemes.map((themeOption) => (
                            <button
                                key={themeOption.name}
                                onClick={() => setTheme(themeOption)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${currentTheme.name === themeOption.name ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600 scale-110' : ''}`}
                                style={{ backgroundColor: themeOption.hex }}
                                title={themeOption.name}
                            >
                                {currentTheme.name === themeOption.name && (
                                <span className="material-symbols-rounded text-white text-[12px] drop-shadow-md">check</span>
                                )}
                            </button>
                            ))}
                        </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                            <span className="material-symbols-rounded text-[14px]" style={{ color: 'var(--text-secondary)' }}>dark_mode</span>
                            {t.darkMode}
                        </label>
                        <Switch 
                            checked={darkMode}
                            onChange={setDarkMode}
                            theme={currentTheme.name.toLowerCase()}
                            activeColor={currentTheme.hex}
                        />
                    </div>
                </div>
                )}
            </div>

            {/* Dropdown Blur Toggle */}
            {setDropdownBlur && (
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <span className="material-symbols-rounded text-[14px]" style={{ color: 'var(--text-secondary)' }}>blur_on</span>
                  {t.dropdownBlur}
                </label>
                <Switch 
                  checked={dropdownBlur || false}
                  onChange={(val) => setDropdownBlur(val)}
                  theme={currentTheme.name.toLowerCase()}
                  activeColor={currentTheme.hex}
                />
              </div>
            )}

            {/* Nav Style Switch */}
            {setNavStyle && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  {t.designStyle}
                </label>
                <SegmentedControl
                  value={navStyle || 1}
                  onChange={(val) => setNavStyle(val as 1 | 2 | 3)}
                  color={currentTheme.name.toLowerCase()}
                  size="xs"
                  options={[
                    { label: t.designStyleFull, value: 1 },
                    { label: t.designStyleNavbar, value: 2 }
                  ]}
                />
              </div>
            )}

            {/* Separator */}
            <div className="border-t border-gray-100 dark:border-gray-800 my-1 opacity-50" />

            {/* --- Group 2: Language & Text --- */}
            {/* Language Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>{t.language}</label>
              <SegmentedControl
                value={language}
                onChange={(val) => setLanguage(val as Language)}
                color={currentTheme.name.toLowerCase()}
                size="xs"
                options={availableLanguages.map(lang => ({
                  label: lang.label,
                  value: lang.code
                }))}
              />
            </div>
            
            {/* Text Transform Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <span className="material-symbols-rounded text-[14px]" style={{ color: 'var(--text-secondary)' }}>text_fields</span>
                {t.textTransform}
              </label>
              <Switch 
                checked={textTransform === 'uppercase'}
                onChange={() => setTextTransform(textTransform === 'normal' ? 'uppercase' : 'normal')}
                theme={currentTheme.name.toLowerCase()}
                activeColor={currentTheme.hex}
              />
            </div>

      {/* Separator */}
            <div className="border-t border-gray-100 dark:border-gray-800 my-1 opacity-50" />

            {/* --- Group 3: Typography --- */}
            <div className="space-y-1 relative" ref={typographyRef}>
                {/* Main Row */}
                <div className="w-full flex items-center justify-between py-1 transition-colors">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-[16px]" style={{ color: 'var(--text-secondary)' }}>font_download</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t.typography}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                checkTypographyPos();
                                setTypographyExpanded(!typographyExpanded);
                                if (!typographyExpanded) {
                                    setStatusBarExpanded(false);
                                    setThemeExpanded(false);
                                }
                            }}
                            className="transition-colors"
                            type="button"
                        >
                            <span 
                                className={`material-symbols-rounded text-[16px] transition-transform ${typographyExpanded ? 'rotate-180' : ''}`}
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                {typographyPos.side === 'left' ? 'chevron_left' : 'chevron_right'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Typography Submenu */}
                {typographyExpanded && (
                    <div 
                        className={`absolute w-56 rounded-lg shadow-xl border z-40 p-3 space-y-3 ${typographyPos.align === 'top' ? 'top-0' : 'bottom-0'}`}
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderColor: 'var(--border-primary)',
                            [typographyPos.side === 'left' ? 'right' : 'left']: '100%',
                            [typographyPos.side === 'left' ? 'marginRight' : 'marginLeft']: '12px',
                        }}
                    >
                        {/* English Font Selection */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>{t.fontEN}</label>
                            <select 
                                value={fontFamilyEN}
                                onChange={(e) => setFontFamilyEN(e.target.value)}
                                className="w-full text-xs bg-transparent border rounded-md px-2 py-1 outline-none transition-colors hover:border-blue-400 focus:border-blue-500"
                                style={{ color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
                            >
                                {AVAILABLE_FONTS_EN.map(font => (
                                    <option key={font.value} value={font.value} style={{ backgroundColor: 'var(--bg-primary)' }}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Arabic Font Selection */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>{t.fontAR}</label>
                            <select 
                                value={fontFamilyAR}
                                onChange={(e) => setFontFamilyAR(e.target.value)}
                                className="w-full text-xs bg-transparent border rounded-md px-2 py-1 outline-none transition-colors hover:border-blue-400 focus:border-blue-500"
                                style={{ color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
                            >
                                {AVAILABLE_FONTS_AR.map(font => (
                                    <option key={font.value} value={font.value} style={{ backgroundColor: 'var(--bg-primary)' }}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Separator */}
            <div className="border-t border-gray-100 dark:border-gray-800 my-1 opacity-50" />

            {/* --- Group 4: Workspace --- */}
            {/* Focus Mode Toggle */}
            {setHideInactiveModules && (
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <span className="material-symbols-rounded text-[14px]" style={{ color: 'var(--text-secondary)' }}>filter_center_focus</span>
                  {t.focusMode}
                </label>
                <Switch 
                  checked={hideInactiveModules || false}
                  onChange={(val) => setHideInactiveModules(val)}
                  theme={currentTheme.name.toLowerCase()}
                  activeColor={currentTheme.hex}
                />
              </div>
            )}

            {/* Developer Mode Toggle */}
            {setDeveloperMode && (
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <span className="material-symbols-rounded text-[14px]" style={{ color: 'var(--text-secondary)' }}>science</span>
                  {t.developerMode}
                </label>
                <Switch 
                  checked={developerMode || false}
                  onChange={(val) => setDeveloperMode(val)}
                  theme={currentTheme.name.toLowerCase()}
                  activeColor={currentTheme.hex}
                />
              </div>
            )}

            {/* Separator */}
            {setShowTicker && (
              <div className="border-t border-gray-100 dark:border-gray-800 my-1 opacity-50" />
            )}

            {/* --- Status Bar Settings (Collapsible) --- */}
            {setShowTicker && (
              <div className="space-y-1">
                {/* Section Header */}
                <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  {t.statusBarSettings}
                </label>

                {/* Quick Statuses Row with Arrow */}
                <div className="space-y-1 relative" ref={quickStatusesRef}>
                   {/* Main Row */}
                  <div className="w-full flex items-center justify-between py-1 transition-colors">
                    {/* Left Side: Icon + Label */}
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-rounded text-[16px]" style={{ color: 'var(--text-secondary)' }}>speed</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t.quickStatuses}</span>
                    </div>

                    {/* Right Side: Switch + Arrow */}
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={showTicker || false}
                        onChange={(val) => setShowTicker(val)}
                        theme={currentTheme.name.toLowerCase()}
                        activeColor={currentTheme.hex}
                      />
                      <button
                        onClick={() => {
                          checkInfoPos();
                          setStatusBarExpanded(!statusBarExpanded);
                          if (!statusBarExpanded) setThemeExpanded(false);
                        }}
                        className="transition-colors"
                        type="button"
                      >
                        <span 
                          className={`material-symbols-rounded text-[16px] transition-transform ${statusBarExpanded ? 'rotate-180' : ''}`}
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {quickStatusesPos.side === 'left' ? 'chevron_left' : 'chevron_right'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Submenu (Side Pop-out) */}
                  {statusBarExpanded && showTicker && (
                    <div 
                        className={`absolute w-48 rounded-lg shadow-xl border z-40 p-2 space-y-1 ${quickStatusesPos.align === 'top' ? 'top-0' : 'bottom-0'}`}
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderColor: 'var(--border-primary)',
                            // Dynamic Horizontal
                            [quickStatusesPos.side === 'left' ? 'right' : 'left']: '100%',
                            [quickStatusesPos.side === 'left' ? 'marginRight' : 'marginLeft']: '12px',
                        }}
                    >
                      {/* Sales */}
                      {setShowTickerSales && (
                        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {t.showSales}
                          </span>
                          <Switch 
                            checked={showTickerSales ?? true}
                            onChange={(val) => setShowTickerSales(val)}
                            theme={currentTheme.name.toLowerCase()}
                            activeColor={currentTheme.hex}
                          />
                        </div>
                      )}
                      {/* Inventory */}
                      {setShowTickerInventory && (
                        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {t.showInventory}
                          </span>
                          <Switch 
                            checked={showTickerInventory ?? true}
                            onChange={(val) => setShowTickerInventory(val)}
                            theme={currentTheme.name.toLowerCase()}
                            activeColor={currentTheme.hex}
                          />
                        </div>
                      )}
                      {/* Customers */}
                      {setShowTickerCustomers && (
                        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {t.showCustomers}
                          </span>
                          <Switch 
                            checked={showTickerCustomers ?? true}
                            onChange={(val) => setShowTickerCustomers(val)}
                            theme={currentTheme.name.toLowerCase()}
                            activeColor={currentTheme.hex}
                          />
                        </div>
                      )}
                      {/* Top Seller */}
                      {setShowTickerTopSeller && (
                        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {t.showTopSeller}
                          </span>
                          <Switch 
                            checked={showTickerTopSeller ?? true}
                            onChange={(val) => setShowTickerTopSeller(val)}
                            theme={currentTheme.name.toLowerCase()}
                            activeColor={currentTheme.hex}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
