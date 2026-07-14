import { motion } from 'framer-motion';
import type React from 'react';

interface SnowPileProps {
  id: string;
  rect: {
    top: number | string;
    left: number | string;
    width: number | string;
    height: number | string;
  };
}

export const SnowPile: React.FC<SnowPileProps> = ({ id: _id, rect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className='absolute pointer-events-none overflow-visible'
      style={{
        top: Number(rect.top) - 10,
        left: rect.left,
        width: rect.width,
        height: '20px',
        zIndex: 1000,
      }}
    >
      <div className='relative w-full h-full flex justify-around items-end px-4'>
        {[...Array(Math.floor(Number(rect.width) / 50 || 10))].map((_, i) => (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: particles have no stable id
            key={`pile-${i}`}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
            className='text-blue-100/80 dark:text-white/40 select-none filter blur-[1px]'
            style={{ fontSize: `${15 + Math.random() * 10}px`, marginBottom: '-5px' }}
          >
            ❄
          </motion.div>
        ))}
        <div className='absolute bottom-0 left-0 right-0 h-[6px] bg-gradient-to-t from-blue-100/40 to-transparent dark:from-white/20 rounded-full blur-[2px]' />
      </div>
    </motion.div>
  );
};
