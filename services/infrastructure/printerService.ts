/**
 * Printer Service (Orchestrator)
 *
 * Unified interface for printing across all platforms.
 * Prioritizes Tauri native thermal printer plugin when running on desktop,
 * falls back to QZ Tray or browser printing elsewhere.
 */

import { list_thermal_printers, print_thermal_printer } from 'tauri-plugin-thermal-printer';
import { isTauri } from '../../utils/platform';
import * as qz from '../../utils/qzPrinter';

export type PrinterInterface = 'tauri' | 'qz' | 'browser';

export interface UniversalPrinterSettings extends qz.PrinterSettings {
  /** Preferred interface: 'auto', 'tauri', 'qz' */
  preferredInterface: 'auto' | 'tauri' | 'qz';
  /** Native Tauri printer name */
  tauriPrinter: string | null;
}

class UniversalPrinterService {
  private settings: UniversalPrinterSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): UniversalPrinterSettings {
    const qzSettings = qz.getPrinterSettings();
    const tauriPrinter = localStorage.getItem('desktop_receipt_printer');
    const preferredInterface =
      (localStorage.getItem('preferred_printer_interface') as any) || 'auto';

    return {
      ...qzSettings,
      tauriPrinter,
      preferredInterface,
    };
  }

  public getSettings(): UniversalPrinterSettings {
    return this.settings;
  }

  public async getAvailablePrinters(): Promise<string[]> {
    if (isTauri()) {
      try {
        const tauriPrinters = await list_thermal_printers();
        if (tauriPrinters && tauriPrinters.length > 0) {
          return tauriPrinters.map((p) => p.name);
        }
      } catch (e) {
        console.warn('[PrinterService] Failed to list Tauri printers:', e);
      }
    }

    // Fallback to QZ if connected
    if (qz.isConnected()) {
      return await qz.getPrinters();
    }

    return [];
  }

  /**
   * Universal print receipt function
   */
  public async printReceipt(html: string, rawData?: string): Promise<boolean> {
    const settings = this.loadSettings();
    const { preferredInterface, tauriPrinter, enabled, silentMode } = settings;

    // 1. Try Tauri Native (if on desktop and prioritized)
    if (isTauri() && (preferredInterface === 'auto' || preferredInterface === 'tauri')) {
      const printerName = tauriPrinter || localStorage.getItem('desktop_receipt_printer');
      if (printerName) {
        try {
          // If we have raw ESC/POS data, it's better for thermal printers
          // But usually we have HTML. The plugin might handle HTML to image conversion.
          // For now, let's assume the plugin wants ESC/POS or we have a way to convert.
          await print_thermal_printer({
            printer: printerName,
            sections: [{ Text: { text: html, styles: { align: 'left', size: 'normal' } } }],
            options: { code_page: 0 },
            paper_size: 'Mm80',
          });
          return true;
        } catch (e) {
          console.error('[PrinterService] Tauri print failed:', e);
          if (preferredInterface === 'tauri') return false; // Strict mode
        }
      }
    }

    // 2. Try QZ Tray
    if (
      enabled &&
      silentMode !== 'off' &&
      (preferredInterface === 'auto' || preferredInterface === 'qz')
    ) {
      try {
        const success = await qz.printReceiptSilently(html);
        if (success) return true;
      } catch (e) {
        console.error('[PrinterService] QZ print failed:', e);
      }
    }

    // 3. Fallback to Browser
    return false;
  }

  /**
   * Universal print label function
   */
  public async printLabel(html: string, size: { width: number; height: number; orientation?: string }): Promise<boolean> {
    // Labels are more complex, QZ Tray is usually better for custom sizes unless plugin supports it
    const settings = this.loadSettings();
    const { enabled, silentMode } = settings;

    if (enabled && silentMode !== 'off') {
      try {
        const success = await qz.printLabelSilently(html, size);
        if (success) return true;
      } catch (e) {
        console.error('[PrinterService] QZ label print failed:', e);
      }
    }

    return false;
  }

  public async printLabelRaw(commands: string[]): Promise<boolean> {
    const settings = this.loadSettings();
    const { preferredInterface, enabled, silentMode } = settings;

    // 1. Try Tauri Native (if on desktop)
    if (isTauri() && (preferredInterface === 'auto' || preferredInterface === 'tauri')) {
      const printerName = localStorage.getItem('desktop_label_printer');
      if (printerName) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const payload = commands.join('\n') + '\n';
          await invoke('print_raw_data', { printerName, data: payload });
          return true;
        } catch (e) {
          console.error('[PrinterService] Tauri raw print failed:', e);
          if (preferredInterface === 'tauri') return false;
        }
      } else {
        console.warn('[PrinterService] No desktop label printer selected for Tauri');
      }
    }

    // 2. Try QZ Tray
    if (enabled && silentMode !== 'off') {
      try {
        if (!settings.labelPrinter) {
          console.warn('[PrinterService] No label printer configured for raw printing');
          return false;
        }
        await qz.printRaw(settings.labelPrinter, commands);
        return true;
      } catch (e) {
        console.error('[PrinterService] QZ raw label print failed:', e);
      }
    }

    return false;
  }
}

export const printerService = new UniversalPrinterService();
export default printerService;
