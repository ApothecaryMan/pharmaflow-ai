import React, { useState } from 'react';
import { BUTTON_BASE } from '../../utils/themeStyles';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../../context';
import './AnimationLab.css';

const FramerMorphDemo = () => {
  const [activeView, setActiveView] = useState<string | null>(null);
  
  return (
    <motion.div 
      layout 
      transition={{ layout: { type: "spring", bounce: 0, duration: 0.3 } }}
      className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm"
    >
      <div className="p-3 relative">
        <AnimatePresence mode="popLayout" initial={false}>
          {activeView === null ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="grid grid-cols-2 gap-3 w-full"
            >
              {[1, 2, 3, 4].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveView(`View ${i}`)}
                  className="aspect-square bg-zinc-100 dark:bg-zinc-700/50 rounded-lg flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  <span className="font-semibold text-zinc-500 dark:text-zinc-400">Tool {i}</span>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="w-full space-y-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => setActiveView(null)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-rounded text-lg">arrow_back</span>
                </button>
                <span className="font-semibold text-sm">{activeView}</span>
              </div>
              <div className="h-24 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30" />
              <div className="h-10 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700" />
              {/* Extra height to demonstrate layout morphing */}
              {activeView === 'View 1' && <div className="h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/30" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

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
    <div className="p-8 w-full h-full flex flex-col xl:flex-row gap-8 overflow-y-auto">
      
      {/* Left Sidebar (Controls) */}
      <div className="w-full xl:w-[450px] flex-shrink-0 flex flex-col gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">أنماط الانتقال</h2>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => runTransition('swipe-transition', toggleLocalState)}
              className={`${BUTTON_BASE} text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}
            >
              مسح اللون
            </button>
            
            <button 
              onClick={() => runTransition('slide-transition', toggleLocalState)}
              className={`${BUTTON_BASE} text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300`}
            >
              انزلاق
            </button>

            <button 
              onClick={() => runTransition('matrix-transition', toggleLocalState)}
              className={`${BUTTON_BASE} text-xs bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700`}
            >
              ماتريكس
            </button>

            <button 
              onClick={() => runTransition('storm-transition', toggleLocalState)}
              className={`${BUTTON_BASE} text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`}
            >
              عاصفة رملية
            </button>

            <div className="w-full h-px bg-[var(--bg-skeleton)] my-2" />

            <button 
              onClick={(e) => {
                setDarkMode(!darkMode);
              }}
              className={`${BUTTON_BASE} text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 w-full`}
            >
              التمدد الدائري (Global Reveal)
            </button>
          </div>

          <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-8" />

          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
            Framer Motion: Layout Morph & iOS Slide
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            يستخدم <code>AnimatePresence mode="popLayout"</code> مع <code>layout</code> لتحريك الحاوية والانزلاق الجانبي بسلاسة تامة، تماماً مثل قوائم الـ iOS.
          </p>
          <div className="w-full max-w-sm" style={{ direction: 'ltr' }}>
            <FramerMorphDemo />
          </div>
        </div>
      </div>

      {/* Right Main Content (Demo View) */}
      <div className="flex-1 flex flex-col h-full min-h-[500px]">
        <div 
          className={`flex-1 p-12 rounded-3xl transition-colors duration-500 flex flex-col items-center justify-center border-4 border-dashed
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
