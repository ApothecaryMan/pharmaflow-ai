import { storage } from './storage';
import type { SettingsState } from '../context/SettingsContext';

/**
 * Drug Display Name Utility
 * 
 * Centralized utility for formatting drug display names consistently across the application.
 * Always displays the drug name with its dosage form in English.
 */

export interface DrugDisplayItem {
  name: string;
  dosageForm?: string;
  genericName?: string;
  strength?: string;
}

/**
 * Helper to check capitalization setting
 */
const shouldCapitalize = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // 1. Try unified settings
  const settings = storage.get<SettingsState | null>('pharma_settings', null);
  if (settings && settings.textTransform) {
    return settings.textTransform === 'uppercase';
  }
  
  // 2. Fallback to legacy key
  const legacy = storage.get<'normal' | 'uppercase'>('pharma_textTransform', 'normal');
  return legacy === 'uppercase';
};

/**
 * Returns a formatted display name for a drug item.
 * Combines the drug name with its dosage form (in English).
 * 
 * @param item - The drug item object containing name and optional dosageForm
 * @returns Formatted string like "Panadol Tablet" or "Levoxin 500mg Capsule"
 * 
 * @example
 * getDisplayName({ name: 'Panadol', dosageForm: 'Tablet' }) // "Panadol Tablet"
 * getDisplayName({ name: 'Levoxin 250 mg' }) // "Levoxin 250 mg"
 */
export const getDisplayName = (item: DrugDisplayItem): string => {
  if (!item) return '';
  
  const parts: string[] = [item.name];
  
  if (item.dosageForm) {
    parts.push(item.dosageForm);
  }
  
  const fullName = parts.join(' ');
  return shouldCapitalize() ? fullName.toUpperCase() : fullName;
};

/**
 * Returns a formatted display name with strength included.
 * 
 * @param item - The drug item object
 * @returns Formatted string like "Panadol 500mg Tablet"
 */
export const getFullDisplayName = (item: DrugDisplayItem): string => {
  if (!item) return '';
  
  const parts: string[] = [item.name];
  
  if (item.strength) {
    parts.push(item.strength);
  }
  
  if (item.dosageForm) {
    parts.push(item.dosageForm);
  }
  
  const fullName = parts.join(' ');
  return shouldCapitalize() ? fullName.toUpperCase() : fullName;
};
