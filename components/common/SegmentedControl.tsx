import type React from 'react';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { permissionsService, type PermissionAction } from '../../services/auth/permissions';

export interface SegmentedControlOption<T> {
  label: string; value: T; icon?: string; dotColor?: string; activeColor?: string;
  count?: number | string; fontFamily?: string; disabled?: boolean; permission?: PermissionAction;
}

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[]; value: T; onChange: (v: T) => void;
  className?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; fullWidth?: boolean;
  shape?: 'rounded-sm' | 'pill'; iconSize?: string; disableAnimation?: boolean;
  useGraphicFont?: boolean; dir?: 'ltr' | 'rtl';
}

const SIZES = {
  xs: { b: 'py-0.5 px-2 text-[11px] h-[26px]', i: '--icon-xs' },
  sm: { b: 'py-1 px-3 text-[13px] h-[32px]', i: '--icon-sm' },
  md: { b: 'py-1.5 px-4 text-sm h-[36px]', i: '--icon-md' },
  lg: { b: 'py-2 px-5 text-base h-[44px]', i: '--icon-lg' },
};

export function SegmentedControl<T extends string | number | boolean>({
  options, value, onChange, className = '', size = 'sm', fullWidth = true,
  shape = 'rounded-sm', iconSize, disableAnimation = false, useGraphicFont = false, dir,
}: SegmentedControlProps<T>) {
  const ref = useRef<HTMLDivElement>(null), isFirst = useRef(true), prevDir = useRef<string | null>(null);
  const filtered = useMemo(() => options.filter(o => !o.permission || permissionsService.can(o.permission)), [options]);

  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const upd = () => {
      const s = getComputedStyle(el), rtl = s.direction === 'rtl', act = el.querySelector<HTMLButtonElement>('button[data-active="true"]');
      if (!act) return;
      const { offsetWidth: w, offsetHeight: h, offsetLeft: l, offsetTop: t } = act;
      const x = rtl ? el.offsetWidth - (l + w) : l;
      el.style.setProperty('--iw', `${w}px`); el.style.setProperty('--ih', `${h}px`);
      el.style.setProperty('--ix', `${x}px`); el.style.setProperty('--it', `${t}px`);
      if (prevDir.current && prevDir.current !== s.direction) {
        el.dataset.dirChange = 'true'; setTimeout(() => el && (el.dataset.dirChange = 'false'), 150);
      }
      prevDir.current = s.direction;
      if (isFirst.current) {
        el.dataset.settled = 'false'; setTimeout(() => { if (el) el.dataset.settled = 'true'; isFirst.current = false; }, 50);
      }
    };
    const obs = new ResizeObserver(upd); obs.observe(el); el.querySelectorAll('button').forEach(b => obs.observe(b));
    upd(); return () => obs.disconnect();
  }, [value, filtered.length]);

  const pill = shape === 'pill', sz = SIZES[size];

  return (
    <div ref={ref} dir={dir} data-settled="false" data-dir-change="false"
      className={`relative flex p-1 gap-1 bg-gray-200/50 dark:bg-black/20 ${pill ? 'rounded-full' : 'rounded-xl'} shadow-inner isolate ${className} [--itn:none] data-[settled=true]:data-[dir-change=false]:[--itn:inset-inline-start_0.2s_ease-out,width_0.2s_ease-out,height_0.2s_ease-out,top_0.2s_ease-out]`}
    >
      <div className={`absolute bg-white dark:bg-(--bg-card) border border-transparent dark:border-(--border-divider) ${pill ? 'rounded-full' : 'rounded-lg'} z-0 shadow-sm ${disableAnimation ? '' : 'transition-[var(--itn)]'}`}
        style={{ width: 'var(--iw)', height: 'var(--ih)', top: 'var(--it)', insetInlineStart: 'var(--ix)' }} />
      {filtered.map((o) => (
        <button key={String(o.value)} onClick={() => onChange(o.value)} data-active={value === o.value} disabled={o.disabled}
          className={`${fullWidth ? 'flex-1' : ''} ${sz.b} ${pill ? 'rounded-full' : 'rounded-lg'} z-10 relative flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-colors ${value === o.value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:hover:text-white'} ${o.disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {o.icon && <span className="material-symbols-rounded" style={{ fontSize: `var(${iconSize || sz.i})` }}>{o.icon}</span>}
          {o.dotColor && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: o.dotColor }} />}
          {o.label && <span style={{ fontFamily: o.fontFamily || (useGraphicFont ? 'var(--page-title-font-family)' : undefined), fontSize: useGraphicFont ? '1.05em' : undefined }}>{o.label}</span>}
          {o.count !== undefined && <span className="text-[10px] opacity-70 ms-1">({o.count})</span>}
        </button>
      ))}
    </div>
  );
}
