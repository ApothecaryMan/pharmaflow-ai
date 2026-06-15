import React from 'react';

export function CryoVaporNexus() {
  const iceCrystals = [];
  const N = 12; // 12 ice crystals around the edge
  for (let i = 0; i < N; i++) {
    const angle = ((i * 360) / N) * (Math.PI / 180);
    // Base position for the crystal on the perimeter (R=59, outside the face)
    const x = 64 + 59 * Math.sin(angle);
    const y = 64 - 59 * Math.cos(angle);
    const rotation = (i * 360) / N;
    const isMajor = i % 3 === 0; // Every 3rd crystal is larger
    iceCrystals.push({ x, y, rotation, isMajor, index: i });
  }

  // Generate steam/vapor orbs
  const steamOrbs = [];
  for (let i = 0; i < 8; i++) {
    const angle = ((i * 360) / 8) * (Math.PI / 180);
    const r = 58 + Math.random() * 6; // random distance between 58 and 64
    const x = 64 + r * Math.sin(angle);
    const y = 64 - r * Math.cos(angle);
    steamOrbs.push({ x, y, delay: i * 0.5, size: 6 + Math.random() * 4 });
  }

  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <defs>
        {/* Steam blur filter */}
        <filter id='cvn-steam-blur'>
          <feGaussianBlur stdDeviation='3.5' />
        </filter>
        {/* Ice crystal gradient */}
        <linearGradient id='cvn-ice-grad' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor='#ffffff' stopOpacity='0.95' />
          <stop offset='50%' stopColor='#7dd3fc' stopOpacity='0.7' />
          <stop offset='100%' stopColor='#0ea5e9' stopOpacity='0.1' />
        </linearGradient>
      </defs>

      <style>{`
        @keyframes cvn-spin-cw { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes cvn-spin-ccw { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        
        /* The liquid flow simulation */
        @keyframes cvn-water-ripple { 
          0% { transform: scale(0.98) rotate(0deg); stroke-width: 1.5; } 
          50% { transform: scale(1.02) rotate(180deg); stroke-width: 2.5; filter: drop-shadow(0 0 5px #0ea5e9); } 
          100% { transform: scale(0.98) rotate(360deg); stroke-width: 1.5; } 
        }
        
        /* The vapor fade */
        @keyframes cvn-steam-fade {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.65; transform: scale(1.5); }
        }
        
        /* Ice shimmer */
        @keyframes cvn-ice-shimmer {
          0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 2px #7dd3fc); }
          50% { opacity: 1; filter: drop-shadow(0 0 8px #ffffff); }
        }
        
        /* Frost particles bobbing */
        @keyframes cvn-float-up {
          0% { transform: translateY(2px) scale(0.9); }
          50% { transform: translateY(-4px) scale(1.1); opacity: 1; }
          100% { transform: translateY(2px) scale(0.9); }
        }
        
        .cvn-origin { transform-origin: 64px 64px; }
        .cvn-water { animation: cvn-water-ripple 9s ease-in-out infinite; }
        .cvn-spin-slow { animation: cvn-spin-cw 40s linear infinite; }
        .cvn-spin-fast { animation: cvn-spin-ccw 25s linear infinite; }
        .cvn-steam { animation: cvn-steam-fade 6s ease-in-out infinite; }
        .cvn-ice { animation: cvn-ice-shimmer 4s ease-in-out infinite; }
      `}</style>

      <g opacity='0.95'>
        {/* === ELEMENT 1: WATER (Liquid Currents) === */}
        {/* We use multiple off-center circles rotating in different directions to simulate a dynamic flowing envelope of liquid water */}
        <g className='cvn-origin cvn-water'>
          <circle
            cx='62'
            cy='64'
            r='53'
            stroke='#0284c7'
            strokeWidth='1.5'
            fill='none'
            opacity='0.7'
            className='cvn-origin cvn-spin-slow'
          />
          <circle
            cx='66'
            cy='62'
            r='55'
            stroke='#0ea5e9'
            strokeWidth='2'
            fill='none'
            opacity='0.8'
            className='cvn-origin cvn-spin-fast'
          />
          <circle
            cx='64'
            cy='66'
            r='54'
            stroke='#38bdf8'
            strokeWidth='1.5'
            fill='none'
            opacity='0.6'
            className='cvn-origin cvn-spin-slow'
            style={{ animationDirection: 'reverse' }}
          />
          <circle
            cx='63'
            cy='63'
            r='56'
            stroke='#7dd3fc'
            strokeWidth='2.5'
            strokeDasharray='20 30 10 40'
            fill='none'
            opacity='0.9'
            className='cvn-origin cvn-spin-fast'
          />
        </g>

        {/* === ELEMENT 2: STEAM / VAPOR === */}
        {/* Two counter-rotating layers of blurred orbs that swell and fade, creating dry-ice style fog */}
        <g className='cvn-origin cvn-spin-cw' style={{ animationDuration: '60s' }}>
          {steamOrbs.map((orb, i) => (
            <circle
              key={`steam-${i}`}
              cx={orb.x}
              cy={orb.y}
              r={orb.size}
              fill='#e0f2fe'
              filter='url(#cvn-steam-blur)'
              className='cvn-origin cvn-steam'
              style={{ animationDelay: `${orb.delay}s` }}
            />
          ))}
          <g className='cvn-origin cvn-spin-ccw' style={{ animationDuration: '45s' }}>
            {steamOrbs.map((orb, i) => (
              <circle
                key={`steam2-${i}`}
                cx={128 - orb.x}
                cy={128 - orb.y}
                r={orb.size * 1.2}
                fill='#ffffff'
                filter='url(#cvn-steam-blur)'
                className='cvn-origin cvn-steam'
                style={{ animationDelay: `${orb.delay + 0.5}s`, animationDuration: '8s' }}
              />
            ))}
          </g>
        </g>

        {/* === ELEMENT 3: ICE CRYSTALS === */}
        {/* Sharp, geometric shards protruding outwards, with glowing frosty rings connecting them */}
        <g className='cvn-origin cvn-spin-slow'>
          {/* Inner Frost connecting lines */}
          <circle
            cx='64'
            cy='64'
            r='59'
            stroke='#bae6fd'
            strokeWidth='0.5'
            strokeDasharray='1 6'
            fill='none'
            opacity='0.8'
          />
          <circle
            cx='64'
            cy='64'
            r='58'
            stroke='#e0f2fe'
            strokeWidth='1'
            strokeDasharray='4 12'
            fill='none'
            opacity='0.5'
          />

          {iceCrystals.map((c) => (
            <g
              key={`ice-${c.index}`}
              transform={`translate(${c.x}, ${c.y}) rotate(${c.rotation})`}
              className='cvn-ice'
              style={{ animationDelay: `${c.index * 0.3}s` }}
            >
              {/* The sharp frozen polygon */}
              <polygon
                points={c.isMajor ? '0,-12 5,0 0,16 -5,0' : '0,-8 3,0 0,10 -3,0'}
                fill='url(#cvn-ice-grad)'
                stroke='#ffffff'
                strokeWidth={c.isMajor ? '0.8' : '0.4'}
              />
              {/* The bright central core reflection for major crystals */}
              {c.isMajor && <polygon points='0,-8 2,0 0,10 -2,0' fill='#ffffff' opacity='0.8' />}
            </g>
          ))}
        </g>

        {/* === ELEMENT 4: FLOATING FROST / SNOWFLAKES === */}
        {/* Small crisp dots that bob up and down asynchronously */}
        <g className='cvn-origin' style={{ animation: 'cvn-spin-ccw 90s linear infinite' }}>
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = ((i * 360) / 16) * (Math.PI / 180);
            const x = 64 + 61 * Math.sin(angle);
            const y = 64 - 61 * Math.cos(angle);
            return (
              <circle
                key={`frost-${i}`}
                cx={x}
                cy={y}
                r={i % 2 === 0 ? 1 : 0.5}
                fill='#ffffff'
                opacity='0.8'
                style={{
                  animation: `cvn-float-up ${3 + (i % 3)}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                  transformOrigin: `${x}px ${y}px`,
                }}
              />
            );
          })}
        </g>
      </g>
    </svg>
  );
}
