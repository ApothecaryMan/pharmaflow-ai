import React from 'react';

export function NeonCyberHex() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <style>{`
        @keyframes ch-spin { 100% { transform: rotate(360deg); } }
        @keyframes ch-flicker { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.2; } }
        @keyframes ch-scan { 0% { transform: translateY(-70px); } 100% { transform: translateY(70px); } }
        .ch-ring { transform-origin: 64px 64px; animation: ch-spin 10s linear infinite; }
        .ch-hex-1 { animation: ch-flicker 2s step-end infinite; }
        .ch-hex-2 { animation: ch-flicker 3s step-end infinite; animation-delay: 0.5s; }
        .ch-hex-3 { animation: ch-flicker 1.5s step-end infinite; animation-delay: 1.2s; }
        .ch-scanner { animation: ch-scan 3s ease-in-out infinite alternate; }
      `}</style>
      <g opacity='0.85'>
        {/* Outer Tech Ring */}
        <g className='ch-ring'>
          <circle cx='64' cy='64' r='62' stroke='#06b6d4' strokeWidth='1' strokeDasharray='10 15 30 5 5 20' opacity='0.7' />
          <circle cx='64' cy='64' r='58' stroke='#d946ef' strokeWidth='1.5' strokeDasharray='40 10 5 10' opacity='0.5' />
          <path d='M64,2 L64,8 M64,120 L64,126 M2,64 L8,64 M120,64 L126,64' stroke='#22d3ee' strokeWidth='2' />
        </g>
        
        {/* Hexagons */}
        <g stroke='#22d3ee' strokeWidth='1' fill='none' opacity='0.6'>
          <polygon points='30,20 40,14 50,20 50,32 40,38 30,32' className='ch-hex-1' />
          <polygon points='98,90 108,84 118,90 118,102 108,108 98,102' className='ch-hex-2' stroke='#d946ef' />
          <polygon points='10,70 20,64 30,70 30,82 20,88 10,82' className='ch-hex-3' />
          <polygon points='80,15 90,9 100,15 100,27 90,33 80,27' className='ch-hex-1' stroke='#d946ef' />
        </g>

        {/* Scanner Line Removed */}
      </g>
      <defs>
      </defs>
    </svg>
  );
}
