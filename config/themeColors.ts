/**
 * Theme Colors Configuration
 * 
 * Central source of truth for all theme colors used across the application.
 * Import from here instead of defining colors in multiple places.
 */

import { ThemeColor } from '../types';

/**
 * Complete color palette with hex values
 * Used for CSS-in-JS styling and dynamic theming
 */
export const COLOR_HEX_MAP: Record<string, string> = {
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  pink: '#ec4899',
  rose: '#f43f5e',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  gray: '#6b7280',
  slate: '#64748b',
  zinc: '#71717a',
  neutral: '#737373',
  stone: '#78716c',
};

/**
 * Available themes for the application
 * Displayed in the settings menu for user selection
 */
export const THEMES: ThemeColor[] = [
  { name: 'Blue', primary: 'blue', hex: COLOR_HEX_MAP.blue },
  { name: 'Indigo', primary: 'indigo', hex: COLOR_HEX_MAP.indigo },
  { name: 'Violet', primary: 'violet', hex: COLOR_HEX_MAP.violet },
  { name: 'Purple', primary: 'purple', hex: COLOR_HEX_MAP.purple },
  { name: 'Pink', primary: 'pink', hex: COLOR_HEX_MAP.pink },
  { name: 'Rose', primary: 'rose', hex: COLOR_HEX_MAP.rose },
  { name: 'Red', primary: 'red', hex: COLOR_HEX_MAP.red },
  { name: 'Orange', primary: 'orange', hex: COLOR_HEX_MAP.orange },
  { name: 'Amber', primary: 'amber', hex: COLOR_HEX_MAP.amber },
  { name: 'Yellow', primary: 'yellow', hex: COLOR_HEX_MAP.yellow },
  { name: 'Lime', primary: 'lime', hex: COLOR_HEX_MAP.lime },
  { name: 'Green', primary: 'green', hex: COLOR_HEX_MAP.green },
  { name: 'Emerald', primary: 'emerald', hex: COLOR_HEX_MAP.emerald },
  { name: 'Teal', primary: 'teal', hex: COLOR_HEX_MAP.teal },
  { name: 'Cyan', primary: 'cyan', hex: COLOR_HEX_MAP.cyan },
  { name: 'Sky', primary: 'sky', hex: COLOR_HEX_MAP.sky },
  { name: 'Gray', primary: 'gray', hex: COLOR_HEX_MAP.gray },
  { name: 'Slate', primary: 'slate', hex: COLOR_HEX_MAP.slate },
  { name: 'Zinc', primary: 'zinc', hex: COLOR_HEX_MAP.zinc },
  { name: 'Neutral', primary: 'neutral', hex: COLOR_HEX_MAP.neutral },
  { name: 'Stone', primary: 'stone', hex: COLOR_HEX_MAP.stone },
];

/**
 * Helper to get hex color by name
 */
export const getColorHex = (colorName: string, fallback = '#3b82f6'): string => {
  return COLOR_HEX_MAP[colorName.toLowerCase()] || fallback;
};

/**
 * Default theme
 */
export const DEFAULT_THEME = THEMES[0];
