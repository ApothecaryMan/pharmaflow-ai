import React from 'react';
import { motion } from 'framer-motion';
import { getIconByName } from '../../../components/common/Icons';

interface StandardOverlayProps {
  id: string;
  payload: any;
  rect: {
    top: number | string;
    left: number | string;
    width: number | string;
    height: number | string;
  };
  isRTL: boolean;
}

export const StandardOverlay: React.FC<StandardOverlayProps> = ({ id, payload, rect, isRTL }) => {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className='absolute pointer-events-none'
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <div className='relative w-full h-full flex items-center justify-center'>
        {payload.img && (
          <img
            src={payload.img}
            className='absolute'
            style={{
              width: payload.size || '40px',
              transform: isRTL && !payload.noFlip ? 'scaleX(-1)' : 'none',
              top: payload.offsetY || '-20px',
              [isRTL ? 'right' : 'left']: payload.offsetX || '-10px',
            }}
            alt=''
          />
        )}

        {payload.icon &&
          (() => {
            const IconComp = getIconByName(payload.icon);
            return (
              <div
                className='absolute'
                style={{
                  top: payload.offsetY || '-20px',
                  [isRTL ? 'right' : 'left']: payload.offsetX || '-10px',
                }}
              >
                <IconComp size={payload.size || 24} color={payload.color} />
              </div>
            );
          })()}

        {payload.text && (
          <motion.div
            className='absolute whitespace-nowrap font-bold'
            animate={payload.animate || { y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              fontSize: payload.size || '20px',
              color: payload.color,
              top: payload.offsetY || '-30px',
              [isRTL ? 'right' : 'left']: payload.offsetX || '0px',
            }}
          >
            {payload.text}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
