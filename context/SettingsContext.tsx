import type React from 'react';
import type { ReactNode } from 'react';
import type { BadgeStyle, Language, SwitchVariant, ThemeColor } from '../types';
import { NotificationProvider, useNotification } from './NotificationContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { TypographyProvider, useTypography } from './TypographyContext';
import { UIProvider, useUI } from './UIContext';

export { THEMES } from '../config/themeColors';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'EN', label: 'English' },
  { code: 'AR', label: 'العربية' },
];

export interface SettingsState {
  theme: ThemeColor;
  darkMode: boolean;
  language: Language;
  fontFamilyEN: string;
  fontFamilyAR: string;
  textTransform: 'normal' | 'uppercase';
  numeralSystem: 'AR' | 'EN';
  backgroundPattern:
    | 'none'
    | 'dots'
    | 'grid'
    | 'mesh'
    | 'crosshatch'
    | 'stripes'
    | 'noise'
    | 'mandala'
    | 'diamond'
    | 'corners'
    | 'cross'
    | 'stars'
    | 'bricks'
    | 'polka'
    | 'abstract'
    | 'circuit'
    | 'ornate';
  backgroundPatternOpacity: number;
  backgroundPatternUseThemeColor: boolean;
  navStyle: 1 | 2 | 3;
  sidebarVisible: boolean;
  sidebarStyle: 1 | 2 | 3;
  cardBorderLight: 'default' | 'thin' | 'none';
  borderRadius: 'default' | 'sharp' | 'full';
  customCardCss?: string;
  enableCustomCardCss: boolean;
  hideInactiveModules: boolean;
  developerMode: boolean;
  showTicker: boolean;
  showNotificationBell: boolean;
  showNotificationOverlay: boolean;
  showTickerSales: boolean;
  showTickerInventory: boolean;
  showTickerCustomers: boolean;
  showTickerTopSeller: boolean;
  graphicStyle: boolean;
  graphicFontVariant: 'serif' | 'sans';
  vividBg: 'muted' | 'subtle' | 'vivid';
  switchVariant: SwitchVariant;
  badgeStyle: BadgeStyle;
  modalPresentationMode: 'modal' | 'sidebar';
  sidebarModalWidth: 'sm' | 'md' | 'lg' | 'xl';
  navbarMenuLayout: 'single' | 'multi';
  reducedMotion: boolean;
  disableCSSTransitions: boolean;
  tooltipBlur: boolean;
  activeBranchId: string;
  branchCode: string;
}

export interface SettingsContextType extends SettingsState {
  setTheme: (theme: ThemeColor) => void;
  setDarkMode: (mode: boolean) => void;
  setLanguage: (lang: Language) => void;
  setFontFamilyEN: (font: string) => void;
  setFontFamilyAR: (font: string) => void;
  setTextTransform: (transform: 'normal' | 'uppercase') => void;
  setNumeralSystem: (system: 'AR' | 'EN') => void;
  setBackgroundPattern: (pattern: SettingsState['backgroundPattern']) => void;
  setBackgroundPatternOpacity: (opacity: number) => void;
  setBackgroundPatternUseThemeColor: (use: boolean) => void;
  setNavStyle: (style: 1 | 2 | 3) => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarStyle: (style: 1 | 2 | 3) => void;
  setCardBorderLight: (style: 'default' | 'thin' | 'none') => void;
  setBorderRadius: (radius: 'default' | 'sharp' | 'full') => void;
  setCustomCardCss: (css: string) => void;
  setEnableCustomCardCss: (enable: boolean) => void;
  setHideInactiveModules: (hide: boolean) => void;
  setDeveloperMode: (mode: boolean) => void;
  setShowTicker: (show: boolean) => void;
  setShowNotificationBell: (show: boolean) => void;
  setShowNotificationOverlay: (show: boolean) => void;
  setShowTickerSales: (show: boolean) => void;
  setShowTickerInventory: (show: boolean) => void;
  setShowTickerCustomers: (show: boolean) => void;
  setShowTickerTopSeller: (show: boolean) => void;
  setGraphicStyle: (graphic: boolean) => void;
  setGraphicFontVariant: (variant: 'serif' | 'sans') => void;
  setVividBg: (vivid: 'muted' | 'subtle' | 'vivid') => void;
  setSwitchVariant: (variant: SwitchVariant) => void;
  setBadgeStyle: (style: BadgeStyle) => void;
  setModalPresentationMode: (mode: 'modal' | 'sidebar') => void;
  setSidebarModalWidth: (width: 'sm' | 'md' | 'lg' | 'xl') => void;
  setNavbarMenuLayout: (layout: 'single' | 'multi') => void;
  setReducedMotion: (value: boolean) => void;
  setDisableCSSTransitions: (value: boolean) => void;
  availableThemes: ThemeColor[];
  availableLanguages: { code: Language; label: string }[];
  numeralLocale: string;
  textLocale: string;
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <UIProvider>
        <TypographyProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </TypographyProvider>
      </UIProvider>
    </ThemeProvider>
  );
};

export const useSettings = (): SettingsContextType => {
  const theme = useTheme();
  const ui = useUI();
  const typography = useTypography();
  const notification = useNotification();

  return {
    ...theme,
    ...ui,
    ...typography,
    ...notification,
    availableThemes: theme.availableThemes,
    availableLanguages: LANGUAGES,
    numeralLocale: typography.numeralLocale,
    textLocale: typography.textLocale,
    tooltipBlur: true,
  };
};

export { useNotification } from './NotificationContext';
export { useTheme } from './ThemeContext';
export { useTypography } from './TypographyContext';
export { useUI } from './UIContext';
