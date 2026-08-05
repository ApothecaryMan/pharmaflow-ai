/**
 * Serial / ID Generator — single client contract
 *
 * Numbering is AUTHORITATIVE on the server:
 *   - `increment_sequence`   : atomic per-(tenant, branch, doc_type, year) counter
 *                              (Supabase RPC, SECURITY DEFINER, row-locked).
 *   - `generate_serial_id`   : single canonical formatter. Layout lives in ONE
 *                              place (SQL), so client never duplicates prefixes.
 *
 * Client responsibilities are limited to:
 *   - `uuid()`      : PKs (uuid v4, correct for Supabase).
 *   - `nextSerial()`: ask the server for the next serial (throws on error —
 *                     NO client-side fallback, to preserve data integrity).
 *   - `draftId()`   : LOCAL, UI-only identifiers (tabs, notifications, draft
 *                     row keys). NOT a serial — never persisted as one.
 */

import { supabase } from '../lib/supabase';

// Supported document / counter types
// Document types (new scheme: {BranchCode}-{TypeCode}-{YY}-{000001}):
//   SL sale · SR sale return · QT quotation · PU purchase
//   PR purchase return · PO purchase order · TR transfer
//   AD adjustment · DS disposal · SH shift · CS cash · EX expense
//   DO delivery order · RV review · SB subscription (tenant-level)
// Legacy/master-data types retain their current formats.
export type DocType =
  | 'sales'
  | 'returns'
  | 'purchase_returns'
  | 'supplier_payments'
  | 'customers-serial'
  | 'inventory'
  | 'barcodes'
  | 'employees'
  | 'transactions'
  | 'purchases'
  | 'shifts'
  | 'branches'
  | 'suppliers'
  | 'branches-code'
  | 'generic'
  | 'SL'
  | 'SR'
  | 'QT'
  | 'PU'
  | 'PR'
  | 'PO'
  | 'TR'
  | 'AD'
  | 'DS'
  | 'SH'
  | 'CS'
  | 'EX'
  | 'DO'
  | 'RV'
  | 'SB';

export interface NextSerialParams {
  /** UUID of the branch (DB counter scope). Required for DB sequence. */
  branchId: string;
  /** Which counter/format family to use. */
  docType: DocType;
  /** Branch code prefix (e.g. "B1"). Falls back to "PF" server-side. */
  branchCode?: string;
  /** Business date for date-embedded formats (defaults to now). */
  date?: string | Date;
  /** Use a caller-owned sequence number instead of incrementing the counter. */
  customSeq?: number;
  /** Zero-pad the sequence to N digits (0 = no padding). */
  zeroPad?: number;
  /** Return the raw sequence number as text (no prefix/format). */
  raw?: boolean;
}

const DEFAULT_ZERO_PAD = 4;

/**
 * Raised when the server cannot mint a serial after retries are exhausted.
 * There is NEVER a client-side fallback number — callers must abort the
 * whole operation and surface a clear message to the user.
 */
export class SerialGenerationError extends Error {
  readonly docType: DocType;
  readonly cause?: unknown;

  constructor(docType: DocType, cause?: unknown) {
    super(
      `Failed to generate serial for ${docType}. Operation aborted to preserve data integrity.`
    );
    this.name = 'SerialGenerationError';
    this.docType = docType;
    this.cause = cause;
  }
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Retry: attempt 1, backoff 150ms, attempt 2, backoff 300ms, attempt 3, then fail.
const TRANSIENT_BACKOFF_MS = [150, 300];

/**
 * True for transient failures worth retrying (network / timeout / 5xx /
 * rollback races). Logical errors (unique violation, permissions, invalid
 * input) are never retryable — they will not resolve.
 */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string; name?: string; message?: string };
  const code = String(e?.code || '');
  const name = String(e?.name || '');
  const msg = String(e?.message || '');

  // Postgres/PGRST codes that represent connection/race conditions.
  if (/^(52[0-9]|53[0-9]|60[0-9]|57014|40001|40P01)$/.test(code)) return true;
  // supabase-js retryable fetch error types.
  if (/RetryableFetchError|FetchError/i.test(name)) return true;
  // Network-level failures.
  if (
    /failed to fetch|network error|socket hang up|ECONN(RESET|REFUSED|ABORTED)|time\s*out|timed out|ETIMEDOUT/i.test(
      msg
    )
  ) {
    return true;
  }
  return false;
}

export const idGenerator = {
  /**
   * Generates a standard UUID v4 (with a fallback for non-secure contexts).
   */
  uuid: (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Requests the next serial from the server's single source of truth.
   * Retries transient (network/timeout/5xx) failures with backoff — on the
   * SAME RPC, never a local fallback. Once the retry budget is exhausted it
   * throws a SerialGenerationError; callers must abort the operation.
   */
  nextSerial: async (params: NextSerialParams): Promise<string> => {
    const { branchId, docType, branchCode, date, customSeq, zeroPad, raw } = params;

    let lastError: unknown;

    for (let attempt = 0; attempt <= TRANSIENT_BACKOFF_MS.length; attempt++) {
      const { data, error } = await supabase.rpc('generate_serial_id', {
        p_branch_id: branchId,
        p_doc_type: docType,
        p_branch_code: branchCode || null,
        ...(date ? { p_date: new Date(date).toISOString() } : {}),
        p_custom_seq: customSeq ?? null,
        p_zero_pad: zeroPad ?? DEFAULT_ZERO_PAD,
        p_raw: raw ?? false,
      });

      if (!error && typeof data === 'string') return data;

      lastError =
        error || new Error(`generate_serial_id returned a non-string value for ${docType}`);

      // A logical error (unique violation, permission denied, invalid input)
      // will not resolve on retry — fail fast instead of retrying.
      if (error && !isTransientError(error)) break;

      if (attempt < TRANSIENT_BACKOFF_MS.length) {
        await delay(TRANSIENT_BACKOFF_MS[attempt]);
      }
    }

    console.error(`[idGenerator] Serial generation failed for ${docType}:`, lastError);
    throw new SerialGenerationError(docType, lastError);
  },

  /**
   * LOCAL, UI-only identifier (React keys, draft rows, notifications).
   * Timestamp + entropy. NOT a serial — do not persist as a serial number.
   */
  draftId: (): string => {
    const timePart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${timePart}${randomPart}`;
  },

  /**
   * Validates if a string is a valid UUID v4.
   */
  isUuid: (id: string): boolean => {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },

  /**
   * Generates a short, smart, and deterministic batch barcode.
   * Format: [DrugID in Base36][Months since 2024 in Base36]
   */
  generateBatchBarcode: (drugId: number, expiryDate: string | Date): string => {
    const drugPart = drugId.toString(36).toUpperCase();
    const date = new Date(expiryDate);
    const months = (date.getFullYear() - 2024) * 12 + date.getMonth();
    const datePart = months.toString(36).toUpperCase().padStart(2, '0');
    return `${drugPart}${datePart}`;
  },

  /**
   * Decodes a smart batch barcode back into drugId and approximate expiry date.
   */
  decodeBatchBarcode: (barcode: string): { drugId: number; expiryDate: Date } => {
    const datePart = barcode.slice(-2);
    const drugPart = barcode.slice(0, -2);
    const drugId = parseInt(drugPart, 36);
    const months = parseInt(datePart, 36);
    const year = Math.floor(months / 12) + 2024;
    const month = months % 12;
    return { drugId, expiryDate: new Date(year, month, 1) };
  },
};
