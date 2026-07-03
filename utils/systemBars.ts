import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { isTauri } from './platform';

const DEFAULT_LIGHT_BAR_COLOR = '#ffffff';
const DEFAULT_DARK_BAR_COLOR = '#1f1f1f';

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
  setAndroidStatusBarColor(color);
  void setNativeTitleBarColor(color);
};

export const useSystemBarColor = (color: string): void => {
  useEffect(() => {
    setSystemBarColor(color);
  }, [color]);
};

export const useSystemBarColorOverride = (
  cssVar: string = '--bg-page-surface',
  refreshKey?: string
): void => {
  useEffect(() => {
    void refreshKey;

    const timer = window.setTimeout(() => {
      setSystemBarColor(evaluateCssColor(cssVar, DEFAULT_LIGHT_BAR_COLOR));
    }, 50);

    return () => {
      window.clearTimeout(timer);
      setSystemBarColor(getDefaultSystemBarColor());
    };
  }, [cssVar, refreshKey]);
};
