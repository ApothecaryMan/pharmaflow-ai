import { motion } from 'framer-motion';
import React from 'react';

export const PageLoader: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 right-0 h-px bg-zinc-100 dark:bg-zinc-800/50 z-50 overflow-hidden">
      <motion.div
        className="h-full bg-primary-500 dark:bg-white"
        initial={{ x: '-100%' }}
        animate={{ x: '300%' }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: 'easeInOut',
        }}
        style={{ width: '30%' }}
      />
    </div>
  );
};
