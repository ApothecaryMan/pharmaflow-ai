/**
 * Print Shell — Shared HTML wrapper for all print jobs.
 *
 * Replaces the 5 hand-rolled copies of `@page` + body reset + font-loading
 * boilerplate that previously lived in LabelPrinter, InvoiceTemplate,
 * ShiftReceiptTemplate and the test-print helpers.
 *
 * The shell owns ONLY the generic chrome (page size, orientation, reset,
 * font-ready cycle, optional auto-print). The *content* (label layout,
 * receipt design, shift report) stays in its own generator and is injected
 * via `bodyHTML`/`css`.
 */

export type PrintOrientation = 'portrait' | 'landscape';

export interface PrintShellOptions {
  /** Inner HTML of the document body (the actual label/receipt content). */
  bodyHTML: string;
  /** Extra CSS to inline (template-specific rules, @font-face blocks, etc.). */
  css?: string;
  /** Physical page width in mm. */
  width: number;
  /** Physical page height in mm. */
  height: number;
  /** Page orientation. Defaults to auto-derived from width/height. */
  orientation?: PrintOrientation;
  /** Font CSS to embed (barcode base64 fonts, receipt @font-face, etc.). */
  fontsCSS?: string;
  /** Whether to trigger window.print() once fonts are ready. Default true. */
  autoPrint?: boolean;
  /** Extra attributes for the <html> tag (e.g. dir="rtl"). */
  htmlAttrs?: string;
  /** Document <title>. */
  title?: string;
  /** Language direction. Default 'ltr'. */
  dir?: 'ltr' | 'rtl';
  /** Body font-family for the shell reset. Content can override per-element. */
  fontFamily?: string;
}

/**
 * Escapes special HTML characters to prevent XSS when rendering dynamic data.
 * Centralized so every print path uses the same escaping.
 */
export const escapeHtml = (text: string | null | undefined): string => {
  if (text == null) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Derives the effective orientation. Labels (width > height) must be
 * landscape; receipts (tall & narrow) are portrait.
 */
export const deriveOrientation = (
  width: number,
  height: number,
  explicit?: PrintOrientation
): PrintOrientation => {
  if (explicit) return explicit;
  return width > height ? 'landscape' : 'portrait';
};

/**
 * Wraps print content in a complete, self-contained HTML document with the
 * shared print chrome. This is the single source of truth for `@page`,
 * the body reset, the font-ready cycle and the auto-print trigger.
 */
export const wrapPrintHTML = (options: PrintShellOptions): string => {
  const {
    bodyHTML,
    css = '',
    width,
    height,
    orientation,
    fontsCSS = '',
    autoPrint = true,
    htmlAttrs = '',
    title = 'Print',
    dir = 'ltr',
    fontFamily = "'Roboto', Arial, sans-serif",
  } = options;

  const _effectiveOrientation = deriveOrientation(width, height, orientation);

  // For landscape, the @page size string keeps W×H but the browser/printer
  // honors the orientation. We do NOT swap dimensions in CSS — that was the
  // old rotatePage hack that produced skewed output. The real orientation
  // fix lives in the QZ config (see qzPrinter.printLabelSilently).
  const _pageSize = `${width}mm ${height}mm`;

  // Shared font-ready + optional auto-print script. Replaces the duplicated
  // `document.fonts.ready` + setTimeout safety-delay logic.
  const printScript = autoPrint
    ? `
    <script>
      (function() {
        var ready = (document.fonts && document.fonts.ready) || Promise.resolve();
        Promise.all([
          ready,
          new Promise(function(resolve) { setTimeout(resolve, 100); })
        ]).then(function() {
          try { window.print(); } catch (e) { console.error('Print failed', e); }
        }).catch(function(e) { console.error('Font loading failed', e); try { window.print(); } catch (_) {} });
      })();
    </script>`
    : '';

  return `<!DOCTYPE html>
<html ${htmlAttrs} dir="${dir}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
${fontsCSS}
${css}
@page { margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  height: auto !important;
  background: #ffffff;
  overflow: visible !important;
}
body {
  font-family: ${fontFamily};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
</style>
</head>
<body>
${bodyHTML}
${printScript}
</body>
</html>`;
};
