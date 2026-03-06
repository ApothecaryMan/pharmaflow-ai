import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AVAILABLE_FONTS_AR, AVAILABLE_FONTS_EN } from '../../../../config/fonts';
import { canPerformAction, type UserRole } from '../../../../config/permissions';
import { useSettings } from '../../../../context';
import { useSmartPosition } from '../../../../hooks/useSmartPosition';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { type Language, ThemeColor } from '../../../../types';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { Switch } from '../../../common/Switch';
import { StatusBarItem } from '../StatusBarItem';

/**
 * ARCHITECTURE NOTE:
 * This component is self-contained. It consumes the `useSettings` hook directly to manage its toggles.
 * Never re-introduce passed-down setting props here; always use the central context.
 */
export interface SettingsMenuProps {
  userRole?: UserRole;
  dropDirection?: 'up' | 'down';
  showTrigger?: boolean;
  align?: 'start' | 'end';
  triggerVariant?: 'statusBar' | 'navbar';
  triggerSize?: number;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  userRole,
  dropDirection = 'up',
  showTrigger = true,
  align = 'start',
  triggerVariant = 'statusBar',
  triggerSize = 24,
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
    graphicStyle,
    setGraphicStyle,
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
    resetPosition: resetThemesPos,
  } = useSmartPosition({ defaultAlign: 'top' });

  // Use Custom Hook for Quick Statuses Position
  const {
    ref: quickStatusesRef,
    position: quickStatusesPos,
    checkPosition: checkInfoPos,
    resetPosition: resetInfoPos,
  } = useSmartPosition({ defaultAlign: 'bottom' });

  // Use Custom Hook for Typography Position
  const {
    ref: typographyRef,
    position: typographyPos,
    checkPosition: checkTypographyPos,
    resetPosition: resetTypographyPos,
  } = useSmartPosition({ defaultAlign: 'top' });

  // Use Custom Hook for Blur Options Position
  const {
    ref: blurOptionsRef,
    position: blurOptionsPos,
    checkPosition: checkBlurOptionsPos,
    resetPosition: resetBlurOptionsPos,
  } = useSmartPosition({ defaultAlign: 'top' });

  const [blurOptionsExpanded, setBlurOptionsExpanded] = useState(false);

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };

    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <div
      className={`relative ${showTrigger && triggerVariant === 'statusBar' ? 'h-full flex items-center' : ''}`}
      ref={dropdownRef}
    >
      {/* Settings Button */}
      {showTrigger &&
        (triggerVariant === 'statusBar' ? (
          <StatusBarItem
            icon='settings'
            tooltip={t.settings}
            variant={isOpen ? 'info' : 'default'}
            onClick={() => setIsOpen(!isOpen)}
          />
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-center w-10 h-10 transition-colors ${isOpen ? 'text-blue-500' : 'text-gray-600 dark:text-gray-300'}`}
          >
            <span className={`material-symbols-rounded text-[${triggerSize}px]`}>
              settings
            </span>
          </button>
        ))}

      {/* Settings Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute ${dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} 
            ${align === 'start' ? 'inset-s-0 origin-top-start' : 'inset-e-0 origin-top-end'}
            w-64 bg-(--bg-menu) rounded-xl shadow-2xl border border-(--border-divider) 
            backdrop-blur-xs z-110 animate-fade-in
          `}
        >
          {/* Header */}
          <div className='px-3 py-2 border-b border-(--border-divider) text-center'>
            <span className='text-xs font-bold' style={{ color: 'var(--text-primary)' }}>
              {t.settings}
            </span>
          </div>

          {/* Settings Content */}
          <div className='p-3 space-y-3' style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>
            {/* --- Group 1: Appearance --- */}

            {/* Themes Nested Menu (Replaces old selector) */}
            <div className='space-y-1 relative' ref={themesRef}>
              {/* Main Row */}
              <div className='w-full flex items-center justify-between py-1 transition-colors'>
                {/* Left Side: Icon + Label */}
                <div className='flex items-center gap-2'>
                  <span
                    className='material-symbols-rounded text-(--icon-base)'
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    brightness_6
                  </span>
                  <span className='text-xs font-medium' style={{ color: 'var(--text-primary)' }}>
                    {t.themesMenu}
                  </span>
                </div>

                {/* Right Side: Arrow */}
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => {
                      checkThemesPos(); // Check position
                      setThemeExpanded(!themeExpanded);
                      if (!themeExpanded) setStatusBarExpanded(false);
                    }}
                    className='transition-colors'
                    type='button'
                  >
                    <span
                      className={`material-symbols-rounded transition-transform text-(--icon-base) ${themeExpanded ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {themesPos.side === 'left' ? 'chevron_left' : 'chevron_right'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submenu (Hybrid: Pop-out on Desktop, Accordion on Mobile) */}
              {themeExpanded && (
                <div
                  className={`
                        ${
                          isMobile
                            ? 'relative w-full mt-2 bg-(--bg-page-surface) border-none shadow-none p-4 space-y-4 rounded-xl'
                            : `absolute w-64 rounded-xl shadow-2xl border border-(--border-divider) bg-(--bg-menu) z-120 p-4 space-y-4 ${themesPos.align === 'top' ? 'top-0' : 'bottom-0'}`
                        }
                    `}
                  style={
                    isMobile
                      ? {}
                      : {
                          // Dynamic Horizontal
                          [themesPos.side === 'left' ? 'right' : 'left']: '100%',
                          [themesPos.side === 'left' ? 'marginRight' : 'marginLeft']: '12px',
                        }
                  }
                >
                  {/* Theme Selector */}
                    <div className='flex items-center gap-1.5'>
                      <span
                        className='material-symbols-rounded text-(--icon-sm)'
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        palette
                      </span>
                      <SegmentedControl
                        value={currentTheme.name}
                        onChange={(val) => {
                          const theme = availableThemes.find((t) => t.name === val);
                          if (theme) setTheme(theme);
                        }}
                        color={currentTheme.name.toLowerCase()}
                        size='xs'
                        fullWidth={true}
                        className='flex-1'
                        shape='pill'
                        options={availableThemes.map((theme) => ({
                          label: '',
                          value: theme.name,
                          dotColor: theme.hex,
                        }))}
                      />
                    </div>


                  {/* Dark Mode Toggle */}
                  <div className='flex items-center justify-between'>
                    <label
                      className='text-xs font-medium flex items-center gap-1.5'
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span
                        className='material-symbols-rounded text-(--icon-sm)'
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        brightness_6
                      </span>
                      {t.darkMode}
                    </label>
                    <SegmentedControl
                      value={darkMode}
                      onChange={(val) => setDarkMode(val as boolean)}
                      color={currentTheme.name.toLowerCase()}
                      size='xs'
                      iconSize='--icon-lg'
                      fullWidth={false}
                      shape='pill'
                      options={[
                        { label: '', value: false, icon: 'light_mode' },
                        { label: '', value: true, icon: 'dark_mode' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Blur Options Nested Menu */}
            <div className='space-y-1 relative' ref={blurOptionsRef}>
              {/* Main Row */}
              <div className='w-full flex items-center justify-between py-1 transition-colors'>
                <div className='flex items-center gap-2'>
                  <span
                    className='material-symbols-rounded text-(--icon-base)'
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    blur_on
                  </span>
                  <span className='text-xs font-medium' style={{ color: 'var(--text-primary)' }}>
                    {t.dropdownBlur}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
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
                    className='transition-colors'
                    type='button'
                  >
                    <span
                      className={`material-symbols-rounded transition-transform text-(--icon-base) ${blurOptionsExpanded ? 'rotate-180' : ''}`}
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
                  className={`
                            ${
                              isMobile
                                ? 'relative w-full mt-2 bg-(--bg-page-surface) border-none shadow-none p-3 space-y-1.5 rounded-lg'
                                : `absolute w-64 rounded-lg shadow-xl border border-(--border-divider) bg-(--bg-menu) z-120 p-3 space-y-1.5 ${blurOptionsPos.align === 'top' ? 'top-0' : 'bottom-0'}`
                            }
                        `}
                  style={
                    isMobile
                      ? {}
                      : {
                          [blurOptionsPos.side === 'left' ? 'right' : 'left']: '100%',
                          [blurOptionsPos.side === 'left' ? 'marginRight' : 'marginLeft']: '12px',
                        }
                  }
                >
                  {/* Summary Label */}
                  <label
                    className='text-[10px] font-bold uppercase mb-1 block'
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t.dropdownBlur}
                  </label>

                  {/* Sidebar Blur */}
                  <div className='flex items-center justify-between py-1'>
                    <span className='text-xs' style={{ color: 'var(--text-primary)' }}>
                      {t.sidebarBlur}
                    </span>
                    <Switch
                      checked={sidebarBlur || false}
                      onChange={(val) => setSidebarBlur?.(val)}
                      theme={currentTheme.name.toLowerCase()}
                      activeColor={currentTheme.hex}
                    />
                  </div>

                  {/* Menu Blur */}
                  <div className='flex items-center justify-between py-1'>
                    <span className='text-xs' style={{ color: 'var(--text-primary)' }}>
                      {t.menuBlur}
                    </span>
                    <Switch
                      checked={menuBlur || false}
                      onChange={(val) => setMenuBlur?.(val)}
                      theme={currentTheme.name.toLowerCase()}
                      activeColor={currentTheme.hex}
                    />
                  </div>

                  {/* Tooltip Blur */}
                  <div className='flex items-center justify-between py-1'>
                    <span className='text-xs' style={{ color: 'var(--text-primary)' }}>
                      {t.tooltipBlur}
                    </span>
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

            {/* Nav Style Switch (Redesigned to be inline with icons) */}
            {setNavStyle && (
              <div className='flex items-center justify-between'>
                <label
                  className='text-xs font-medium flex items-center gap-1.5'
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className='material-symbols-rounded text-(--icon-sm)'
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    dashboard_customize
                  </span>
                  {t.designStyle}
                </label>
                <SegmentedControl
                  value={navStyle || 1}
                  onChange={(val) => setNavStyle(val as 1 | 2 | 3)}
                  color={currentTheme.name.toLowerCase()}
                  size='xs'
                  iconSize='--icon-lg'
                  fullWidth={true}
                  className='max-w-[100px]'
                  shape='pill'
                  options={[
                    { label: '', value: 1, icon: 'view_sidebar' },
                    { label: '', value: 2, icon: 'web_asset' },
                  ]}
                />
              </div>
            )}

            {/* Separator */}
            <div className='border-t border-(--border-divider) my-1 opacity-50' />

            {/* --- Group 2: Language & Text --- */}
            {/* Language Selector (Redesigned to be inline with icons) */}
            <div className='flex items-center justify-between'>
              <label
                className='text-xs font-medium flex items-center gap-1.5'
                style={{ color: 'var(--text-primary)' }}
              >
                <span
                  className='material-symbols-rounded text-(--icon-sm)'
                  style={{ color: 'var(--text-secondary)' }}
                >
                  translate
                </span>
                {t.language}
              </label>
              <SegmentedControl
                value={language}
                onChange={(val) => setLanguage(val as Language)}
                color={currentTheme.name.toLowerCase()}
                size='xs'
                fullWidth={true}
                className='max-w-[100px]'
                shape='pill'
                options={[
                  { label: 'EN', value: 'EN' },
                  { label: 'AR', value: 'AR' },
                ]}
              />
            </div>

            {/* Text Transform Toggle */}
            <div className='flex items-center justify-between'>
              <label
                className='text-xs font-medium flex items-center gap-1.5'
                style={{ color: 'var(--text-primary)' }}
              >
                <span
                  className='material-symbols-rounded text-(--icon-sm)'
                  style={{ color: 'var(--text-secondary)' }}
                >
                  text_fields
                </span>
                {t.textTransform}
              </label>
              <Switch
                checked={textTransform === 'uppercase'}
                onChange={() =>
                  setTextTransform(textTransform === 'normal' ? 'uppercase' : 'normal')
                }
                theme={currentTheme.name.toLowerCase()}
                activeColor={currentTheme.hex}
              />
            </div>

            {/* Separator */}
            <div className='border-t border-(--border-divider) my-1 opacity-50' />

            {/* --- Group 3: Typography --- */}
            <div className='space-y-1 relative' ref={typographyRef}>
              {/* Main Row */}
              <div className='w-full flex items-center justify-between py-1 transition-colors'>
                <div className='flex items-center gap-2'>
                  <span
                    className='material-symbols-rounded text-(--icon-base)'
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    font_download
                  </span>
                  <span className='text-xs font-medium' style={{ color: 'var(--text-primary)' }}>
                    {t.typography}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => {
                      checkTypographyPos();
                      setTypographyExpanded(!typographyExpanded);
                      if (!typographyExpanded) {
                        setStatusBarExpanded(false);
                        setThemeExpanded(false);
                      }
                    }}
                    className='transition-colors'
                    type='button'
                  >
                    <span
                      className={`material-symbols-rounded transition-transform text-(--icon-base) ${typographyExpanded ? 'rotate-180' : ''}`}
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
                  className={`
                            ${
                              isMobile
                                ? 'relative w-full mt-2 bg-(--bg-page-surface) border-none shadow-none p-3 space-y-3 rounded-lg'
                                : `absolute w-64 rounded-lg shadow-xl border border-(--border-divider) bg-(--bg-menu) z-120 p-3 space-y-3 ${typographyPos.align === 'top' ? 'top-0' : 'bottom-0'}`
                            }
                        `}
                  style={
                    isMobile
                      ? {}
                      : {
                          [typographyPos.side === 'left' ? 'right' : 'left']: '100%',
                          [typographyPos.side === 'left' ? 'marginRight' : 'marginLeft']: '12px',
                        }
                  }
                >
                  {/* English Font Selection */}
                  <div className='space-y-2'>
                    <label
                      className='text-xs font-medium flex items-center gap-1.5'
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className='material-symbols-rounded text-(--icon-xs)'>text_fields</span>
                      {t.fontEN}
                    </label>
                    <div className='flex flex-wrap gap-1.5'>
                      {AVAILABLE_FONTS_EN.map((font) => {
                        const isSelected = fontFamilyEN === font.value;
                        return (
                          <button
                            key={font.value}
                            onClick={() => setFontFamilyEN(font.value)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all duration-200 active:scale-95 flex-grow sm:flex-grow-0 ${
                              isSelected
                                ? 'shadow-md border-transparent text-white'
                                : 'bg-transparent border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            style={{
                              fontFamily: font.value,
                              backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                              color: isSelected ? 'white' : 'var(--text-primary)',
                              borderColor: isSelected ? 'var(--accent-primary)' : '',
                            }}
                          >
                            {font.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Arabic Font Selection */}
                  <div className='space-y-2'>
                    <label
                      className='text-xs font-medium flex items-center gap-1.5'
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className='material-symbols-rounded text-(--icon-xs)'>translate</span>
                      {t.fontAR}
                    </label>
                    <div className='flex flex-wrap gap-1.5'>
                      {AVAILABLE_FONTS_AR.map((font) => {
                        const isSelected = fontFamilyAR === font.value;
                        return (
                          <button
                            key={font.value}
                            onClick={() => setFontFamilyAR(font.value)}
                            className={`px-2.5 py-1.5 rounded-lg border text-sm transition-all duration-200 active:scale-95 flex-grow sm:flex-grow-0 ${
                              isSelected
                                ? 'shadow-md border-transparent text-white'
                                : 'bg-transparent border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            style={{
                              fontFamily: font.value,
                              backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                              color: isSelected ? 'white' : 'var(--text-primary)',
                              borderColor: isSelected ? 'var(--accent-primary)' : '',
                            }}
                          >
                            {font.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Graphic Style SegmentedControl - Only visible in Arabic */}
                  {language === 'AR' && (
                    <div className='flex items-center justify-between py-1'>
                      <label
                        className='text-xs font-medium flex items-center gap-1.5'
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <span
                          className='material-symbols-rounded text-(--icon-sm)'
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          style
                        </span>
                        {t.graphicStyle}
                      </label>
                      <SegmentedControl
                        value={graphicStyle}
                        onChange={(val) => setGraphicStyle(val as boolean)}
                        color={currentTheme.name.toLowerCase()}
                        size='xs'
                        fullWidth={true}
                        className='flex-1'
                        shape='pill'
                        options={[
                          { 
                            label: 'جرافيكي', 
                            value: false,
                            fontFamily: fontFamilyAR 
                          },
                          { 
                            label: 'جرافيكي', 
                            value: true,
                            fontFamily: '"HeadingFont"' 
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className='border-t border-(--border-divider) my-1 opacity-50' />

            {/* --- Group 4: Workspace --- */}
            {/* Focus Mode Toggle */}
            {setHideInactiveModules && (
              <div className='flex items-center justify-between'>
                <label
                  className='text-xs font-medium flex items-center gap-1.5'
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className='material-symbols-rounded text-(--icon-sm)'
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    filter_center_focus
                  </span>
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
              <div className='flex items-center justify-between'>
                <label
                  className='text-xs font-medium flex items-center gap-1.5'
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className='material-symbols-rounded text-(--icon-sm)'
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    science
                  </span>
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
              <div className='border-t border-(--border-divider) my-1 opacity-50' />
            )}

            {/* --- Status Bar Settings (Collapsible) --- */}
            {setShowTicker && (
              <div className='space-y-1'>
                {/* Section Header */}
                <label
                  className='text-[10px] font-bold uppercase'
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t.statusBarSettings}
                </label>

                {/* Quick Statuses Row with Arrow */}
                <div className='space-y-1 relative' ref={quickStatusesRef}>
                  {/* Main Row */}
                  <div className='w-full flex items-center justify-between py-1 transition-colors'>
                    {/* Left Side: Icon + Label */}
                    <div className='flex items-center gap-2'>
                      <span
                        className='material-symbols-rounded text-(--icon-base)'
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        speed
                      </span>
                      <span
                        className='text-xs font-medium'
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t.quickStatuses}
                      </span>
                    </div>

                    {/* Right Side: Switch + Arrow */}
                    <div className='flex items-center gap-2'>
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
                        className='transition-colors'
                        type='button'
                      >
                        <span
                          className={`material-symbols-rounded transition-transform text-(--icon-base) ${statusBarExpanded ? 'rotate-180' : ''}`}
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {quickStatusesPos.side === 'left' ? 'chevron_left' : 'chevron_right'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Submenu (Hybrid: Pop-out on Desktop, Accordion on Mobile) */}
                  {statusBarExpanded && showTicker && (
                    <div
                      className={`
                            ${
                              isMobile
                                ? 'relative w-full mt-2 bg-(--bg-search) border-none shadow-none p-2 space-y-1 rounded-lg'
                                : `absolute w-64 rounded-lg shadow-xl border border-(--border-divider) bg-(--bg-menu) z-120 p-2 space-y-1 ${quickStatusesPos.align === 'top' ? 'top-0' : 'bottom-0'}`
                            }
                        `}
                      style={
                        isMobile
                          ? {}
                          : {
                              // Dynamic Horizontal
                              [quickStatusesPos.side === 'left' ? 'right' : 'left']: '100%',
                              [quickStatusesPos.side === 'left' ? 'marginRight' : 'marginLeft']:
                                '12px',
                            }
                      }
                    >
                      {/* Sales */}
                      {setShowTickerSales && canPerformAction(userRole, 'sale.view_history') && (
                        <div className='flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-(--bg-menu-hover)'>
                          <span
                            className='text-[11px] font-medium'
                            style={{ color: 'var(--text-secondary)' }}
                          >
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
                      {setShowTickerInventory &&
                        canPerformAction(userRole, 'reports.view_inventory') && (
                          <div className='flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-(--bg-menu-hover)'>
                            <span
                              className='text-[11px] font-medium'
                              style={{ color: 'var(--text-secondary)' }}
                            >
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
                        <div className='flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-(--bg-menu-hover)'>
                          <span
                            className='text-[11px] font-medium'
                            style={{ color: 'var(--text-secondary)' }}
                          >
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
                      {setShowTickerTopSeller &&
                        canPerformAction(userRole, 'reports.view_financial') && (
                          <div className='flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-(--bg-menu-hover)'>
                            <span
                              className='text-[11px] font-medium'
                              style={{ color: 'var(--text-secondary)' }}
                            >
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
