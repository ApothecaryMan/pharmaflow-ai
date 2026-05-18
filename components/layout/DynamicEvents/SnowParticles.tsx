import React from 'react';
import { motion } from 'framer-motion';

interface SnowParticlesProps {
  id: string;
}

export const SnowParticles: React.FC<SnowParticlesProps> = ({ id }) => {
  return (
    <div key={id} className='absolute inset-0 overflow-hidden pointer-events-none'>
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ top: '-10%', left: `${Math.random() * 100}%`, opacity: 0 }}
          animate={{
            top: '110vh',
            left: `${Math.random() * 100}%`,
            opacity: [0, 0.8, 0],
            rotate: 360,
          }}
          transition={{
            duration: 5 + Math.random() * 10,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'linear',
          }}
          className='absolute text-blue-400/30 dark:text-white/20 select-none'
          style={{ fontSize: `${10 + Math.random() * 20}px` }}
        >
          ❄
        </motion.div>
      ))}
    </div>
  );
};
