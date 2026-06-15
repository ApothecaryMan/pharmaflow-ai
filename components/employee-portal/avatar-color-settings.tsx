import type React from 'react';

export const FRAME_COLORS = [
  { name: 'Default', nameAr: 'افتراضي', value: null },
  { name: 'Gold', nameAr: 'ذهبي', value: '#F5D742' },
  { name: 'Rose', nameAr: 'وردي', value: '#FF6B9D' },
  { name: 'Blue', nameAr: 'أزرق', value: '#5DA8E8' },
  { name: 'Purple', nameAr: 'بنفسجي', value: '#C084FC' },
  { name: 'Green', nameAr: 'أخضر', value: '#5DE87A' },
  { name: 'Red', nameAr: 'أحمر', value: '#DC2626' },
  { name: 'Orange', nameAr: 'برتقالي', value: '#FF9F43' },
  { name: 'White', nameAr: 'أبيض', value: '#FFFFFF' },
  { name: 'Black', nameAr: 'أسود', value: '#1A1A1A' },
];

export const SVG_COLORS = [
  { name: 'Default', nameAr: 'افتراضي', value: null },
  { name: 'Gold', nameAr: 'ذهبي', value: '#F5D742' },
  { name: 'Rose', nameAr: 'وردي', value: '#FF6B9D' },
  { name: 'Blue', nameAr: 'أزرق', value: '#5DA8E8' },
  { name: 'Purple', nameAr: 'بنفسجي', value: '#C084FC' },
  { name: 'Green', nameAr: 'أخضر', value: '#5DE87A' },
  { name: 'Red', nameAr: 'أحمر', value: '#DC2626' },
  { name: 'Orange', nameAr: 'برتقالي', value: '#FF9F43' },
];

interface ColorPickerProps {
  label: string;
  colors: typeof FRAME_COLORS;
  selected: string | null;
  onChange: (value: string | null) => void;
  isRTL: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  colors,
  selected,
  onChange,
  isRTL,
}) => (
  <div className='space-y-1.5'>
    <p className='text-[10px] font-bold uppercase tracking-wider text-(--text-tertiary)'>{label}</p>
    <div className='flex items-center gap-1.5 flex-wrap'>
      {colors.map((c) => (
        <button
          key={c.value || 'default'}
          type='button'
          onClick={() => onChange(c.value)}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 ${
            selected === c.value
              ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-(--bg-page-surface) scale-110'
              : 'ring-1 ring-(--border-secondary) hover:ring-primary-300 dark:hover:ring-primary-600'
          }`}
          title={isRTL ? c.nameAr : c.name}
        >
          <div
            className='w-6 h-6 rounded-full border-[3px] box-border'
            style={{
              borderColor: c.value || 'var(--border-secondary)',
            }}
          />
        </button>
      ))}
    </div>
  </div>
);
