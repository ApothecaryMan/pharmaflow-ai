import { useEffect, useRef, useState } from 'react';
import { isTauri } from '../../utils/platform';

// Empirically enough for 3-4 paint frames in the webview (~50-70ms at 60fps)
// while not penalizing slower machines where rAF in a hidden window may be throttled.
const PAINT_DELAY_MS = 150;
const SHOW_FALLBACK_MS = 4000;

interface TauriNativeOptions {
  isAppReady: boolean;
  language: 'AR' | 'EN';
}

/**
 * Centralized hook for all Tauri-specific native desktop behaviors.
 * This encapsulates window lifecycle, shortcuts, context menus, and system tray logic,
 * keeping the React layer agnostic to the desktop environment.
 */
export function useTauriNative({ isAppReady, language }: TauriNativeOptions) {
  const [isWindowShown, setIsWindowShown] = useState(false);
  const hasShownRef = useRef(false);
  const safeFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Native Window Lifecycle (Show window only when React is ready)
  useEffect(() => {
    if (!isTauri() || hasShownRef.current || !isAppReady) return;

    const clearFallback = () => {
      if (safeFallbackRef.current) {
        clearTimeout(safeFallbackRef.current);
        safeFallbackRef.current = null;
      }
    };

    const revealWindow = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().show();
        setIsWindowShown(true);
        clearFallback();
      } catch (err) {
        console.warn('[Tauri Native] Failed to show window:', err);
      }
    };

    hasShownRef.current = true;
    // NOTE: setTimeout is used deliberately instead of requestAnimationFrame —
    // rAF can be heavily throttled while the native window is still hidden,
    // which would keep the window invisible until the fallback fires.
    // The HTML boot splash masks the reveal, so a timeout is safe.
    setTimeout(revealWindow, PAINT_DELAY_MS);

    // Safety fallback: show window unconditionally so it can never hang hidden.
    safeFallbackRef.current = setTimeout(() => {
      revealWindow().catch(() => {});
    }, SHOW_FALLBACK_MS);

    return clearFallback;
  }, [isAppReady]);

  // 2. Native System Tray Synchronization
  useEffect(() => {
    if (!isTauri()) return;

    const syncTrayLanguage = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('update_tray_language', { lang: language });
      } catch (err) {
        console.warn('[Tauri Native] Failed to sync tray language:', err);
      }
    };

    syncTrayLanguage();
  }, [language]);

  // 3. Desktop Global Input Guards (Context Menu & Reloads)
  useEffect(() => {
    if (!isTauri()) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (import.meta.env.PROD) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser-style reloads in desktop app
      if (e.key === 'F5' || (e.key.toLowerCase() === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { isWindowShown };
}
