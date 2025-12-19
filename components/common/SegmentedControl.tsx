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

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  color?: string;
  size?: SegmentedControlSize;
  fullWidth?: boolean; // If true, buttons use flex-1 for equal width. If false, buttons use natural width.
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

export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  className = '',
  color = 'emerald',
  size = 'sm',
  fullWidth = true
}: SegmentedControlProps<T>) {
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
      className={`relative flex p-1 gap-1 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 isolate ${className}`}
    >
      {indicatorStyle && (
        <div 
          className={`absolute bg-white dark:bg-gray-700 rounded-lg pointer-events-none z-0 ${
            !isFirstRender.current ? 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''
          }`}
          style={{
            ...indicatorStyle,
            boxShadow: 'rgba(0, 0, 0, 0.09) 0px 3px 12px'
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
            className={`${fullWidth ? 'flex-1' : 'flex-none'} ${sizeClasses.button} rounded-lg font-bold transition-colors z-10 relative flex items-center justify-center gap-2 whitespace-nowrap ${
              isActive
                ? `text-${optionColor}-600 dark:text-${optionColor}-400`
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