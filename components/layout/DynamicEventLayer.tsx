import React, { useEffect, useState } from 'react';
import { EventManager, type EventContext } from '../../utils/events/eventManager';
import { useSettings } from '../../context';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { getIconByName } from '../common/Icons';

/**
 * DynamicEventLayer - A generic, hands-off renderer for dynamic events.
 * Features a Virtual Cursor for perfect size control and smooth movement.
 * Supports granular overlays like dragons, snowflakes, and snow piles.
 */
export const DynamicEventLayer: React.FC<{ view?: string }> = ({ view }) => {
  const [currentPath, setCurrentPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '');
  const { activeBranchId, language } = useSettings();
  const [activeOverlays, setActiveOverlays] = useState<any[]>([]);
  const [activeCursorEvent, setActiveCursorEvent] = useState<any>(null);
  const [isMouseInWindow, setIsMouseInWindow] = useState(true);
  
  // High-performance Motion Values (Bypasses React render cycle)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const isRTL = language === 'AR';
  const context: EventContext = {
    currentPath,
    view,
    branchId: activeBranchId,
  };

  // 1. Track Mouse Position & Window Presence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isMouseInWindow) setIsMouseInWindow(true);
    };

    const handleMouseLeave = () => setIsMouseInWindow(false);
    const handleMouseEnter = () => setIsMouseInWindow(true);
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isMouseInWindow]);

  // 2. Location Tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // 3. Resolve Events & Overlays
  useEffect(() => {
    const activeCursors = EventManager.getActiveCursors(context);
    const styleId = 'dynamic-event-styles';
    let styleEl = document.getElementById(styleId);
    if (styleEl) styleEl.remove();

    if (activeCursors.length > 0) {
      const cursor = activeCursors[0];
      setActiveCursorEvent(cursor);
      
      // Hide real cursor
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `* { cursor: none !important; }`;
      document.head.appendChild(styleEl);
    } else {
      setActiveCursorEvent(null);
    }

    const updateOverlays = () => {
      const allEvents = EventManager.getActiveEvents(context);
      const animations = allEvents.filter(e => e.type === 'ANIMATION');
      
      const overlays = animations.map(event => {
        const target = event.targetSelector ? document.querySelector(event.targetSelector) : null;
        
        if (target) {
          const rect = target.getBoundingClientRect();
          return {
            id: event.id,
            payload: event.payload,
            isRTL,
            rect: {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height
            }
          };
        } else if (!event.targetSelector) {
          // Global Overlay (Full Screen)
          return {
            id: event.id,
            payload: event.payload,
            isRTL,
            rect: {
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh'
            }
          };
        }
        return null;
      }).filter(Boolean);

      setActiveOverlays(overlays);
    };

    updateOverlays();
    const timer = setTimeout(updateOverlays, 150);
    
    window.addEventListener('resize', updateOverlays);
    return () => {
      window.removeEventListener('resize', updateOverlays);
      clearTimeout(timer);
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };

  }, [currentPath, activeBranchId, language, view]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" id="dynamic-overlay-layer">
      {/* --- Virtual Cursor --- */}
      <AnimatePresence>
        {(activeCursorEvent && isMouseInWindow) && (
          <motion.div
            key="virtual-cursor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 pointer-events-none z-[10000]"
            style={{ 
              x: mouseX, 
              y: mouseY,
              willChange: 'transform'
            }}
          >
            <div className="relative">
              <img 
                src={activeCursorEvent.payload} 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  objectFit: 'contain',
                  transform: 'translate(-50%, -50%)' 
                }} 
                alt="" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Page Overlays (Animations, Snow, Dragons, etc.) --- */}
      <AnimatePresence>
        {activeOverlays.map((overlay) => {
          const { payload, id, rect } = overlay;
          
          // 1. Snow Pile (Accumulation)
          if (id.includes('pile')) {
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none overflow-visible"
                style={{
                  top: rect.top - 10,
                  left: rect.left,
                  width: rect.width,
                  height: '20px',
                  zIndex: 1000
                }}
              >
                <div className="relative w-full h-full flex justify-around items-end px-4">
                  {[...Array(Math.floor(Number(rect.width) / 50 || 10))].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                      className="text-blue-100/80 dark:text-white/40 select-none filter blur-[1px]"
                      style={{ fontSize: `${15 + Math.random() * 10}px`, marginBottom: '-5px' }}
                    >
                      ❄
                    </motion.div>
                  ))}
                  <div className="absolute bottom-0 left-0 right-0 h-[6px] bg-gradient-to-t from-blue-100/40 to-transparent dark:from-white/20 rounded-full blur-[2px]" />
                </div>
              </motion.div>
            );
          }

          // 2. Snow Particles (Falling)
          if (id.includes('snow')) {
            return (
              <div key={id} className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ top: -20, left: `${Math.random() * 100}%`, opacity: 0 }}
                    animate={{ 
                      top: '110vh',
                      left: `${(Math.random() * 100)}%`,
                      opacity: [0, 0.8, 0],
                      rotate: 360
                    }}
                    transition={{ 
                      duration: 5 + Math.random() * 10, 
                      repeat: Infinity, 
                      delay: i * 0.4,
                      ease: "linear" 
                    }}
                    className="absolute text-blue-400/30 dark:text-white/20 select-none"
                    style={{ fontSize: `${10 + Math.random() * 20}px` }}
                  >
                    ❄
                  </motion.div>
                ))}
              </div>
            );
          }

          // 3. Standard Animations (Dragon, Icons, Text)
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute pointer-events-none"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                direction: overlay.isRTL ? 'rtl' : 'ltr',
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                 {payload.img && (
                   <img 
                    src={payload.img} 
                    className="absolute" 
                    style={{ 
                      width: payload.size || '40px',
                      transform: (overlay.isRTL && !payload.noFlip) ? 'scaleX(-1)' : 'none',
                      top: payload.offsetY || '-20px',
                      [overlay.isRTL ? 'right' : 'left']: payload.offsetX || '-10px'
                    }}
                    alt=""
                   />
                 )}

                 {payload.icon && (() => {
                    const IconComp = getIconByName(payload.icon, true);
                    return (
                      <div 
                        className="absolute" 
                        style={{ 
                          top: payload.offsetY || '-20px',
                          [overlay.isRTL ? 'right' : 'left']: payload.offsetX || '-10px'
                        }}
                      >
                        <IconComp size={payload.size || 24} color={payload.color} />
                      </div>
                    );
                 })()}

                 {payload.text && (
                   <motion.div 
                    className="absolute whitespace-nowrap font-bold"
                    animate={payload.animate || { y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ 
                      fontSize: payload.size || '20px',
                      color: payload.color,
                      top: payload.offsetY || '-30px',
                      [overlay.isRTL ? 'right' : 'left']: payload.offsetX || '0px'
                    }}
                   >
                     {payload.text}
                   </motion.div>
                 )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
