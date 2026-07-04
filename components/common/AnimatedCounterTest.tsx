import React, { useEffect, useRef } from 'react';
import { useSettings } from '../../context';

interface AnimatedCounterTestProps {
  value: number;
  fractionDigits?: number;
  className?: string;
  duration?: number;
  notation?: 'standard' | 'compact';
}

/**
 * AnimatedCounterTest - High-performance counting animation.
 * Uses direct DOM manipulation for 60fps smoothness and tabular-nums to prevent jitter.
 */
export const AnimatedCounterTest = ({
  value,
  fractionDigits = 0,
  className = '',
  duration = 1200,
  notation = 'standard',
}: AnimatedCounterTestProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);
  const isFirstMountRef = useRef(true);
  const { numeralLocale } = useSettings(); // Keeping for re-render trigger if needed, or remove if not needed.
  // Actually, toLocaleString() will now use the global state.

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const from = prevValueRef.current;
    const to = value;

    // Skip animation on first mount
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevValueRef.current = to;
      return;
    }

    // Skip if value hasn't changed
    if (from === to) return;

    const start = performance.now();

    // Cubic ease-out function for smooth deceleration
    const easeOut = (t: number) => 1 - (1 - t) ** 3;

    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate current value based on progress and easing
      const current = from + (to - from) * easeOut(progress);
      
      // Keep track of the current animated value so if the prop changes mid-animation,
      // it starts from exactly where it was rather than dropping back to the original start.
      prevValueRef.current = current;

      // Format with specified decimals and notation
      const formatted = current.toLocaleString(numeralLocale, {
        notation,
        minimumFractionDigits: notation === 'compact' ? (current >= 1000 ? 1 : 0) : fractionDigits,
        maximumFractionDigits: notation === 'compact' ? (current >= 1000 ? 1 : 0) : fractionDigits,
      });

      // Prevent jitter by wrapping digits in 1ch fixed-width spans
      el.innerHTML = formatted.split('').map(char => {
        if (/[0-9\u0660-\u0669\u06F0-\u06F9]/.test(char)) {
          return `<span style="display: inline-block; width: 1ch; text-align: center;">${char}</span>`;
        }
        return char;
      }).join('');

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = to; // Ensure final exact value is set
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [value, duration, fractionDigits]);

  const formattedInitial = value.toLocaleString(numeralLocale, {
    notation,
    minimumFractionDigits: notation === 'compact' ? (value >= 1000 ? 1 : 0) : fractionDigits,
    maximumFractionDigits: notation === 'compact' ? (value >= 1000 ? 1 : 0) : fractionDigits,
  });

  const initialHtml = formattedInitial.split('').map(char => {
    if (/[0-9\u0660-\u0669\u06F0-\u06F9]/.test(char)) {
      return `<span style="display: inline-block; width: 1ch; text-align: center;">${char}</span>`;
    }
    return char;
  }).join('');

  return (
    <span
      ref={spanRef}
      dir="ltr"
      className={`tabular-nums inline-flex transition-colors ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
        whiteSpace: 'nowrap',
      }}
      dangerouslySetInnerHTML={{ __html: initialHtml }}
    />
  );
};
