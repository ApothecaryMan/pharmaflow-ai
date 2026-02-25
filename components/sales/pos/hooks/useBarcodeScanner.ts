import { useEffect, useRef } from 'react';
import type { Drug } from '../../../../types';

interface UseBarcodeScannerProps {
  inventory: Drug[];
  addToCart: (drug: Drug) => void;
  playSuccess: () => void;
  playError: () => void;
  enabled?: boolean;
}

/**
 * useBarcodeScanner
 * 
 * A smart hook that differentiates between human typing and machine barcode scanning
 * by measuring keystroke velocity (delta time).
 */
export const useBarcodeScanner = ({
  inventory,
  addToCart,
  playSuccess,
  playError,
  enabled = true,
}: UseBarcodeScannerProps) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const fastKeyCountRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;

      const currentTime = Date.now();
      const delta = lastKeyTimeRef.current > 0 ? currentTime - lastKeyTimeRef.current : 0;
      lastKeyTimeRef.current = currentTime;

      // Threshold: 50ms is usually safe for human vs machine differentiation
      // Most scanners fire keys < 30ms apart.
      const isFast = delta > 0 && delta < 50;

      if (isFast) {
        fastKeyCountRef.current += 1;
      } else {
        // Human typing speed or start of a new sequence
        // If we were NOT in a sequence, we reset.
        if (e.key !== 'Enter') {
          // If we detect a slow key but had some buffer, check if we should clear it
          if (fastKeyCountRef.current < 2) {
            bufferRef.current = '';
          }
          fastKeyCountRef.current = 0;
        }
      }

      // Handle Completion (Enter key is the standard end-of-scan for most HID scanners)
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        
        // Only process if we detected a "burst" of fast keys or a significant buffer
        if (barcode.length >= 3 && fastKeyCountRef.current >= 2) {
          e.preventDefault();
          e.stopPropagation();

          const drug = inventory.find(
            (d) => d.barcode === barcode || d.internalCode === barcode
          );

          if (drug) {
            addToCart(drug);
            playSuccess();
          } else {
            console.warn(`[Scanner] Barcode not found: ${barcode}`);
            playError();
          }

          // Reset
          bufferRef.current = '';
          fastKeyCountRef.current = 0;
          return;
        }
        
        // Reset on any Enter to keep it clean
        bufferRef.current = '';
        fastKeyCountRef.current = 0;
        return;
      }

      // Buffer the key
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Detection & Interception Logic
        // If we are deep into a fast sequence (3+ fast keys), we start intercepting
        if (fastKeyCountRef.current >= 2) {
          e.preventDefault();
          e.stopPropagation();

          // "Smart Cleaning": If the 1st or 2nd character leaked into an input before 
          // we could identify it as a machine, we try to clean it up.
          const activeEl = document.activeElement;
          if (
            activeEl instanceof HTMLInputElement || 
            activeEl instanceof HTMLTextAreaElement
          ) {
            // This is a bit aggressive but works for POS scenarios
            // If the buffer just started and we are now sure it's a machine,
            // the first 1-2 chars might be in the value.
            if (fastKeyCountRef.current === 2) {
              const val = activeEl.value;
              // Remove the last 2 characters (the ones that leaked)
              // Note: This assumes the scanner typed them at the cursor position.
              activeEl.value = val.slice(0, -2);
              
              // Trigger input event to notify React/Frameworks
              activeEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }
      }

      // Safety Timeout: If someone scans but the scanner doesn't send Enter,
      // clear the buffer after 500ms of silence so it doesn't pollute the next scan.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
        fastKeyCountRef.current = 0;
      }, 500);
    };

    // Use capture: true to intercept before other listeners (like search inputs)
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [inventory, addToCart, playSuccess, playError, enabled]);
};
