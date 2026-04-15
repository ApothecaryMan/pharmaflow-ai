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

import type React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface SegmentedControlOption<T> {
  label: string;
  value: T;
  icon?: string;
  dotColor?: string;
  activeColor?: string;
  count?: number | string;
  fontFamily?: string;
  disabled?: boolean;
}

type SegmentedControlSize = 'xs' | 'sm' | 'md' | 'lg';

type SegmentedControlShape = 'rounded-sm' | 'pill';

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
  shape?: SegmentedControlShape; // 'rounded-sm' (default) or 'pill' for circular style
  variant?: SegmentedControlVariant; // 'onCard' (default) or 'onPage' - controls dark mode background
  iconSize?: string; // Optional custom icon size variable (e.g., '--icon-sm')
  disableAnimation?: boolean; // If true, removes all transitions and animations
  dir?: 'ltr' | 'rtl'; // Support explicit direction override
}

const SIZE_CLASSES = {
  xs: {
    button: 'py-0.5 px-2 text-[11px] min-w-[28px] h-[26px]',
    iconSize: '--icon-xs', // 12px
  },
  sm: {
    button: 'py-1 px-3 text-[13px] min-w-[38px] h-[32px]',
    iconSize: '--icon-sm', // 14px
  },
  md: {
    button: 'py-1.5 px-4 text-sm min-w-[44px] h-[36px]',
    iconSize: '--icon-md', // 18px
  },
  lg: {
    button: 'py-2 px-5 text-base min-w-[50px] h-[44px]',
    iconSize: '--icon-lg', // 24px
  },
};


export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  className = '',
  color = 'emerald',
  size = 'sm',
  fullWidth = true,
  shape = 'rounded-sm',
  variant = 'onCard',
  iconSize,
  disableAnimation = false,
  dir,
}: SegmentedControlProps<T>) {
  const isPill = shape === 'pill';
  const containerRound = isPill ? 'rounded-full' : 'rounded-xl';
  const buttonRound = isPill ? 'rounded-full' : 'rounded-lg';
  const indicatorRound = isPill ? 'rounded-full' : 'rounded-lg';
  const darkBg = variant === 'onPage' ? 'dark:bg-gray-800' : 'dark:bg-gray-900';
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const prevDir = useRef<string | null>(null);
  const [isRtlChange, setIsRtlChange] = useState(false);

  const activeOption = options.find((o) => o.value === value);
  const activeColor = activeOption?.activeColor || color;
  const sizeClasses = SIZE_CLASSES[size];

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const container = containerRef.current;
      if (!container) return;

      const currentDir = window.getComputedStyle(container).direction;
      const isDirChange = prevDir.current !== null && prevDir.current !== currentDir;
      prevDir.current = currentDir;

      const activeSegment = container.querySelector<HTMLButtonElement>(
        `button[data-active="true"]`
      );

      if (activeSegment) {
        if (isDirChange) {
          setIsRtlChange(true);
        }

        const rect = {
          width: activeSegment.offsetWidth,
          height: activeSegment.offsetHeight,
          x: activeSegment.offsetLeft,
          y: activeSegment.offsetTop,
        };

        setIndicatorStyle({
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
        });

        if (isFirstRender.current) {
          requestAnimationFrame(() => {
            isFirstRender.current = false;
          });
        }

        if (isDirChange) {
          setTimeout(() => {
            setIsRtlChange(false);
          }, 100);
        }
      }
    };

    // Calculate immediately and also on next frame for safety
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);

    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
      cancelAnimationFrame(rafId);
    };
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      dir={dir}
      className={`relative flex p-1 gap-1 bg-gray-200/50 dark:bg-black/20 ${containerRound} shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] isolate ${className}`}
    >
      {indicatorStyle && (
        <div
          className={`absolute top-0 left-0 bg-white dark:bg-(--bg-card) border border-transparent dark:border-(--border-divider) ${indicatorRound} pointer-events-none z-0 ${
            !isFirstRender.current && !isRtlChange && !disableAnimation
              ? 'transition-[transform,width,height] duration-200 ease-out'
              : ''
          }`}
          style={{
            ...indicatorStyle,
            boxShadow: 'rgba(0, 0, 0, 0.09) 0px 3px 12px',
            willChange: 'transform, width, height',
          }}
        />
      )}

      {options.map((option) => {
        const isActive = value === option.value;
        const optionColor = option.activeColor || color;
        const hasIcon = !!option.icon;
        const hasDot = !!option.dotColor;
        const hasLabel = !!option.label;

        return (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            type='button'
            data-active={isActive}
            style={{ WebkitAppearance: 'none', appearance: 'none' }}
            disabled={option.disabled}
            className={`${fullWidth ? 'flex-1' : 'flex-none'} ${sizeClasses.button} ${buttonRound} z-10 relative flex items-center justify-center ${hasIcon && hasLabel ? 'gap-2' : 'gap-0'} whitespace-nowrap font-bold ${
              isActive
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
            } ${option.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            {hasIcon && (
              <span
                className='material-symbols-rounded'
                style={{ fontSize: `var(${iconSize || sizeClasses.iconSize})` }}
              >
                {option.icon}
              </span>
            )}
            {hasDot && (
              <div 
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: option.dotColor }}
              />
            )}
            {hasLabel && (
              <span style={option.fontFamily ? { fontFamily: option.fontFamily } : {}}>
                {option.label}
              </span>
            )}
            {option.count !== undefined && (
              <span
                className={`text-[10px] font-bold leading-none ms-1.5 ${
                  isActive
                    ? 'text-gray-900 dark:text-zinc-300'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                ({option.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
