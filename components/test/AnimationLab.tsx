import React, { useState } from 'react';
import { useSettings } from '../../context';
import './AnimationLab.css';

export const AnimationLab: React.FC = () => {
  const { darkMode, setDarkMode } = useSettings();
  const [isStorming, setIsStorming] = useState(false);
  const [state, setState] = useState({
    themeMode: 'light', // 'light' or 'dark' inside the sandbox
    layoutStr: 'LTR Layout',
  });

  const runTransition = (className: string, updateFn: () => void) => {
    if (!('startViewTransition' in document)) {
      updateFn();
      return;
    }

    document.documentElement.classList.add(className);
    
    // For specific transitions that might conflict with the global .theme-transition
    // We remove .theme-transition if it exists
    document.documentElement.classList.remove('theme-transition');

    if (className === 'storm-transition') {
      setIsStorming(true);
    }

    const transition = (document as any).startViewTransition(() => {
      updateFn();
    });

    transition.finished.then(() => {
      document.documentElement.classList.remove(className);
      if (className === 'storm-transition') {
        setIsStorming(false);
      }
    });
  };

  const toggleLocalState = () => {
    setState((prev) => ({
      themeMode: prev.themeMode === 'light' ? 'dark' : 'light',
      layoutStr: prev.layoutStr === 'LTR Layout' ? 'RTL Layout (عربي)' : 'LTR Layout',
    }));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          مختبر الأنميشن (Animation Lab)
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          جرب الأفكار المختلفة للانتقالات (View Transitions API) هنا دون التأثير على باقي النظام.
        </p>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">أنماط الانتقال</h2>
        <div className="flex gap-4 flex-wrap">
          <button 
            onClick={() => runTransition('swipe-transition', toggleLocalState)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
          >
            مسح اللون (Color Swipe)
          </button>
          
          <button 
            onClick={() => runTransition('slide-transition', toggleLocalState)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors"
          >
            انزلاق (Slide Blur)
          </button>

          <button 
            onClick={() => runTransition('matrix-transition', toggleLocalState)}
            className="px-5 py-2.5 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-900 text-emerald-400 rounded-xl shadow-sm transition-colors border border-emerald-500/30"
          >
            تأثير ماتريكس (Scramble/Matrix)
          </button>

          <button 
            onClick={() => runTransition('storm-transition', toggleLocalState)}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm transition-colors"
          >
            عاصفة رملية (Dust Storm)
          </button>

          <div className="w-full h-px bg-[var(--bg-skeleton)] my-2" />

          <button 
            onClick={(e) => {
              // Trigger the global ThemeContext transition!
              // Note: The global setDarkMode triggers a circular reveal where you click!
              setDarkMode(!darkMode);
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-colors"
          >
            التمدد الدائري (Global Circular Reveal)
          </button>
        </div>
      </div>

      <div 
        className={`mt-4 p-12 rounded-3xl transition-colors duration-500 min-h-[400px] flex flex-col items-center justify-center border-4 border-dashed
          ${state.themeMode === 'light' 
            ? 'bg-zinc-50 border-zinc-200 text-zinc-900' 
            : 'bg-zinc-900 border-zinc-700 text-white'
          }`}
      >
        <h2 className="text-4xl font-black mb-6 tracking-tight">
          {state.layoutStr}
        </h2>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
          <div className={`p-6 rounded-2xl ${state.themeMode === 'light' ? 'bg-white shadow-sm' : 'bg-zinc-800'}`}>
            <h3 className="font-bold mb-2">عنصر أ</h3>
            <p className="opacity-70 text-sm">محتوى تجريبي يتغير شكله ولونه</p>
          </div>
          <div className={`p-6 rounded-2xl ${state.themeMode === 'light' ? 'bg-white shadow-sm' : 'bg-zinc-800'}`}>
            <h3 className="font-bold mb-2">عنصر ب</h3>
            <p className="opacity-70 text-sm">يتم تطبيق الأنميشن على كامل الصفحة</p>
          </div>
        </div>
      </div>

      {isStorming && (
        <svg className="fixed pointer-events-none w-0 h-0" style={{ position: 'absolute', zIndex: -1 }}>
          <defs>
            <filter id="dust-storm-out" x="-50%" y="-50%" width="200%" height="200%">
              {/* Very fine high-frequency noise to simulate dust/sand particles */}
              <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 5 -2" in="noise" result="alphaNoise" />
              <feDisplacementMap in="SourceGraphic" in2="alphaNoise" scale="0" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" from="0" to="250" dur="1.2s" fill="freeze" />
              </feDisplacementMap>
              <feGaussianBlur stdDeviation="0">
                <animate attributeName="stdDeviation" from="0" to="3" dur="1.2s" fill="freeze" />
              </feGaussianBlur>
            </filter>

            <filter id="dust-storm-in" x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 5 -2" in="noise" result="alphaNoise" />
              <feDisplacementMap in="SourceGraphic" in2="alphaNoise" scale="250" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" from="250" to="0" dur="1.2s" fill="freeze" />
              </feDisplacementMap>
              <feGaussianBlur stdDeviation="3">
                <animate attributeName="stdDeviation" from="3" to="0" dur="1.2s" fill="freeze" />
              </feGaussianBlur>
            </filter>
          </defs>
        </svg>
      )}
    </div>
  );
};
