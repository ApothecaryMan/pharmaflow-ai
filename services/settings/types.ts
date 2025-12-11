/**
 * Settings Types - User preferences and app configuration
 */

import { ThemeColor, Language } from '../../types';

export interface AppSettings {
  theme: ThemeColor;
  darkMode: boolean;
  language: Language;
  textTransform: 'normal' | 'uppercase';
  sidebarVisible: boolean;
  hideInactiveModules: boolean;
  navStyle: 1 | 2 | 3;
  profileImage: string | null;
  activeModule: string;
}

export interface SettingsService {
  getAll(): Promise<AppSettings>;
  get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]>;
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  setMultiple(settings: Partial<AppSettings>): Promise<void>;
  reset(): Promise<void>;
}
