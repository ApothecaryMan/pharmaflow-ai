import React, { useEffect, useState } from 'react';
import { EventManager, type EventContext } from '../../utils/events/eventManager';
import { useSettings } from '../../context';

/**
 * DynamicEventLayer - A global component that applies dynamic effects
 * based on active events (e.g., custom cursors, animations).
 */
export const DynamicEventLayer: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '');
  const { activeBranchId, language } = useSettings();
  
  // We can get orgId and employeeId from storage or other contexts if needed
  // For now, let's build the context object
  const context: EventContext = {
    currentPath,
    branchId: activeBranchId,
    // Add orgId and employeeId when available from your auth system
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    // 1. Resolve Active Cursors
    const activeCursors = EventManager.getActiveCursors(context);

    // Clean up previous styles
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
          // Target specific component
          cssRules += `
            ${cursor.selector}, ${cursor.selector} * {
              cursor: ${cursorUrl}, auto !important;
            }
          `;
        } else {
          // Global target
          document.documentElement.style.setProperty('--global-cursor', cursorUrl);
          document.documentElement.style.setProperty('--global-pointer', cursorUrl);
          document.body.classList.add('has-custom-cursor');
        }
      });

      styleEl.textContent = cssRules;
      document.head.appendChild(styleEl);
    } else {
      document.documentElement.style.removeProperty('--global-cursor');
      document.documentElement.style.removeProperty('--global-pointer');
      document.body.classList.remove('has-custom-cursor');
    }

    // 2. Future: Resolve Animations, Banners, etc.
  }, [currentPath, activeBranchId]);

  return null;
};
