import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { isTauri } from './platform';

const DEFAULT_LIGHT_BAR_COLOR = '#ffffff';
const DEFAULT_DARK_BAR_COLOR = '#1f1f1f';
const TOP_SAMPLE_Y = 2;

let lastAppliedSystemBarColor = '';

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

    const frameId = window.requestAnimationFrame(() => {
      setSystemBarColor(getAutoSystemBarColor(fallbackCssVar));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
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