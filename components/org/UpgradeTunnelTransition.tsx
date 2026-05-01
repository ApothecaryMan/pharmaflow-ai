import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';

interface UpgradeTunnelTransitionProps {
  isOpen: boolean;
  triggerRect: DOMRect | null;
  onComplete: () => void;
  language: 'en' | 'ar';
  darkMode: boolean;
}

/**
 * UpgradeTunnelTransition - A ultra-premium transition component
 * Featuring nested glowing rings, particle systems, and organic expansion.
 */
export const UpgradeTunnelTransition: React.FC<UpgradeTunnelTransitionProps> = ({
  isOpen,
  triggerRect,
  onComplete,
  language,
  darkMode
}) => {
  const [phase, setPhase] = useState<'idle' | 'expanding' | 'tunneling' | 'revealing'>('idle');

  useEffect(() => {
    if (isOpen && triggerRect) {
      setPhase('expanding');
      const tunnelTimer = setTimeout(() => setPhase('tunneling'), 600);
      const revealTimer = setTimeout(() => {
        setPhase('revealing');
        onComplete();
      }, 1800);
      
      return () => {
        clearTimeout(tunnelTimer);
        clearTimeout(revealTimer);
      };
    } else {
      setPhase('idle');
    }
  }, [isOpen, triggerRect, onComplete]);

  // Generate random particles for the background
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    }));
  }, []);

  if (!isOpen || !triggerRect) return null;

  const startX = triggerRect.left + triggerRect.width / 2;
  const startY = triggerRect.top + triggerRect.height / 2;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden" dir="ltr">
      <AnimatePresence>
        {phase !== 'idle' && (
          <div className="relative w-full h-full bg-black/0">
            
            {/* Background Particles - Fading in early */}
            <div className="absolute inset-0 z-0">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: phase === 'revealing' ? 0.6 : 0,
                    x: [`${p.x}%`, `${p.x + (Math.random() - 0.5) * 10}%`],
                    y: [`${p.y}%`, `${p.y + (Math.random() - 0.5) * 10}%`],
                  }}
                  transition={{ 
                    opacity: { duration: 2 },
                    x: { duration: p.duration, repeat: Infinity, repeatType: 'reverse', ease: 'linear' },
                    y: { duration: p.duration, repeat: Infinity, repeatType: 'reverse', ease: 'linear' },
                  }}
                  className="absolute rounded-full bg-amber-400/30 blur-[1px]"
                  style={{ width: p.size, height: p.size }}
                />
              ))}
            </div>

            {/* Layer 1: Shockwave Expansion */}
            <motion.div
              initial={{ 
                width: triggerRect.width, 
                height: triggerRect.height,
                left: triggerRect.left,
                top: triggerRect.top,
                borderRadius: '16px',
                scale: 1,
                opacity: 1
              }}
              animate={{ 
                width: 3500, 
                height: 3500,
                left: startX - 1750,
                top: startY - 1750,
                borderRadius: '100%',
                scale: 1,
              }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute ${darkMode ? 'bg-white' : 'bg-zinc-900'} shadow-2xl pointer-events-auto`}
            />

            {/* Phase 2: Cosmic Tunnel Rings - Opposite Color for Contrast */}
            {(phase === 'tunneling' || phase === 'revealing') && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Large Background Glow */}
                <motion.div 
                   initial={{ scale: 0, opacity: 0 }}
                   animate={{ scale: 1, opacity: 0.4 }}
                   transition={{ duration: 1.5 }}
                   className={`absolute w-[800px] h-[800px] ${darkMode ? 'bg-amber-500/20' : 'bg-amber-400/10'} rounded-full blur-[120px]`}
                />

                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ width: 0, height: 0, opacity: 0, rotate: 0 }}
                    animate={{ 
                      width: [0, 400 + i * 250], 
                      height: [0, 400 + i * 250], 
                      opacity: [0, 0.4, 0],
                      rotate: i % 2 === 0 ? 360 : -360
                    }}
                    transition={{ 
                      duration: 3, 
                      delay: i * 0.2,
                      ease: "easeOut",
                      rotate: { duration: 10 + i * 2, repeat: Infinity, ease: 'linear' }
                    }}
                    className={`absolute border-[1px] ${darkMode ? 'border-amber-500/30' : 'border-zinc-100/20'} rounded-full pointer-events-none`}
                    style={{ 
                      boxShadow: darkMode ? `0 0 ${20 + i * 10}px rgba(245, 158, 11, 0.1)` : 'none',
                      borderStyle: i % 2 === 0 ? 'solid' : 'dashed'
                    }}
                  />
                ))}

                {/* The Central "Void" - The actual Tunnel */}
                <motion.div
                   initial={{ scale: 0 }}
                   animate={{ scale: [0, 1.2, 10] }}
                   transition={{ 
                     times: [0, 0.4, 1],
                     duration: 2.5, 
                     delay: 0.5,
                     ease: [0.16, 1, 0.3, 1] 
                   }}
                   className={`absolute w-[500px] h-[500px] ${darkMode ? 'bg-black' : 'bg-white'} rounded-full`}
                />
              </div>
            )}

            {/* Phase 3: Premium Reveal Content */}
            {phase === 'revealing' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 pointer-events-auto z-10"
              >
                {/* Massive Floating Lightning Icon */}
                <div className="relative mb-12">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className={`absolute inset-0 ${darkMode ? 'bg-amber-500/70' : 'bg-amber-400/50'} rounded-full blur-[110px]`}
                  />
                  <motion.div
                    animate={{ 
                      y: [0, -20, 0],
                      rotate: [12, 15, 12]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10"
                  >
                    <span className="material-symbols-rounded text-white drop-shadow-[0_0_50px_rgba(245,158,11,1)]" style={{ fontSize: '180px' }}>
                      bolt
                    </span>
                  </motion.div>
                </div>

                {/* Header - Solid White/Black - Using Thmanyah font */}
                <h2 
                  className={`text-5xl md:text-6xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'} mb-4 tracking-tight`}
                  style={{ fontFamily: "'HeadingFont', serif" }}
                >
                  {language === 'ar' ? 'نصمــم تجربتك الجديــــدة...' : 'Designing your upgrade...'}
                </h2>
                
                <div className="flex flex-col items-center gap-2">
                  <p 
                    className={`${darkMode ? 'text-white' : 'text-zinc-900'} text-xl font-bold tracking-[0.2em] uppercase`}
                    style={{ fontFamily: "'GraphicSansFont', sans-serif" }}
                  >
                    {language === 'ar' ? 'يرجى الانتظار' : 'Please Wait'}
                  </p>
                  <div className="flex gap-1 mt-4">
                     {[0, 1, 2].map(i => (
                       <motion.div 
                         key={i}
                         animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                         transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                         className={`w-2 h-2 ${darkMode ? 'bg-white' : 'bg-zinc-900'} rounded-full`}
                       />
                     ))}
                  </div>
                </div>

              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};
