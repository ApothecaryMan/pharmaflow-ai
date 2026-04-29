/**
 * Global Localization Polyfills
 * 
 * This file overrides the default behavior of JS localization methods 
 * to respect the application's global numeral system and language settings.
 * 
 * It monkey-patches:
 * - Number.prototype.toLocaleString
 * - Date.prototype.toLocaleString
 * - Intl.NumberFormat
 * - Intl.DateTimeFormat
 */

declare global {
  interface Window {
    __NUMERAL_LOCALE__?: string;
    __TEXT_LOCALE__?: string;
  }
}

const originalNumberToLocaleString = Number.prototype.toLocaleString;
const originalDateToLocaleString = Date.prototype.toLocaleString;
const OriginalNumberFormat = Intl.NumberFormat;
const OriginalDateTimeFormat = Intl.DateTimeFormat;

/**
 * Helper to determine the best locale to use.
 * Priority: 
 * 1. Explicitly passed locale (if any)
 * 2. Global window setting
 * 3. Browser default
 */
const getActiveLocale = (passedLocale?: string | string[], type: 'numeral' | 'text' = 'numeral') => {
  if (passedLocale && passedLocale !== 'undefined') return passedLocale;
  
  const globalSetting = type === 'numeral' 
    ? window.__NUMERAL_LOCALE__ 
    : window.__TEXT_LOCALE__;
    
  return globalSetting || undefined;
};

// --- DOM Digit Replacement Logic ---

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const replaceDigits = (text: string, toArabic: boolean) => {
  let result = text;
  for (let i = 0; i < 10; i++) {
    const from = toArabic ? ENGLISH_DIGITS[i] : ARABIC_DIGITS[i];
    const to = toArabic ? ARABIC_DIGITS[i] : ENGLISH_DIGITS[i];
    result = result.replace(new RegExp(from, 'g'), to);
  }
  return result;
};

/**
 * Configuration for technical data that should never be converted
 */
const TECHNICAL_KEYWORDS = [
  'id', 'sku', 'barcode', 'batch', 'serial', 
  'email', 'address', 'phone', 'mobile', 
  'invoice', 'receipt', 'code'
];

/**
 * Checks if a node or its ancestors should be excluded from digit conversion
 */
const shouldSkipNode = (node: Node): boolean => {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement;
      
      // Explicit skip via data attribute
      if (el.getAttribute('data-no-convert') === 'true') return true;
      
      // Skip interactive inputs to avoid breaking user entry
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
      
      // Skip specific font/icon families (Google Material Symbols)
      const style = window.getComputedStyle(el);
      if (style.fontFamily.includes('Material Symbols')) return true;

      // Skip columns marked as technical in TanStackTable
      // Note: TanStackTable now adds data-no-convert, but we keep keyword check for extra safety
      const id = el.getAttribute('data-column-id')?.toLowerCase() || '';
      if (TECHNICAL_KEYWORDS.some(k => id.includes(k))) return true;
    }
    current = current.parentNode;
  }
  return false;
};

const processNode = (node: Node, toArabic: boolean) => {
  if (shouldSkipNode(node)) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const originalValue = node.nodeValue || '';
    
    // Skip nodes that have the invisible protection marker (\u200B)
    if (originalValue.startsWith('\u200B')) {
      return;
    }

    const newValue = replaceDigits(originalValue, toArabic);
    if (originalValue !== newValue) {
      node.nodeValue = newValue;
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    node.childNodes.forEach((child) => processNode(child, toArabic));
  }
};

let observer: MutationObserver | null = null;
let isProcessing = false;

/**
 * Starts or stops the global digit observer based on current settings.
 */
(window as any).__UPDATE_DIGITS__ = () => {
  if (isProcessing) return;
  
  const currentLocale = window.__NUMERAL_LOCALE__;
  const toArabic = currentLocale === 'ar-EG';
  
  // Initial pass to fix current DOM
  isProcessing = true;
  processNode(document.body, toArabic);
  isProcessing = false;

  // Setup observer if not already running
  if (!observer) {
    observer = new MutationObserver((mutations) => {
      if (isProcessing) return;
      
      // CRITICAL: Re-evaluate toArabic based on the CURRENT window setting
      // to avoid stale closure issues when settings change.
      const latestLocale = window.__NUMERAL_LOCALE__;
      const latestToArabic = latestLocale === 'ar-EG';
      
      isProcessing = true;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => processNode(node, latestToArabic));
        if (mutation.type === 'characterData') {
          processNode(mutation.target, latestToArabic);
        }
      });
      isProcessing = false;
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
};

// 1. Monkey-patch Number.prototype.toLocaleString
Number.prototype.toLocaleString = function(this: number, locales?: string | string[], options?: Intl.NumberFormatOptions) {
  const activeLocale = getActiveLocale(locales, 'numeral');
  return originalNumberToLocaleString.call(this, activeLocale, options);
};

// 2. Monkey-patch Date.prototype.toLocaleString
Date.prototype.toLocaleString = function(this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  // Dates usually need text (Months) but digits follow the numeral system.
  // Intl usually handles this correctly if we pass the numeral-aware locale.
  const activeLocale = getActiveLocale(locales, 'numeral');
  return originalDateToLocaleString.call(this, activeLocale, options);
};

// 3. Monkey-patch Intl.NumberFormat
// @ts-ignore - Overriding native Intl constructor
Intl.NumberFormat = function(locales?: string | string[], options?: Intl.NumberFormatOptions) {
  const activeLocale = getActiveLocale(locales, 'numeral');
  return new OriginalNumberFormat(activeLocale, options);
} as any;

Object.defineProperty(Intl.NumberFormat, 'prototype', {
  value: OriginalNumberFormat.prototype,
});
Object.defineProperty(Intl.NumberFormat, 'supportedLocalesOf', {
  value: OriginalNumberFormat.supportedLocalesOf,
});

// 4. Monkey-patch Intl.DateTimeFormat
// @ts-ignore - Overriding native Intl constructor
Intl.DateTimeFormat = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  // Use numeral locale to ensure digits follow user preference
  const activeLocale = getActiveLocale(locales, 'numeral');
  return new OriginalDateTimeFormat(activeLocale, options);
} as any;

Object.defineProperty(Intl.DateTimeFormat, 'prototype', {
  value: OriginalDateTimeFormat.prototype,
});
Object.defineProperty(Intl.DateTimeFormat, 'supportedLocalesOf', {
  value: OriginalDateTimeFormat.supportedLocalesOf,
});

export {};
