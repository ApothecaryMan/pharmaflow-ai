/**
 * SegmentedControl Component
 * 
 * A modern, animated segmented control with sliding indicator.
 * 
 * @example
 * ```tsx
 * <SegmentedControl
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   options={[
 *     { label: 'Option 1', value: 'opt1' },
 *     { label: 'Option 2', value: 'opt2', activeColor: 'blue' }
 *   ]}
 *   size="md"
 *   color="emerald"
 * />
 * ```
 * 
 * SIZE GUIDE:
 * - xs: Compact size for tight spaces (py-1, text-xs, icon-16px)
 *   Use in: Filters, compact toolbars, mobile headers
 * 
 * - sm: Small size for secondary controls (py-1.5, text-sm, icon-18px) [DEFAULT]
 *   Use in: Settings panels, sidebars, secondary navigation
 * 
 * - md: Medium size for primary controls (py-2, text-base, icon-20px)
 *   Use in: Main forms, primary navigation, modal dialogs
 * 
 * - lg: Large size for prominent controls (py-2.5, text-lg, icon-22px)
 *   Use in: Hero sections, landing pages, call-to-action areas
 */

import React, { useEffect, useRef, useState } from 'react';

interface SegmentedControlOption<T> {
  label: string;
  value: T;
  icon?: string;
  activeColor?: string;
}

type SegmentedControlSize = 'xs' | 'sm' | 'md' | 'lg';

type SegmentedControlShape = 'rounded' | 'pill';

// Variant controls the dark mode background:
// 'onCard' (default): Use when on gray-800 card backgrounds -> container uses dark:bg-gray-900
// 'onPage': Use when on gray-900 page backgrounds -> container uses dark:bg-gray-800
type SegmentedControlVariant = 'onCard' | 'onPage';

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  color?: string;
  size?: SegmentedControlSize;
  fullWidth?: boolean; // If true, buttons use flex-1 for equal width. If false, buttons use natural width.
  shape?: SegmentedControlShape; // 'rounded' (default) or 'pill' for circular style
  variant?: SegmentedControlVariant; // 'onCard' (default) or 'onPage' - controls dark mode background
}

const SIZE_CLASSES = {
  xs: {
    button: 'py-1 px-2 text-xs',
    icon: 'text-[16px]'
  },
  sm: {
    button: 'py-1.5 px-3 text-sm',
    icon: 'text-[18px]'
  },
  md: {
    button: 'py-2.5 px-4 text-base',
    icon: 'text-[20px]'
  },
  lg: {
    button: 'py-3 px-5 text-lg',
    icon: 'text-[22px]'
  }
};

// Color map for pill indicator since Tailwind doesn't support dynamic class names
const PILL_COLOR_MAP: Record<string, string> = {
  emerald: '#059669',
  green: '#16a34a',
  blue: '#2563eb',
  indigo: '#4f46e5',
  purple: '#9333ea',
  pink: '#db2777',
  red: '#dc2626',
  orange: '#ea580c',
  amber: '#d97706',
  yellow: '#ca8a04',
  teal: '#0d9488',
  cyan: '#0891b2',
  sky: '#0284c7',
  gray: '#4b5563'
};

export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  className = '',
  color = 'emerald',
  size = 'sm',
  fullWidth = true,
  shape = 'rounded',
  variant = 'onCard'
}: SegmentedControlProps<T>) {
  const isPill = shape === 'pill';
  const containerRound = isPill ? 'rounded-full' : 'rounded-xl';
  const buttonRound = isPill ? 'rounded-full' : 'rounded-lg';
  const indicatorRound = isPill ? 'rounded-full' : 'rounded-lg';
  const darkBg = variant === 'onPage' ? 'dark:bg-gray-800' : 'dark:bg-gray-900';
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  
  const activeOption = options.find(o => o.value === value);
  const activeColor = activeOption?.activeColor || color;
  const sizeClasses = SIZE_CLASSES[size];

  useEffect(() => {
    const updateIndicator = () => {
      const container = containerRef.current;
      if (!container) return;

      const activeSegment = container.querySelector<HTMLButtonElement>(`button[data-active="true"]`);
      
      if (activeSegment) {
        setIndicatorStyle({
          width: activeSegment.offsetWidth,
          height: activeSegment.offsetHeight,
          top: activeSegment.offsetTop,
          left: activeSegment.offsetLeft
        });
        
        isFirstRender.current = false;
      }
    };

    requestAnimationFrame(() => {
      updateIndicator();
    });

    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [value, options]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex p-1 gap-1 bg-gray-200/50 dark:bg-gray-700/50 ${containerRound} isolate ${className}`}
    >
      {indicatorStyle && (
        <div 
          className={`absolute ${isPill ? '' : 'bg-white dark:bg-gray-700'} ${indicatorRound} pointer-events-none z-0 ${
            !isFirstRender.current ? 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''
          }`}
          style={{
            ...indicatorStyle,
            boxShadow: isPill ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' : 'rgba(0, 0, 0, 0.09) 0px 3px 12px',
            backgroundColor: isPill ? (PILL_COLOR_MAP[color] || '#059669') : undefined
          }}
        />
      )}

      {options.map((option) => {
        const isActive = value === option.value;
        const optionColor = option.activeColor || color;
        return (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            type="button"
            data-active={isActive}
            style={{ WebkitAppearance: 'none', appearance: 'none' }}
            className={`${fullWidth ? 'flex-1' : 'flex-none'} ${sizeClasses.button} ${buttonRound} transition-colors z-10 relative flex items-center justify-center gap-2 whitespace-nowrap ${
              isPill 
                ? (isActive ? 'font-bold' : 'font-medium') 
                : 'font-bold'
            } ${
              isActive
                ? isPill 
                  ? 'text-white' 
                  : 'text-gray-900 dark:text-white'
                : isPill
                  ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50'
            }`}
          >
            {option.icon && (
              <span className={`material-symbols-rounded ${sizeClasses.icon}`}>{option.icon}</span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}