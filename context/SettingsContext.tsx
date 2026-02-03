/**
 * SettingsContext - Centralized application settings management
 * 
 * This context manages all application preferences including:
 * - Theme settings (color, dark mode)
 * - Language settings (current language, text transform)
 * - UI preferences (nav style, dropdown blur)
 * - Developer settings (developer mode, hide inactive modules)
 * - Status bar settings (ticker visibility)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Language } from '../types';
import { THEMES, COLOR_HEX_MAP } from '../config/themeColors';
import { AVAILABLE_FONTS_EN, AVAILABLE_FONTS_AR } from '../config/fonts';
import { storage } from '../utils/storage';
import type { ThemeColor } from '../types';

// Re-export for convenience
export { THEMES } from '../config/themeColors';

/**
 * ARCHITECTURE NOTE:
 * This context is the Single Source of Truth for all application-wide settings.
 * 
 * DESIGN PATTERN: Hook-based Consumption (Anti Prop-Drilling)
 * - DO NOT pass settings properties (like darkMode, language, blur) as props through layout components.
 * - Components (even deeply nested ones) should use the `useSettings()` hook directly.
 * - This decouples layout components (Navbar, StatusBar, etc.) from the configuration state.
 */


// Available Languages
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'EN', label: 'English' },
  { code: 'AR', label: 'العربية' },
];

// Storage Key
const STORAGE_KEY = 'pharma_settings';

// Settings Interface
export interface SettingsState {
  // Theme
  theme: ThemeColor;
  darkMode: boolean;
  // Language
  language: Language;
  fontFamilyEN: string;
  fontFamilyAR: string;
  textTransform: 'normal' | 'uppercase';
  // UI Preferences
  navStyle: 1 | 2 | 3;
  dropdownBlur: boolean;
  sidebarBlur: boolean;
  menuBlur: boolean;
  tooltipBlur: boolean;
  sidebarVisible: boolean;
  // Developer
  hideInactiveModules: boolean;
  developerMode: boolean;
  // Status Bar Ticker
  showTicker: boolean;
  showTickerSales: boolean;
  showTickerInventory: boolean;
  showTickerCustomers: boolean;
  showTickerTopSeller: boolean;
}

// Context Type
export interface SettingsContextType extends SettingsState {
  // Theme Actions
  setTheme: (theme: ThemeColor) => void;
  setDarkMode: (mode: boolean) => void;
  // Language Actions
  setLanguage: (lang: Language) => void;
  setFontFamilyEN: (font: string) => void;
  setFontFamilyAR: (font: string) => void;
  setTextTransform: (transform: 'normal' | 'uppercase') => void;
  // UI Actions
  setNavStyle: (style: 1 | 2 | 3) => void;
  setDropdownBlur: (blur: boolean) => void;
  setSidebarBlur: (blur: boolean) => void;
  setMenuBlur: (blur: boolean) => void;
  setTooltipBlur: (blur: boolean) => void;
  setSidebarVisible: (visible: boolean) => void;
  // Developer Actions
  setHideInactiveModules: (hide: boolean) => void;
  setDeveloperMode: (mode: boolean) => void;
  // Ticker Actions
  setShowTicker: (show: boolean) => void;
  setShowTickerSales: (show: boolean) => void;
  setShowTickerInventory: (show: boolean) => void;
  setShowTickerCustomers: (show: boolean) => void;
  setShowTickerTopSeller: (show: boolean) => void;
  // Helpers
  availableThemes: ThemeColor[];
  availableLanguages: { code: Language; label: string }[];
}

// Default Settings
const defaultSettings: SettingsState = {
  theme: THEMES[0],
  darkMode: false,
  language: 'AR', // Default English
  fontFamilyEN: 'En-Firewall', 
  fontFamilyAR: 'Ar-Firewall', 
  textTransform: 'uppercase',
  navStyle: 2,
  dropdownBlur: false,
  sidebarBlur: false,
  menuBlur: false,
  tooltipBlur: false,
  sidebarVisible: false,
  hideInactiveModules: true,
  developerMode: false,
  showTicker: true,
  showTickerSales: true,
  showTickerInventory: true,
  showTickerCustomers: true,
  showTickerTopSeller: true,
};

