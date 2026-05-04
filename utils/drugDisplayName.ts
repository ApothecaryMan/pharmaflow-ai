import type { SettingsState } from '../context/SettingsContext';
import { storage } from './storage';
import { getLocalizedProductType } from '../data/productCategories';

/**
 * Drug Display Name Utility
 *
 * Centralized utility for formatting drug display names consistently across the application.
 * Always displays the drug name with its dosage form in English.
 */

export interface DrugDisplayItem {
  name: string;
  nameAr?: string;
  dosageForm?: string;
  genericName?: string[];
  strength?: string;
}

/**
 * Helper to check capitalization setting
 */
const shouldCapitalize = (): boolean => {
  if (typeof window === 'undefined') return true; // Default matches SettingsContext

  // 1. Try unified settings
  const settings = storage.get<SettingsState | null>('pharma_settings', null);
  if (settings && settings.textTransform) {
    return settings.textTransform === 'uppercase';
  }

  // 2. Fallback to legacy key
  const legacy = storage.get<'normal' | 'uppercase'>('pharma_textTransform', 'uppercase');
  return legacy === 'uppercase';
};

/**
 * Helper to capitalize first letter of every word
 */
const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Returns a formatted display name for a drug item.
 * Combines the drug name with its dosage form (in English).
 *
 * @param item - The drug item object containing name and optional dosageForm
 * @param forcedTransform - Optional override for text transform ('uppercase' | 'normal')
 * @returns Formatted string like "Panadol Tablet" or "Levoxin 500mg Capsule"
 */
export const getDisplayName = (
  item: DrugDisplayItem,
  forcedTransform?: 'uppercase' | 'normal'
): string => {
  if (!item) return '';

  const parts: string[] = [item.name];

  // Only append dosage form if it's not already in the name
  if (item.dosageForm && !item.name.toLowerCase().includes(item.dosageForm.toLowerCase())) {
    parts.push(item.dosageForm);
  }

  const fullName = parts.join(' ');
  const mode = forcedTransform || (shouldCapitalize() ? 'uppercase' : 'normal');
  const result = mode === 'uppercase' ? fullName.toUpperCase() : capitalizeWords(fullName);
  return `\u200B${result}\u200B`;
};

/**
 * Returns a formatted display name with strength included.
 *
 * @param item - The drug item object
 * @param forcedTransform - Optional override for text transform
 * @returns Formatted string like "Panadol 500mg Tablet"
 */
export const getFullDisplayName = (
  item: DrugDisplayItem,
  forcedTransform?: 'uppercase' | 'normal'
): string => {
  if (!item) return '';

  const parts: string[] = [item.name];

  if (item.strength) {
    parts.push(item.strength);
  }

  // Only append dosage form if it's not already in the name
  if (item.dosageForm && !item.name.toLowerCase().includes(item.dosageForm.toLowerCase())) {
    parts.push(item.dosageForm);
  }

  const fullName = parts.join(' ');
  const mode = forcedTransform || (shouldCapitalize() ? 'uppercase' : 'normal');
  const result = mode === 'uppercase' ? fullName.toUpperCase() : capitalizeWords(fullName);
  return `\u200B${result}\u200B`;
};

export const getArabicDisplayName = (item: DrugDisplayItem): string => {
  if (!item || !item.nameAr) return '';

  const parts: string[] = [item.nameAr];

  if (item.dosageForm) {
    const localizedForm = getLocalizedProductType(item.dosageForm, 'ar');
    // If we have a translation, wrap it in parentheses for better Arabic UX
    if (localizedForm !== item.dosageForm) {
      parts.push(`(${localizedForm})`);
    } else {
      parts.push(item.dosageForm);
    }
  }

  return parts.join(' ');
};
