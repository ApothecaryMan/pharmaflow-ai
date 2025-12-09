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
