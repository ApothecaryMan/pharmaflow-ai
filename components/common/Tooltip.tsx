import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * A highly reusable, Smart Tooltip component.
 * Uses React Portal to render outside parent stacking contexts.
 * Automatically adjusts position to stay within viewport.
 */

interface TooltipProps {
  children: ReactNode;
  content: string | ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
  tooltipClassName?: string;
  triggerClassName?: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  position = 'top',
  className = "",
  tooltipClassName = "",
  triggerClassName = "",
  delay = 300
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowLeft: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>(position);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current || !isVisible) return;
    
    // ... existing logic ...
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect() || { width: 0, height: 0 };
    
    // Gap between trigger and tooltip
    const gap = 8;
    
    // Preferred calculation
    let top = 0;
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2); // Center horizontally
    
    // Vertical Logic (Flip if no space)
    const spaceAbove = triggerRect.top;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const requiredHeight = tooltipRect.height + gap;

    let finalPlacement = position;

    // If preferred is top but not enough space, and there is space below -> flip to bottom
    if (position === 'top' && spaceAbove < requiredHeight && spaceBelow > requiredHeight) {
      finalPlacement = 'bottom';
    } 
    // If preferred is bottom but not enough space, and there is space above -> flip to top
    else if (position === 'bottom' && spaceBelow < requiredHeight && spaceAbove > requiredHeight) {
      finalPlacement = 'top';
    }

    if (finalPlacement === 'top') {
        top = triggerRect.top - tooltipRect.height - gap;
    } else {
        top = triggerRect.bottom + gap;
    }

    // Horizontal Logic (Viewport Constrained)
    const viewportWidth = window.innerWidth;
    // Prevent left overflow
    if (left < 10) left = 10;
    // Prevent right overflow
    if (left + tooltipRect.width > viewportWidth - 10) {
        left = viewportWidth - tooltipRect.width - 10;
    }

    // Arrow Logic: Arrow should point to center of trigger
    // Arrow Left relative to Tooltip = (Trigger Center X) - (Tooltip Left X)
    const triggerCenter = triggerRect.left + (triggerRect.width / 2);
    let arrowL = triggerCenter - left;

    // Clamp arrow to be within tooltip (minus border radius/padding)
    // Tooltip width approx known from rect
    if (arrowL < 6) arrowL = 6;
    if (arrowL > tooltipRect.width - 6) arrowL = tooltipRect.width - 6;

    setCoords({ top, left, arrowLeft: arrowL });
    setPlacement(finalPlacement);
  };

  // Recalculate when showing or content changes
  useEffect(() => {
    if (isVisible) {
      updatePosition();
      // Also update on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, content]);

  // Initial layout measurement
  useEffect(() => {
     if (isVisible && tooltipRef.current) {
         updatePosition();
     }
  }, [isVisible]);

  return (
    // Wrapper must not affect layout too much, but preserves className prop
    <div 
        className={`relative w-fit ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Container */}
      <div 
        ref={triggerRef}
        className={`cursor-help flex items-center min-w-0 max-w-full ${triggerClassName}`}
      >
        {children}
      </div>

      {/* Portal Tooltip Content */}
      {isVisible && createPortal(
        <div 
            ref={tooltipRef}
            className={`
                fixed px-2 py-1 
                bg-gray-800 dark:bg-gray-700 text-white text-[10px] 
                rounded-lg z-[9999] shadow-xl border border-gray-700/50
                pointer-events-none whitespace-nowrap
                transition-opacity duration-200
                ${tooltipClassName}
            `}
            style={{ 
                top: coords.top, 
                left: coords.left,
                opacity: coords.top === 0 ? 0 : 1 // Hide until positioned
            }}
        >
            {content}
            
            {/* Arrow */}
            <div 
                className={`
                  absolute w-0 h-0 
                  border-4 border-transparent
                  ${placement === 'top' 
                    ? 'top-full border-t-gray-800 dark:border-t-gray-700' 
                    : 'bottom-full border-b-gray-800 dark:border-b-gray-700'
                  }
                `}
                style={{
                    left: coords.arrowLeft,
                    transform: 'translateX(-50%)' // Center the arrow itself at the calculated point
                }}
            />
        </div>,
        document.body
      )}
    </div>
  );
};
