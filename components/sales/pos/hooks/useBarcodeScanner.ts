import { useEffect, useRef, useCallback } from 'react';
import type { Drug } from '../../../../types';
import { inventorySearchEngine } from '../../../../services/search/drugSearchService';

// ─── Constants ───────────────────────────────────────────────────────────────
const FAST_KEY_THRESHOLD_MS = 50;   // Most HID scanners fire keys < 30ms apart
const MIN_FAST_KEYS_TO_CONFIRM = 3; // Need 3+ fast keys to confirm it's a scanner
const MIN_BARCODE_LENGTH = 3;       // Minimum barcode length to process
const BUFFER_TIMEOUT_MS = 500;      // Clear stale buffer after 500ms of silence

// ─── Scanner Event ───────────────────────────────────────────────────────────
export interface BarcodeScanResult {
  barcode: string;
  drug: Drug | null;
  source: 'hid' | 'keyboard';
}

// ─── Hook Props ──────────────────────────────────────────────────────────────
interface UseBarcodeScannerProps {
  inventory: Drug[];
  addToCart: (drug: Drug) => void;
  playSuccess: () => void;
  playError: () => void;
  enabled?: boolean;
  /** Called when leaked characters need to be trimmed from React state. */
  onLeakedChars?: (leakedCount: number) => void;
  /** Optional callback for scan events (useful for logging/analytics). */
  onScanResult?: (result: BarcodeScanResult) => void;
}

/**
 * useBarcodeScanner — Barcode-First Routing
 *
 * Core principle: barcode scanner input NEVER touches the search field.
 *
 * How it works:
 * 1. Captures keystrokes in the **capture phase** (before React handlers).
 * 2. Measures keystroke velocity to distinguish human typing vs HID scanner.
 * 3. Once a "burst" of fast keys (delta < 50ms) is detected, ALL subsequent
 *    keys are intercepted and buffered internally.
 * 4. On Enter (standard HID scanner termination):
 *    - Looks up the barcode via O(1) HashMap in inventorySearchEngine.
 *    - Found → addToCart() + playSuccess(). Search field stays clean.
 *    - Not found → playError() + optional notification. Search field stays clean.
 *
 * Edge cases handled:
 * - **Leaked chars**: First 1-2 chars may reach React state before detection.
 *   The `onLeakedChars` callback notifies the parent to trim them.
 * - **Human fast typing**: Unlikely to trigger MIN_FAST_KEYS_TO_CONFIRM.
 * - **Scanner without Enter**: 500ms timeout clears stale buffer.
 */
export const useBarcodeScanner = ({
  inventory,
  addToCart,
  playSuccess,
  playError,
  enabled = true,
  onLeakedChars,
  onScanResult,
}: UseBarcodeScannerProps) => {
  // ─── Refs (never change, no re-renders) ────────────────────────────────────
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const fastKeyCountRef = useRef(0);
  const isConfirmedScanRef = useRef(false); // true once we're sure it's a scanner
  const leakedCharsCountRef = useRef(0); // chars that leaked before confirmation
  const hasReportedLeakRef = useRef(false); // ensures we report leak exactly once per scan
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Exposed to siblings (e.g. handleGlobalKeyDown) so they can bail out mid-scan.
  // Defined with the other refs so it's in scope for handleKeyDown/reset closures.
  const isScanningRef = useRef(false);

  // Keep latest inventory + callbacks in refs to avoid effect re-runs
  const inventoryRef = useRef(inventory);
  const callbacksRef = useRef({
    addToCart,
    playSuccess,
    playError,
    onLeakedChars,
    onScanResult,
  });

  useEffect(() => {
    inventoryRef.current = inventory;
    callbacksRef.current = {
      addToCart,
      playSuccess,
      playError,
      onLeakedChars,
      onScanResult,
    };
  }, [inventory, addToCart, playSuccess, playError, onLeakedChars, onScanResult]);

  /**
   * Process a completed barcode scan:
   * 1. O(1) HashMap lookup via inventorySearchEngine
   * 2. Route to cart or error
   */
  const processBarcode = useCallback((barcode: string) => {
    const cb = callbacksRef.current;

    // O(1) Lookup
    const drug = inventorySearchEngine.searchByBarcode(barcode) as Drug | null;

    // Also check internalCode (some scanners read internal labels)
    const match = drug || inventoryRef.current.find(
      (d) => d.internalCode === barcode
    );

    if (match) {
      cb.addToCart(match);
      cb.playSuccess();
    } else {
      console.warn(`[BarcodeScanner] Not found: "${barcode}"`);
      cb.playError();
    }

    // Notify parent for analytics/logging
    cb.onScanResult?.({
      barcode,
      drug: match,
      source: 'hid',
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      bufferRef.current = '';
      fastKeyCountRef.current = 0;
      isConfirmedScanRef.current = false;
      leakedCharsCountRef.current = 0;
      hasReportedLeakRef.current = false;
      isScanningRef.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier-only keys
      if (
        ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)
      ) {
        return;
      }

      const now = Date.now();
      const delta = lastKeyTimeRef.current > 0 ? now - lastKeyTimeRef.current : 0;
      lastKeyTimeRef.current = now;

      const isFast = delta > 0 && delta < FAST_KEY_THRESHOLD_MS;
      const wasConfirmed = isConfirmedScanRef.current;

      // ─── Velocity Tracking ─────────────────────────────────────────────────
      if (isFast) {
        fastKeyCountRef.current += 1;
        if (fastKeyCountRef.current >= MIN_FAST_KEYS_TO_CONFIRM) {
          isConfirmedScanRef.current = true;
          // Signal to siblings that a scan is in progress, so they can bail out.
          isScanningRef.current = true;
        }
      } else if (!isConfirmedScanRef.current) {
        // Slow key before confirmation — human typing. Reset burst.
        fastKeyCountRef.current = 0;
        bufferRef.current = '';
      }

      // ─── Enter Key = End of Scan ───────────────────────────────────────────
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();

        if (isConfirmedScanRef.current && barcode.length >= MIN_BARCODE_LENGTH) {
          e.preventDefault();
          e.stopPropagation();
          processBarcode(barcode);
          reset();
          return;
        }

        // Not a scan — let Enter propagate normally.
        reset();
        return;
      }

      // ─── Printable Character ────────────────────────────────────────────────
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        if (isConfirmedScanRef.current) {
          // Confirmed scanner → swallow the key. It does NOT leak, so we must
          // NOT count it (only pre-confirmation chars reach React state).
          e.preventDefault();
          e.stopPropagation();

          // On the key that just crossed the threshold, report the leak once.
          if (!wasConfirmed && !hasReportedLeakRef.current) {
            hasReportedLeakRef.current = true;
            const leaked = leakedCharsCountRef.current;
            if (leaked > 0) {
              callbacksRef.current.onLeakedChars?.(leaked);
            }
          }
        } else {
          // Not confirmed yet → this char WILL reach React state. Count it.
          leakedCharsCountRef.current += 1;
        }
      }

      // ─── Safety Timeout ──────────────────────────────────────────────────
      // If scanner doesn't send Enter, clear buffer after silence.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        reset();
      }, BUFFER_TIMEOUT_MS);
    };

    // Capture phase: runs BEFORE React's synthetic events and other handlers.
    // This guarantees we intercept scanner keystrokes before they reach the
    // search input or handleGlobalKeyDown.
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, processBarcode]);

  return { isScanningRef };
};
