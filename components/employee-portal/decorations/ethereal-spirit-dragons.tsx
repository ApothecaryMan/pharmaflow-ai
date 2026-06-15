import React from 'react';

export function EtherealSpiritDragons() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <style>{`
        @keyframes esd-spin { 100% { transform: rotate(360deg); } }
        @keyframes esd-tail { 0%, 100% { opacity: 0.8; stroke-width: 4; } 50% { opacity: 0.3; stroke-width: 1; } }
        .esd-container { transform-origin: 64px 64px; animation: esd-spin 5s linear infinite; }
        .esd-glow { filter: drop-shadow(0 0 6px currentColor); }
      `}</style>

      <g className='esd-container'>
        {/* Dragon 1 (Blue) */}
        <g stroke='#2dd4bf' fill='none' strokeLinecap='round'>
          <path d='M64,4 A60,60 0 0,1 124,64' strokeWidth='4' className='esd-glow' opacity='0.9' />
          <path d='M124,64 A60,60 0 0,1 64,124' strokeWidth='2' opacity='0.4' />
          <path d='M64,124 A60,60 0 0,1 4,64' strokeWidth='0.5' opacity='0.1' />
          {/* Head */}
          <polygon points='64,0 72,4 64,8' fill='#2dd4bf' className='esd-glow' />
        </g>

        {/* Dragon 2 (Gold) */}
        <g stroke='#fbbf24' fill='none' strokeLinecap='round'>
          <path d='M64,124 A60,60 0 0,1 4,64' strokeWidth='4' className='esd-glow' opacity='0.9' />
          <path d='M4,64 A60,60 0 0,1 64,4' strokeWidth='2' opacity='0.4' />
          <path d='M64,4 A60,60 0 0,1 124,64' strokeWidth='0.5' opacity='0.1' />
          {/* Head */}
          <polygon points='64,128 56,124 64,120' fill='#fbbf24' className='esd-glow' />
        </g>
      </g>
    </svg>
  );
}
