import React, { useEffect, useRef } from 'react';
import { useSettings } from '../../context';
import { useInView, useMotionValue, useSpring, motion, useTransform } from 'framer-motion';

interface AnimatedCounterTestProps {
  value: number;
  fractionDigits?: number;
  className?: string;
  duration?: number;
  notation?: 'standard' | 'compact';
  direction?: 'up' | 'down';
  delay?: number;
  mode?: 'countup' | 'rolling';
}

const NUMBERS_EN = '0123456789'.split('');
const NUMBERS_AR = '٠١٢٣٤٥٦٧٨٩'.split('');

// Pre-compute the static JSX tracks to prevent creating thousands of spans every second
const createTrackJSX = (track: string[]) => track.map((digit) => (
  <span 
    key={digit} 
    style={{ 
      height: '1.2em', 
      lineHeight: '1.2em', 
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    {digit}
  </span>
));

const TRACK_JSX_EN = createTrackJSX(NUMBERS_EN);
const TRACK_JSX_AR = createTrackJSX(NUMBERS_AR);

const RollingDigit = React.memo(({ char }: { char: string }) => {
  let val = NUMBERS_EN.indexOf(char);
  let trackJSX = TRACK_JSX_EN;
  
  if (val === -1) {
    val = NUMBERS_AR.indexOf(char);
    trackJSX = TRACK_JSX_AR;
  }

  const isDigit = val !== -1;

  // Use a highly optimized framer-motion spring for flawless physics
  const spring = useSpring(isDigit ? val : 0, {
    stiffness: 250,
    damping: 25,
    mass: 0.5,
  });

  // Calculate percentage translation unconditionally to satisfy React hooks rule
  const y = useTransform(spring, (latest) => `-${latest * 10}%`);

  useEffect(() => {
    if (isDigit) {
      spring.set(val);
    }
  }, [val, isDigit, spring]);

  if (!isDigit) {
    return <span style={{ display: 'inline-block' }}>{char}</span>;
  }

  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        width: '1ch', 
        height: '1.2em', // Slightly taller to prevent cutoff/cropping
        overflow: 'hidden', 
        position: 'relative',
        verticalAlign: 'bottom',
      }}
    >
      <motion.div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          y,
        }}
      >
        {trackJSX}
      </motion.div>
    </span>
  );
});

export const AnimatedCounterTest = ({
  value,
  fractionDigits = 0,
  className = '',
  duration = 1.2,
  notation = 'standard',
  direction = 'up',
  delay = 0,
  mode = 'countup',
}: AnimatedCounterTestProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const { numeralLocale } = useSettings();
  
  // --- ROLLING MODE HOOKS ---
  // Use value directly. useDeferredValue causes visible skipping/stalling during rapid scrub.
  const formattedRollingValue = value.toLocaleString(numeralLocale, {
    notation,
    minimumFractionDigits: notation === 'compact' ? (value >= 1000 ? 1 : 0) : fractionDigits,
    maximumFractionDigits: notation === 'compact' ? (value >= 1000 ? 1 : 0) : fractionDigits,
  });
  
  // --- COUNTUP (TICKER) MODE HOOKS ---
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (mode === 'countup' && isInView) {
      setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, delay, value, direction, mode]);

  useEffect(() => {
    if (mode === 'rolling') return;
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
  }, [springValue, fractionDigits, notation, numeralLocale, value, mode]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (mode === 'rolling') return;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    motionValue.set(value);
  }, [value, motionValue, mode]);

  // --- RENDER ---
  if (mode === 'rolling') {
    const chars = formattedRollingValue.split('');
    return (
      <span
        dir="ltr"
        className={`tabular-nums inline-flex transition-colors ${className}`}
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum"',
          whiteSpace: 'nowrap',
        }}
      >
        {[...chars].reverse().map((char, revIndex) => (
          <RollingDigit 
            key={revIndex} 
            char={char} 
          />
        )).reverse()}
      </span>
    );
  }

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
