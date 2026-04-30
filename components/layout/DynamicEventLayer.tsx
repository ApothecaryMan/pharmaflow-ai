import React, { useEffect, useState } from 'react';
import { EventManager, type EventContext } from '../../utils/events/eventManager';
import { useSettings } from '../../context';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons, getIconByName } from '../common/Icons';

/**
 * DynamicEventLayer - A generic, hands-off renderer for dynamic events.
 * No need to modify this file when adding new events to dynamicEvents.ts.
 */
export const DynamicEventLayer: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '');
  const { activeBranchId, language } = useSettings();
  const [activeOverlays, setActiveOverlays] = useState<any[]>([]);
  
  const isRTL = language === 'AR';
  
  const context: EventContext = {
    currentPath,
    branchId: activeBranchId,
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    // 1. Resolve Active Cursors
    const activeCursors = EventManager.getActiveCursors(context);
    const styleId = 'dynamic-event-styles';
    let styleEl = document.getElementById(styleId);
    if (styleEl) styleEl.remove();

    if (activeCursors.length > 0) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      let cssRules = '';
      activeCursors.forEach((cursor) => {
        const cursorUrl = `url('${cursor.payload}')`;
        if (cursor.selector) {
          cssRules += `${cursor.selector}, ${cursor.selector} * { cursor: ${cursorUrl}, auto !important; }`;
        } else {
          document.documentElement.style.setProperty('--global-cursor', cursorUrl);
          document.documentElement.style.setProperty('--global-pointer', cursorUrl);
          document.body.classList.add('has-custom-cursor');
        }
      });
      styleEl.textContent = cssRules;
      document.head.appendChild(styleEl);
    }

    // 2. Generic Overlay/Animation Resolver
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
        }
        return null;
      }).filter(Boolean);

      setActiveOverlays(overlays);
    };

    updateOverlays();
    const timer = setTimeout(updateOverlays, 150); // Delay to ensure layout is settled
    
    window.addEventListener('resize', updateOverlays);
    return () => {
      window.removeEventListener('resize', updateOverlays);
      clearTimeout(timer);
    };

  }, [currentPath, activeBranchId, language]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" id="dynamic-overlay-layer">
      <AnimatePresence>
        {activeOverlays.map((overlay) => {
          const { payload } = overlay;
          
          return (
            <motion.div
              key={overlay.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute pointer-events-none"
              style={{
                top: overlay.rect.top,
                left: overlay.rect.left,
                width: overlay.rect.width,
                height: overlay.rect.height,
                direction: overlay.isRTL ? 'rtl' : 'ltr',
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                 {/* 1. Image/GIF Support */}
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

                 {/* 2. System Icon Support */}
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

                 {/* 3. Text/Emoji Support */}
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
