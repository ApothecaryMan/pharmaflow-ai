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
export const CONTAINER_BASE = `bg-(--bg-surface-neutral) border border-transparent dark:border-(--border-divider) rounded-3xl`;

// Common variations (optional, can be expanded)
export const CARD_SM = `${CARD_BASE} rounded-xl`;
export const CARD_MD = `${CARD_BASE} rounded-2xl`;
export const CARD_LG = `${CARD_BASE} rounded-3xl`;

export const TABLE_HEADER_BASE =
  'px-4 py-3 text-xs font-bold text-(--text-tertiary) uppercase tracking-wider bg-(--bg-input)';
export const TABLE_ROW_BASE =
  'hover:bg-(--bg-input) transition-colors border-b border-(--border-divider) last:border-0';
export const BUTTON_BASE = 'px-4 py-2 rounded-xl bg-gray-300 dark:bg-zinc-900/80 border border-transparent dark:border-(--border-divider) font-medium transition-all hover:opacity-80 cursor-pointer ';
export const BUTTON_INACTIVE = 'bg-(--button-base-inactive) border border-(--border-divider) text-(--text-tertiary) cursor-not-allowed';
export const INPUT_BASE =
  'w-full px-3 py-2.5 rounded-xl bg-(--bg-input) border border-(--border-divider) outline-hidden focus:border-gray-400 dark:focus:border-gray-500 focus:shadow-sm text-sm transition-colors duration-0 text-(--text-primary) placeholder-(--text-tertiary)';

export const THEME_COLORS = ['zinc', 'purple', 'green', 'orange', 'red', 'pink', 'teal'];

// Flat icon button (square/rounded-xl) with border and high-contrast active state
export const ICON_BUTTON_BASE = 'flex items-center justify-center w-10 h-10 rounded-xl border transition-all';
export const ICON_BUTTON_FLAT = `${ICON_BUTTON_BASE} bg-white dark:bg-(--bg-surface-neutral) border-gray-200 dark:border-(--border-divider) text-gray-500 dark:text-gray-400`;
export const ICON_BUTTON_FLAT_ACTIVE = `${ICON_BUTTON_BASE} bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-gray-900`;

// Shorthand for easier usage: ICON_BTN(showAll)
export const ICON_BTN = (active?: boolean) => active ? ICON_BUTTON_FLAT_ACTIVE : ICON_BUTTON_FLAT;

// Semi-interactive card for onPage only
export const GLASS_CARD_BASE = 'p-2.5 rounded-xl bg-(--bg-secondary)/40 border border-(--border-divider)/50 hover:bg-(--bg-hover)';

