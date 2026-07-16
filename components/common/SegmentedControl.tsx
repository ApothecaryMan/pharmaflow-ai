import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePageHeader } from './PageHeader';
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
  disabled?: boolean;
  valueChangeEffect?: boolean;
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
  valueChangeEffect = false,
}: SegmentedControlProps<T>) {
  const pageHeaderCtx = usePageHeader();
  const effectivelyDisabled = disableAnimation || pageHeaderCtx.disableAnimation;
  const useAnimations = valueChangeEffect && !effectivelyDisabled;

  const ref = useRef<HTMLDivElement>(null);
  const fullWidthRef = useRef<number>(0);
  const changeLockRef = useRef(false);

  const [isCompact, setIsCompact] = useState(false);
  const [changedValue, setChangedValue] = useState<T | null>(null);
  const [indicator, setIndicator] = useState<{
    width: number;
    height: number;
    pos: number;
    top: number;
    rtl: boolean;
  } | null>(null);

  const filtered = useMemo(
    () => options.filter((o) => !o.permission || permissionsService.can(o.permission)),
    [options]
  );

  const handleChange = useCallback(
    (newValue: T) => {
      if (newValue === value || changeLockRef.current) return;
      changeLockRef.current = true;
      setChangedValue(newValue);
      onChange(newValue);
      setTimeout(() => {
        setChangedValue(null);
        changeLockRef.current = false;
      }, 500);
    },
    [value, onChange]
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

      const act = el.querySelector<HTMLButtonElement>('button[data-active="true"]');
      if (!act) return;
      const { offsetWidth: w, offsetHeight: h, offsetLeft: l, offsetTop: t } = act;
      const rtl = getComputedStyle(el).direction === 'rtl';
      const pos = rtl ? el.clientWidth - (l + w) : l;
      setIndicator({ width: w, height: h, pos, top: t, rtl });
    };
    const obs = new ResizeObserver(upd);
    obs.observe(el);
    if (el.parentElement) obs.observe(el.parentElement);
    el.querySelectorAll('button').forEach((b) => obs.observe(b));
    upd();

    const dirObserver = new MutationObserver(() => upd());
    dirObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir'],
    });

    return () => {
      obs.disconnect();
      dirObserver.disconnect();
    };
  }, [isCompact, value]);

  const pill = shape === 'pill';
  const sz = SIZES[size];

  return (
    <div
      ref={ref}
      dir={dir}
      className={`relative flex p-1 gap-1 bg-gray-100 dark:bg-gray-900 custom-card-css-target no-padding ${pill ? 'rounded-full' : 'rounded-xl'} shadow-[inset_0_1px_3px_0_rgb(0_0_0/0.12)] isolate ${className}`}
    >
      {indicator && (
        <motion.div
          initial={false}
          className={`absolute bg-white dark:bg-(--bg-card) border border-transparent dark:border-(--border-divider) custom-card-css-target no-padding ${pill ? 'rounded-full' : 'rounded-lg'} z-0 shadow-sm`}
          animate={
            indicator.rtl
              ? { width: indicator.width, height: indicator.height, right: indicator.pos, top: indicator.top }
              : { width: indicator.width, height: indicator.height, left: indicator.pos, top: indicator.top }
          }
          transition={
            useAnimations && changedValue
              ? { type: 'tween', duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
              : { type: 'tween', duration: 0.2, ease: 'easeOut' }
          }
        />
      )}
      {filtered.map((o) => {
        const isChanging = valueChangeEffect && changedValue === o.value;
        const isActive = value === o.value;

        const btnClass = `${fullWidth ? 'flex-1' : ''} ${sz.b} ${pill ? 'rounded-full' : 'rounded-lg'} z-10 relative flex items-center justify-center gap-2 whitespace-nowrap font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'} ${disabled || o.disabled ? 'pointer-events-none' : ''}`;

        return (
          <motion.button
            key={String(o.value)}
            type='button'
            data-value={String(o.value)}
            onClick={() => (valueChangeEffect ? handleChange(o.value) : onChange(o.value))}
            data-active={isActive ? 'true' : undefined}
            disabled={disabled || o.disabled}
            whileTap={useAnimations ? { scale: 0.93 } : undefined}
            className={btnClass}
          >
            {o.icon && (
              <motion.span
                className='material-symbols-rounded'
                style={{ fontSize: `var(${iconSize || sz.i})` }}
                animate={isChanging ? { scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] } : undefined}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {o.icon}
              </motion.span>
            )}
            {o.dotColor && (
              <span className='relative flex h-2.5 w-2.5'>
                {o.pulseDot && (
                  <motion.span
                    className='absolute inline-flex h-full w-full rounded-full'
                    style={{ backgroundColor: o.dotColor }}
                    animate={isChanging ? { scale: [1, 1.3, 1], opacity: [0.75, 0.25, 0.75] } : { scale: 1, opacity: 0.75 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
                <span
                  className='relative inline-flex rounded-full h-2.5 w-2.5'
                  style={{ backgroundColor: o.dotColor }}
                />
              </span>
            )}
            {o.label && (
              <motion.span
                className={o.icon && value !== o.value && isCompact ? 'hidden' : ''}
                style={{
                  fontFamily:
                    o.fontFamily || (useGraphicFont ? 'var(--page-title-font-family)' : undefined),
                  fontSize: useGraphicFont ? '1.05em' : undefined,
                }}
                animate={isChanging ? { y: [0, -1, 0] } : {}}
                transition={{ duration: 0.35 }}
              >
                {o.label}
              </motion.span>
            )}
            {o.count !== undefined && (
              <span
                className={`text-[10px] opacity-70 ms-1 ${o.icon && value !== o.value && isCompact ? 'hidden' : ''}`}
              >
                ({o.count})
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
