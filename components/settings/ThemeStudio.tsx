import React, { useCallback, useMemo } from 'react';
import { useUI } from '../../context/UIContext';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { CARD_BASE } from '../../utils/themeStyles';
import { CustomCssEditor } from '../common/CustomCssEditor';
import { Switch } from '../common/Switch';

type CssPropMap = Record<string, string>;

const SHADOW_PRESETS: Record<string, string> = {
  none: '',
  subtle: '0px 1px 3px rgba(0,0,0,0.12)',
  medium: '0px 4px 12px rgba(0,0,0,0.15)',
  heavy: '0px 8px 24px rgba(0,0,0,0.2)',
};

const cssToProps = (css: string): CssPropMap => {
  const props: CssPropMap = {};
  css.split(';').forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed.includes(':')) return;
    const colonIdx = trimmed.indexOf(':');
    const name = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim().replace(/\s*!important\s*$/i, '').trim();
    if (name) props[name] = value;
  });
  return props;
};

const propsToCss = (props: CssPropMap): string => {
  return Object.entries(props)
    .map(([name, value]) => value ? `${name}: ${value}` : '')
    .filter(Boolean)
    .join(';\n');
};

const displayValue = (value: string): string => {
  if (!value) return '';
  return value.replace(/\s*!important\s*$/i, '').trim();
};

const stripUnit = (value: string): number => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const simplifyShadow = (value: string): string => {
  if (!value) return 'none';
  const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase();
  if (normalized === SHADOW_PRESETS.subtle) return 'subtle';
  if (normalized === SHADOW_PRESETS.medium) return 'medium';
  if (normalized === SHADOW_PRESETS.heavy) return 'heavy';
  return 'custom';
};

const getSliderValue = (props: CssPropMap, key: string, defaultValue: string): number => {
  if (props[key]) return stripUnit(displayValue(props[key]));
  const globalProps = cssToProps(defaultValue);
  return globalProps[key] ? stripUnit(globalProps[key]) : 0;
};

