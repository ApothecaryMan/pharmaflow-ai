/**
 * Centralized Z-index scale for the Zinc Pharmacy System.
 * Following common UI patterns and the project's existing usage.
 */

export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 1000,
  STAMP: 1050,
  STICKY: 1100,
  BANNER: 1200,
  OVERLAY: 1300,
  MODAL: 1400,
  POPOVER: 1500,
  DRAWER: 1600,
  TOOLTIP: 9999,
  MAX: 2147483647
} as const;
