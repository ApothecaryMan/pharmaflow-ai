/**
 * Settings Service - Manages user preferences and app configuration
 */

import { AppSettings, SettingsService } from './types';
import { ThemeColor } from '../../types';

const STORAGE_KEYS = {
  theme: 'pharma_theme',
  darkMode: 'pharma_darkMode',
  language: 'pharma_language',
  textTransform: 'pharma_textTransform',
  sidebarVisible: 'pharma_sidebarVisible',
  hideInactiveModules: 'pharma_hideInactiveModules',
  navStyle: 'pharma_navStyle',
  profileImage: 'pharma_profileImage',
  activeModule: 'pharma_activeModule',
  purchaseTaxRate: 'pharma_purchaseTaxRate'
} as const;

const DEFAULT_THEME: ThemeColor = { name: 'Blue', primary: 'blue', hex: '#3b82f6' };

const DEFAULT_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  darkMode: false,
  language: 'EN',
  textTransform: 'normal',
  sidebarVisible: true,
  hideInactiveModules: false,
  navStyle: 1,
  profileImage: null,
  activeModule: 'dashboard',
  purchaseTaxRate: 14 // Default 14% tax rate
};

// Mock implementation using localStorage
export const createSettingsService = (): SettingsService => ({
  getAll: async (): Promise<AppSettings> => {
    return {
      theme: JSON.parse(localStorage.getItem(STORAGE_KEYS.theme) || JSON.stringify(DEFAULT_SETTINGS.theme)),
      darkMode: JSON.parse(localStorage.getItem(STORAGE_KEYS.darkMode) || 'false'),
      language: (localStorage.getItem(STORAGE_KEYS.language) as AppSettings['language']) || DEFAULT_SETTINGS.language,
      textTransform: (localStorage.getItem(STORAGE_KEYS.textTransform) as AppSettings['textTransform']) || DEFAULT_SETTINGS.textTransform,
      sidebarVisible: JSON.parse(localStorage.getItem(STORAGE_KEYS.sidebarVisible) || 'true'),
      hideInactiveModules: JSON.parse(localStorage.getItem(STORAGE_KEYS.hideInactiveModules) || 'false'),
      navStyle: (Number(localStorage.getItem(STORAGE_KEYS.navStyle)) as AppSettings['navStyle']) || DEFAULT_SETTINGS.navStyle,
      profileImage: localStorage.getItem(STORAGE_KEYS.profileImage),
      activeModule: localStorage.getItem(STORAGE_KEYS.activeModule) || DEFAULT_SETTINGS.activeModule,
      purchaseTaxRate: Number(localStorage.getItem(STORAGE_KEYS.purchaseTaxRate)) || DEFAULT_SETTINGS.purchaseTaxRate
    };
  },

  get: async <K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> => {
    const storageKey = STORAGE_KEYS[key];
    const value = localStorage.getItem(storageKey);
    
    if (value === null) return DEFAULT_SETTINGS[key];
    
    // Handle different types
    if (key === 'theme') return JSON.parse(value);
    if (key === 'darkMode' || key === 'sidebarVisible' || key === 'hideInactiveModules') {
      return JSON.parse(value);
    }
    if (key === 'navStyle' || key === 'purchaseTaxRate') return Number(value) as AppSettings[K];
    return value as AppSettings[K];
  },

  set: async <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> => {
    const storageKey = STORAGE_KEYS[key];
    
    if (value === null) {
      localStorage.removeItem(storageKey);
    } else if (typeof value === 'object') {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } else if (typeof value === 'boolean') {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } else {
      localStorage.setItem(storageKey, String(value));
    }
  },

  setMultiple: async (settings: Partial<AppSettings>): Promise<void> => {
    const service = createSettingsService();
    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        service.set(key as keyof AppSettings, value)
      )
    );
  },

  reset: async (): Promise<void> => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
});

// Default instance
export const settingsService = createSettingsService();
