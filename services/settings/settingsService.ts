/**
 * Settings Service - Manages user preferences and app configuration
 */

import { StorageKeys } from '../../config/storageKeys';
import type { ThemeColor } from '../../types';

import { storage } from '../../utils/storage';
import type { AppSettings, SettingsService } from './types';

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
  purchaseTaxRate: 14, // Default 14% tax rate
  branchCode: 'B1', // Default Branch Code
};

export const createSettingsService = (): SettingsService => ({
  getAll: async (): Promise<AppSettings> => {
    // Try to get unified settings first
    const unified = storage.get<Partial<AppSettings>>(StorageKeys.SETTINGS, {});

    // Merge with defaults
    return { ...DEFAULT_SETTINGS, ...unified };
  },

  get: async <K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> => {
    const all = await settingsService.getAll();
    return all[key];
  },

  set: async <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> => {
    const all = await settingsService.getAll();
    const updated = { ...all, [key]: value };
    storage.set(StorageKeys.SETTINGS, updated);
  },

  setMultiple: async (settings: Partial<AppSettings>): Promise<void> => {
    const all = await settingsService.getAll();
    const updated = { ...all, ...settings };
    storage.set(StorageKeys.SETTINGS, updated);
  },

  reset: async (): Promise<void> => {
    storage.remove(StorageKeys.SETTINGS);
  },
});

// Default instance
export const settingsService = createSettingsService();
