import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useUI } from '../../context/UIContext';
import { CARD_BASE } from '../../utils/themeStyles';
import { CustomCssEditor } from '../common/CustomCssEditor';
import { PillSlider } from '../common/PillSlider';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmallCard } from '../common/SmallCard';
import { Switch } from '../common/Switch';
import { DesignMcpBridge } from './DesignMcpBridge';
import { BlendModePicker, FilterBuilder, ShadowBuilder } from './EffectsControls';
import { PresetSelector } from './PresetSelector';

type CssPropMap = Record<string, string>;

const gradientPct = (val: number, min: number, max: number) =>
  ((val - min) / (max - min || 1)) * 100;

const cssToProps = (css: string): CssPropMap => {
  const props: CssPropMap = {};
  css.split(';').forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed.includes(':')) return;
    const colonIdx = trimmed.indexOf(':');
    const name = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed
      .slice(colonIdx + 1)
      .trim()
      .replace(/\s*!important\s*$/i, '')
      .trim();
    if (name) props[name] = value;
  });
  return props;
};

const propsToCss = (props: CssPropMap): string => {
  return Object.entries(props)
    .map(([name, value]) => (value ? `${name}: ${value}` : ''))
    .filter(Boolean)
    .join(';\n');
};

const displayValue = (value: string): string => {
  if (!value) return '';
  return value.replace(/\s*!important\s*$/i, '').trim();
};

const stripUnit = (value: string): number => {
  const num = parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
};

type ControlType =
  | 'slider'
  | 'color'
  | 'select'
  | 'text'
  | 'shadow'
  | 'filter'
  | 'backdrop-filter'
  | 'blend';

interface CssPropDef {
  key: string;
  label: string;
  type: ControlType;
  icon?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
}

interface CssCategory {
  id: string;
  label: string;
  icon: string;
  properties: CssPropDef[];
}

