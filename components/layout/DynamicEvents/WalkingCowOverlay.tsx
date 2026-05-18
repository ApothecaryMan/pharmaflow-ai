import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SVGCow } from './SVGCow';

interface WalkingCowOverlayProps {
  id: string;
  payload: any;
  rect: {
    top: number | string;
    left: number | string;
    width: number | string;
    height: number | string;
  };
}

export const WalkingCowOverlay: React.FC<WalkingCowOverlayProps> = ({ id, payload, rect }) => {
  const widthVal = typeof rect.width === 'number' ? rect.width : parseFloat(rect.width) || 1200;
  const [isJumping, setIsJumping] = useState(false);

  const handleMouseEnter = () => {
    if (!isJumping) {
      setIsJumping(true);
      setTimeout(() => {
        setIsJumping(false);
      }, 750);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const prevPointerEvents = target.style.pointerEvents;
    
    // Temporarily disable pointer events to click through
    target.style.pointerEvents = 'none';

    try {
      const elementBehind = document.elementFromPoint(e.clientX, e.clientY);
      if (elementBehind) {
        // Dispatch a real click event to the element behind
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: e.clientX,
          clientY: e.clientY
        });
        elementBehind.dispatchEvent(clickEvent);
      }
    } catch (err) {
      console.error('Failed to forward click:', err);
    } finally {
      target.style.pointerEvents = prevPointerEvents;
    }
  };

  return (
    <div
      key={id}
      className='absolute pointer-events-none overflow-hidden'
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        zIndex: 9999,
      }}
    >
      <motion.div
        style={{
          display: 'inline-block',
          position: 'absolute',
          left: 0,
          bottom: 0,
        }}
        animate={{
          x: [0, widthVal - 55, widthVal - 55, widthVal - 55, 0, 0, 0],
          scaleX: [1, 1, 0, -1, -1, 0, 1],
        }}
        transition={{
          duration: payload.speed || 30,
          ease: 'linear',
          repeat: Infinity,
          times: [0, 0.47, 0.485, 0.50, 0.97, 0.985, 1.0],
        }}
      >
        <motion.div
          animate={
            isJumping
              ? {
                  y: [0, 2, -18, -20, 3, -1, 0],
                  scaleY: [1, 0.75, 1.25, 1.2, 0.8, 1.05, 1],
                  scaleX: [1, 1.2, 0.8, 0.85, 1.2, 0.96, 1],
                  rotate: [0, 0, -10, 10, -3, 1, 0],
                }
              : {}
          }
          transition={{
            duration: 0.75,
            ease: 'easeInOut',
          }}
          className='pointer-events-auto cursor-pointer select-none'
          onMouseEnter={handleMouseEnter}
          onTouchStart={handleMouseEnter}
          onClick={handleClick}
        >
          <SVGCow />
        </motion.div>
      </motion.div>
    </div>
  );
};
