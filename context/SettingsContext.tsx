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

import type React from 'react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AVAILABLE_FONTS_AR, AVAILABLE_FONTS_EN } from '../config/fonts';
import { COLOR_HEX_MAP, THEMES } from '../config/themeColors';
import type { Language, ThemeColor, SwitchVariant, BadgeStyle } from '../types';
import { storage } from '../utils/storage';

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
  numeralSystem: 'AR' | 'EN';
  // UI Preferences
  navStyle: 1 | 2 | 3;
  sidebarVisible: boolean;
  sidebarStyle: 1 | 2 | 3; // 1: Normal, 2: Mini, 3: Auto-Expand
  cardBorderLight: 'default' | 'thin' | 'none';
  borderRadius: 'default' | 'sharp' | 'full';
  customCardCss?: string;
  enableCustomCardCss: boolean;
  // Developer
  hideInactiveModules: boolean;
  developerMode: boolean;
  // Status Bar Ticker
  showTicker: boolean;
  showTickerSales: boolean;
  showTickerInventory: boolean;
  showTickerCustomers: boolean;
  showTickerTopSeller: boolean;
  graphicStyle: boolean;
  graphicFontVariant: 'serif' | 'sans';
  // Metadata
  activeBranchId: string;
  branchCode: string;
  switchVariant: SwitchVariant;
  badgeStyle: BadgeStyle;
  modalPresentationMode: 'modal' | 'sidebar';
  sidebarModalWidth: 'sm' | 'md' | 'lg' | 'xl';
  navbarMenuLayout: 'single' | 'multi';
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
  setNumeralSystem: (system: 'AR' | 'EN') => void;
  // UI Actions
  setNavStyle: (style: 1 | 2 | 3) => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarStyle: (style: 1 | 2 | 3) => void;
  setCardBorderLight: (style: 'default' | 'thin' | 'none') => void;
  setBorderRadius: (radius: 'default' | 'sharp' | 'full') => void;
  setCustomCardCss: (css: string) => void;
  setEnableCustomCardCss: (enable: boolean) => void;
  // Developer Actions
  setHideInactiveModules: (hide: boolean) => void;
  setDeveloperMode: (mode: boolean) => void;
  // Ticker Actions
  setShowTicker: (show: boolean) => void;
  setShowTickerSales: (show: boolean) => void;
  setShowTickerInventory: (show: boolean) => void;
  setShowTickerCustomers: (show: boolean) => void;
  setShowTickerTopSeller: (show: boolean) => void;
  setGraphicStyle: (graphic: boolean) => void;
  setGraphicFontVariant: (variant: 'serif' | 'sans') => void;
  setSwitchVariant: (variant: SwitchVariant) => void;
  setBadgeStyle: (style: BadgeStyle) => void;
  setModalPresentationMode: (mode: 'modal' | 'sidebar') => void;
  setSidebarModalWidth: (width: 'sm' | 'md' | 'lg' | 'xl') => void;
  setNavbarMenuLayout: (layout: 'single' | 'multi') => void;
  // Helpers
  availableThemes: ThemeColor[];
  availableLanguages: { code: Language; label: string }[];
  /** 
   * The locale to use for numbers/digits. 
   * Respects numeralSystem setting (e.g., 'ar-u-nu-latn' for English digits in Arabic). 
   */
  numeralLocale: string;
  /** 
   * The locale to use for text/names (e.g., Months, Days). 
   * Based strictly on the application language. 
   */
  textLocale: string;
}

// Default Settings
const defaultSettings: SettingsState = {
  theme: THEMES[0],
  darkMode: true,
  language: 'AR',
  fontFamilyEN: 'En-Firewall',
  fontFamilyAR: 'Ar-Firewall',
  textTransform: 'uppercase',
  numeralSystem: 'EN',
  navStyle: 2,
  sidebarVisible: false,
  sidebarStyle: 1,
  cardBorderLight: 'default',
  borderRadius: 'default',
  customCardCss: '',
  enableCustomCardCss: true,
  hideInactiveModules: true,
  developerMode: false,
  showTicker: false,
  showTickerSales: false,
  showTickerInventory: false,
  showTickerCustomers: false,
  showTickerTopSeller: true,
  graphicStyle: false,
  graphicFontVariant: 'sans',
  activeBranchId: '',
  branchCode: '',
  switchVariant: 'default',
  badgeStyle: 'default',
  modalPresentationMode: 'modal',
  sidebarModalWidth: 'md',
  navbarMenuLayout: 'single',
};

