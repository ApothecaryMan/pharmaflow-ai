/**
 * QZ Tray Printer Utilities
 *
 * Provides direct communication with QZ Tray for silent printing.
 * QZ Tray is a local print server that bridges web apps with system printers.
 *
 * @see https://qz.io/
 */

// QZ Tray global object (loaded via script tag or npm package)
declare const qz: any;

// --- Types ---

export type PrinterStatus = 'connected' | 'disconnected' | 'not_installed' | 'connecting';

export type SilentMode = 'on' | 'off' | 'fallback';

export interface PrinterSettings {
  /** Whether QZ Tray integration is enabled */
  enabled: boolean;
  /** Selected printer for barcode/label printing */
  labelPrinter: string | null;
  /** Selected printer for receipt printing */
  receiptPrinter: string | null;
  /** Silent printing mode */
  silentMode: SilentMode;
}

export type PrinterOrientation = 'portrait' | 'landscape';

export interface PrintSize {
  /** Paper width in mm */
  width: number;
  /** Paper height in mm */
  height: number;
  /**
   * Print orientation. Labels (width > height) must be 'landscape' or the
   * printer auto-rotates them (GitHub qzind/tray#428, #635). Defaults to
   * auto-derived from width/height when omitted.
   */
  orientation?: PrinterOrientation;
}

export interface PrintConfig {
  /** Paper size in mm + optional orientation */
  size?: { width: number; height: number };
  /** Print margins in mm */
  margins?: { top: number; right: number; bottom: number; left: number };
  /** Number of copies */
  copies?: number;
  /** Color mode */
  colorType?: 'color' | 'grayscale' | 'blackwhite';
  /** Print orientation */
  orientation?: PrinterOrientation;
}

/**
 * Resolves the effective orientation: explicit value wins, otherwise labels
 * (width > height) become landscape and tall/narrow pages stay portrait.
 */
const resolveOrientation = (
  width: number,
  height: number,
  explicit?: PrinterOrientation
): PrinterOrientation => explicit ?? (width > height ? 'landscape' : 'portrait');

// --- Constants ---

import { StorageKeys } from '../config/storageKeys';
import { storage } from './storage';

const DEFAULT_SETTINGS: PrinterSettings = {
  enabled: false, // Disable by default - avoid errors if not installed
  labelPrinter: null,
  receiptPrinter: null,
  silentMode: 'fallback', // Try silent first, fallback to browser if fails
};

// QZ Tray script URL (CDN)
const QZ_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/qz-tray@2/qz-tray.min.js';

import { QZ_CERTIFICATE, signQZData } from './qzSecurity';

// --- QZ Tray Loading ---

let qzLoaded = false;
let qzLoadPromise: Promise<void> | null = null;

/**
 * Dynamically loads QZ Tray script if not already loaded
 */
export const loadQzTray = (): Promise<void> => {
  if (qzLoaded && typeof qz !== 'undefined') {
    return Promise.resolve();
  }

  if (qzLoadPromise) {
    return qzLoadPromise;
  }

  qzLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof qz !== 'undefined') {
      qzLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = QZ_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      qzLoaded = true;

      // Setup QZ Security for Silent Printing only if WebCrypto is available
      const qzGlobal = (window as any).qz;
      if (qzGlobal) {
        if (window.crypto && window.crypto.subtle) {
          qzGlobal.security.setCertificatePromise((resolve: any) => {
            resolve(QZ_CERTIFICATE);
          });

          qzGlobal.security.setSignatureAlgorithm('SHA512');
          qzGlobal.security.setSignaturePromise((toSign: string) => {
            return function (resolve: any, reject: any) {
              signQZData(toSign)
                .then((signature) => resolve(signature))
                .catch((err) => {
                  console.error('QZ Signature failed:', err);
                  reject(err);
                });
            };
          });
        } else {
          console.warn('[QZ] WebCrypto not available (HTTP connection). Falling back to manual permission prompts.');
        }
      }

      resolve();
    };

    script.onerror = () => {
      qzLoadPromise = null;
      reject(new Error('Failed to load QZ Tray script'));
    };

    document.head.appendChild(script);
  });

  return qzLoadPromise;
};

// --- Connection Management ---

/**
 * Checks if QZ Tray is currently connected
 */
export const isConnected = (): boolean => {
  try {
    return typeof qz !== 'undefined' && qz.websocket.isActive();
  } catch {
    return false;
  }
};

/**
 * Connects to QZ Tray WebSocket
 * @returns Promise that resolves when connected
 */
export const connect = async (): Promise<void> => {
  await loadQzTray();

  if (isConnected()) {
    return;
  }

  try {
    // Set up promise handler for connection
    await qz.websocket.connect();
  } catch (err: any) {
    // Check if error is because already connected
    if (err?.message?.includes('already active')) {
      return;
    }
    throw err;
  }
};

/**
 * Disconnects from QZ Tray WebSocket
 */
export const disconnect = async (): Promise<void> => {
  if (!isConnected()) {
    return;
  }

  try {
    await qz.websocket.disconnect();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[QZ] Disconnect error:', err);
    }
  }
};

/**
 * Gets the current connection status
 */
