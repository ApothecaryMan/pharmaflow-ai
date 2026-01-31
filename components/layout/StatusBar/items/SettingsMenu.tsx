import React, { useState, useRef, useEffect } from 'react';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { UserRole, canPerformAction } from '../../../../config/permissions';
import { StatusBarItem } from '../StatusBarItem';
import { Switch } from '../../../common/Switch';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { ThemeColor, Language } from '../../../../types';
import { useSmartPosition } from '../../../../hooks/useSmartPosition';
import { AVAILABLE_FONTS_EN, AVAILABLE_FONTS_AR } from '../../../../config/fonts';
import { useSettings } from '../../../../context';

/**
 * ARCHITECTURE NOTE:
 * This component is self-contained. It consumes the `useSettings` hook directly to manage its toggles.
 * Never re-introduce passed-down setting props here; always use the central context.
 */
export const SettingsMenu: React.FC<{ userRole?: UserRole }> = ({ 
  userRole 
}) => {
  const {
    language,
    theme: currentTheme,
    setTheme,
    darkMode,
    setDarkMode,
    setLanguage,
    availableThemes,
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
    sidebarBlur,
    setSidebarBlur,
    menuBlur,
    setMenuBlur,
    tooltipBlur,
    setTooltipBlur,
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
  } = useSettings();

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

  // Use Custom Hook for Blur Options Position
  const { 
    ref: blurOptionsRef, 
    position: blurOptionsPos, 
    checkPosition: checkBlurOptionsPos,
    resetPosition: resetBlurOptionsPos
  } = useSmartPosition({ defaultAlign: 'top' });

  const [blurOptionsExpanded, setBlurOptionsExpanded] = useState(false);

  // Reset submenu when main menu is closed
  useEffect(() => {
    if (!isOpen) {
      setStatusBarExpanded(false);
      setThemeExpanded(false);
      setTypographyExpanded(false);
      setBlurOptionsExpanded(false);
      resetThemesPos();
      resetInfoPos();
      resetTypographyPos();
      resetBlurOptionsPos();
    }
  }, [isOpen, resetThemesPos, resetInfoPos, resetTypographyPos, resetBlurOptionsPos]);

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

            {/* Blur Options Nested Menu */}
            <div className="space-y-1 relative" ref={blurOptionsRef}>
                {/* Main Row */}
                <div className="w-full flex items-center justify-between py-1 transition-colors">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-[16px]" style={{ color: 'var(--text-secondary)' }}>blur_on</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t.dropdownBlur}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch 
                            checked={dropdownBlur || false}
                            onChange={(val) => setDropdownBlur?.(val)}
                            theme={currentTheme.name.toLowerCase()}
                            activeColor={currentTheme.hex}
                        />
                        <button
                            onClick={() => {
                                checkBlurOptionsPos();
                                setBlurOptionsExpanded(!blurOptionsExpanded);
                                if (!blurOptionsExpanded) {
                                    setStatusBarExpanded(false);
                                    setThemeExpanded(false);
                                    setTypographyExpanded(false);
                                }
                            }}
                            className="transition-colors"
                            type="button"
                        >
                            <span 
                                className={`material-symbols-rounded text-[16px] transition-transform ${blurOptionsExpanded ? 'rotate-180' : ''}`}
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                {blurOptionsPos.side === 'left' ? 'chevron_left' : 'chevron_right'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Blur Options Submenu */}
                {blurOptionsExpanded && (
                    <div 
                        className={`absolute w-56 rounded-lg shadow-xl border z-40 p-3 space-y-1.5 ${blurOptionsPos.align === 'top' ? 'top-0' : 'bottom-0'}`}
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderColor: 'var(--border-primary)',
                            [blurOptionsPos.side === 'left' ? 'right' : 'left']: '100%',
                            [blurOptionsPos.side === 'left' ? 'marginRight' : 'marginLeft']: '12px',
                        }}
                    >
                        {/* Summary Label */}
                        <label className="text-[10px] font-bold uppercase mb-1 block" style={{ color: 'var(--text-tertiary)' }}>{t.dropdownBlur}</label>
                        
                        {/* Sidebar Blur */}
                        <div className="flex items-center justify-between py-1">
                            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t.sidebarBlur}</span>
                            <Switch 
                                checked={sidebarBlur || false}
                                onChange={(val) => setSidebarBlur?.(val)}
                                theme={currentTheme.name.toLowerCase()}
                                activeColor={currentTheme.hex}
                            />
                        </div>

                        {/* Menu Blur */}
                        <div className="flex items-center justify-between py-1">
                            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t.menuBlur}</span>
                            <Switch 
                                checked={menuBlur || false}
                                onChange={(val) => setMenuBlur?.(val)}
                                theme={currentTheme.name.toLowerCase()}
                                activeColor={currentTheme.hex}
                            />
                        </div>

                        {/* Tooltip Blur */}
                        <div className="flex items-center justify-between py-1">
                            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{t.tooltipBlur}</span>
                            <Switch 
                                checked={tooltipBlur || false}
                                onChange={(val) => setTooltipBlur?.(val)}
                                theme={currentTheme.name.toLowerCase()}
                                activeColor={currentTheme.hex}
                            />
                        </div>
                    </div>
                )}
            </div>

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
            {setDeveloperMode && userRole === 'admin' && (
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
                      {setShowTickerSales && canPerformAction(userRole, 'sale.view_history') && (
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
                      {setShowTickerInventory && canPerformAction(userRole, 'reports.view_inventory') && (
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
                      {setShowTickerCustomers && canPerformAction(userRole, 'customer.view') && (
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
                      {setShowTickerTopSeller && canPerformAction(userRole, 'reports.view_financial') && (
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
