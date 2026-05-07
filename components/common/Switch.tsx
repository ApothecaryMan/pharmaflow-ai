import { useLayoutEffect, useRef } from 'react';
import './Switch.css';
import { useSettings } from '../../context/SettingsContext';
import type { SwitchVariant } from '../../types';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  variant?: SwitchVariant;
  theme?: string;
  disabled?: boolean;
  activeColor?: string;
  animate?: boolean;
}

/**
 * Professional Switch Component
 * Supports multiple design variants while preserving core logic and accessibility.
 * Now using global settings for variant selection if not explicitly provided.
 */
export const Switch: React.FC<SwitchProps> = ({
  checked, 
  onChange, 
  className = '', 
  variant: propVariant,
  theme = 'primary', 
  disabled = false, 
  activeColor, 
  animate = true,
}) => {
  const { switchVariant: globalVariant, theme: currentTheme } = useSettings();
  const variant = propVariant || globalVariant || 'default';
  
  const ref = useRef<any>(null);
  const isFirst = useRef(true);
  const prevDir = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction;
    if (prevDir.current && prevDir.current !== dir) {
      el.dataset.dirChanging = 'true';
      setTimeout(() => {
        if (el) el.dataset.dirChanging = 'false';
      }, 150);
    }
    prevDir.current = dir;
    if (isFirst.current) {
      el.dataset.settled = 'false';
      setTimeout(() => {
        if (el) el.dataset.settled = 'true';
      }, 50);
      isFirst.current = false;
    }
  });

  const handleClick = () => {
    if (!disabled) onChange(!checked);
  };

  const dynamicStyle = {
    '--sw-active-color': activeColor || currentTheme.hex,
  } as React.CSSProperties;

  const commonProps = {
    onClick: handleClick,
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    tabIndex: disabled ? -1 : 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    }
  };

  // --- Variant Rendering ---

  if (variant === 'v1') {
    const bg = checked && !activeColor ? (theme === 'primary' ? 'bg-primary-600' : `bg-${theme}-600`) : '';
    return (
      <button
        {...commonProps}
        ref={ref}
        type="button" 
        data-checked={checked} 
        data-settled="false" 
        data-dir-changing="false"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${checked ? bg : 'bg-gray-200 dark:bg-black/30 shadow-inner'} ${className} [--tx:0.25rem] data-[checked=true]:[--tx:1.5rem] [--tt:none] data-[settled=true]:data-[dir-changing=false]:[--tt:inset-inline-start_0.2s_cubic-bezier(0.4,0,0.2,1)]`}
        style={{ ...dynamicStyle, backgroundColor: checked ? activeColor : undefined }}
      >
        <span
          className="pointer-events-none absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-[var(--tt)] flex items-center justify-center"
          style={{ insetInlineStart: 'var(--tx)' }}
        >
          <svg className={`w-2.5 h-2.5 ${checked ? (activeColor ? '' : `text-${theme}-600`) : 'text-gray-400'}`} style={{ color: checked ? activeColor : undefined }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            {checked ? <path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M6 18L18 6M6 6l12 12" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </span>
      </button>
    );
  }

  if (variant === 'ios') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s1-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="s1-thumb"></div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s3-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="s3-thumb"></div>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s4-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <svg className="s4-moon w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <div className="s4-thumb"></div>
        <svg className="s4-sun w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s5-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="s5-thumb"></div>
      </div>
    );
  }

  if (variant === 'squircle') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s6-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="s6-thumb"></div>
      </div>
    );
  }

  if (variant === 'slim') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s7-wrap ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="s7-track"></div>
        <div className="s7-thumb"></div>
      </div>
    );
  }

  if (variant === 'outline') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s8-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="s8-thumb"></div>
      </div>
    );
  }

  if (variant === 'segmented') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s9-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="s9-seg">OFF</div>
        <div className="s9-seg">ON</div>
      </div>
    );
  }

  if (variant === 'neon') {
    return (
      <div {...commonProps} ref={ref} style={dynamicStyle} className={`s10-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="s10-glow"></div>
        <div className="s10-thumb"></div>
      </div>
    );
  }

  // Default Variant (New Dark Design - previously default_v2)
  return (
    <div {...commonProps} ref={ref} style={dynamicStyle} className={`s2-track ${checked ? 'on' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="s2-thumb">
        <svg className="s2-check" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
};


