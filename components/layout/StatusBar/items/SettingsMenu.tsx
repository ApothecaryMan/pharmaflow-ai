import React, { useState, useRef, useEffect } from 'react';
import { StatusBarItem } from '../StatusBarItem';
import { Switch } from '../../../common/Switch';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { ThemeColor, Language } from '../../../../types';

export interface SettingsMenuProps {
  language: 'EN' | 'AR';
  // Theme
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
  currentTheme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
  availableThemes: ThemeColor[];
  // Language
  setLanguage: (lang: Language) => void;
  availableLanguages: { code: Language; label: string }[];
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Translations
  const t = {
    settings: language === 'AR' ? 'الإعدادات' : 'Settings',
    theme: language === 'AR' ? 'اللون' : 'Theme',
    darkMode: language === 'AR' ? 'الوضع الداكن' : 'Dark Mode',
    language: language === 'AR' ? 'اللغة' : 'Language',
    textTransform: language === 'AR' ? 'تحويل النص' : 'Text Transform',
    focusMode: language === 'AR' ? 'وضع التركيز' : 'Focus Mode',
    designStyle: language === 'AR' ? 'تصميم التنقل' : 'Nav Style',
    designStyleFull: language === 'AR' ? 'كامل' : 'Full',
    designStyleNavbar: language === 'AR' ? 'شريط' : 'Navbar',
    developerMode: language === 'AR' ? 'وضع المطور' : 'Developer Mode',
    dropdownBlur: language === 'AR' ? 'خلفية ضبابية للقوائم' : 'Blur Dropdown Background',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative flex items-center h-full" ref={dropdownRef}>
      <StatusBarItem
        icon="tune"
        tooltip={t.settings}
        variant={isOpen ? 'info' : 'default'}
        onClick={handleToggle}
      />

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute bottom-full left-0 mb-1 w-72 rounded-lg shadow-xl border z-50 ml-1"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Arrow Indicator */}
          <div 
            className="absolute bottom-[-5px] left-3 w-2.5 h-2.5 rotate-45 border-b border-r z-50"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
            }}
          />

          {/* Header */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {t.settings}
            </span>
          </div>

          {/* Settings Content */}
          <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto" style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>
            
            {/* --- Group 1: Appearance --- */}
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
            {(setHideInactiveModules || setDeveloperMode) && (
                <div className="border-t border-gray-100 dark:border-gray-800 my-1 opacity-50" />
            )}

            {/* --- Group 3: Workspace --- */}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
