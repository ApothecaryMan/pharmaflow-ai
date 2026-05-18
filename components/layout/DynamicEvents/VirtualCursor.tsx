import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VirtualCursorProps {
  activeCursorEvent: any;
  isMouseInWindow: boolean;
  mouseX: any;
  mouseY: any;
}

export const VirtualCursor: React.FC<VirtualCursorProps> = ({
  activeCursorEvent,
  isMouseInWindow,
  mouseX,
  mouseY,
}) => {
  return (
    <AnimatePresence>
      {activeCursorEvent && isMouseInWindow && (
        <motion.div
          key='virtual-cursor'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed top-0 left-0 pointer-events-none z-[10000]'
          style={{
            x: mouseX,
            y: mouseY,
            willChange: 'transform',
          }}
        >
          <div className='relative'>
            <img
              src={activeCursorEvent.payload}
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                transform: 'translate(-50%, -50%)',
              }}
              alt=''
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
