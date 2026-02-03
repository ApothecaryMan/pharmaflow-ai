/**
 * Centralized theme styles for the application.
 * Use these constants to ensure consistent styling across components.
 */

// The core shadow class defined in index.css
export const SHADOW_CLASS = 'card-shadow';

// Base card style: standard background with the consistent shadow
// Note: Does not include padding or border-radius as these vary by component context
export const CARD_BASE = `bg-white dark:bg-gray-900 ${SHADOW_CLASS}`;

// Common variations (optional, can be expanded)
export const CARD_SM = `${CARD_BASE} rounded-xl`;
export const CARD_MD = `${CARD_BASE} rounded-2xl`;
export const CARD_LG = `${CARD_BASE} rounded-3xl`;

export const TABLE_HEADER_BASE =
  'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50';
export const TABLE_ROW_BASE =
  'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0';
export const BUTTON_BASE = 'px-4 py-2 rounded-xl font-medium '; //transition-all active:scale-95
export const INPUT_BASE =
  'w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none placeholder:text-gray-400';

export const THEME_COLORS = ['blue', 'purple', 'green', 'orange', 'red', 'pink', 'cyan', 'teal'];
