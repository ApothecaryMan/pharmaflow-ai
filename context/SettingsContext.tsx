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
import { ThemeColor, Language } from '../types';

// Available Themes
export const THEMES: ThemeColor[] = [
  { name: 'Blue', primary: 'blue', hex: '#3b82f6' },
  { name: 'Indigo', primary: 'indigo', hex: '#6366f1' },
  { name: 'Purple', primary: 'purple', hex: '#a855f7' },
  { name: 'Pink', primary: 'pink', hex: '#ec4899' },
  { name: 'Red', primary: 'red', hex: '#ef4444' },
  { name: 'Orange', primary: 'orange', hex: '#f97316' },
  { name: 'Amber', primary: 'amber', hex: '#f59e0b' },
  { name: 'Yellow', primary: 'yellow', hex: '#eab308' },
  { name: 'Lime', primary: 'lime', hex: '#84cc16' },
  { name: 'Green', primary: 'green', hex: '#22c55e' },
  { name: 'Emerald', primary: 'emerald', hex: '#10b981' },
  { name: 'Teal', primary: 'teal', hex: '#14b8a6' },
  { name: 'Cyan', primary: 'cyan', hex: '#06b6d4' },
  { name: 'Sky', primary: 'sky', hex: '#0ea5e9' },
  { name: 'Gray', primary: 'gray', hex: '#6b7280' },
  { name: 'Slate', primary: 'slate', hex: '#64748b' },
  { name: 'Zinc', primary: 'zinc', hex: '#71717a' },
  { name: 'Neutral', primary: 'neutral', hex: '#737373' },
  { name: 'Stone', primary: 'stone', hex: '#78716c' },
];

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
  textTransform: 'normal' | 'uppercase';
  // UI Preferences
  navStyle: 1 | 2 | 3;
  dropdownBlur: boolean;
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
  setTextTransform: (transform: 'normal' | 'uppercase') => void;
  // UI Actions
  setNavStyle: (style: 1 | 2 | 3) => void;
  setDropdownBlur: (blur: boolean) => void;
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
  language: 'AR',
  textTransform: 'uppercase',
  navStyle: 2,
  dropdownBlur: false,
  sidebarVisible: false,
  hideInactiveModules: true,
  developerMode: false,
  showTicker: true,
  showTickerSales: true,
  showTickerInventory: true,
  showTickerCustomers: true,
  showTickerTopSeller: true,
};

// Load settings from localStorage
const loadSettings = (): SettingsState => {
  if (typeof window === 'undefined') return defaultSettings;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  
  // Migrate from old individual keys if new unified key doesn't exist
  try {
    const theme = localStorage.getItem('pharma_theme');
    const darkMode = localStorage.getItem('pharma_darkMode');
    const language = localStorage.getItem('pharma_language');
    const textTransform = localStorage.getItem('pharma_textTransform');
    const navStyle = localStorage.getItem('pharma_navStyle');
    const dropdownBlur = localStorage.getItem('pharma_dropdownBlur');
    const sidebarVisible = localStorage.getItem('pharma_sidebarVisible');
    const hideInactiveModules = localStorage.getItem('pharma_hideInactiveModules');
    const developerMode = localStorage.getItem('pharma_developerMode');
    
    return {
      ...defaultSettings,
      theme: theme ? JSON.parse(theme) : defaultSettings.theme,
      darkMode: darkMode ? JSON.parse(darkMode) : defaultSettings.darkMode,
      language: (language as Language) || defaultSettings.language,
      textTransform: (textTransform as 'normal' | 'uppercase') || defaultSettings.textTransform,
      navStyle: navStyle ? (Number(navStyle) as 1 | 2 | 3) : defaultSettings.navStyle,
      dropdownBlur: dropdownBlur ? JSON.parse(dropdownBlur) : defaultSettings.dropdownBlur,
      sidebarVisible: sidebarVisible ? JSON.parse(sidebarVisible) : defaultSettings.sidebarVisible,
      hideInactiveModules: hideInactiveModules ? JSON.parse(hideInactiveModules) : defaultSettings.hideInactiveModules,
      developerMode: developerMode ? JSON.parse(developerMode) : defaultSettings.developerMode,
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

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply dark mode to document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

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

  const setTextTransform = useCallback((textTransform: 'normal' | 'uppercase') => {
    setSettings(prev => ({ ...prev, textTransform }));
  }, []);

  const setNavStyle = useCallback((navStyle: 1 | 2 | 3) => {
    setSettings(prev => ({ ...prev, navStyle }));
  }, []);

  const setDropdownBlur = useCallback((dropdownBlur: boolean) => {
    setSettings(prev => ({ ...prev, dropdownBlur }));
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
    setSidebarVisible,
    setHideInactiveModules,
    setDeveloperMode,
    setShowTicker,
    setShowTickerSales,
    setShowTickerInventory,
    setShowTickerCustomers,
    setShowTickerTopSeller,
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
