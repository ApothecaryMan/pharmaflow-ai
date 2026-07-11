import { create } from 'zustand';
import { DEFAULT_SHORTCUTS } from '../hooks/keyboard/shortcuts.constants';

const STORAGE_KEY = 'pharma_keyboard_overrides';

function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveOverrides(overrides: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {}
}

interface KeyboardStoreState {
  overrides: Record<string, string>;
  setOverride: (shortcutId: string, customKeys: string) => void;
  removeOverride: (shortcutId: string) => void;
  resetToDefaults: () => void;
  getResolvedShortcut: (shortcutId: string) => string;
}

export const useKeyboardStore = create<KeyboardStoreState>((set, get) => ({
  overrides: loadOverrides(),

  setOverride: (shortcutId, customKeys) => {
    set((state) => {
      const next = { ...state.overrides, [shortcutId]: customKeys };
      saveOverrides(next);
      return { overrides: next };
    });
  },

  removeOverride: (shortcutId) => {
    set((state) => {
      const next = { ...state.overrides };
      delete next[shortcutId];
      saveOverrides(next);
      return { overrides: next };
    });
  },

  resetToDefaults: () => {
    saveOverrides({});
    set({ overrides: {} });
  },

  getResolvedShortcut: (shortcutId) => {
    const { overrides } = get();
    return overrides[shortcutId] || DEFAULT_SHORTCUTS[shortcutId] || shortcutId;
  },
}));
