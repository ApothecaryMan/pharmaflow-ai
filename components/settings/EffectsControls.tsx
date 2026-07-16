import React, { useCallback, useMemo, type FC } from 'react';
import { PillSlider } from '../common/PillSlider';
import { Switch } from '../common/Switch';

const gradientPct = (val: number, min: number, max: number) =>
  ((val - min) / (max - min || 1)) * 100;

function splitTopLevel(str: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function tokenize(str: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (current) {
        out.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) out.push(current);
  return out;
}

const isLength = (t: string) => /^-?\d+(\.\d+)?(px|rem|em)?$/.test(t);

const ColorField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  className?: string;
}> = ({ value, onChange, className = '' }) => (
  <div
    className={`flex items-center bg-(--bg-input) border border-(--border-divider) rounded-lg p-1 px-2 gap-2 ${className}`}
  >
    <input
      type='color'
      value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#000000'}
      onChange={(e) => onChange(e.target.value)}
      className='w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0'
    />
    <input
      type='text'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder='rgba(0,0,0,.15)'
      className='flex-1 min-w-0 bg-transparent text-[11px] font-mono text-(--text-primary) outline-hidden'
    />
  </div>
);

const MiniSlider: React.FC<{
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, min, max, step = 1, value, unit = '', onChange }) => (
  <div className='flex items-center justify-between gap-2'>
    <span className='text-[10px] font-medium text-(--text-tertiary) w-14 shrink-0'>{label}</span>
    <PillSlider
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className='flex-1'
      formatValue={(v) => `${v}${unit}`}
      backgroundStyle={{
        background: `linear-gradient(to right, var(--primary-500) ${gradientPct(value, min, max)}%, transparent ${gradientPct(value, min, max)}%)`,
      }}
    />
  </div>
);

interface ShadowLayer {
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}

const DEFAULT_LAYER: ShadowLayer = {
  inset: false,
  x: 0,
  y: 4,
  blur: 12,
  spread: 0,
  color: 'rgba(15, 23, 42, 0.18)',
};

function parseShadowLayer(raw: string): ShadowLayer {
  const tokens = tokenize(raw);
  let inset = false;
  const lengths: number[] = [];
  let color = '';
  for (const t of tokens) {
    if (/^inset$/i.test(t)) {
      inset = true;
      continue;
    }
    if (isLength(t)) {
      lengths.push(parseFloat(t));
      continue;
    }
    if (!color) color = t;
  }
  const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
  return { inset, x, y, blur, spread, color: color || DEFAULT_LAYER.color };
}

function formatShadowLayer(l: ShadowLayer): string {
  return `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color}`;
}

export const ShadowBuilder: FC<{ value: string; onChange: (v: string) => void }> = React.memo(({
  value,
  onChange,
}) => {
  const layers = useMemo<ShadowLayer[]>(() => {
    const raw = (value || '').trim();
    if (!raw) return [];
    return splitTopLevel(raw, ',').map(parseShadowLayer);
  }, [value]);

  const commit = useCallback(
    (next: ShadowLayer[]) => {
      onChange(next.map(formatShadowLayer).join(', '));
    },
    [onChange]
  );

  const updateLayer = (idx: number, patch: Partial<ShadowLayer>) => {
    const next = layers.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    commit(next);
  };

  const addLayer = () => commit([...layers, { ...DEFAULT_LAYER }]);
  const removeLayer = (idx: number) => commit(layers.filter((_, i) => i !== idx));

  return (
    <div className='space-y-2'>
      <div className='h-16 rounded-lg bg-[repeating-conic-gradient(#00000008_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] flex items-center justify-center'>
        <div
          className='w-20 h-9 rounded-lg bg-(--bg-card)'
          style={{ boxShadow: value || 'none' }}
        />
      </div>

      {layers.length === 0 && (
        <p className='text-[10px] text-(--text-tertiary) italic'>No shadow layers yet.</p>
      )}

      {layers.map((layer, idx) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: layers have no stable id
          key={`layer-${idx}`}
          className='rounded-lg border border-(--border-divider) bg-(--bg-input)/40 p-2.5 space-y-2'
        >
          <div className='flex items-center justify-between'>
            <span className='text-[10px] font-bold text-(--text-secondary)'>Layer {idx + 1}</span>
            <div className='flex items-center gap-2'>
              <span className='text-[10px] text-(--text-tertiary)'>Inset</span>
              <Switch
                checked={layer.inset}
                onChange={(checked) => updateLayer(idx, { inset: checked })}
              />
              <button
                onClick={() => removeLayer(idx)}
                className='w-5 h-5 rounded hover:bg-red-500/10 text-red-500 flex items-center justify-center'
                title='Remove layer'
                type='button'
              >
                <span className='material-symbols-rounded text-[13px]'>close</span>
              </button>
            </div>
          </div>

          <MiniSlider
            label='X'
            min={-50}
            max={50}
            value={layer.x}
            unit='px'
            onChange={(v) => updateLayer(idx, { x: v })}
          />
          <MiniSlider
            label='Y'
            min={-50}
            max={50}
            value={layer.y}
            unit='px'
            onChange={(v) => updateLayer(idx, { y: v })}
          />
          <MiniSlider
            label='Blur'
            min={0}
            max={100}
            value={layer.blur}
            unit='px'
            onChange={(v) => updateLayer(idx, { blur: v })}
          />
          <MiniSlider
            label='Spread'
            min={-50}
            max={50}
            value={layer.spread}
            unit='px'
            onChange={(v) => updateLayer(idx, { spread: v })}
          />

          <div className='flex items-center gap-2'>
            <span className='text-[10px] font-medium text-(--text-tertiary) w-14 shrink-0'>
              Color
            </span>
            <ColorField
              value={layer.color}
              onChange={(v) => updateLayer(idx, { color: v })}
              className='flex-1'
            />
          </div>
        </div>
      ))}

      <button
        onClick={addLayer}
        className='w-full text-[11px] font-semibold text-primary-500 border border-dashed border-primary-500/40 rounded-lg py-1.5 hover:bg-primary-500/5 transition-colors flex items-center justify-center gap-1'
        type='button'
      >
        <span className='material-symbols-rounded text-[14px]'>add</span>
        Add Shadow Layer
      </button>
    </div>
  );
});

