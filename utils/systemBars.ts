import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { isTauri } from './platform';

const DEFAULT_LIGHT_BAR_COLOR = '#ffffff';
const DEFAULT_DARK_BAR_COLOR = '#1f1f1f';
const TOP_SAMPLE_Y = 2;

let lastAppliedSystemBarColor = '';
let lastRawCssColor = '';
let cachedCanvasCtx: CanvasRenderingContext2D | null = null;

const isTransparentColor = (color: string): boolean => {
  const normalized = color.trim().toLowerCase();
  if (!normalized || normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)') {
    return true;
  }

  if (!normalized.startsWith('rgba(')) return false;

  const parts = normalized.match(/[\d.]+/g);
  if (!parts || parts.length < 4) return false;

  return Number(parts[3]) <= 0.05;
};

const toHexChannel = (value: number): string => {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
};

const normalizeSystemBarColor = (color: string): string => {
  const normalized = color.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized;

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  // Pre-allocate a single canvas instance to avoid GC churn every 250ms
  if (typeof document !== 'undefined' && !cachedCanvasCtx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    cachedCanvasCtx = canvas.getContext('2d', { willReadFrequently: true });
  }

  // Use canvas to convert ANY valid CSS color (including oklch, hsl, color-mix) to Hex
  if (cachedCanvasCtx) {
    cachedCanvasCtx.clearRect(0, 0, 1, 1);
    cachedCanvasCtx.fillStyle = normalized;
    cachedCanvasCtx.fillRect(0, 0, 1, 1);
    const data = cachedCanvasCtx.getImageData(0, 0, 1, 1).data;
    return `#${toHexChannel(data[0])}${toHexChannel(data[1])}${toHexChannel(data[2])}`;
  }

  const rgbParts = normalized.match(/[\d.]+/g);
  if ((normalized.startsWith('rgb(') || normalized.startsWith('rgba(')) && rgbParts?.length >= 3) {
    return `#${toHexChannel(Number(rgbParts[0]))}${toHexChannel(Number(rgbParts[1]))}${toHexChannel(Number(rgbParts[2]))}`;
  }

  return color;
};

export const evaluateCssColor = (cssVar: string, fallback: string): string => {
  if (typeof window === 'undefined' || !document.body) return fallback;

  const dummy = document.createElement('div');
  dummy.style.backgroundColor = `var(${cssVar})`;
  dummy.style.display = 'none';
  document.body.appendChild(dummy);
  const color = getComputedStyle(dummy).backgroundColor;
  document.body.removeChild(dummy);

  if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
    return color;
  }

  return fallback;
};

const getOrCreateThemeColorMeta = (): HTMLMetaElement => {
  const existing = document.querySelector('meta[name="theme-color"]');
  if (existing instanceof HTMLMetaElement) return existing;

  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.id = '__pharma_theme_color';
  document.head.appendChild(meta);
  return meta;
};

export const setAndroidStatusBarColor = (color: string): void => {
  if (typeof document === 'undefined') return;

  const metaTags = document.querySelectorAll('meta[name="theme-color"]');
  if (metaTags.length > 0) {
    metaTags.forEach((tag) => {
      tag.setAttribute('content', color);
    });
    return;
  }

  getOrCreateThemeColorMeta().content = color;
};

export const setNativeTitleBarColor = async (color: string): Promise<void> => {
  if (!isTauri()) return;

  try {
    await invoke('set_titlebar_color', { color });
  } catch (err) {
    console.warn('Failed to set native titlebar color:', err);
  }
};

export const getDefaultSystemBarColor = (): string => {
  if (typeof document === 'undefined') return DEFAULT_LIGHT_BAR_COLOR;

  const computedNavbarColor = evaluateCssColor('--bg-navbar', '');
  if (computedNavbarColor) return computedNavbarColor;

  return document.documentElement.classList.contains('dark')
    ? DEFAULT_DARK_BAR_COLOR
    : DEFAULT_LIGHT_BAR_COLOR;
};

