/**
 * Theme Colors Configuration
 *
 * Central source of truth for all theme colors used across the application.
 * Import from here instead of defining colors in multiple places.
 */

import type { ThemeColor } from '../types';

/**
 * Complete color palette with hex values
 * Used for CSS-in-JS styling and dynamic theming
 */
export const COLOR_HEX_MAP: Record<string, string> = {
  blue: '#2563eb',    // Deeper, professional blue (600)
  indigo: '#4f46e5',  // Premium rich indigo (600)
  violet: '#7c3aed',  // Deeper violet
  purple: '#9333ea',  // Sophisticated royal purple (600)
  fuchsia: '#c026d3',
  pink: '#db2777',
  rose: '#e11d48',
  red: '#dc2626',
  orange: '#ea580c',  // Deep rust/orange, much easier on the eyes
  amber: '#d97706',
  yellow: '#ca8a04',
  lime: '#65a30d',
  green: '#16a34a',   // Grounded, elegant green (600) instead of neon
  emerald: '#059669',
  teal: '#0d9488',
  cyan: '#0891b2',
  sky: '#0284c7',
  gray: '#4b5563',
  slate: '#475569',
  zinc: '#52525b',
  neutral: '#525252',
  stone: '#57534e',
};

/**
 * Available themes for the application
 * Displayed in the settings menu for user selection
 */
export const THEMES: ThemeColor[] = [
  { name: 'Indigo', primary: 'indigo', hex: COLOR_HEX_MAP.indigo },
  { name: 'Green', primary: 'green', hex: COLOR_HEX_MAP.green },
  { name: 'Blue', primary: 'blue', hex: COLOR_HEX_MAP.blue },
  { name: 'Purple', primary: 'purple', hex: COLOR_HEX_MAP.purple },
  { name: 'Orange', primary: 'orange', hex: COLOR_HEX_MAP.orange },
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