// Load settings from storage
const loadSettings = (): SettingsState => {
  if (typeof window === 'undefined') return defaultSettings;
  
  // Try loading unified settings object first
  const saved = storage.get<SettingsState | null>(STORAGE_KEY, null);
  if (saved) {
    return { ...defaultSettings, ...saved };
  }
  
  // Backward compatibility: Migrate from old individual keys
  try {
    const theme = storage.get('pharma_theme', null);
    const darkMode = storage.get('pharma_darkMode', null);
    const language = storage.get('pharma_language', null);
    const fontFamilyEN = storage.get('pharma_fontFamilyEN', null);
    const fontFamilyAR = storage.get('pharma_fontFamilyAR', null);
    const textTransform = storage.get('pharma_textTransform', null);
    const navStyle = storage.get('pharma_navStyle', null);
    const dropdownBlur = storage.get('pharma_dropdownBlur', null);
    const sidebarVisible = storage.get('pharma_sidebarVisible', null);
    const hideInactiveModules = storage.get('pharma_hideInactiveModules', null);
    const developerMode = storage.get('pharma_developerMode', null);
    
    return {
      ...defaultSettings,
      theme: theme ? (typeof theme === 'string' ? JSON.parse(theme) : theme) : defaultSettings.theme,
      darkMode: darkMode ?? defaultSettings.darkMode,
      language: (language as Language) || defaultSettings.language,
      fontFamilyEN: fontFamilyEN || defaultSettings.fontFamilyEN,
      fontFamilyAR: fontFamilyAR || defaultSettings.fontFamilyAR,
      textTransform: (textTransform as 'normal' | 'uppercase') || defaultSettings.textTransform,
      navStyle: navStyle ? (Number(navStyle) as 1 | 2 | 3) : defaultSettings.navStyle,
      dropdownBlur: dropdownBlur ?? defaultSettings.dropdownBlur,
      sidebarBlur: storage.get('pharma_sidebarBlur', defaultSettings.sidebarBlur),
      menuBlur: storage.get('pharma_menuBlur', defaultSettings.menuBlur),
      tooltipBlur: storage.get('pharma_tooltipBlur', defaultSettings.tooltipBlur),
      sidebarVisible: sidebarVisible ?? defaultSettings.sidebarVisible,
      hideInactiveModules: hideInactiveModules ?? defaultSettings.hideInactiveModules,
      developerMode: developerMode ?? defaultSettings.developerMode,
    };
  } catch (e) {
    console.warn('Failed to migrate old settings:', e);
  }
  
  return defaultSettings;
};

