import React, { useEffect, useRef, useMemo } from 'react';
import { useSettings } from '../../context';
import { useMotionValue, useSpring, motion, useTransform } from 'framer-motion';

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

  const y = useTransform(spring, (latest) => `-${latest * 10}%`);

  useEffect(() => {
    if (isDigit) spring.set(val);
  }, [val, isDigit, spring]);

  if (!isDigit) {
    return <span style={{ display: 'inline-block' }}>{char}</span>;
  }

  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        width: '1ch', 
        height: '1.2em', 
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
          willChange: 'transform',
        }}
      >
        {trackJSX}
      </motion.div>
    </span>
  );
});

/**
 * AnimatedCounterTest - High-performance counting animation.
 * Modes:
 * - countup: Standard Ticker animation using framer-motion spring driven DOM insertion.
 * - rolling: Physical Gear/Odometer style sliding digits using Framer Motion + GPU acceleration.
 */
export const AnimatedCounterTest = ({
  value,
  fractionDigits = 0,
  className = '',
  notation = 'standard',
  mode = 'countup',
}: AnimatedCounterTestProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const { numeralLocale } = useSettings();
  
  // PERFORMANCE: Cache the boolean instead of raw value to prevent 60fps re-evaluations
  const isCompactLarge = notation === 'compact' && value >= 1000;

  // DRY & PERFORMANCE: Centralize and heavily memoize format options
  const formatOptions = useMemo<Intl.NumberFormatOptions>(() => ({
    notation,
    minimumFractionDigits: notation === 'compact' ? (isCompactLarge ? 1 : 0) : fractionDigits,
    maximumFractionDigits: notation === 'compact' ? (isCompactLarge ? 1 : 0) : fractionDigits,
  }), [notation, isCompactLarge, fractionDigits]);
  
  // PERFORMANCE: Re-use a single formatter instance instead of calling toLocaleString repeatedly
  const formatter = useMemo(() => new Intl.NumberFormat(numeralLocale, formatOptions), [numeralLocale, formatOptions]);

  // --- ROLLING MODE HOOKS ---
  const formattedRollingValue = mode === 'rolling' 
    ? formatter.format(value)
    : '';
  
  // --- COUNTUP (TICKER) MODE HOOKS ---
  // Initialize with value directly to skip mount animation
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });

  useEffect(() => {
    if (mode === 'rolling') return;
    
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatter.format(Number(latest.toFixed(fractionDigits)));
      }
    });
    return () => unsubscribe();
  }, [springValue, fractionDigits, formatter, mode]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (mode === 'rolling') return;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    motionValue.set(value);
  }, [value, motionValue, mode]);

  // DRY: Unify the container rendering
  const baseClassName = `tabular-nums transition-colors ${className} ${
    mode === 'rolling' ? 'inline-flex' : 'inline-block tracking-wider'
  }`;

  return (
    <span
      ref={mode === 'countup' ? ref : null}
      dir="ltr"
      className={baseClassName}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
        whiteSpace: 'nowrap',
      }}
    >
      {mode === 'rolling' ? (
        formattedRollingValue.split('').reverse().map((char, revIndex) => {
          // biome-ignore lint/suspicious/noArrayIndexKey: keying by positional index ensures individual digit slots stay mounted during value change so their spring can animate
          return (
            <RollingDigit 
              key={revIndex} 
              char={char} 
            />
          );
        }).reverse()
      ) : (
        formatter.format(value)
      )}
    </span>
  );
};