const CSS_CATEGORIES: CssCategory[] = [
  {
    id: 'layout',
    label: 'Layout & Box Model',
    icon: 'dashboard',
    properties: [
      {
        key: 'display',
        label: 'Display',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Block', value: 'block' },
          { label: 'Flex', value: 'flex' },
          { label: 'Grid', value: 'grid' },
          { label: 'Inline-Block', value: 'inline-block' },
          { label: 'None', value: 'none' },
        ],
      },
      {
        key: 'flex-direction',
        label: 'Flex Direction',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Row', value: 'row' },
          { label: 'Column', value: 'column' },
          { label: 'Row Reverse', value: 'row-reverse' },
          { label: 'Column Reverse', value: 'column-reverse' },
        ],
      },
      {
        key: 'justify-content',
        label: 'Justify Content',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Flex Start', value: 'flex-start' },
          { label: 'Center', value: 'center' },
          { label: 'Flex End', value: 'flex-end' },
          { label: 'Space Between', value: 'space-between' },
          { label: 'Space Around', value: 'space-around' },
        ],
      },
      {
        key: 'align-items',
        label: 'Align Items',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Stretch', value: 'stretch' },
          { label: 'Flex Start', value: 'flex-start' },
          { label: 'Center', value: 'center' },
          { label: 'Flex End', value: 'flex-end' },
        ],
      },
      {
        key: 'gap',
        label: 'Gap',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
        icon: 'space_bar',
      },
      { key: 'width', label: 'Width', type: 'text', defaultValue: 'auto' },
      { key: 'min-width', label: 'Min Width', type: 'text' },
      { key: 'max-width', label: 'Max Width', type: 'text' },
      { key: 'height', label: 'Height', type: 'text', defaultValue: 'auto' },
      { key: 'min-height', label: 'Min Height', type: 'text' },
      { key: 'max-height', label: 'Max Height', type: 'text' },
      {
        key: 'overflow',
        label: 'Overflow',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Visible', value: 'visible' },
          { label: 'Hidden', value: 'hidden' },
          { label: 'Scroll', value: 'scroll' },
          { label: 'Auto', value: 'auto' },
        ],
      },
    ],
  },
  {
    id: 'spacing',
    label: 'Spacing',
    icon: 'format_line_spacing',
    properties: [
      {
        key: 'padding',
        label: 'Padding (All)',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'padding-inline-start',
        label: 'Padding Start',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'padding-inline-end',
        label: 'Padding End',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'padding-top',
        label: 'Padding Top',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'padding-right',
        label: 'Padding Right',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'padding-bottom',
        label: 'Padding Bottom',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'padding-left',
        label: 'Padding Left',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'margin',
        label: 'Margin (All)',
        type: 'slider',
        min: -32,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'margin-inline-start',
        label: 'Margin Start',
        type: 'slider',
        min: -32,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'margin-inline-end',
        label: 'Margin End',
        type: 'slider',
        min: -32,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'margin-top',
        label: 'Margin Top',
        type: 'slider',
        min: -32,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'margin-right',
        label: 'Margin Right',
        type: 'slider',
        min: -32,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'margin-bottom',
        label: 'Margin Bottom',
        type: 'slider',
        min: -32,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'margin-left',
        label: 'Margin Left',
        type: 'slider',
        min: -32,
        max: 64,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    id: 'typography',
    label: 'Typography',
    icon: 'text_fields',
    properties: [
      { key: 'color', label: 'Text Color', type: 'color', defaultValue: '#111827' },
      {
        key: 'font-family',
        label: 'Font Family',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'System UI', value: 'system-ui, sans-serif' },
          { label: 'Serif', value: 'serif' },
          { label: 'Monospace', value: 'monospace' },
        ],
      },
      {
        key: 'font-size',
        label: 'Font Size',
        type: 'slider',
        min: 8,
        max: 72,
        step: 1,
        unit: 'px',
      },
      {
        key: 'font-weight',
        label: 'Font Weight',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: '300 (Light)', value: '300' },
          { label: '400 (Normal)', value: '400' },
          { label: '500 (Medium)', value: '500' },
          { label: '600 (Semibold)', value: '600' },
          { label: '700 (Bold)', value: '700' },
          { label: '900 (Black)', value: '900' },
        ],
      },
      {
        key: 'line-height',
        label: 'Line Height',
        type: 'slider',
        min: 0.5,
        max: 3,
        step: 0.1,
        unit: '',
      },
      {
        key: 'letter-spacing',
        label: 'Letter Spacing',
        type: 'slider',
        min: -2,
        max: 10,
        step: 0.1,
        unit: 'px',
      },
      {
        key: 'text-align',
        label: 'Text Align',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
          { label: 'Justify', value: 'justify' },
        ],
      },
      {
        key: 'text-transform',
        label: 'Text Transform',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'None', value: 'none' },
          { label: 'Capitalize', value: 'capitalize' },
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'Lowercase', value: 'lowercase' },
        ],
      },
    ],
  },
  {
    id: 'borders',
    label: 'Borders & Outlines',
    icon: 'border_style',
    properties: [
      {
        key: 'border-radius',
        label: 'Border Radius',
        type: 'slider',
        min: 0,
        max: 64,
        step: 1,
        unit: 'px',
      },
      {
        key: 'border-width',
        label: 'Border Width',
        type: 'slider',
        min: 0,
        max: 16,
        step: 1,
        unit: 'px',
      },
      {
        key: 'border-style',
        label: 'Border Style',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' },
          { label: 'Double', value: 'double' },
          { label: 'None', value: 'none' },
        ],
      },
      { key: 'border-color', label: 'Border Color', type: 'color', defaultValue: '#e5e7eb' },
      {
        key: 'outline-width',
        label: 'Outline Width',
        type: 'slider',
        min: 0,
        max: 16,
        step: 1,
        unit: 'px',
      },
      {
        key: 'outline-style',
        label: 'Outline Style',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'None', value: 'none' },
        ],
      },
      { key: 'outline-color', label: 'Outline Color', type: 'color', defaultValue: '#3b82f6' },
      {
        key: 'outline-offset',
        label: 'Outline Offset',
        type: 'slider',
        min: -10,
        max: 20,
        step: 1,
        unit: 'px',
      },
    ],
  },
  {
    id: 'backgrounds',
    label: 'Backgrounds',
    icon: 'format_paint',
    properties: [
      {
        key: 'background',
        label: 'Background',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'None (Transparent)', value: 'none' },
        ],
      },
      {
        key: 'background-color',
        label: 'Background Color',
        type: 'color',
        defaultValue: '#ffffff',
      },
      { key: 'background-image', label: 'Background Image', type: 'text', defaultValue: '' },
      {
        key: 'background-size',
        label: 'Background Size',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Auto', value: 'auto' },
          { label: 'Cover', value: 'cover' },
          { label: 'Contain', value: 'contain' },
        ],
      },
      {
        key: 'background-position',
        label: 'Background Position',
        type: 'text',
        defaultValue: 'center',
      },
    ],
  },
  {
    id: 'effects',
    label: 'Effects & Filters',
    icon: 'blur_on',
    properties: [
      { key: 'box-shadow', label: 'Box Shadow', type: 'shadow' },
      { key: 'opacity', label: 'Opacity', type: 'slider', min: 0, max: 1, step: 0.05, unit: '' },
      { key: 'filter', label: 'Filter (Blur & Color)', type: 'filter' },
      { key: 'backdrop-filter', label: 'Backdrop Filter', type: 'backdrop-filter' },
      { key: 'mix-blend-mode', label: 'Mix Blend Mode', type: 'blend' },
    ],
  },
  {
    id: 'transforms',
    label: 'Transforms & Transitions',
    icon: 'transform',
    properties: [
      { key: 'transform', label: 'Transform (e.g., scale(1.1))', type: 'text' },
      { key: 'transform-origin', label: 'Transform Origin', type: 'text', defaultValue: 'center' },
      { key: 'transition', label: 'Transition', type: 'text', defaultValue: 'all 0.3s ease' },
      {
        key: 'cursor',
        label: 'Cursor',
        type: 'select',
        options: [
          { label: 'Default', value: '' },
          { label: 'Pointer', value: 'pointer' },
          { label: 'Text', value: 'text' },
          { label: 'Not Allowed', value: 'not-allowed' },
          { label: 'Crosshair', value: 'crosshair' },
        ],
      },
      { key: 'z-index', label: 'Z-Index', type: 'text' },
    ],
  },
];