// Context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);

  // Persist to storage
  useEffect(() => {
    storage.set(STORAGE_KEY, settings);
  }, [settings]);

  // Apply dark mode to document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Apply Font Settings & Load Fonts
  useEffect(() => {
    // 1. Update CSS Variables
    document.documentElement.style.setProperty('--font-en', settings.fontFamilyEN);
    document.documentElement.style.setProperty('--font-ar', settings.fontFamilyAR);

    // 2. Load English Font
    const enFont = AVAILABLE_FONTS_EN.find(f => f.value === settings.fontFamilyEN);
    if (enFont && enFont.url) {
        const linkId = `font-en-${settings.fontFamilyEN.replace(/[^a-zA-Z0-9]/g, '')}`;
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.href = enFont.url;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }

    // 3. Load Arabic Font
    const arFont = AVAILABLE_FONTS_AR.find(f => f.value === settings.fontFamilyAR);
    if (arFont && arFont.url) {
         const linkId = `font-ar-${settings.fontFamilyAR.replace(/[^a-zA-Z0-9]/g, '')}`;
         if (!document.getElementById(linkId)) {
             const link = document.createElement('link');
             link.id = linkId;
             link.href = arFont.url;
             link.rel = 'stylesheet';
             document.head.appendChild(link);
         }
    }
  }, [settings.fontFamilyEN, settings.fontFamilyAR]);


  // Apply text transform
  useEffect(() => {
    document.documentElement.style.setProperty('--text-transform', settings.textTransform === 'uppercase' ? 'uppercase' : 'none');
    if (settings.textTransform === 'uppercase') {
      document.body.classList.add('uppercase-mode');
    } else {
      document.body.classList.remove('uppercase-mode');
    }
  }, [settings.textTransform]);

  // Setters
  const setTheme = useCallback((theme: ThemeColor) => {
    setSettings(prev => ({ ...prev, theme }));
  }, []);

  const setDarkMode = useCallback((darkMode: boolean) => {
    setSettings(prev => ({ ...prev, darkMode }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setSettings(prev => ({ ...prev, language }));
  }, []);

  const setFontFamilyEN = useCallback((fontFamilyEN: string) => {
    setSettings(prev => ({ ...prev, fontFamilyEN }));
  }, []);

  const setFontFamilyAR = useCallback((fontFamilyAR: string) => {
      setSettings(prev => ({ ...prev, fontFamilyAR }));
  }, []);

  const setTextTransform = useCallback((textTransform: 'normal' | 'uppercase') => {
    setSettings(prev => ({ ...prev, textTransform }));
  }, []);

  const setNavStyle = useCallback((navStyle: 1 | 2 | 3) => {
    setSettings(prev => ({ ...prev, navStyle }));
  }, []);

  const setDropdownBlur = useCallback((dropdownBlur: boolean) => {
    setSettings(prev => ({ 
      ...prev, 
      dropdownBlur,
      sidebarBlur: dropdownBlur,
      menuBlur: dropdownBlur,
      tooltipBlur: dropdownBlur
    }));
  }, []);

  const setSidebarBlur = useCallback((sidebarBlur: boolean) => {
    setSettings(prev => ({ ...prev, sidebarBlur }));
  }, []);

  const setMenuBlur = useCallback((menuBlur: boolean) => {
    setSettings(prev => ({ ...prev, menuBlur }));
  }, []);

  const setTooltipBlur = useCallback((tooltipBlur: boolean) => {
    setSettings(prev => ({ ...prev, tooltipBlur }));
  }, []);

  const setSidebarVisible = useCallback((sidebarVisible: boolean) => {
    setSettings(prev => ({ ...prev, sidebarVisible }));
  }, []);

  const setHideInactiveModules = useCallback((hideInactiveModules: boolean) => {
    setSettings(prev => ({ ...prev, hideInactiveModules }));
  }, []);

  const setDeveloperMode = useCallback((developerMode: boolean) => {
    setSettings(prev => ({ ...prev, developerMode }));
  }, []);

  const setShowTicker = useCallback((showTicker: boolean) => {
    setSettings(prev => ({ ...prev, showTicker }));
  }, []);

  const setShowTickerSales = useCallback((showTickerSales: boolean) => {
    setSettings(prev => ({ ...prev, showTickerSales }));
  }, []);

  const setShowTickerInventory = useCallback((showTickerInventory: boolean) => {
    setSettings(prev => ({ ...prev, showTickerInventory }));
  }, []);

  const setShowTickerCustomers = useCallback((showTickerCustomers: boolean) => {
    setSettings(prev => ({ ...prev, showTickerCustomers }));
  }, []);

  const setShowTickerTopSeller = useCallback((showTickerTopSeller: boolean) => {
    setSettings(prev => ({ ...prev, showTickerTopSeller }));
  }, []);

  const value = useMemo<SettingsContextType>(() => ({
    ...settings,
    setTheme,
    setDarkMode,
    setLanguage,
    setTextTransform,
    setNavStyle,
    setDropdownBlur,
    setSidebarBlur,
    setMenuBlur,
    setTooltipBlur,
    setSidebarVisible,
    setHideInactiveModules,
    setDeveloperMode,
    setShowTicker,
    setShowTickerSales,
    setShowTickerInventory,
    setShowTickerCustomers,
    setShowTickerTopSeller,
    setFontFamilyEN,
    setFontFamilyAR,
    availableThemes: THEMES,
    availableLanguages: LANGUAGES,
  }), [
    settings,
    setTheme,
    setDarkMode,
    setLanguage,
    setTextTransform,
    setNavStyle,
    setDropdownBlur,
    setSidebarVisible,
    setHideInactiveModules,
    setDeveloperMode,
    setShowTicker,
    setShowTickerSales,
    setShowTickerInventory,
    setShowTickerCustomers,
    setShowTickerTopSeller,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