export const setSystemBarColor = (color: string): void => {
  if (color === lastRawCssColor) return;
  lastRawCssColor = color;

  const normalizedColor = normalizeSystemBarColor(color);
  if (normalizedColor === lastAppliedSystemBarColor) return;

  lastAppliedSystemBarColor = normalizedColor;
  setAndroidStatusBarColor(normalizedColor);
  void setNativeTitleBarColor(normalizedColor);
};

const getElementBackgroundColor = (element: Element | null): string | null => {
  let current: Element | null = element;

  while (current) {
    const color = getComputedStyle(current).backgroundColor;
    if (!isTransparentColor(color)) return color;
    current = current.parentElement;
  }

  return null;
};

export const getAutoSystemBarColor = (fallbackCssVar: string = '--bg-navbar'): string => {
  if (typeof document === 'undefined') return DEFAULT_LIGHT_BAR_COLOR;

  const sampleX = Math.max(1, Math.floor(window.innerWidth / 2));
  const sampledElement = document.elementFromPoint(sampleX, TOP_SAMPLE_Y);
  const sampledColor = getElementBackgroundColor(sampledElement);

  if (sampledColor) return sampledColor;

  return evaluateCssColor(fallbackCssVar, getDefaultSystemBarColor());
};

export const useAutoSystemBarColor = (
  refreshKey?: string,
  fallbackCssVar: string = '--bg-navbar'
): void => {
  useEffect(() => {
    void refreshKey;

    const checkColor = () => {
      const sampleX = Math.max(1, Math.floor(window.innerWidth / 2));
      const sampledElement = document.elementFromPoint(sampleX, 2);
      
      let current: Element | null = sampledElement;
      let foundColor: string | null = null;
      
      while (current) {
        const color = window.getComputedStyle(current).backgroundColor;
        if (!isTransparentColor(color)) {
          foundColor = color;
          break;
        }
        current = current.parentElement;
      }

      if (!foundColor) {
        // Fallback if no solid color found
        const isDark = document.documentElement.classList.contains('dark');
        const defaultFallback = isDark ? '#1f1f1f' : '#ffffff';
        foundColor = evaluateCssColor(fallbackCssVar, defaultFallback);
      }

      setSystemBarColor(foundColor);
    };

    // 1. Check immediately
    checkColor();
    // Also check after first paint to catch any late style resolution
    requestAnimationFrame(checkColor);

    // 2. Poll every 250ms to catch transitions, scroll events, overlays, and modal pops.
    // This is cheap because setSystemBarColor short-circuits if the color hasn't changed.
    const intervalId = window.setInterval(checkColor, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fallbackCssVar, refreshKey]);
};

/////////////////legacy codes
/*
import { useEffect } from 'react';
import { evaluateCssColor, getDefaultSystemBarColor, setSystemBarColor } from './systemBars';

// LEGACY - Manual system-bar controls kept for reference only.
// LEGACY - Do not import this file in app code; use useAutoSystemBarColor from systemBars.ts.

export const legacyUseSystemBarColor = (color: string): void => {
  useEffect(() => {
    setSystemBarColor(color);
  }, [color]);
};

export const UseSystemBarColorOverride = (
  cssVar: string = '--bg-page-surface',
  refreshKey?: string
): void => {
  useEffect(() => {
    void refreshKey;

    const timer = window.setTimeout(() => {
      setSystemBarColor(evaluateCssColor(cssVar, '#ffffff'));
    }, 50);

    return () => {
      window.clearTimeout(timer);
      setSystemBarColor(getDefaultSystemBarColor());
    };
  }, [cssVar, refreshKey]);
};

export const ApplyThemeSystemBarColor = (isLoginView: boolean, darkMode: boolean): void => {
  const computedNavbarColor = evaluateCssColor('--bg-navbar', '');
  const titleBarColor = isLoginView
    ? '#000000'
    : computedNavbarColor || (darkMode ? '#1f1f1f' : '#ffffff');

  setSystemBarColor(titleBarColor);
};

export const LEGACY_MANUAL_USAGE_NOTES = [
  'LEGACY - AuthPage previously forced #000000 with a manual hook.',
  'LEGACY - Navbar previously forced #1f1f1f or #ffffff from darkMode.',
  'LEGACY - useTheme previously calculated and applied titleBarColor directly.',
  'LEGACY - Individual pages previously used CSS variable overrides manually.',
];
*/
