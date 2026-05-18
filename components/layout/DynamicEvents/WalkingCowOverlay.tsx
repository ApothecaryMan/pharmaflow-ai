import React from 'react';
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
          bottom: 0,
        }}
        animate={{
          x: [0, widthVal - 55, widthVal - 55, 0, 0],
          scaleX: [1, 1, -1, -1, 1],
        }}
        transition={{
          duration: payload.speed || 30,
          ease: 'linear',
          repeat: Infinity,
          times: [0, 0.47, 0.50, 0.97, 1.0],
        }}
      >
        <SVGCow />
      </motion.div>
    </div>
  );
};
