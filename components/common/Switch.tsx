import type React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  theme?: string;
  disabled?: boolean;
  activeColor?: string; // Hex color for checked state (bypasses tailwind safelist issues)
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  className = '',
  theme = 'primary',
  disabled = false,
  activeColor,
}) => {
  const containerRef = useRef<HTMLButtonElement>(null);
  const prevDir = useRef<string | null>(null);
  const [isRtlChange, setIsRtlChange] = useState(false);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    const currentDir = window.getComputedStyle(containerRef.current).direction;
    if (prevDir.current !== null && prevDir.current !== currentDir) {
      setIsRtlChange(true);
      setTimeout(() => setIsRtlChange(false), 100);
    }
    prevDir.current = currentDir;
  }); // Run on every render to catch layout shifts
  return (
    <button
      ref={containerRef}
      type='button'
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        WebkitAppearance: 'none',
        appearance: 'none',
        width: '48px',
        minWidth: '48px',
        height: '24px',
        minHeight: '24px',
        backgroundColor: checked && activeColor ? activeColor : undefined,
      }}
      className={`w-12 h-6 rounded-full relative ${isRtlChange ? '' : 'transition-colors duration-200 ease-in-out'} focus:outline-hidden ${
        checked ? (!activeColor ? (theme === 'primary' ? 'bg-primary-600' : `bg-${theme}-600`) : '') : 'bg-gray-200 shadow-inner dark:bg-black/30'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <div
        className={`absolute top-1 inset-s-1 w-4 h-4 rounded-full shadow-xs flex items-center justify-center ${
          checked 
            ? 'bg-gray-50 dark:bg-gray-200' 
            : 'bg-white dark:bg-(--bg-card) border border-transparent dark:border-(--border-divider)'
        } ${
          isRtlChange ? '' : 'transition-transform duration-200 ease-in-out'
        } ${
          checked ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
        }`}
      >
        {checked ? (
          <svg
            className={`w-3 h-3 ${!activeColor ? (theme === 'primary' ? 'text-primary-600' : `text-${theme}-600`) : ''}`}
            style={{ color: activeColor }}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='3' d='M5 13l4 4L19 7' />
          </svg>
        ) : (
          <svg
            className='w-3 h-3 text-gray-400 dark:text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='3'
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        )}
      </div>
    </button>
  );
};
