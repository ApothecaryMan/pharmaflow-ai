import React, { useEffect, useRef } from 'react';
import { useSettings } from '../../context';

interface AnimatedCounterProps {
  value: number;
  fractionDigits?: number;
  className?: string;
  duration?: number;
  notation?: 'standard' | 'compact';
}

/**
 * AnimatedCounter - High-performance counting animation.
 * Uses direct DOM manipulation for 60fps smoothness and tabular-nums to prevent jitter.
 */
export const AnimatedCounter = ({
  value,
  fractionDigits = 0,
  className = '',
  duration = 1200,
  notation = 'standard',
}: AnimatedCounterProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);
  const isFirstMountRef = useRef(true);
  const { language, numeralSystem, fontFamilyAR, fontFamilyEN } = useSettings();
  const isAR = language === 'AR';
  
  // Logic: Use numeralSystem setting if in AR mode, otherwise always EN
  const locale = isAR 
    ? (numeralSystem === 'AR' ? 'ar-EG' : 'ar-u-nu-latn') 
    : 'en-US';

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
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calculate current value based on progress and easing
      const current = from + (to - from) * easeOut(progress);

      // Format with specified decimals, locale, and notation
      el.textContent = current.toLocaleString(locale, {
        notation,
        minimumFractionDigits: notation === 'compact' ? (current >= 1000 ? 1 : 0) : fractionDigits,
        maximumFractionDigits: notation === 'compact' ? (current >= 1000 ? 1 : 0) : fractionDigits,
      });

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = to;
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [value, duration, fractionDigits]);

  return (
    <span
      ref={spanRef}
      className={`tabular-nums inline-block transition-colors ${className}`}
      style={{ 
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
        whiteSpace: 'nowrap'
      }}
    >
      {value.toLocaleString(locale, {
        notation,
        minimumFractionDigits: notation === 'compact' ? (value >= 1000 ? 1 : 0) : fractionDigits,
        maximumFractionDigits: notation === 'compact' ? (value >= 1000 ? 1 : 0) : fractionDigits,
      })}
    </span>
  );
};
