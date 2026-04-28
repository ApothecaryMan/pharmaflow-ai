import type React from 'react';
import { useLayoutEffect, useRef } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  theme?: string;
  disabled?: boolean;
  activeColor?: string;
  animate?: boolean;
}

/**
 * Condensed "Native" Switch
 * All features preserved: RTL support, performance optimized, premium feel.
 */
export const Switch: React.FC<SwitchProps> = ({
  checked, onChange, className = '', theme = 'primary', disabled = false, activeColor, animate = true,
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const isFirst = useRef(true);
  const prevDir = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction;
    if (prevDir.current && prevDir.current !== dir) {
      el.dataset.dirChanging = 'true';
      setTimeout(() => el && (el.dataset.dirChanging = 'false'), 150);
    }
    prevDir.current = dir;
    if (isFirst.current) {
      el.dataset.settled = 'false';
      setTimeout(() => el && (el.dataset.settled = 'true'), 50);
      isFirst.current = false;
    }
  });

  const bg = checked && !activeColor ? (theme === 'primary' ? 'bg-primary-600' : `bg-${theme}-600`) : '';

  return (
    <button
      ref={ref} type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      data-checked={checked} data-settled="false" data-dir-changing="false"
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${checked ? bg : 'bg-gray-200 dark:bg-black/30 shadow-inner'} ${className} [--tx:0.25rem] data-[checked=true]:[--tx:1.5rem] [--tt:none] data-[settled=true]:data-[dir-changing=false]:[--tt:inset-inline-start_0.2s_cubic-bezier(0.4,0,0.2,1)]`}
      style={{ backgroundColor: checked ? activeColor : undefined }}
    >
      <span
        className="pointer-events-none absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-[var(--tt)] flex items-center justify-center"
        style={{ insetInlineStart: 'var(--tx)' }}
      >
        <svg className={`w-2.5 h-2.5 ${checked ? (activeColor ? '' : `text-${theme}-600`) : 'text-gray-400'}`} style={{ color: checked ? activeColor : undefined }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {checked ? <path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M6 18L18 6M6 6l12 12" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </span>
    </button>
  );
};
