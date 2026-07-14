import { useState } from 'react';
import { AnimatedCounterTest } from '../common/AnimatedCounterTest';

export const AnimatedCounterLab = () => {
  const [value, setValue] = useState(1500);

  return (
    <div className='h-full flex flex-col p-6 gap-6 overflow-hidden'>
      <div className='flex-shrink-0 flex gap-6'>
        <div className='flex-1 bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-divider)] flex flex-col justify-center'>
          <h1 className='text-3xl font-bold mb-2'>Animated Counter Lab</h1>
          <p className='text-gray-500'>
            Test different sizes, weights, and values for the AnimatedCounterTest component.
          </p>
        </div>

        <div className='flex-[2] bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-divider)]'>
          <div className='flex justify-between items-center mb-4'>
            <span className='text-sm font-bold flex items-center gap-2'>
              <span className='material-symbols-rounded text-primary-500 text-sm'>tune</span>
              Value Control
            </span>
            <div className='text-2xl font-black text-primary-500 tabular-nums bg-primary-50 dark:bg-primary-900/10 px-4 py-1 rounded-xl'>
              {value.toLocaleString()}
            </div>
          </div>

          <input
            type='range'
            min='0'
            max='1000'
            step='10'
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className='w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500 mb-6'
          />

          <div className='flex flex-wrap gap-4'>
            <button
              className='flex-1 min-w-[120px] py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95'
              onClick={() => setValue(Math.floor(Math.random() * 1000))}
              type='button'
            >
              Random Value
            </button>
            <button
              className='flex-1 min-w-[120px] py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-all active:scale-95'
              onClick={() => setValue(0)}
              type='button'
            >
              Reset to 0
            </button>
            <button
              className='flex-1 min-w-[120px] py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-all active:scale-95'
              onClick={() => setValue(500)}
              type='button'
            >
              Set to 500
            </button>
          </div>
        </div>
      </div>

      <div className='flex-1 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 min-h-0'>
        {/* Box 1: Font Sizes */}
        <div className='bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-divider)] space-y-6 overflow-y-auto'>
          <h2 className='text-xl font-bold border-b border-[var(--border-divider)] pb-4 flex items-center gap-2 sticky top-0 bg-[var(--bg-card)] z-10'>
            <span className='material-symbols-rounded text-primary-500'>text_format</span>
            Font Sizes
          </h2>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>Text sm</p>
            <div className='text-sm bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Text base
            </p>
            <div className='text-base bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 0.85} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Text 3xl
            </p>
            <div className='text-3xl bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 0.6} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Text 6xl (Rolling)
            </p>
            <div className='text-6xl tracking-tight bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 0.25} mode='rolling' />
            </div>
          </div>
        </div>

        {/* Box 2: Font Weights & Colors */}
        <div className='bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-divider)] space-y-6 overflow-y-auto'>
          <h2 className='text-xl font-bold border-b border-[var(--border-divider)] pb-4 flex items-center gap-2 sticky top-0 bg-[var(--bg-card)] z-10'>
            <span className='material-symbols-rounded text-emerald-500'>format_bold</span>
            Font Weights & Colors
          </h2>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Normal Weight (400)
            </p>
            <div className='text-4xl font-normal text-blue-500 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 0.75} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Bold Weight (700)
            </p>
            <div className='text-4xl font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 0.5} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Black Weight (900)
            </p>
            <div className='text-4xl font-black text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 0.33} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              With Fractions & Currency (Rolling)
            </p>
            <div className='text-4xl font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl flex items-baseline gap-2'>
              <AnimatedCounterTest
                value={value > 0 ? value * 0.9 + 0.99 : 0}
                fractionDigits={2}
                mode='rolling'
              />
              <span className='text-lg font-medium text-amber-600/50'>EGP</span>
            </div>
          </div>
        </div>

        {/* Box 3: Animation Speeds */}
        <div className='bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-divider)] space-y-6 overflow-y-auto'>
          <h2 className='text-xl font-bold border-b border-[var(--border-divider)] pb-4 flex items-center gap-2 sticky top-0 bg-[var(--bg-card)] z-10'>
            <span className='material-symbols-rounded text-indigo-500'>speed</span>
            Animation Speeds
          </h2>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Fast (300ms)
            </p>
            <div className='text-3xl font-bold bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Normal (1200ms)
            </p>
            <div className='text-3xl font-bold bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Slow (3000ms)
            </p>
            <div className='text-3xl font-bold bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value} />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Dynamic Speed (Rolling)
            </p>
            <div className='text-3xl font-bold bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl text-indigo-500'>
              <AnimatedCounterTest value={value} mode='rolling' />
            </div>
          </div>
        </div>

        {/* Box 4: Notations (K / M) */}
        <div className='bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--border-divider)] space-y-6 overflow-y-auto'>
          <h2 className='text-xl font-bold border-b border-[var(--border-divider)] pb-4 flex items-center gap-2 sticky top-0 bg-[var(--bg-card)] z-10'>
            <span className='material-symbols-rounded text-fuchsia-500'>functions</span>
            Notations (K / M)
          </h2>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Standard Notation
            </p>
            <div className='text-4xl font-bold bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 8.5} notation='standard' />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Compact Notation (K/M) - Normal Speed
            </p>
            <div className='text-4xl font-bold text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/10 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 42} notation='compact' />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Compact Notation (K/M) - Slow Speed
            </p>
            <div className='text-4xl font-bold text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/10 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 155.5} notation='compact' />
            </div>
          </div>

          <div>
            <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-2'>
              Large Number Format (No Decimals)
            </p>
            <div className='text-4xl font-bold bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl'>
              <AnimatedCounterTest value={value * 5000} notation='compact' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
