import React, { useEffect, useRef } from 'react';
import { useSettings } from '../../context';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

interface AnimatedCounterTestProps {
  value: number;
  fractionDigits?: number;
  className?: string;
  duration?: number;
  notation?: 'standard' | 'compact';
  mode?: 'countup' | 'rolling'; // Kept for backward compatibility
  direction?: 'up' | 'down';
  delay?: number;
}

export const AnimatedCounterTest = ({
  value,
  fractionDigits = 0,
  className = '',
  duration = 1.2,
  notation = 'standard',
  direction = 'up',
  delay = 0,
}: AnimatedCounterTestProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const { numeralLocale } = useSettings();
  
  // Flawless Magic UI NumberTicker Architecture
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat(numeralLocale, {
          notation,
          minimumFractionDigits: notation === 'compact' ? (value >= 1000 ? 1 : 0) : fractionDigits,
          maximumFractionDigits: notation === 'compact' ? (value >= 1000 ? 1 : 0) : fractionDigits,
        }).format(Number(latest.toFixed(fractionDigits)));
      }
    });
    return () => unsubscribe();
  }, [springValue, fractionDigits, notation, numeralLocale, value]);

  // Handle immediate slider updates flawlessly by skipping the initial delay
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    motionValue.set(value);
  }, [value, motionValue]);

  return (
    <span
      ref={ref}
      dir="ltr"
      className={`tabular-nums inline-block tracking-wider ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
        whiteSpace: 'nowrap',
      }}
    />
  );
};
