import { type FC } from 'react';
import { useUI } from '../../context/UIContext';

interface PresetStyle {
  background?: string;
  backdropFilter?: string;
  WebkitBackdropFilter?: string;
  padding?: string;
  boxShadow?: string;
  border?: string;
  borderRadius?: string;
  transform?: string;
  clipPath?: string;
  fontFamily?: string;
  lineHeight?: string;
  fontSize?: string;
  color?: string;
}

interface Preset {
  name: string;
  label: string;
  description: string;
  style: PresetStyle;
}

const PRESETS: Preset[] = [
  {
    name: 'paper-notebook',
    label: 'ورق دفتر',
    description: 'Notebook paper with ruled lines',
    style: {
      background: 'repeating-linear-gradient(#fdfbf3 0 27px, #d8e0e8 27px 28px) #fdfbf3',
      padding: '24px',
      boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
      border: '2px solid #2c2c2c',
      borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
    },
  },
  {
    name: 'paper-torn',
    label: 'ورق مقطع',
    description: 'Torn-edge paper with jagged clip',
    style: {
      background: 'repeating-linear-gradient(#fdfbf3 0 27px, #d8e0e8 27px 28px), #fdfbf3',
      padding: '30px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transform: 'rotate(-0.5deg)',
      clipPath: `polygon(1% 4%, 8% 0%, 20% 3%, 33% 0%, 47% 2%, 60% 0%, 74% 3%, 88% 0%, 100% 4%, 98% 18%, 100% 32%, 97% 46%, 100% 60%, 98% 74%, 100% 88%, 97% 100%, 83% 98%, 70% 100%, 56% 97%, 42% 100%, 28% 98%, 14% 100%, 0% 96%, 3% 82%, 0% 68%, 2% 54%, 0% 40%, 3% 26%, 0% 12%)`,
    },
  },
  {
    name: 'paper-dark',
    label: 'ورق ليلي',
    description: 'Dark ruled notebook with grid lines',
    style: {
      background: 'repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.04) 27px, rgba(255,255,255,0.04) 28px), #1e1e2e',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      border: '2px solid #3a3a4e',
      borderRadius: '4px',
      color: '#cdd6f4',
      padding: '28px 24px',
      fontFamily: "'Courier New', monospace",
      lineHeight: '1.75',
      fontSize: '14px',
    },
  },
  {
    name: 'glass-frost',
    label: 'زجاج بلوري',
    description: 'Transparent frosted glass with blur',
    style: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(16px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      borderRadius: '16px',
    },
  },
  {
    name: 'paper-clean',
    label: 'ورق نقي',
    description: 'Clean white paper with serif text',
    style: {
      background: '#faf9f6',
      borderRadius: '2px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      border: '1px solid #e8e6e1',
      padding: '24px',
      fontFamily: "'Georgia', 'Times New Roman', serif",
      lineHeight: '1.6',
    },
  },
];

const presetToCss = (style: PresetStyle): string => {
  return Object.entries(style)
    .map(([key, val]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${val}`;
    })
    .join(';\n');
};

export const PresetSelector: FC = () => {
  const { setCustomCardCss } = useUI();

  return (
    <div className='grid grid-cols-1 gap-2'>
      {PRESETS.map((preset) => (
        <button
          key={preset.name}
          onClick={() => setCustomCardCss(presetToCss(preset.style))}
          className='relative rounded-xl border border-(--border-divider) bg-(--bg-card) p-3 text-left hover:border-primary-500/40 transition-colors overflow-hidden'
          title={preset.description}
        >
          <div className='text-[11px] font-bold text-(--text-primary) mb-0.5'>
            {preset.label}
          </div>
          <div className='text-[9px] text-(--text-tertiary) mb-2'>
            {preset.description}
          </div>
          <div className='rounded-lg overflow-hidden h-10 bg-(--bg-input)'
            style={{
              ...preset.style,
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: preset.style.color || 'inherit',
            }}
          >
            {preset.label}
          </div>
        </button>
      ))}
    </div>
  );
};