export const getStatus = (): PrinterStatus => {
  if (!qzLoaded || typeof qz === 'undefined') {
    return 'not_installed';
  }

  try {
    return qz.websocket.isActive() ? 'connected' : 'disconnected';
  } catch {
    return 'not_installed';
  }
};

// --- Printer Discovery ---

/**
 * Gets list of all available printers
 * @returns Array of printer names
 */
export const getPrinters = async (): Promise<string[]> => {
  if (!isConnected()) {
    await connect();
  }

  try {
    const printers = await qz.printers.find();
    return Array.isArray(printers) ? printers : [];
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[QZ] Failed to get printers:', err);
    }
    return [];
  }
};

/**
 * Gets the system default printer
 * @returns Default printer name or null
 */
export const getDefaultPrinter = async (): Promise<string | null> => {
  if (!isConnected()) {
    await connect();
  }

  try {
    const printer = await qz.printers.getDefault();
    return printer || null;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[QZ] Failed to get default printer:', err);
    }
    return null;
  }
};

// --- Printing ---

/**
 * Prints HTML content to a specific printer
 * @param printerName - Name of target printer
 * @param html - HTML content to print
 * @param config - Print configuration options
 */
export const printHTML = async (
  printerName: string,
  html: string,
  config: PrintConfig = {}
): Promise<void> => {
  if (!isConnected()) {
    await connect();
  }

  // Resolve orientation: explicit config wins, otherwise derive from size so
  // landscape labels (width > height) print correctly instead of being
  // auto-rotated by QZ (qzind/tray#428, #635).
  const orientation = config.size
    ? resolveOrientation(config.size.width, config.size.height, config.orientation)
    : config.orientation || 'portrait';

  const printerConfig = qz.configs.create(printerName, {
    size: config.size ? { width: config.size.width, height: config.size.height } : undefined,
    margins: config.margins,
    copies: config.copies || 1,
    colorType: config.colorType || 'blackwhite',
    orientation,
    scaleContent: true,
    interpolation: 'nearest-neighbor',
    rendering: 'pixelated',
  });

  // Base64 encode the HTML to ensure no character encoding issues (UTF-8 safe)
  const base64Html = btoa(unescape(encodeURIComponent(html)));

  const data = [
    {
      type: 'html',
      format: 'base64',
      data: base64Html,
      baseUrl: window.location.origin,
    },
  ];

  await qz.print(printerConfig, data);
};

/**
 * Prints raw data (ESC/POS commands for thermal printers)
 * @param printerName - Name of target printer
 * @param commands - Array of raw commands
 */
export const printRaw = async (printerName: string, commands: string[]): Promise<void> => {
  if (!isConnected()) {
    await connect();
  }

  const printerConfig = qz.configs.create(printerName);

  const data = commands.map((cmd) => ({
    type: 'raw',
    format: 'plain',
    data: cmd,
  }));

  await qz.print(printerConfig, data);
};

// --- Settings Management ---

/**
 * Retrieves saved printer settings from storage
 */
export const getPrinterSettings = (): PrinterSettings => {
  const saved = storage.get<Partial<PrinterSettings>>(StorageKeys.PRINTER_SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...saved };
};

/**
 * Saves printer settings to storage
 */
export const savePrinterSettings = (settings: Partial<PrinterSettings>): PrinterSettings => {
  const current = getPrinterSettings();
  const updated = { ...current, ...settings };

  storage.set(StorageKeys.PRINTER_SETTINGS, updated);

  return updated;
};

// --- High-Level Print Functions ---

/**
 * Prints a label using configured settings
 * Falls back to browser print if QZ unavailable
 * @returns true if printed via QZ, false if fell back to browser
 */
export const printLabelSilently = async (
  html: string,
  labelSize: { width: number; height: number; orientation?: PrinterOrientation }
): Promise<boolean> => {
  const settings = getPrinterSettings();

  if (!settings.enabled || settings.silentMode === 'off') {
    return false;
  }

  if (!settings.labelPrinter) {
    if (import.meta.env.DEV) {
      console.warn('[QZ] No label printer configured');
    }
    return false;
  }

  try {
    await printHTML(settings.labelPrinter, html, {
      size: { width: labelSize.width, height: labelSize.height },
      orientation: labelSize.orientation,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[QZ] Label print failed:', err);
    }

    if (settings.silentMode === 'fallback') {
      return false; // Signal to use browser print
    }

    throw err;
  }
};

/**
 * Prints a receipt using configured settings
 * Falls back to browser print if QZ unavailable
 * @returns true if printed via QZ, false if fell back to browser
 */
export const printReceiptSilently = async (
  html: string,
  options?: { orientation?: PrinterOrientation }
): Promise<boolean> => {
  const settings = getPrinterSettings();

  if (!settings.enabled || settings.silentMode === 'off') {
    return false;
  }

  if (!settings.receiptPrinter) {
    if (import.meta.env.DEV) {
      console.warn('[QZ] No receipt printer configured');
    }
    return false;
  }

  try {
    await printHTML(settings.receiptPrinter, html, {
      orientation: options?.orientation, // receipts are portrait by default
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[QZ] Receipt print failed:', err);
    }

    if (settings.silentMode === 'fallback') {
      return false; // Signal to use browser print
    }

    throw err;
  }
};
