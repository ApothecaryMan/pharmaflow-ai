import React, { useEffect, useState } from 'react';
import { EventManager, type EventContext } from '../../utils/events/eventManager';
import { useSettings } from '../../context';
import { useMotionValue } from 'framer-motion';
import { VirtualCursor } from './DynamicEvents/VirtualCursor';
import { SnowPile } from './DynamicEvents/SnowPile';
import { SnowParticles } from './DynamicEvents/SnowParticles';
import { WalkingCowOverlay } from './DynamicEvents/WalkingCowOverlay';
import { StandardOverlay } from './DynamicEvents/StandardOverlay';
import { EidNavbarGradient } from './DynamicEvents/EidNavbarGradient';

export const DynamicEventLayer: React.FC<{ view?: string }> = ({ view }) => {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );
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

  const activeEvents = React.useMemo(() => {
    if (typeof window === 'undefined') return [];
    return EventManager.getActiveEvents(context);
  }, [currentPath, view, activeBranchId]);

  const navbarIconsEvent = activeEvents.find((e) => e.type === 'NAVBAR_ICONS');
  const customIcons = navbarIconsEvent?.payload as Record<string, any> | undefined;
  const customGradient = customIcons?.gradient;

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
      const animations = allEvents.filter(
        (e) => e.type === 'ANIMATION' || e.type === 'WALKING_COW'
      );

      const overlays = animations
        .map((event) => {
          const target = event.targetSelector ? document.querySelector(event.targetSelector) : null;

          if (target) {
            const rect = target.getBoundingClientRect();
            return {
              id: event.id,
              type: event.type,
              payload: event.payload,
              isRTL,
              rect: {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height,
              },
            };
          } else if (!event.targetSelector) {
            // Global Overlay (Full Screen)
            return {
              id: event.id,
              type: event.type,
              payload: event.payload,
              isRTL,
              rect: {
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
              },
            };
          }
          return null;
        })
        .filter(Boolean);

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
    <div className='fixed inset-0 pointer-events-none z-[9999]' id='dynamic-overlay-layer'>
      {/* Global Eid Gradient for Navbar Icons */}
      <EidNavbarGradient customGradient={customGradient} />

      {/* --- Virtual Cursor --- */}
      <VirtualCursor
        activeCursorEvent={activeCursorEvent}
        isMouseInWindow={isMouseInWindow}
        mouseX={mouseX}
        mouseY={mouseY}
      />

      {/* --- Active Overlays & Animations --- */}
      {activeOverlays.map((overlay) => {
        const { payload, id, rect, type } = overlay;

        // 1. Snow Pile (Accumulation)
        if (id.includes('pile')) {
          return <SnowPile key={id} id={id} rect={rect} />;
        }

        // 2. Snow Particles (Falling)
        if (id.includes('snow')) {
          return <SnowParticles key={id} id={id} />;
        }

        // 3. Walking Character
        if (type === 'WALKING_COW') {
          return <WalkingCowOverlay key={id} id={id} payload={payload} rect={rect} />;
        }

        // 4. Standard Animations (Dragon, Icons, Text)
        return <StandardOverlay key={id} id={id} payload={payload} rect={rect} isRTL={isRTL} />;
      })}
    </div>
  );
};