export const ThemeStudio: React.FC = () => {
  const { customCardCss, setCustomCardCss, enableCustomCardCss, setEnableCustomCardCss } = useUI();

  const currentProps = useMemo(() => cssToProps(customCardCss || ''), [customCardCss]);

  const updateProp = useCallback(
    (name: string, value: string) => {
      const newProps = { ...currentProps, [name]: value };
      setCustomCardCss(propsToCss(newProps));
    },
    [currentProps, setCustomCardCss]
  );

  const removeProp = useCallback(
    (name: string) => {
      const newProps = { ...currentProps };
      delete newProps[name];
      setCustomCardCss(propsToCss(newProps));
    },
    [currentProps, setCustomCardCss]
  );

  const handleSlider = useCallback(
    (name: string, raw: number, unit: string = 'px') => {
      if (raw === 0) {
        removeProp(name);
      } else {
        updateProp(name, `${raw}${unit}`);
      }
    },
    [updateProp, removeProp]
  );

  const handleColor = useCallback(
    (name: string, value: string) => {
      updateProp(name, value);
    },
    [updateProp]
  );

  const handleShadow = useCallback(
    (value: string) => {
      if (value === 'none' || !value) {
        removeProp('box-shadow');
      } else {
        updateProp('box-shadow', SHADOW_PRESETS[value] || value);
      }
    },
    [updateProp, removeProp]
  );

  const sliders = [
    {
      key: 'border-radius' as const,
      label: 'Border Radius',
      icon: 'rounded_corner',
      min: 0, max: 24, step: 1, unit: 'px',
    },
    {
      key: 'padding' as const,
      label: 'Padding',
      icon: 'space_bar',
      min: 0, max: 32, step: 1, unit: 'px',
    },
    {
      key: 'margin' as const,
      label: 'Margin',
      icon: 'outlined_flag',
      min: 0, max: 32, step: 1, unit: 'px',
    },
    {
      key: 'border-width' as const,
      label: 'Border Width',
      icon: 'border_style',
      min: 0, max: 8, step: 0.5, unit: 'px',
    },
  ];

  return (
    <div className='flex flex-col h-full w-full overflow-hidden bg-transparent p-4 md:p-6 gap-4 md:gap-6'>
      {/* Header Card */}
      <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-4 flex items-center justify-between shadow-sm shrink-0'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center'>
            <span className='material-symbols-rounded text-xl text-primary-500'>palette</span>
          </div>
          <div>
            <h1 className='text-base font-bold text-(--text-primary)'>Theme Studio</h1>
            <p className='text-xs text-(--text-tertiary)'>Customize and preview your theme in real-time</p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-sm font-medium text-(--text-secondary)'>Enable Custom CSS</span>
          <Switch
            checked={enableCustomCardCss}
            onChange={setEnableCustomCardCss}
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 overflow-hidden'>
        
        {/* Left Column: Visual Controls */}
        <div className='lg:col-span-4 xl:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1 pb-10 scrollbar-none'>
          <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-5 shadow-sm space-y-6'>
            <div className='space-y-1'>
              <h2 className='text-sm font-bold text-(--text-primary)'>Visual Controls</h2>
              <p className='text-xs text-(--text-tertiary)'>Adjust CSS properties visually</p>
            </div>

            {sliders.map(({ key, label, icon, min, max, step, unit }) => {
              const colorConfig = 
                key === 'border-width' ? { cKey: 'border-color' as const, cLabel: 'Border Color', cDef: '#e5e7eb' } :
                key === 'padding' ? { cKey: 'background-color' as const, cLabel: 'BG Color', cDef: '#ffffff' } :
                key === 'border-radius' ? { cKey: 'color' as const, cLabel: 'Text Color', cDef: '#111827' } : null;

              return (
              <div key={key} className='space-y-2 bg-(--bg-card)'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='material-symbols-rounded text-base text-(--text-secondary)'>{icon}</span>
                    <label className='text-xs font-semibold text-(--text-secondary) uppercase tracking-wider'>
                      {label}
                    </label>
                  </div>
                  {colorConfig && (
                    <div className='flex items-center gap-1.5' title={colorConfig.cLabel}>
                      <span className='text-[10px] text-(--text-tertiary) font-medium'>{colorConfig.cLabel}</span>
                      <input
                        type='color'
                        value={currentProps[colorConfig.cKey] || colorConfig.cDef}
                        onChange={(e) => handleColor(colorConfig.cKey, e.target.value)}
                        className='w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent'
                      />
                    </div>
                  )}
                </div>
                <input
                  type='range'
                  min={min}
                  max={max}
                  step={step}
                  value={getSliderValue(currentProps, key, customCardCss || '')}
                  onChange={(e) => handleSlider(key, Number(e.target.value))}
                  className='w-full h-1.5 rounded-full appearance-none cursor-pointer bg-(--border-divider) [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500'
                />
                <div className='flex justify-between text-[10px] text-(--text-tertiary)'>
                  <span>{min}{unit}</span>
                  <span className='font-mono font-bold text-(--text-primary)'>{getSliderValue(currentProps, key, customCardCss || '')}{unit}</span>
                  <span>{max}{unit}</span>
                </div>
              </div>
            )})}

            <div className='border-t border-(--border-divider) pt-4 space-y-4'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <span className='material-symbols-rounded text-base text-(--text-secondary)'>shadow</span>
                  <label className='text-xs font-semibold text-(--text-secondary) uppercase tracking-wider'>Box Shadow</label>
                </div>
                <select
                  value={simplifyShadow(currentProps['box-shadow'] || '')}
                  onChange={(e) => handleShadow(e.target.value)}
                  className='w-full text-xs p-2 rounded-lg bg-(--bg-input) border border-(--border-divider) text-(--text-primary) outline-hidden'
                >
                  <option value='none'>None</option>
                  <option value='subtle'>Subtle</option>
                  <option value='medium'>Medium</option>
                  <option value='heavy'>Heavy</option>
                  {currentProps['box-shadow'] && simplifyShadow(currentProps['box-shadow']) === 'custom' && (
                    <option value='custom' disabled>Custom</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Live Preview */}
        <div className='lg:col-span-5 xl:col-span-6 flex flex-col overflow-y-auto pr-1 pb-10 scrollbar-none'>
          <div className='min-h-full flex flex-wrap gap-3 items-start content-start'>
            
            <div className='w-full flex flex-wrap xl:flex-nowrap gap-3'>
              <SearchInput 
                value='' 
                onSearchChange={() => {}} 
                placeholder='Search...' 
                wrapperClassName='flex-1 min-w-[150px]'
              />

              <SegmentedControl
                options={[
                  { value: '1', label: 'Day' },
                  { value: '2', label: 'Week' },
                  { value: '3', label: 'Month' }
                ]}
                value='1'
                onChange={() => {}}
                className='flex-1 min-w-[180px]'
              />
            </div>

            <SmallCard
              title='Revenue'
              value={12500.5}
              type='currency'
              icon='payments'
              iconColor='#10B981'
              trend='up'
              trendValue='+12.5%'
              trendLabel='vs last month'
              className='w-full custom-card-css-target border border-transparent'
            />

            <div className='w-full grid grid-cols-2 gap-3'>
              <div className='custom-card-css-target no-padding bg-(--bg-card) border border-(--border-divider) rounded-2xl p-1 shadow-xl flex flex-col justify-center'>
                <div className='px-3 py-1.5 text-xs font-semibold text-(--text-primary) hover:bg-(--bg-menu-hover) rounded-xl cursor-pointer'>Edit Settings</div>
                <div className='px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer'>Delete Record</div>
              </div>

              <div className='flex flex-col border border-(--border-divider) rounded-xl overflow-hidden'>
                <div className='custom-card-css-target no-padding shrink-0 border-b border-(--border-divider)/50 bg-(--bg-card) px-3 h-10 flex items-center justify-between'>
                  <span className='font-bold text-xs text-(--text-primary)'>Modal Window</span>
                  <button className='custom-card-css-target no-padding w-6 h-6 rounded-full grid place-items-center text-(--text-tertiary) hover:bg-zinc-500/10'>
                    <span className='material-symbols-rounded text-[16px]'>close</span>
                  </button>
                </div>
                <div className='bg-(--bg-card) flex-1 p-2 text-[10px] text-(--text-tertiary)'>Modal Body Content</div>
              </div>
            </div>

            <div className={`w-full overflow-hidden ${CARD_BASE} custom-card-css-target no-padding`}>
              <table className='w-full text-[11px] text-left'>
                <thead className='bg-transparent border-b border-(--border-divider)'>
                  <tr>
                    <th className='px-3 py-2 font-bold text-(--text-secondary)'>Product</th>
                    <th className='px-3 py-2 font-bold text-(--text-secondary) text-right'>Qty</th>
                    <th className='px-3 py-2 font-bold text-(--text-secondary) text-right'>Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='bg-transparent'>
                    <td className='px-3 py-2 text-(--text-primary) font-semibold'>Paracetamol</td>
                    <td className='px-3 py-2 text-(--text-primary) text-right'>150</td>
                    <td className='px-3 py-2 text-emerald-500 font-bold text-right'>$12.50</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Right Column: Raw CSS */}
        <div className='lg:col-span-3 xl:col-span-3 flex flex-col h-full overflow-hidden'>
          <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-5 shadow-sm space-y-4 flex-1 flex flex-col min-h-0'>
            <div className='space-y-1 shrink-0'>
              <h2 className='text-sm font-bold text-(--text-primary)'>Raw CSS</h2>
              <p className='text-xs text-(--text-tertiary)'>Edit the CSS directly</p>
            </div>
            <div className='flex-1 relative min-h-0'>
              <div className='absolute inset-0'>
                <CustomCssEditor
                  value={customCardCss || ''}
                  onChange={(v) => setCustomCardCss(v)}
                  placeholder='border-radius: 12px;'
                  className='h-full'
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ThemeStudio;
