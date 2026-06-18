import { motion } from 'framer-motion';
import React from 'react';

export const PageLoader: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 right-0 h-[3px] bg-zinc-100 dark:bg-zinc-800/50 z-50 overflow-hidden">
      <motion.div
        className="h-full bg-blue-600 dark:bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
        initial={{ x: '-100%' }}
        animate={{ x: '300%' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeInOut',
        }}
        style={{ width: '40%', borderRadius: '2px' }}
      />
    </div>
  );
};
