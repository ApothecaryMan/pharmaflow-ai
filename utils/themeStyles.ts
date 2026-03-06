/**
 * Centralized theme styles for the application.
 * Use these constants to ensure consistent styling across components.
 */

// The core shadow class defined in index.css
export const SHADOW_CLASS = 'card-shadow';

// Base card style: standard background with the consistent shadow
// Note: Does not include padding or border-radius as these vary by component context
export const CARD_BASE = `bg-(--bg-card) ${SHADOW_CLASS} border border-transparent dark:border-(--border-divider)`;

// Container surface: slightly lighter/transparent to distinctly wrap inner cards without melting
export const CONTAINER_BASE = `bg-gray-50/50 dark:bg-gray-800/20 border border-transparent dark:border-(--border-divider) rounded-3xl`;

// Common variations (optional, can be expanded)
export const CARD_SM = `${CARD_BASE} rounded-xl`;
export const CARD_MD = `${CARD_BASE} rounded-2xl`;
export const CARD_LG = `${CARD_BASE} rounded-3xl`;

export const TABLE_HEADER_BASE =
  'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50';
export const TABLE_ROW_BASE =
  'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0';
export const BUTTON_BASE = 'px-4 py-2 rounded-xl bg-(--button-base-active) font-medium transition-all hover:opacity-90 active:scale-95 ';
export const BUTTON_INACTIVE = 'bg-(--button-base-inactive) border border-(--border-divider) text-gray-400 dark:text-gray-500 cursor-not-allowed';
export const INPUT_BASE =
  'w-full px-3 py-2.5 rounded-xl bg-(--bg-input) border border-(--border-search) outline-hidden focus:border-gray-400 dark:focus:border-gray-500 focus:shadow-sm text-sm transition-colors duration-0 text-gray-900 dark:text-gray-100 placeholder-gray-400';

export const THEME_COLORS = ['blue', 'purple', 'green', 'orange', 'red', 'pink', 'cyan', 'teal'];
