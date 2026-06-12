import React from 'react';

export function ArcaneMagicRunes() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <style>{`
        @keyframes amr-spin-cw { 100% { transform: rotate(360deg); } }
        @keyframes amr-spin-ccw { 100% { transform: rotate(-360deg); } }
        @keyframes amr-pulse { 0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 2px #fbbf24); } 50% { opacity: 1; filter: drop-shadow(0 0 8px #38bdf8); } }
        .amr-ring-1 { transform-origin: 64px 64px; animation: amr-spin-cw 12s linear infinite; }
        .amr-ring-2 { transform-origin: 64px 64px; animation: amr-spin-ccw 16s linear infinite; }
        .amr-ring-3 { transform-origin: 64px 64px; animation: amr-spin-cw 24s linear infinite; }
        .amr-rune { animation: amr-pulse 4s ease-in-out infinite; }
      `}</style>
      
      <g className='amr-ring-1'>
        <circle cx='64' cy='64' r='62' stroke='#fbbf24' strokeWidth='0.5' opacity='0.8' />
        <circle cx='64' cy='64' r='60' stroke='#38bdf8' strokeWidth='1.5' strokeDasharray='20 10 5 10' opacity='0.6' />
        {/* Runes */ }
        <path d='M64,6 L60,10 L68,14 Z' fill='#fbbf24' className='amr-rune' />
        <path d='M122,64 L118,60 L114,68 Z' fill='#fbbf24' className='amr-rune' style={{animationDelay:'1s'}} />
        <path d='M64,122 L68,118 L60,114 Z' fill='#fbbf24' className='amr-rune' style={{animationDelay:'2s'}} />
        <path d='M6,64 L10,68 L14,60 Z' fill='#fbbf24' className='amr-rune' style={{animationDelay:'3s'}} />
      </g>

      <g className='amr-ring-2'>
        <circle cx='64' cy='64' r='54' stroke='#0ea5e9' strokeWidth='1' strokeDasharray='40 20' opacity='0.7' />
        <polygon points='64,10 68,16 60,16' fill='#0284c7' className='amr-rune' />
        <polygon points='118,64 112,60 112,68' fill='#0284c7' className='amr-rune' />
        <polygon points='64,118 60,112 68,112' fill='#0284c7' className='amr-rune' />
        <polygon points='10,64 16,68 16,60' fill='#0284c7' className='amr-rune' />
      </g>

      <g className='amr-ring-3'>
        <circle cx='64' cy='64' r='48' stroke='#f59e0b' strokeWidth='0.5' opacity='0.5' />
        <text x='64' y='20' fill='#fbbf24' fontSize='8' textAnchor='middle' className='amr-rune' style={{fontFamily:'monospace'}}>▲</text>
        <text x='110' y='67' fill='#fbbf24' fontSize='8' textAnchor='middle' className='amr-rune' style={{fontFamily:'monospace'}}>▼</text>
        <text x='64' y='114' fill='#fbbf24' fontSize='8' textAnchor='middle' className='amr-rune' style={{fontFamily:'monospace'}}>▲</text>
        <text x='18' y='67' fill='#fbbf24' fontSize='8' textAnchor='middle' className='amr-rune' style={{fontFamily:'monospace'}}>▼</text>
      </g>
    </svg>
  );
}
