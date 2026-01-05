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

export interface PrintConfig {
  /** Paper size in mm [width, height] */
  size?: { width: number; height: number };
  /** Print margins in mm */
  margins?: { top: number; right: number; bottom: number; left: number };
  /** Number of copies */
  copies?: number;
  /** Color mode */
  colorType?: 'color' | 'grayscale' | 'blackwhite';
  /** Print orientation */
  orientation?: 'portrait' | 'landscape';
}

// --- Constants ---

const STORAGE_KEY = 'pharma_printer_settings';

const DEFAULT_SETTINGS: PrinterSettings = {
  enabled: false,
  labelPrinter: null,
  receiptPrinter: null,
  silentMode: 'fallback'
};

// QZ Tray script URL (CDN)
const QZ_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/qz-tray@2/qz-tray.min.js';

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
    console.warn('QZ disconnect error:', err);
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
    console.error('Failed to get printers:', err);
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
    console.error('Failed to get default printer:', err);
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
  
  const printerConfig = qz.configs.create(printerName, {
    size: config.size ? { width: config.size.width, height: config.size.height } : undefined,
    margins: config.margins,
    copies: config.copies || 1,
    colorType: config.colorType || 'grayscale',
    orientation: config.orientation || 'portrait',
    scaleContent: true
  });
  
  const data = [{
    type: 'html',
    format: 'plain',
    data: html
  }];
  
  await qz.print(printerConfig, data);
};

/**
 * Prints raw data (ESC/POS commands for thermal printers)
 * @param printerName - Name of target printer
 * @param commands - Array of raw commands
 */
export const printRaw = async (
  printerName: string,
  commands: string[]
): Promise<void> => {
  if (!isConnected()) {
    await connect();
  }
  
  const printerConfig = qz.configs.create(printerName);
  
  const data = commands.map(cmd => ({
    type: 'raw',
    format: 'plain',
    data: cmd
  }));
  
  await qz.print(printerConfig, data);
};

// --- Settings Management ---

/**
 * Retrieves saved printer settings from localStorage
 */
export const getPrinterSettings = (): PrinterSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load printer settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
};

/**
 * Saves printer settings to localStorage
 */
export const savePrinterSettings = (settings: Partial<PrinterSettings>): PrinterSettings => {
  const current = getPrinterSettings();
  const updated = { ...current, ...settings };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save printer settings:', err);
  }
  
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
  labelSize: { width: number; height: number }
): Promise<boolean> => {
  const settings = getPrinterSettings();
  
  if (!settings.enabled || settings.silentMode === 'off') {
    return false;
  }
  
  if (!settings.labelPrinter) {
    console.warn('No label printer configured');
    return false;
  }
  
  try {
    await printHTML(settings.labelPrinter, html, {
      size: labelSize,
      margins: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    return true;
  } catch (err) {
    console.error('QZ label print failed:', err);
    
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
export const printReceiptSilently = async (html: string): Promise<boolean> => {
  const settings = getPrinterSettings();
  
  if (!settings.enabled || settings.silentMode === 'off') {
    return false;
  }
  
  if (!settings.receiptPrinter) {
    console.warn('No receipt printer configured');
    return false;
  }
  
  try {
    await printHTML(settings.receiptPrinter, html, {
      size: { width: 80, height: 297 }, // 80mm thermal paper, variable height
      margins: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    return true;
  } catch (err) {
    console.error('QZ receipt print failed:', err);
    
    if (settings.silentMode === 'fallback') {
      return false; // Signal to use browser print
    }
    
    throw err;
  }
};
