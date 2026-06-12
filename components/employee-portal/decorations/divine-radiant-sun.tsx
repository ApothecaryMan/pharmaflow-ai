import React from 'react';

export function DivineRadiantSun() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <style>{`
        @keyframes drs-spin { 100% { transform: rotate(360deg); } }
        @keyframes drs-spin-slow { 100% { transform: rotate(-360deg); } }
        @keyframes drs-pulse { 0% { transform: scale(0.8); opacity: 0; } 50% { opacity: 0.6; } 100% { transform: scale(1.3); opacity: 0; } }
        @keyframes drs-glow { 0%, 100% { filter: drop-shadow(0 0 5px #fbbf24); opacity: 0.8; } 50% { filter: drop-shadow(0 0 15px #fef08a); opacity: 1; } }
        .drs-rays { transform-origin: 64px 64px; animation: drs-spin 20s linear infinite; }
        .drs-rays-outer { transform-origin: 64px 64px; animation: drs-spin-slow 30s linear infinite; }
        .drs-ring { transform-origin: 64px 64px; animation: drs-pulse 4s ease-out infinite; }
        .drs-center { animation: drs-glow 3s ease-in-out infinite; }
      `}</style>
      
      {/* Expanding Light Rings */}
      <circle cx='64' cy='64' r='55' stroke='#fef08a' strokeWidth='2' className='drs-ring' style={{animationDelay: '0s'}} />
      <circle cx='64' cy='64' r='55' stroke='#fef08a' strokeWidth='1' className='drs-ring' style={{animationDelay: '2s'}} />
      
      {/* Inner Glowing Sun Rays */}
      <g className='drs-rays drs-center'>
        {Array.from({ length: 12 }).map((_, i) => (
          <polygon
            key={'inner-'+i}
            points='64,-5 68,20 60,20'
            fill='#fbbf24'
            transform={`rotate(${i * 30} 64 64)`}
          />
        ))}
      </g>
      
      {/* Outer Fine Rays */}
      <g className='drs-rays-outer'>
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={'outer-'+i}
            x1='64' y1='-10' x2='64' y2='10'
            stroke={i % 2 === 0 ? '#f59e0b' : '#fcd34d'}
            strokeWidth={i % 2 === 0 ? '1.5' : '0.5'}
            opacity='0.6'
            transform={`rotate(${i * 15} 64 64)`}
          />
        ))}
      </g>
    </svg>
  );
}
