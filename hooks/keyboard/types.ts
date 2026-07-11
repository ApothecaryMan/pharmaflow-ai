export type ShortcutScope = 'global' | 'pos' | 'inventory' | 'purchases' | 'barcode-studio' | 'barcode-printer' | 'add-product' | 'stock-adjustment' | 'calculator' | 'sales-history' | 'customers' | 'reports' | 'settings' | 'dashboard';

export interface ShortcutDef {
  id: string;
  keys: string;
  label: string;
  labelAr: string;
  category: string;
  scope: ShortcutScope;
}

export interface ShortcutCategory {
  name: string;
  nameAr: string;
  shortcuts: ShortcutDef[];
}

export interface PageShortcutMap {
  [key: string]: (e?: KeyboardEvent) => void;
}

export interface RegisteredShortcut {
  id: string;
  keys: string;
  handler: (e: KeyboardEvent) => void;
  scope: ShortcutScope;
}

export interface KeyboardContextValue {
  currentScope: ShortcutScope;
  registerShortcuts: (scope: ShortcutScope, shortcutMap: PageShortcutMap) => () => void;
  getResolvedShortcut: (id: string) => string;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  shortcutsOverlayOpen: boolean;
  setShortcutsOverlayOpen: (open: boolean) => void;
}

export type ViewNavigationMap = Record<number, string>;
