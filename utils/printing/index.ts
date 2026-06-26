/**
 * Unified Printing API.
 *
 * Single entry point for the whole app's printing. Call sites should use
 * `printDocument` (from printEngine) which handles silent→fallback policy.
 * The shell + window helpers are exposed for the content generators and tests.
 */

export { escapeHtml, deriveOrientation, wrapPrintHTML } from './printShell';
export type { PrintOrientation, PrintShellOptions } from './printShell';

export { mmToPopupSize, openPrintWindow, printViaIframe } from './printWindow';
export type { OpenPrintWindowOptions } from './printWindow';

export { printDocument } from './printEngine';
export type { PrintDocumentOptions, PrintKind } from './printEngine';