const getPropValue = (props: CssPropMap, key: string): string => {
  return displayValue(props[key]);
};

export const ThemeStudio: React.FC = () => {
  const { customCardCss, setCustomCardCss, enableCustomCardCss, setEnableCustomCardCss } = useUI();
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set([CSS_CATEGORIES[0].id])
  );
  const [inactiveCategories, setInactiveCategories] = useState<Set<string>>(new Set());
  const lastKnownProps = useRef<CssPropMap>({});

  const currentProps = useMemo(() => cssToProps(customCardCss || ''), [customCardCss]);

  const updateProp = useCallback(
    (name: string, value: string) => {
      const newProps = { ...currentProps };
      if (!value) {
        delete newProps[name];
      } else {
        newProps[name] = value;
      }
      setCustomCardCss(propsToCss(newProps));

      const category = CSS_CATEGORIES.find((c) => c.properties.some((p) => p.key === name));
      if (category && inactiveCategories.has(category.id)) {
        setInactiveCategories((prev) => {
          const next = new Set(prev);
          next.delete(category.id);
          return next;
        });
      }
    },
    [currentProps, setCustomCardCss, inactiveCategories]
  );

  const toggleCategoryActive = useCallback(
    (categoryId: string, active: boolean) => {
      const category = CSS_CATEGORIES.find((c) => c.id === categoryId);
      if (!category) return;

      const newProps = { ...currentProps };

      if (active) {
        setInactiveCategories((prev) => {
          const next = new Set(prev);
          next.delete(categoryId);
          return next;
        });
        category.properties.forEach((p) => {
          if (lastKnownProps.current[p.key]) {
            newProps[p.key] = lastKnownProps.current[p.key];
          }
        });
      } else {
        setInactiveCategories((prev) => {
          const next = new Set(prev);
          next.add(categoryId);
          return next;
        });
        category.properties.forEach((p) => {
          if (newProps[p.key]) {
            lastKnownProps.current[p.key] = newProps[p.key];
            delete newProps[p.key];
          }
        });
      }

      setCustomCardCss(propsToCss(newProps));
    },
    [currentProps, setCustomCardCss]
  );

  const toggleCategory = useCallback((id: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <>
      <DesignMcpBridge />
      <div className='flex flex-col h-full w-full overflow-hidden bg-transparent p-4 md:p-6 gap-4 md:gap-6'>
        <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-4 flex items-center justify-between shadow-sm shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center'>
              <span className='material-symbols-rounded text-xl text-primary-500'>palette</span>
            </div>
            <div>
              <h1 className='text-base font-bold text-(--text-primary)'>Theme Studio</h1>
              <p className='text-xs text-(--text-tertiary)'>Advanced CSS Visual Controls</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-sm font-medium text-(--text-secondary)'>Enable Custom CSS</span>
            <Switch checked={enableCustomCardCss} onChange={setEnableCustomCardCss} />
          </div>
        </div>

        <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 overflow-hidden'>
          <div className='lg:col-span-3 xl:col-span-2 flex flex-col gap-2 overflow-y-auto pr-1 pb-10 scrollbar-none'>
            <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl overflow-hidden shadow-sm shrink-0'>
              <div className='px-3 pt-3 pb-1'>
                <span className='text-xs font-bold text-(--text-secondary) flex items-center gap-2'>
                  <span className='material-symbols-rounded text-[16px]'>auto_awesome</span>
                  Presets
                </span>
              </div>
              <div className='px-3 pb-3'>
                <PresetSelector />
              </div>
            </div>

            {CSS_CATEGORIES.map((category) => {
              const isOpen = openCategories.has(category.id);
              const isActive = !inactiveCategories.has(category.id);
              return (
                <div
                  key={category.id}
                  className={`bg-(--bg-card) border rounded-xl overflow-hidden shadow-sm shrink-0 transition-colors ${isActive ? 'border-(--border-divider)' : 'border-transparent opacity-60'}`}
                >
                  <div
                    className={`w-full flex items-center justify-between p-3 transition-colors ${isOpen ? 'bg-(--bg-menu-hover)' : 'hover:bg-(--bg-menu-hover)/50'}`}
                  >
                    <button
                      className='flex-1 flex items-center gap-2.5 text-left'
                      onClick={() => toggleCategory(category.id)}
                      type='button'
                    >
                      <span
                        className={`material-symbols-rounded text-[18px] ${isActive ? (isOpen ? 'text-primary-500' : 'text-(--text-secondary)') : 'text-(--text-tertiary)'}`}
                      >
                        {category.icon}
                      </span>
                      <span
                        className={`text-xs font-bold ${isActive ? (isOpen ? 'text-(--text-primary)' : 'text-(--text-secondary)') : 'text-(--text-tertiary)'}`}
                      >
                        {category.label}
                      </span>
                    </button>
                    <div className='flex items-center gap-3 shrink-0'>
                      <Switch
                        checked={isActive}
                        onChange={(checked) => toggleCategoryActive(category.id, checked)}
                      />
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className='flex items-center justify-center w-5 h-5'
                        type='button'
                      >
                        <span
                          className={`material-symbols-rounded text-[18px] text-(--text-tertiary) transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        >
                          expand_more
                        </span>
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div
                      className={`px-3 pb-3 pt-2 border-t border-(--border-divider)/50 space-y-3 mt-0 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {category.properties.map((prop) => {
                        const val = getPropValue(currentProps, prop.key);

                        if (prop.type === 'shadow') {
                          return (
                            <div key={prop.key} className='space-y-1.5'>
                              <span className='text-xs font-semibold text-(--text-secondary) block'>
                                {prop.label}
                              </span>
                              <ShadowBuilder
                                value={val}
                                onChange={(v) => updateProp(prop.key, v)}
                              />
                            </div>
                          );
                        }
                        if (prop.type === 'filter' || prop.type === 'backdrop-filter') {
                          return (
                            <div key={prop.key} className='space-y-1.5'>
                              <span className='text-xs font-semibold text-(--text-secondary) block'>
                                {prop.label}
                              </span>
                              <FilterBuilder
                                value={val}
                                onChange={(v) => updateProp(prop.key, v)}
                                backdrop={prop.type === 'backdrop-filter'}
                              />
                            </div>
                          );
                        }
                        if (prop.type === 'blend') {
                          return (
                            <div key={prop.key} className='space-y-1.5'>
                              <span className='text-xs font-semibold text-(--text-secondary) block'>
                                {prop.label}
                              </span>
                              <BlendModePicker
                                value={val}
                                onChange={(v) => updateProp(prop.key, v)}
                              />
                            </div>
                          );
                        }

                        if (prop.type === 'slider') {
                          const rawNum = val ? stripUnit(val) : prop.min || 0;
                          const sliderMin = prop.min || 0;
                          const sliderMax = prop.max || 100;
                          return (
                            <div key={prop.key} className='flex items-center justify-between gap-2'>
                              <span className='text-[10px] font-medium text-(--text-secondary) capitalize shrink-0'>
                                {prop.label}
                              </span>
                              <div className='flex items-center gap-1'>
                                <PillSlider
                                  min={sliderMin}
                                  max={sliderMax}
                                  step={prop.step || 1}
                                  value={rawNum}
                                  onChange={(v) => updateProp(prop.key, `${v}${prop.unit || ''}`)}
                                  className='w-24 md:w-32'
                                  formatValue={(v) => `${v}${prop.unit || ''}`}
                                  backgroundStyle={{
                                    background: `linear-gradient(to right, var(--primary-500) ${gradientPct(rawNum, sliderMin, sliderMax)}%, transparent ${gradientPct(rawNum, sliderMin, sliderMax)}%)`,
                                  }}
                                />
                                {val && (
                                  <button
                                    onClick={() => updateProp(prop.key, '')}
                                    className='w-4 h-4 rounded hover:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 ml-1'
                                    title='Reset'
                                    type='button'
                                  >
                                    <span className='material-symbols-rounded text-[12px]'>
                                      close
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={prop.key} className='space-y-1.5'>
                            <span className='text-xs font-semibold text-(--text-secondary) capitalize block'>
                              {prop.label}
                            </span>

                            {prop.type === 'color' && (
                              <div className='flex items-center gap-2'>
                                <div className='flex-1 flex items-center bg-(--bg-input) border border-(--border-divider) rounded-lg p-1 px-2 gap-2'>
                                  <input
                                    type='color'
                                    value={val || prop.defaultValue || '#000000'}
                                    onChange={(e) => updateProp(prop.key, e.target.value)}
                                    className='w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0'
                                  />
                                  <input
                                    type='text'
                                    value={val}
                                    onChange={(e) => updateProp(prop.key, e.target.value)}
                                    placeholder='Inherit'
                                    className='flex-1 bg-transparent text-xs text-(--text-primary) outline-hidden'
                                  />
                                </div>
                                {val && (
                                  <button
                                    onClick={() => updateProp(prop.key, '')}
                                    className='w-4 h-4 rounded hover:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0'
                                    title='Reset'
                                    type='button'
                                  >
                                    <span className='material-symbols-rounded text-[12px]'>
                                      close
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}

                            {prop.type === 'select' && (
                              <div className='flex items-center gap-2'>
                                <select
                                  value={val}
                                  onChange={(e) => updateProp(prop.key, e.target.value)}
                                  className='flex-1 text-xs p-2 rounded-lg bg-(--bg-input) border border-(--border-divider) text-(--text-primary) outline-hidden'
                                >
                                  {prop.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                {val && (
                                  <button
                                    onClick={() => updateProp(prop.key, '')}
                                    className='w-4 h-4 rounded hover:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0'
                                    title='Reset'
                                    type='button'
                                  >
                                    <span className='material-symbols-rounded text-[12px]'>
                                      close
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}

                            {prop.type === 'text' && (
                              <div className='flex items-center gap-2'>
                                <input
                                  type='text'
                                  value={val}
                                  onChange={(e) => updateProp(prop.key, e.target.value)}
                                  placeholder={prop.defaultValue || 'e.g. auto'}
                                  className='flex-1 text-xs p-2 rounded-lg bg-(--bg-input) border border-(--border-divider) text-(--text-primary) outline-hidden placeholder:text-(--text-tertiary)'
                                />
                                {val && (
                                  <button
                                    onClick={() => updateProp(prop.key, '')}
                                    className='w-4 h-4 rounded hover:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0'
                                    title='Reset'
                                    type='button'
                                  >
                                    <span className='material-symbols-rounded text-[12px]'>
                                      close
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className='lg:col-span-6 xl:col-span-7 flex flex-col overflow-y-auto pr-1 pb-10 scrollbar-none'>
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
                    { value: '3', label: 'Month' },
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
                  <div className='px-3 py-1.5 text-xs font-semibold text-(--text-primary) hover:bg-(--bg-menu-hover) rounded-xl cursor-pointer transition-colors'>
                    Edit Settings
                  </div>
                  <div className='px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors'>
                    Delete Record
                  </div>
                </div>

                <div className='flex flex-col border border-(--border-divider) rounded-xl overflow-hidden'>
                  <div className='custom-card-css-target no-padding shrink-0 border-b border-(--border-divider)/50 bg-(--bg-card) px-3 h-10 flex items-center justify-between'>
                    <span className='font-bold text-xs text-(--text-primary)'>Modal Window</span>
                    <button
                      className='custom-card-css-target no-padding w-6 h-6 rounded-full grid place-items-center text-(--text-tertiary) hover:bg-zinc-500/10 transition-colors'
                      type='button'
                    >
                      <span className='material-symbols-rounded text-[16px]'>close</span>
                    </button>
                  </div>
                  <div className='bg-(--bg-card) flex-1 p-2 text-[10px] text-(--text-tertiary)'>
                    Modal Body Content
                  </div>
                </div>
              </div>

              <div
                className={`w-full overflow-hidden ${CARD_BASE} custom-card-css-target no-padding`}
              >
                <table className='w-full text-[11px] text-left'>
                  <thead className='bg-transparent border-b border-(--border-divider)'>
                    <tr>
                      <th className='px-3 py-2 font-bold text-(--text-secondary)'>Product</th>
                      <th className='px-3 py-2 font-bold text-(--text-secondary) text-right'>
                        Qty
                      </th>
                      <th className='px-3 py-2 font-bold text-(--text-secondary) text-right'>
                        Price
                      </th>
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
    </>
  );
};

export default ThemeStudio;
