import type { CssPropMap } from './state.js';

export interface Preset {
  name: string;
  label: string;
  description: string;
  properties: CssPropMap;
}

export const PRESETS: Preset[] = [
  {
    name: 'paper-notebook',
    label: 'ورق دفتر',
    description: 'Notebook paper with ruled lines and handwritten-style borders',
    properties: {
      background:
        'repeating-linear-gradient(#fdfbf3 0 27px, #d8e0e8 27px 28px) #fdfbf3',
      padding: '24px',
      'box-shadow': '0 3px 10px rgba(0,0,0,0.15)',
      transform: 'rotate(0deg)',
      border: '2px solid #2c2c2c',
      'border-radius': '255px 15px 225px 15px / 15px 225px 15px 255px',
    },
  },
  {
    name: 'paper-torn',
    label: 'ورق مقطع',
    description: 'Torn-edge paper with jagged clip-path edges',
    properties: {
      background:
        'repeating-linear-gradient(#fdfbf3 0 27px, #d8e0e8 27px 28px), #fdfbf3',
      padding: '30px',
      'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
      transform: 'rotate(-0.5deg)',
      'clip-path':
        'polygon(1% 4%, 8% 0%, 20% 3%, 33% 0%, 47% 2%, 60% 0%, 74% 3%, 88% 0%, 100% 4%, 98% 18%, 100% 32%, 97% 46%, 100% 60%, 98% 74%, 100% 88%, 97% 100%, 83% 98%, 70% 100%, 56% 97%, 42% 100%, 28% 98%, 14% 100%, 0% 96%, 3% 82%, 0% 68%, 2% 54%, 0% 40%, 3% 26%, 0% 12%)',
    },
  },
  {
    name: 'paper-dark',
    label: 'ورق ليلي',
    description: 'Dark ruled notebook paper with grid lines',
    properties: {
      background:
        'repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.04) 27px, rgba(255,255,255,0.04) 28px), #1e1e2e',
      'box-shadow': '0 4px 20px rgba(0,0,0,0.5)',
      border: '2px solid #3a3a4e',
      'border-radius': '4px',
      color: '#cdd6f4',
      padding: '28px 24px',
      'font-family': "'Courier New', monospace",
      'line-height': '1.75',
      'font-size': '14px',
    },
  },
  {
    name: 'glass-frost',
    label: 'زجاج بلوري',
    description: 'Transparent frosted glass with backdrop blur, no color',
    properties: {
      background: 'rgba(255, 255, 255, 0.08)',
      'backdrop-filter': 'blur(16px) saturate(1.2)',
      '-webkit-backdrop-filter': 'blur(16px) saturate(1.2)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.08)',
      'border-radius': '16px',
    },
  },
  {
    name: 'paper-clean',
    label: 'ورق نقي',
    description: 'Clean white paper with subtle shadow',
    properties: {
      background: '#faf9f6',
      'border-radius': '2px',
      'box-shadow': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      border: '1px solid #e8e6e1',
      color: '#1a1a1a',
      padding: '24px',
      'font-family': "'Georgia', 'Times New Roman', serif",
      'line-height': '1.6',
    },
  },
];
