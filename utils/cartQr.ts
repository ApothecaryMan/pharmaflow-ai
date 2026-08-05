import type { PurchaseItem } from '../types/purchases';

/**
 * Cart QR - Compact cold-transfer payload.
 *
 * Transfers a purchase cart between pharmacies/branches via QR. The QR carries ONLY:
 *   <international barcode>|<qty>|<YYYY-MM>
 * per line (no name/prices/batch) so the payload stays tiny and the reader resolves
 * the drug from its own inventory by international barcode.
 *
 * Wire format (newline-separated lines, `|`-separated fields):
 *   Header:  PFAQ|<version>|<totalPages>|<pageIndex(0-based)>|<timestampMs>|<itemCountOnPage>
 *   Item:    <barcode>|<qty>|<YYYY-MM>
 *
 * `<itemCountOnPage>` reports how many item rows that page carries, so the receiver can
 * verify it received a full/expected page without decoding rows.
 *
 * Multi-page carts split at MAX_CHARS per page when the payload outgrows one QR.
 * Each page always holds a whole number of item rows (a row is never split across QRs).
 */

export const PROTOCOL = 'PFAQ';
export const VERSION = 1;

/** Per-QR character ceiling. Conservative for phone-camera scanning at EC level M. */
export const MAX_CHARS = 600;

/** Residue for the header + newlines when packing lines into pages. */
const PAGE_OVERHEAD = 40;

export interface CartQrLine {
  /** International barcode only. */
  code: string;
  /** Quantity (always > 0). */
  qty: number;
  /** Canonical expiry YYYY-MM. */
  expiry: string;
}

export interface CartQrFragment {
  pageIndex: number;
  totalPages: number;
  ts: number;
}

export interface ParsedCartPage {
  fragment: CartQrFragment;
  lines: CartQrLine[];
  /** Number of item lines this page was declared to carry (from the header). */
  count: number;
  /** Number of item lines dropped in this page due to sanitization failures. */
  invalid: number;
}

const YYYY_MM_RE = /^\d{4}-\d{2}$/;

/**
 * Normalize any expiry the cart may hold into canonical YYYY-MM.
 * Accepts MMYY, YYYY-MM, YYYY-MM-DD, and MM/YYYY / MM/YY. Returns null when unparseable.
 */
export function toIsoMonth(expiry: string | null | undefined): string | null {
  const s = (expiry ?? '').trim();
  if (!s) return null;

  // YYYY-MM
  if (YYYY_MM_RE.test(s)) return s;

  // YYYY-MM-DD (+ optional time) -> strip to month
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);

  // MMYY
  if (/^\d{4}$/.test(s)) {
    const month = parseInt(s.slice(0, 2), 10);
    if (month < 1 || month > 12) return null;
    const yy = s.slice(2);
    return `20${yy}-${s.slice(0, 2)}`;
  }

  // MM/YYYY or MM/YY
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 2) {
      const month = parts[0].padStart(2, '0');
      const m = parseInt(month, 10);
      if (m < 1 || m > 12) return null;
      let year = parts[1];
      if (year.length === 2) year = `20${year}`;
      else if (year.length !== 4 || !/^\d{4}$/.test(year)) return null;
      return `${year}-${month}`;
    }
    return null;
  }

  return null;
}

/**
 * Convert YYYY-MM (or any parseable format) into the cart's native MMYY.
 * Returns the original string when it cannot be mapped.
 */
export function toMmyy(isoOrRaw: string): string {
  const iso = toIsoMonth(isoOrRaw);
  if (iso && YYYY_MM_RE.test(iso)) {
    const [year, month] = iso.split('-');
    return `${month}${year.slice(2)}`;
  }
  return isoOrRaw;
}

