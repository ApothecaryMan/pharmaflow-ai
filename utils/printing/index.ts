/**
 * Unified Printing API.
 *
 * Single entry point for the whole app's printing. Call sites should use
 * `printDocument` (from printEngine) which handles silent→fallback policy.
 * The shell + window helpers are exposed for the content generators and tests.
 */

export type { PrintDocumentOptions, PrintKind } from './printEngine';
export { printDocument } from './printEngine';
export type { PrintOrientation, PrintShellOptions } from './printShell';
export { deriveOrientation, escapeHtml, wrapPrintHTML } from './printShell';
export type { OpenPrintWindowOptions } from './printWindow';
export { mmToPopupSize, openPrintWindow, printViaIframe } from './printWindow';
export { getReceiptFontsCSS } from './receiptFonts';
