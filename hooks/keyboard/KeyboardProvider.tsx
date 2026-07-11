import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { VIEW_NAVIGATION_MAP } from './shortcuts.constants';
import type { KeyboardContextValue, PageShortcutMap, RegisteredShortcut, ShortcutScope } from './types';
import { useBrowserOverride } from './useBrowserOverride';
import { useKeyboardStore } from '../../stores/keyboardStore';

export const KeyboardContext = createContext<KeyboardContextValue>(null as any);

interface KeyboardProviderProps {
  children: React.ReactNode;
  onNavigate: (viewId: string) => void;
  onToggleSidebar?: () => void;
  currentScope?: ShortcutScope;
}

interface ParsedKey {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

function parseShortcutKeys(keys: string): ParsedKey {
  const parts = keys.toLowerCase().split('+');
  const ctrl = parts.includes('ctrl');
  const alt = parts.includes('alt');
  const shift = parts.includes('shift');
  const key = parts.filter((p) => !['ctrl', 'alt', 'shift'].includes(p)).join('+');
  return { ctrl, alt, shift, key };
}

const SPECIAL_KEYS: Record<string, string[]> = {
  delete: ['delete', 'backspace'],
  enter: ['enter'],
  escape: ['escape'],
  '+': ['+', '='],
  '=': ['+', '='],
};

function matchShortcut(e: KeyboardEvent, parsed: ParsedKey): boolean {
  if (e.ctrlKey !== parsed.ctrl) return false;
  if (e.altKey !== parsed.alt) return false;
  
  if (e.shiftKey !== parsed.shift) {
    const shiftChars = ['+', '?', ':', '{', '}', '"', '|', '<', '>', '~', '_', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];
    if (!shiftChars.includes(parsed.key)) return false;
  }

  const eventKey = e.key.toLowerCase();

  if (parsed.key.startsWith('f') && /^f\d+$/.test(parsed.key)) {
    return eventKey === parsed.key;
  }

  const special = SPECIAL_KEYS[parsed.key];
  if (special) return special.includes(eventKey);

  return eventKey === parsed.key;
}

export function KeyboardProvider({
  children,
  onNavigate,
  currentScope: currentScopeProp = 'global',
}: KeyboardProviderProps) {
  useBrowserOverride();

  const getResolvedShortcut = useKeyboardStore((s) => s.getResolvedShortcut);

  const registryRef = useRef<Map<string, RegisteredShortcut[]>>(new Map());
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOverlayOpen, setShortcutsOverlayOpen] = useState(false);

  const registerShortcuts = useMemo(
    () =>
      (scope: ShortcutScope, shortcutMap: PageShortcutMap): (() => void) => {
        const entries = Object.entries(shortcutMap).map(([keys, handler]) => ({
          id: `${scope}:${keys}`,
          keys,
          handler: handler as (e: KeyboardEvent) => void,
          scope,
        }));

        const entryIds = new Set(entries.map((e) => e.id));

        const existing = registryRef.current.get(scope) || [];
        registryRef.current.set(scope, [...existing, ...entries]);

        return () => {
          const current = registryRef.current.get(scope) || [];
          registryRef.current.set(
            scope,
            current.filter((s) => !entryIds.has(s.id))
          );
        };
      },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { register, unregister } = await import('@tauri-apps/plugin-global-shortcut');
        const { getCurrentWindow } = await import('@tauri-apps/api/window');

        await register('CommandOrControl+Shift+P', () => {
          getCurrentWindow().show().then(() => getCurrentWindow().setFocus());
        });
        await register('CommandOrControl+Shift+K', () => {
          getCurrentWindow().show().then(() => getCurrentWindow().setFocus());
          setCommandPaletteOpen(true);
        });
        cleanup = () => {
          unregister('CommandOrControl+Shift+P');
          unregister('CommandOrControl+Shift+K');
        };
      } catch (err) {
        console.warn('[Keyboard] Tauri global shortcut registration failed:', err);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isModalOpen = document.querySelector('[role="dialog"]');
      const activeEl = document.activeElement;
      const activeTag = activeEl?.tagName;
      const isInput =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable === true;
      const isFunctionKey = /^F\d+$/.test(e.key);
      const hasModifier = e.ctrlKey || e.altKey || e.metaKey;

      if (isModalOpen) {
        if (e.key === 'Escape') {
          setCommandPaletteOpen(false);
          setShortcutsOverlayOpen(false);
          return;
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setCommandPaletteOpen(true);
          return;
        }
        return;
      }

      if (isInput && !isFunctionKey && !hasModifier && e.key !== 'Escape') {
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 8) {
          e.preventDefault();
          onNavigate(VIEW_NAVIGATION_MAP[num]);
          return;
        }
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'k' && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setShortcutsOverlayOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setShortcutsOverlayOpen(false);
        return;
      }

      const allEntries: RegisteredShortcut[] = [];
      registryRef.current.forEach((entries) => allEntries.push(...entries));

      for (const shortcut of allEntries) {
        const parsed = parseShortcutKeys(shortcut.keys);
        if (matchShortcut(e, parsed)) {
          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onNavigate, currentScopeProp]);

  const contextValue = useMemo<KeyboardContextValue>(
    () => ({
      currentScope: currentScopeProp,
      registerShortcuts,
      getResolvedShortcut,
      commandPaletteOpen,
      setCommandPaletteOpen,
      shortcutsOverlayOpen,
      setShortcutsOverlayOpen,
    }),
    [currentScopeProp, registerShortcuts, getResolvedShortcut, commandPaletteOpen, shortcutsOverlayOpen]
  );

  return <KeyboardContext.Provider value={contextValue}>{children}</KeyboardContext.Provider>;
}

export function useKeyboardContext(): KeyboardContextValue {
  const ctx = useContext(KeyboardContext);
  if (!ctx) {
    throw new Error('useKeyboardContext must be used within a KeyboardProvider');
  }
  return ctx;
}
