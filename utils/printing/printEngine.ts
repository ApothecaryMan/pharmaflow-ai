/**
 * Print Engine — the single entry point for every print job.
 *
 * Centralizes the "try silent (QZ Tray) → fall back to browser print" policy
 * that was previously copy-pasted in 4 places (LabelPrinter, usePOSCheckout,
 * useCashRegister, ShiftHistory), each with subtly different fallback logic.
 *
 * All call sites should route through `printDocument`. Silent vs browser and
 * the orientation/size handling are decided here once, consistently.
 */

import { printerService } from '../../services/infrastructure/printerService';
import { isTauri } from '../platform';
import { getPrinterSettings } from '../qzPrinter';
import type { PrintOrientation } from './printShell';
import { mmToPopupSize, openPrintWindow } from './printWindow';

export type PrintKind = 'label' | 'receipt';

export interface PrintDocumentOptions {
  /** Already-wrapped, complete HTML document (from `wrapPrintHTML`). */
  html: string;
  /** Page width in mm (used for QZ sizing + popup window size). */
  width: number;
  /** Page height in mm (used for QZ sizing + popup window size). */
  height: number;
  /** What kind of document this is — selects the configured printer + QZ fn. */
  kind: PrintKind;
  /**
   * Effective orientation. The engine passes it to QZ so landscape labels
   * (width > height) no longer print rotated.
   */
  orientation: PrintOrientation;
  /** Popup preview size override (px). Defaults to derived from mm size. */
  popupWidth?: number;
  popupHeight?: number;
  /**
   * Whether the browser fallback popup should inject its own auto-print
   * trigger. Receipt/shift templates are complete HTML documents without an
   * embedded print script, so they need this. Content wrapped via
   * `wrapPrintHTML` already ships its own and should leave this false.
   * Default false.
   */
  autoPrintFallback?: boolean;
  /**
   * Raw printer commands (TSPL/ZPL). If provided, the engine will attempt
   * to send these directly to the printer instead of rendering HTML.
   */
  rawCommands?: string[];
}

/**
 * Prints a document: tries silent (QZ Tray) first per the user's silent mode,
 * then falls back to a browser print popup.
 *
 * Behavior matches the three `silentMode` values:
 *  - 'on':       silent only. On failure, alert + stop (no browser popup).
 *  - 'fallback': silent first, browser popup on any failure.
 *  - 'off':      browser popup directly (skip silent).
 *
 * Returns true if printed silently, false if the browser popup was used.
 */
export const printDocument = async (options: PrintDocumentOptions): Promise<boolean> => {
  const { html, width, height, kind, orientation, rawCommands } = options;
  const settings = printerService.getSettings();
  const shouldTrySilent =
    (isTauri() &&
      (settings.preferredInterface === 'auto' || settings.preferredInterface === 'tauri')) ||
    (settings.enabled && settings.silentMode !== 'off');

  if (shouldTrySilent) {
    try {
      let printed = false;

      if (rawCommands && rawCommands.length > 0 && kind === 'label') {
        // Raw printing bypasses HTML rendering
        printed = await printerService.printLabelRaw(rawCommands);
      } else {
        // Standard HTML printing
        const silentSize = { width, height, orientation };
        printed =
          kind === 'label'
            ? await printerService.printLabel(html, silentSize)
            : await printerService.printReceipt(html);
      }

      if (printed) return true;

      // `printed === false` means silent wasn't available or QZ returned a
      // recoverable failure. In strict mode, surface the error.
      if (settings.silentMode === 'on') {
        alert(
          'Silent printing failed. Check QZ Tray connection or switch to Fallback mode in Printing settings.'
        );
        return false;
      }
      // 'fallback' mode → fall through to browser popup.
    } catch (err: any) {
      if (settings.silentMode === 'on') {
        alert(`Silent printing failed: ${err?.message || 'Check QZ Tray connection'}.`);
        return false;
      }
      // 'fallback' → log and continue to browser popup.
      console.warn('[PrintEngine] Silent print failed, using browser fallback:', err);
    }
  }

  // Browser print fallback (also the only path when silentMode === 'off').
  const { width: pw, height: ph } = mmToPopupSize(width, height);
  openPrintWindow(html, {
    width: options.popupWidth ?? pw,
    height: options.popupHeight ?? ph,
    autoPrint: options.autoPrintFallback ?? false,
  });
  return false;
};
