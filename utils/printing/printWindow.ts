/**
 * Print Window — Unified popup/iframe print mechanics.
 *
 * Replaces the 5 different popup-window variants (3 different window sizes
 * for the same operation) and the 2 hidden-iframe engines scattered across
 * LabelPrinter, InvoiceTemplate, usePOSCheckout, useCashRegister,
 * ShiftHistory, exportUtils and A5InvoiceDesigner.
 *
 * The popup HTML is expected to already contain its own auto-print trigger
 * (injected by `wrapPrintHTML`), so callers just pass the final HTML string.
 */

export interface OpenPrintWindowOptions {
  /** Popup width in px. Derived from page size if omitted. */
  width?: number;
  /** Popup height in px. Derived from page size if omitted. */
  height?: number;
  /**
   * Whether this window injects its own auto-print trigger. Set to true when
   * the HTML is a complete document (e.g. a receipt template) that does NOT
   * already contain a `window.print()` call. The shared `wrapPrintHTML` shell
   * already embeds one, so wrapped content should leave this false.
   * Default false.
   */
  autoPrint?: boolean;
}

// px-per-mm approximation for sizing the preview popup. Printouts are
// rasterized at the printer's DPI regardless, this only affects the on-screen
// preview window dimensions.
const PX_PER_MM = 3.78;

/**
 * Opens a print popup, writes the HTML, and lets the embedded auto-print
 * script fire. Returns the opened window or null if blocked.
 */
export const openPrintWindow = (
  html: string,
  options: OpenPrintWindowOptions = {}
): Window | null => {
  const width = options.width ?? 480;
  const height = options.height ?? 720;
  const features = `width=${width},height=${height},scrollbars=yes,resizable=yes`;

  const printWindow = window.open('', '', features);

  if (!printWindow) {
    alert(
      'Popup blocked! Please allow popups for this site to enable printing.'
    );
    return null;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // For complete HTML documents that don't ship their own auto-print script
  // (the receipt/shift templates), inject a font-safe print trigger here so
  // behaviour matches the wrapped shell path.
  if (options.autoPrint) {
    triggerAutoPrint(printWindow);
  }

  printWindow.focus();

  return printWindow;
};

/**
 * Injects a font-ready print trigger into a popup window, mirroring the
 * embedded script from `wrapPrintHTML`. Kept here so the popup path and the
 * wrapped-document path behave identically for receipts.
 */
const triggerAutoPrint = (win: Window): void => {
  try {
    const doc = win.document;
    const script = doc.createElement('script');
    script.textContent = `
      (function() {
        var ready = (document.fonts && document.fonts.ready) || Promise.resolve();
        Promise.all([
          ready,
          new Promise(function(resolve) { setTimeout(resolve, 100); })
        ]).then(function() {
          try { window.print(); } catch (e) { console.error('Print failed', e); }
        }).catch(function(e) {
          console.error('Font loading failed', e);
          try { window.print(); } catch (_) {}
        });
      })();
    `;
    doc.body.appendChild(script);
  } catch (e) {
    console.error('[printWindow] Failed to inject auto-print script', e);
  }
};

/**
 * Prints via a hidden iframe, then removes it. Used for "export to PDF" flows
 * and in-app printable areas where a popup is undesirable.
 */
export const printViaIframe = (html: string): void => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const contentWindow = iframe.contentWindow;
  // Give the browser a tick to parse + load fonts before printing.
  setTimeout(() => {
    try {
      contentWindow?.focus();
      contentWindow?.print();
    } catch (e) {
      console.error('Iframe print failed', e);
    }
    // Cleanup after the print dialog has had time to open.
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  }, 300);
};

/**
 * Helper: converts mm page dimensions to a sensible popup size in px.
 */
export const mmToPopupSize = (widthMM: number, heightMM: number) => ({
  width: Math.max(360, Math.round(widthMM * PX_PER_MM) + 40),
  height: Math.max(480, Math.round(heightMM * PX_PER_MM) + 80),
});