interface FilterFnDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit: string;
  offValue: number;
}

const FILTER_FUNCTIONS: FilterFnDef[] = [
  { key: 'blur', label: 'Blur', min: 0, max: 40, unit: 'px', offValue: 4 },
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%', offValue: 100 },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%', offValue: 100 },
  { key: 'saturate', label: 'Saturate', min: 0, max: 300, unit: '%', offValue: 150 },
  { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, unit: '%', offValue: 100 },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%', offValue: 100 },
  { key: 'invert', label: 'Invert', min: 0, max: 100, unit: '%', offValue: 100 },
  { key: 'hue-rotate', label: 'Hue Rotate', min: 0, max: 360, unit: 'deg', offValue: 90 },
];

function parseFilterString(raw: string): Record<string, number> {
  const map: Record<string, number> = {};
  const re = /([\w-]+)\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
  while ((m = re.exec(raw || ''))) {
    map[m[1]] = parseFloat(m[2]);
  }
  return map;
}

function formatFilterString(map: Record<string, number>): string {
  return FILTER_FUNCTIONS.filter((f) => map[f.key] !== undefined)
    .map((f) => `${f.key}(${map[f.key]}${f.unit})`)
    .join(' ');
}

export const FilterBuilder: FC<{
  value: string;
  onChange: (v: string) => void;
  backdrop?: boolean;
}> = React.memo(({ value, onChange, backdrop = false }) => {
  const active = useMemo(() => parseFilterString(value), [value]);

  const toggle = (fn: FilterFnDef, on: boolean) => {
    const next = { ...active };
    if (on) next[fn.key] = fn.offValue;
    else delete next[fn.key];
    onChange(formatFilterString(next));
  };

  const setVal = (fn: FilterFnDef, v: number) => {
    onChange(formatFilterString({ ...active, [fn.key]: v }));
  };

  return (
    <div className='space-y-2'>
      <div className='relative h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary-500 via-fuchsia-500 to-amber-400'>
        {backdrop ? (
          <div
            className='absolute inset-0 flex items-center justify-center'
            style={{ backdropFilter: value || 'none', WebkitBackdropFilter: value || 'none' }}
          >
            <span className='text-[10px] font-bold text-white/90 drop-shadow'>Backdrop</span>
          </div>
        ) : (
          <div
            className='absolute inset-0 flex items-center justify-center'
            style={{ filter: value || 'none' }}
          >
            <span className='text-[10px] font-bold text-white/90'>Preview</span>
          </div>
        )}
      </div>

      <div className='space-y-1.5'>
        {FILTER_FUNCTIONS.map((fn) => {
          const isOn = active[fn.key] !== undefined;
          return (
            <div key={fn.key} className='flex items-center gap-2'>
              <Switch checked={isOn} onChange={(checked) => toggle(fn, checked)} />
              <span
                className={`text-[10px] font-medium w-16 shrink-0 ${isOn ? 'text-(--text-primary)' : 'text-(--text-tertiary)'}`}
              >
                {fn.label}
              </span>
              <div className={`flex-1 ${isOn ? '' : 'opacity-30 pointer-events-none'}`}>
                <PillSlider
                  min={fn.min}
                  max={fn.max}
                  step={fn.step || 1}
                  value={isOn ? active[fn.key] : fn.offValue}
                  onChange={(v) => setVal(fn, v)}
                  className='w-full'
                  formatValue={(v) => `${v}${fn.unit}`}
                  backgroundStyle={{
                    background: `linear-gradient(to right, var(--primary-500) ${gradientPct(isOn ? active[fn.key] : fn.offValue, fn.min, fn.max)}%, transparent ${gradientPct(isOn ? active[fn.key] : fn.offValue, fn.min, fn.max)}%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const BLEND_MODES = [
  '',
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
];

export const BlendModePicker: FC<{ value: string; onChange: (v: string) => void }> = React.memo(({
  value,
  onChange,
}) => (
  <div className='grid grid-cols-3 gap-1.5'>
    {BLEND_MODES.map((mode) => {
      const isActive = (value || '') === mode;
      return (
        <button
          key={mode || 'default'}
          onClick={() => onChange(mode)}
          className={`relative rounded-lg overflow-hidden border h-11 flex items-end justify-center transition-colors ${
            isActive
              ? 'border-primary-500 ring-1 ring-primary-500'
              : 'border-(--border-divider) hover:border-primary-500/40'
          }`}
          type='button'
        >
          <div className='absolute inset-0 bg-gradient-to-br from-rose-500 to-sky-500' />
          <div
            className='absolute w-6 h-6 rounded-full bg-amber-400 -translate-y-0.5'
            style={{ mixBlendMode: (mode || 'normal') as React.CSSProperties['mixBlendMode'] }}
          />
          <span className='relative z-10 text-[8px] font-semibold text-white bg-black/40 w-full text-center py-0.5 truncate px-0.5'>
            {mode || 'default'}
          </span>
        </button>
      );
    })}
  </div>
));
