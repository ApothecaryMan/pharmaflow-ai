import React from 'react';

export function GalacticBlackHole() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <style>{`
        @keyframes bh-spin { 100% { transform: rotate(360deg); } }
        @keyframes bh-pulse { 50% { filter: blur(4px) brightness(1.5); } }
        @keyframes bh-suck { 
          0% { transform: scale(1.5) rotate(0deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(0.5) rotate(180deg); opacity: 0; }
        }
        .bh-disk { transform-origin: 64px 64px; animation: bh-spin 6s linear infinite; }
        .bh-disk-reverse { transform-origin: 64px 64px; animation: bh-spin 8s linear infinite reverse; }
        .bh-particle { transform-origin: 64px 64px; animation: bh-suck 3s cubic-bezier(0.1, 0.8, 0.9, 0.2) infinite; }
        .bh-glow { animation: bh-pulse 4s ease-in-out infinite; }
      `}</style>
      <defs>
        <radialGradient id='bh-grad-1' cx='50%' cy='50%' r='50%'>
          <stop offset='60%' stopColor='#000000' stopOpacity='0' />
          <stop offset='85%' stopColor='#9333ea' stopOpacity='0.8' />
          <stop offset='100%' stopColor='#f97316' stopOpacity='0' />
        </radialGradient>
        <radialGradient id='bh-grad-2' cx='50%' cy='50%' r='50%'>
          <stop offset='50%' stopColor='#000000' stopOpacity='0' />
          <stop offset='75%' stopColor='#f97316' stopOpacity='0.9' />
          <stop offset='90%' stopColor='#9333ea' stopOpacity='0.4' />
          <stop offset='100%' stopColor='#000000' stopOpacity='0' />
        </radialGradient>
      </defs>
      <circle cx='64' cy='64' r='64' fill='url(#bh-grad-1)' className='bh-disk bh-glow' />
      <circle cx='64' cy='64' r='58' fill='url(#bh-grad-2)' className='bh-disk-reverse' />
      
      {/* Outer rings only, keeping center empty */}
      
      {/* Particles Removed */}
    </svg>
  );
}
