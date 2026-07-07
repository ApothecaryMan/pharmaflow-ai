import { create } from 'zustand';
import { storage } from '../utils/storage';
import { StorageKeys } from '../config/storageKeys';

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  language: 'EN' | 'AR';
  view: string;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setLanguage: (lang: 'EN' | 'AR') => void;
  setView: (view: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  darkMode: storage.get(StorageKeys.DARK_MODE, false),
  language: storage.get(StorageKeys.LANGUAGE, 'EN'),
  view: 'landing',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDarkMode: (dark) => {
    storage.set(StorageKeys.DARK_MODE, dark);
    set({ darkMode: dark });
  },
  setLanguage: (lang) => {
    storage.set(StorageKeys.LANGUAGE, lang);
    set({ language: lang });
  },
  setView: (view) => set({ view }),
}));