/** Build a single sanitized line from a cart item, or null (skip) when unsafe. */
function sanitizeLine(item: PurchaseItem): CartQrLine | null {
  const code = item.barcode ?? '';
  // International barcode only; reject any delimiter/control/stray char.
  if (!/^[A-Za-z0-9]+$/.test(code)) return null;
  const qty = Number(item.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const iso = toIsoMonth(item.expiryDate ?? '');
  if (!iso) return null;
  return { code, qty, expiry: iso };
}

const buildHeader = (total: number, index: number, ts: number, count: number) =>
  `${PROTOCOL}|${VERSION}|${total}|${index}|${ts}|${count}`;

/**
 * Serialize cart items into one or more QR payload strings.
 * Sanitizes per line (skipping unsafe ones) and greedy-packs whole rows into pages
 * each ≤ MAX_CHARS. Always produces at least the pages needed — a row is never
 * split across pages and no size-based refusal is applied.
 */
export function serializePages(cart: PurchaseItem[], _meta?: { timestamp?: number }): { pages: string[] } {
  const ts = _meta?.timestamp ?? Date.now();
  const lineTexts: string[] = [];
  for (const item of cart) {
    const line = sanitizeLine(item);
    if (line) lineTexts.push(`${line.code}|${line.qty}|${line.expiry}`);
  }
  if (lineTexts.length === 0) return { pages: [] };

  const chunks: string[][] = [];
  let cur: string[] = [];
  let curLen = 0;
  for (const text of lineTexts) {
    const len = text.length;
    if (cur.length > 0 && curLen + 1 + len + PAGE_OVERHEAD > MAX_CHARS) {
      chunks.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(text);
    curLen += len + 1;
  }
  if (cur.length) chunks.push(cur);

  const total = chunks.length;
  const pages = chunks.map(
    (lines, i) => `${buildHeader(total, i, ts, lines.length)}\n${lines.join('\n')}`
  );
  return { pages };
}

/** Number of QR pages the current cart will produce (for a UI hint). */
export function pageCount(cart: PurchaseItem[]): number {
  return serializePages(cart, { timestamp: 0 }).pages.length;
}

function parseLine(code: string, qtyStr: string, expiryStr: string): CartQrLine | null {
  if (!/^[A-Za-z0-9]+$/.test(code)) return null;
  const qty = Number(qtyStr);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const iso = toIsoMonth(expiryStr);
  if (!iso) return null;
  return { code, qty, expiry: iso };
}

/**
 * Parse a single scanned QR payload.
 * Returns null for an unrecognized header. Malformed item lines are skipped and
 * reported via `invalid` — never throws.
 */
export function parsePage(payload: string | null | undefined): ParsedCartPage | null {
  const s = (payload ?? '').trim();
  if (!s) return null;

  const lines = s.split(/\r?\n/);
  const header = lines[0]?.split('|');
  if (!header || header.length !== 6) return null;
  const [proto, version, totalStr, indexStr, tsStr, countStr] = header;
  if (proto !== PROTOCOL || version !== String(VERSION)) return null;

  const totalPages = parseInt(totalStr, 10);
  const pageIndex = parseInt(indexStr, 10);
  const ts = parseInt(tsStr, 10);
  const count = parseInt(countStr, 10);
  if (
    !Number.isInteger(totalPages) ||
    !Number.isInteger(pageIndex) ||
    !Number.isInteger(ts) ||
    !Number.isInteger(count)
  ) {
    return null;
  }
  if (pageIndex < 0 || pageIndex >= totalPages) return null;

  const parsed: CartQrLine[] = [];
  let invalid = 0;
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const parts = raw.split('|');
    if (parts.length !== 3) {
      invalid++;
      continue;
    }
    const line = parseLine(parts[0], parts[1], parts[2]);
    if (line) parsed.push(line);
    else invalid++;
  }

  return { fragment: { pageIndex, totalPages, ts }, lines: parsed, count, invalid };
}

/**
 * Merge duplicate lines across pages/rows.
 * KEY = code|expiry: same barcode + same expiry -> sum quantity; same barcode with a
 * different expiry stays a separate line (genuinely different batch, even without a
 * batch number in the payload). Preserves first-seen order.
 */
export function mergeDuplicateLines(lines: CartQrLine[]): CartQrLine[] {
  const map = new Map<string, CartQrLine>();
  for (const line of lines) {
    const key = `${line.code}|${line.expiry}`;
    const existing = map.get(key);
    if (existing) existing.qty += line.qty;
    else map.set(key, { ...line });
  }
  return Array.from(map.values());
}