// Load settings from storage
const loadSettings = (): SettingsState => {
  if (typeof window === 'undefined') return defaultSettings;

  // Try loading unified settings object first
  let saved = storage.get<SettingsState | null>(STORAGE_KEY, null);
  
  // Migration: If global settings not found, try to recover from the user-scoped key before it was global
  if (!saved) {
    const userId = storage.getUserId();
    if (userId) {
      const userScopedItem = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (userScopedItem) {
        try {
          saved = JSON.parse(userScopedItem);
        } catch (e) {
          console.warn('Failed to parse user-scoped settings:', e);
        }
      }
    }
  }

  if (saved) {
    const combined = { ...defaultSettings, ...saved };
    // Defensive check: Ensure theme is a valid object with a name
    if (!combined.theme || typeof combined.theme !== 'object' || !combined.theme.name) {
      combined.theme = defaultSettings.theme;
    }
    return combined;
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
      theme: theme
        ? typeof theme === 'string'
          ? JSON.parse(theme)
          : theme
        : defaultSettings.theme,
      darkMode: darkMode ?? defaultSettings.darkMode,
      language: (language as Language) || defaultSettings.language,
      fontFamilyEN: fontFamilyEN || defaultSettings.fontFamilyEN,
      fontFamilyAR: fontFamilyAR || defaultSettings.fontFamilyAR,
      textTransform: (textTransform as 'normal' | 'uppercase') || defaultSettings.textTransform,
      navStyle: navStyle ? (Number(navStyle) as 1 | 2 | 3) : defaultSettings.navStyle,
      sidebarVisible: sidebarVisible ?? defaultSettings.sidebarVisible,
      sidebarStyle: storage.get('pharma_sidebarStyle',
        storage.get('pharma_sidebarCollapsed', false)
          ? (storage.get('pharma_sidebarHoverExpand', false) ? 3 : 2)
          : 1
      ) as 1 | 2 | 3,
      cardBorderLight: storage.get('pharma_cardBorderLight', defaultSettings.cardBorderLight),
      borderRadius: storage.get('pharma_borderRadius', defaultSettings.borderRadius),
      customCardCss: storage.get('pharma_customCardCss', defaultSettings.customCardCss || ''),
      enableCustomCardCss: storage.get('pharma_enableCustomCardCss', defaultSettings.enableCustomCardCss),
      hideInactiveModules: hideInactiveModules ?? defaultSettings.hideInactiveModules,
      developerMode: developerMode ?? defaultSettings.developerMode,
      graphicStyle: storage.get('pharma_graphicStyle', defaultSettings.graphicStyle),
      graphicFontVariant: storage.get('pharma_graphicFontVariant', defaultSettings.graphicFontVariant) as 'serif' | 'sans',
      activeBranchId: storage.get('pharma_activeBranchId', defaultSettings.activeBranchId),
      branchCode: storage.get('pharma_branchCode', defaultSettings.branchCode),
      numeralSystem: storage.get('pharma_numeralSystem', defaultSettings.numeralSystem) as 'AR' | 'EN',
      switchVariant: storage.get('pharma_switchVariant', defaultSettings.switchVariant) as SwitchVariant,
      badgeStyle: storage.get('pharma_badgeStyle', defaultSettings.badgeStyle) as BadgeStyle,
      modalPresentationMode: storage.get('pharma_modalPresentationMode', defaultSettings.modalPresentationMode) as 'modal' | 'sidebar',
      sidebarModalWidth: storage.get('pharma_sidebarModalWidth', defaultSettings.sidebarModalWidth) as 'sm' | 'md' | 'lg' | 'xl',
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

  // Persist to storage with guard to prevent redundant writes and loops
  useEffect(() => {
    const currentStored = localStorage.getItem(storage.getScopedKey(STORAGE_KEY));
    const newSettingsStr = JSON.stringify(settings);
    if (currentStored !== newSettingsStr) {
      storage.set(STORAGE_KEY, settings);
    }
  }, [settings]);

  // Synchronize settings from storage updates (cross-tab and same-tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storage.getScopedKey(STORAGE_KEY) && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings((prev) => {
            if (JSON.stringify(prev) === e.newValue) return prev;
            return { ...prev, ...parsed };
          });
        } catch (err) {
          console.error('Failed to parse settings storage update:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Apply Graphic Style to body
  useEffect(() => {
    if (settings.graphicStyle) {
      document.body.classList.add('graphic-mode');
    } else {
      document.body.classList.remove('graphic-mode');
    }
  }, [settings.graphicStyle]);

  // Apply Graphic Font Variant to body
  useEffect(() => {
    if (settings.graphicFontVariant === 'sans') {
      document.body.classList.add('graphic-mode-sans');
    } else {
      document.body.classList.remove('graphic-mode-sans');
    }
  }, [settings.graphicFontVariant]);

  // Apply Font Settings & Load Fonts
  useEffect(() => {
    // 1. Update CSS Variables
    document.documentElement.style.setProperty('--font-en', settings.fontFamilyEN);
    document.documentElement.style.setProperty('--font-ar', settings.fontFamilyAR);

    // 2. Load English Font
    const enFont = AVAILABLE_FONTS_EN.find((f) => f.value === settings.fontFamilyEN);
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
    const arFont = AVAILABLE_FONTS_AR.find((f) => f.value === settings.fontFamilyAR);
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
    document.documentElement.style.setProperty(
      '--text-transform',
      settings.textTransform === 'uppercase' ? 'uppercase' : 'none'
    );
    if (settings.textTransform === 'uppercase') {
      document.body.classList.add('uppercase-mode');
    } else {
      document.body.classList.remove('uppercase-mode');
    }
  }, [settings.textTransform]);

  // Apply light border mode
  useEffect(() => {
    document.documentElement.classList.remove('thin-border-mode', 'none-border-mode');
    if (settings.cardBorderLight === 'thin') {
      document.documentElement.classList.add('thin-border-mode');
    } else if (settings.cardBorderLight === 'none') {
      document.documentElement.classList.add('none-border-mode');
    }
  }, [settings.cardBorderLight]);

  // Apply border radius
  useEffect(() => {
    let radiusValue = '0.625rem'; // default (10px)
    if (settings.borderRadius === 'sharp') radiusValue = '0rem'; // 0px
    else if (settings.borderRadius === 'full') radiusValue = '0.375rem'; // 6px (smaller than default)

    document.documentElement.style.setProperty('--radius', radiusValue);
  }, [settings.borderRadius]);

  // Apply badge style
  useEffect(() => {
    let radiusValue = '0.5rem'; // default/rounded-lg
    let borderWidth = '1px';
    let paddingValue = '0.25rem 0.5rem';
    let fontSize = '0.75rem'; // text-xs
    let textTransform = 'none';
    let letterSpacing = 'normal';

    if (settings.badgeStyle === 'pill') {
      radiusValue = '9999px';
    } else if (settings.badgeStyle === 'slim') {
      radiusValue = '0.25rem'; // rounded (4px)
      borderWidth = '0px';
      paddingValue = '0.125rem 0.375rem'; // px-1.5 py-0.5
      fontSize = '0.625rem'; // text-[10px]
      textTransform = 'uppercase';
      letterSpacing = '0.05em'; // tracking-wider
    }

    document.documentElement.style.setProperty('--badge-radius', radiusValue);
    document.documentElement.style.setProperty('--badge-border-width', borderWidth);
    document.documentElement.style.setProperty('--badge-padding', paddingValue);
    document.documentElement.style.setProperty('--badge-font-size', fontSize);
    document.documentElement.style.setProperty('--badge-text-transform', textTransform);
    document.documentElement.style.setProperty('--badge-letter-spacing', letterSpacing);
  }, [settings.badgeStyle]);

  // Apply sidebar modal width
  useEffect(() => {
    let widthVal = '512px';
    if (settings.sidebarModalWidth === 'sm') widthVal = '384px';
    else if (settings.sidebarModalWidth === 'lg') widthVal = '640px';
    else if (settings.sidebarModalWidth === 'xl') widthVal = '768px';

    document.documentElement.style.setProperty('--sidebar-modal-width', widthVal);
  }, [settings.sidebarModalWidth]);

  // Apply custom CSS
  useEffect(() => {
    let styleEl = document.getElementById('pharma-custom-card-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'pharma-custom-card-css';
      document.head.appendChild(styleEl);
    }

    if (settings.customCardCss && settings.enableCustomCardCss) {
      // Smart CSS processing: Add !important to each property if missing
      const processedCss = settings.customCardCss
        .split(';')
        .map((part) => {
          const trimmed = part.trim();
          if (!trimmed || !trimmed.includes(':')) return trimmed;
          // Check if already has !important (case insensitive)
          if (/\!important/i.test(trimmed)) return trimmed;
          return `${trimmed} !important`;
        })
        .join('; ');

      styleEl.textContent = `
        html:not(.dark) .card-shadow,
        html.dark .card-shadow,
        .card-shadow {
          ${processedCss}
        }
      `;
    } else {
      styleEl.textContent = '';
    }
  }, [settings.customCardCss, settings.enableCustomCardCss]);

  // Synchronize document language and direction
  useEffect(() => {
    const lang = settings.language.toLowerCase();
    document.documentElement.lang = lang;
    document.documentElement.dir = settings.language === 'AR' ? 'rtl' : 'ltr';
    // Also update body class for styling
    document.body.dir = document.documentElement.dir;
  }, [settings.language]);

  // Setters
  const setTheme = useCallback((theme: ThemeColor) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setDarkMode = useCallback((darkMode: boolean) => {
    setSettings((prev) => ({ ...prev, darkMode }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setSettings((prev) => ({ ...prev, language }));
  }, []);

  const setFontFamilyEN = useCallback((fontFamilyEN: string) => {
    setSettings((prev) => ({ ...prev, fontFamilyEN }));
  }, []);

  const setFontFamilyAR = useCallback((fontFamilyAR: string) => {
    setSettings((prev) => ({ ...prev, fontFamilyAR }));
  }, []);

  const setTextTransform = useCallback((textTransform: 'normal' | 'uppercase') => {
    setSettings((prev) => ({ ...prev, textTransform }));
  }, []);

  const setNumeralSystem = useCallback((numeralSystem: 'AR' | 'EN') => {
    setSettings((prev) => ({ ...prev, numeralSystem }));
  }, []);

  const setNavStyle = useCallback((navStyle: 1 | 2 | 3) => {
    setSettings((prev) => ({ ...prev, navStyle }));
  }, []);

  const setSidebarVisible = useCallback((sidebarVisible: boolean) => {
    setSettings((prev) => ({ ...prev, sidebarVisible }));
  }, []);

  const setSidebarStyle = useCallback((sidebarStyle: 1 | 2 | 3) => {
    setSettings((prev) => ({ ...prev, sidebarStyle }));
  }, []);

  const setCardBorderLight = useCallback((cardBorderLight: 'default' | 'thin' | 'none') => {
    setSettings((prev) => ({ ...prev, cardBorderLight }));
  }, []);

  const setBorderRadius = useCallback((borderRadius: 'default' | 'sharp' | 'full') => {
    setSettings((prev) => ({ ...prev, borderRadius }));
  }, []);

  const setCustomCardCss = useCallback((customCardCss: string) => {
    setSettings((prev) => ({ ...prev, customCardCss }));
  }, []);

  const setEnableCustomCardCss = useCallback((enableCustomCardCss: boolean) => {
    setSettings((prev) => ({ ...prev, enableCustomCardCss }));
  }, []);

  const setHideInactiveModules = useCallback((hideInactiveModules: boolean) => {
    setSettings((prev) => ({ ...prev, hideInactiveModules }));
  }, []);

  const setDeveloperMode = useCallback((developerMode: boolean) => {
    setSettings((prev) => ({ ...prev, developerMode }));
  }, []);

  const setShowTicker = useCallback((showTicker: boolean) => {
    setSettings((prev) => ({ ...prev, showTicker }));
  }, []);

  const setShowTickerSales = useCallback((showTickerSales: boolean) => {
    setSettings((prev) => ({ ...prev, showTickerSales }));
  }, []);

  const setShowTickerInventory = useCallback((showTickerInventory: boolean) => {
    setSettings((prev) => ({ ...prev, showTickerInventory }));
  }, []);

  const setShowTickerCustomers = useCallback((showTickerCustomers: boolean) => {
    setSettings((prev) => ({ ...prev, showTickerCustomers }));
  }, []);

  const setShowTickerTopSeller = useCallback((showTickerTopSeller: boolean) => {
    setSettings((prev) => ({ ...prev, showTickerTopSeller }));
  }, []);

  const setGraphicStyle = useCallback((graphicStyle: boolean) => {
    setSettings((prev) => ({ ...prev, graphicStyle }));
  }, []);

  const setGraphicFontVariant = useCallback((graphicFontVariant: 'serif' | 'sans') => {
    setSettings((prev) => ({ ...prev, graphicFontVariant }));
  }, []);

  const setSwitchVariant = useCallback((switchVariant: SwitchVariant) => {
    setSettings((prev) => ({ ...prev, switchVariant }));
  }, []);

  const setBadgeStyle = useCallback((badgeStyle: BadgeStyle) => {
    setSettings((prev) => ({ ...prev, badgeStyle }));
  }, []);

  const setModalPresentationMode = useCallback((modalPresentationMode: 'modal' | 'sidebar') => {
    setSettings((prev) => ({ ...prev, modalPresentationMode }));
  }, []);

  const setSidebarModalWidth = useCallback((sidebarModalWidth: 'sm' | 'md' | 'lg' | 'xl') => {
    setSettings((prev) => ({ ...prev, sidebarModalWidth }));
  }, []);

  const setNavbarMenuLayout = useCallback((navbarMenuLayout: 'single' | 'multi') => {
    setSettings((prev) => ({ ...prev, navbarMenuLayout }));
  }, []);

  // --- Centralized Locale Resolution ---
  const numeralLocale = useMemo(() => {
    const isAR = settings.language === 'AR';
    if (isAR) {
      return settings.numeralSystem === 'AR' ? 'ar-EG' : 'ar-u-nu-latn';
    }
    return 'en-US';
  }, [settings.language, settings.numeralSystem]);

  const textLocale = useMemo(() => {
    return settings.language === 'AR' ? 'ar-EG' : 'en-US';
  }, [settings.language]);

  // Sync with global polyfills
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__NUMERAL_LOCALE__ = numeralLocale;
      window.__TEXT_LOCALE__ = textLocale;

      // Trigger global DOM update for raw numbers
      if ((window as any).__UPDATE_DIGITS__) {
        (window as any).__UPDATE_DIGITS__();
      }
    }
  }, [numeralLocale, textLocale]);

  const value = useMemo<SettingsContextType>(
    () => ({
      ...settings,
      setTheme,
      setDarkMode,
      setLanguage,
      setTextTransform,
      setNavStyle,
      setSidebarVisible,
      setSidebarStyle,
      setCardBorderLight,
      setCustomCardCss,
      setEnableCustomCardCss,
      setHideInactiveModules,
      setDeveloperMode,
      setShowTicker,
      setShowTickerSales,
      setShowTickerInventory,
      setShowTickerCustomers,
      setShowTickerTopSeller,
      setGraphicStyle,
      setGraphicFontVariant,
      setBorderRadius,
      setFontFamilyEN,
      setFontFamilyAR,
      setNumeralSystem,
      setSwitchVariant,
      setBadgeStyle,
      setModalPresentationMode,
      setSidebarModalWidth,
      setNavbarMenuLayout,
      availableThemes: THEMES,
      availableLanguages: LANGUAGES,
      numeralLocale,
      textLocale,
    }),
    [
      settings,
      setTheme,
      setDarkMode,
      setLanguage,
      setTextTransform,
      setSidebarVisible,
      setSidebarStyle,
      setCardBorderLight,
      setCustomCardCss,
      setEnableCustomCardCss,
      setHideInactiveModules,
      setDeveloperMode,
      setShowTicker,
      setShowTickerSales,
      setShowTickerInventory,
      setShowTickerCustomers,
      setShowTickerTopSeller,
      setGraphicStyle,
      setGraphicFontVariant,
      setBorderRadius,
      setFontFamilyEN,
      setFontFamilyAR,
      setNumeralSystem,
      setSwitchVariant,
      setBadgeStyle,
      setModalPresentationMode,
      setSidebarModalWidth,
      setNavbarMenuLayout,
      numeralLocale,
      textLocale,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
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
