import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type PermissionAction, permissionsService } from '../../services/auth/permissionsService';

export interface SegmentedControlOption<T> {
  label: string;
  value: T;
  icon?: string;
  dotColor?: string;
  pulseDot?: boolean;
  activeColor?: string;
  count?: number | string;
  fontFamily?: string;
  disabled?: boolean;
  permission?: PermissionAction;
}

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  shape?: 'rounded-sm' | 'pill';
  iconSize?: string;
  disableAnimation?: boolean;
  useGraphicFont?: boolean;
  dir?: 'ltr' | 'rtl';
  /** When true, disables all options in the control */
  disabled?: boolean;
}

const SIZES = {
  xs: { b: 'py-0.5 px-2 text-[11px] h-[26px]', i: '--icon-xs' },
  sm: { b: 'py-1 px-3 text-[13px] h-[32px]', i: '--icon-sm' },
  md: { b: 'py-1.5 px-4 text-sm h-[36px]', i: '--icon-md' },
  lg: { b: 'py-2 px-5 text-base h-[44px]', i: '--icon-lg' },
};

export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  className = '',
  size = 'sm',
  fullWidth = true,
  shape = 'rounded-sm',
  iconSize,
  disableAnimation = false,
  useGraphicFont = false,
  dir,
  disabled = false,
}: SegmentedControlProps<T>) {
  const ref = useRef<HTMLDivElement>(null),
    isFirst = useRef(true),
    prevDir = useRef<string | null>(null),
    fullWidthRef = useRef<number>(0);

  const [isCompact, setIsCompact] = useState(false);

  const filtered = useMemo(
    () => options.filter((o) => !o.permission || permissionsService.can(o.permission)),
    [options]
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => {
      const parent = el.parentElement;
      if (parent) {
        if (!isCompact) {
          if (el.scrollWidth > parent.clientWidth + 5) {
            fullWidthRef.current = el.scrollWidth;
            setIsCompact(true);
          }
        } else {
          if (parent.clientWidth > fullWidthRef.current + 10) {
            setIsCompact(false);
          }
        }
      }

      const s = getComputedStyle(el),
        rtl = s.direction === 'rtl',
        act = el.querySelector<HTMLButtonElement>('button[data-active="true"]');
      if (!act) return;
      const { offsetWidth: w, offsetHeight: h, offsetLeft: l, offsetTop: t } = act;
      const x = rtl ? el.clientWidth - (l + w) : l;
      el.style.setProperty('--iw', `${w}px`);
      el.style.setProperty('--ih', `${h}px`);
      el.style.setProperty('--ix', `${x}px`);
      el.style.setProperty('--it', `${t}px`);
      if (prevDir.current && prevDir.current !== s.direction) {
        el.dataset.dirChange = 'true';
        // biome-ignore lint/suspicious/noAssignInExpressions: intentional short-circuit
        setTimeout(() => el && (el.dataset.dirChange = 'false'), 150);
      }
      prevDir.current = s.direction;
      if (isFirst.current) {
        el.dataset.settled = 'false';
        setTimeout(() => {
          if (el) el.dataset.settled = 'true';
          isFirst.current = false;
        }, 50);
      }
    };
    const obs = new ResizeObserver(upd);
    obs.observe(el);
    if (el.parentElement) obs.observe(el.parentElement);
    el.querySelectorAll('button').forEach((b) => obs.observe(b));
    upd();
    return () => obs.disconnect();
  }, [isCompact]);

  const pill = shape === 'pill',
    sz = SIZES[size];

  return (
    <div
      ref={ref}
      dir={dir}
      data-settled='false'
      data-dir-change='false'
      className={`relative flex p-1 gap-1 bg-gray-100 dark:bg-gray-900 custom-card-css-target no-padding ${pill ? 'rounded-full' : 'rounded-xl'} shadow-[inset_0_1px_3px_0_rgb(0_0_0/0.12)] isolate ${className} [--itn:none] data-[settled=true]:data-[dir-change=false]:[--itn:inset-inline-start_0.2s_ease-out,width_0.2s_ease-out,height_0.2s_ease-out,top_0.2s_ease-out]`}
    >
      <div
        className={`absolute bg-white dark:bg-(--bg-card) border border-transparent dark:border-(--border-divider) custom-card-css-target no-padding ${pill ? 'rounded-full' : 'rounded-lg'} z-0 shadow-sm ${disableAnimation ? '' : 'transition-[var(--itn)]'}`}
        style={{
          width: 'var(--iw)',
          height: 'var(--ih)',
          top: 'var(--it)',
          insetInlineStart: 'var(--ix)',
        }}
      />
      {filtered.map((o) => (
        <button
          key={String(o.value)}
          type='button'
          data-value={String(o.value)}
          onClick={() => onChange(o.value)}
          data-active={value === o.value}
          disabled={disabled || o.disabled}
          className={`${fullWidth ? 'flex-1' : ''} ${sz.b} ${pill ? 'rounded-full' : 'rounded-lg'} z-10 relative flex items-center justify-center gap-2 whitespace-nowrap font-bold ${value === o.value ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'} ${disabled || o.disabled ? 'pointer-events-none' : ''}`}
        >
          {o.icon && (
            <span
              className='material-symbols-rounded'
              style={{ fontSize: `var(${iconSize || sz.i})` }}
            >
              {o.icon}
            </span>
          )}
          {o.dotColor && (
            <span className='relative flex h-2.5 w-2.5'>
              {o.pulseDot && (
                <span
                  className='animate-ping absolute inline-flex h-full w-full rounded-full opacity-75'
                  style={{ backgroundColor: o.dotColor }}
                />
              )}
              <span
                className='relative inline-flex rounded-full h-2.5 w-2.5'
                style={{ backgroundColor: o.dotColor }}
              />
            </span>
          )}
          {o.label && (
            <span
              className={o.icon && value !== o.value && isCompact ? 'hidden' : ''}
              style={{
                fontFamily:
                  o.fontFamily || (useGraphicFont ? 'var(--page-title-font-family)' : undefined),
                fontSize: useGraphicFont ? '1.05em' : undefined,
              }}
            >
              {o.label}
            </span>
          )}
          {o.count !== undefined && (
            <span
              className={`text-[10px] opacity-70 ms-1 ${o.icon && value !== o.value && isCompact ? 'hidden' : ''}`}
            >
              ({o.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
