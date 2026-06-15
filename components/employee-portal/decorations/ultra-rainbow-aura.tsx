import React from 'react';

export function UltraRainbowAura() {
  const particles = [];
  const N = 24; // 24 floating rainbow particles
  const colors = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#0ea5e9', // Cyan
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899', // Pink
  ];

  for (let i = 0; i < N; i++) {
    const angle = (i * 360) / N;
    // Alternate base distance
    const r = i % 2 === 0 ? 56 : 60;
    particles.push({
      angle,
      r,
      color: colors[i % colors.length],
      delay: i * 0.15,
      size: i % 3 === 0 ? 2.5 : 1.2,
      type: i % 3, // 0=Radial, 1=Shooting Star, 2=Chaos Wave
    });
  }

  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <defs>
        {/* Magical glow filter */}
        <filter id='urv-glow'>
          <feGaussianBlur stdDeviation='2.5' />
        </filter>

        {/* Full spectrum rainbow gradients */}
        <linearGradient id='urv-rainbow-1' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#ef4444' />
          <stop offset='16%' stopColor='#f97316' />
          <stop offset='33%' stopColor='#eab308' />
          <stop offset='50%' stopColor='#22c55e' />
          <stop offset='66%' stopColor='#0ea5e9' />
          <stop offset='83%' stopColor='#3b82f6' />
          <stop offset='100%' stopColor='#a855f7' />
        </linearGradient>

        <linearGradient id='urv-rainbow-2' x1='100%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor='#ec4899' />
          <stop offset='20%' stopColor='#a855f7' />
          <stop offset='40%' stopColor='#3b82f6' />
          <stop offset='60%' stopColor='#22c55e' />
          <stop offset='80%' stopColor='#eab308' />
          <stop offset='100%' stopColor='#ef4444' />
        </linearGradient>
      </defs>

      <style>{`
        /* Rotations */
        @keyframes urv-spin-cw { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes urv-spin-ccw { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        
        /* The magical hue shift that creates the infinite Ultra Rainbow effect */
        @keyframes urv-hue-shift { 
          0% { filter: hue-rotate(0deg) saturate(1.2); } 
          50% { filter: hue-rotate(180deg) saturate(1.5); }
          100% { filter: hue-rotate(360deg) saturate(1.2); } 
        }
        
        /* Expansion pulse for the rings */
        @keyframes urv-pulse { 
          0%, 100% { transform: scale(0.98); opacity: 0.8; } 
          50% { transform: scale(1.02); opacity: 1; } 
        }
        
        /* Advanced Particle Behaviors */
        @keyframes urv-fly-radial {
          0%, 100% { transform: translateX(0px) scale(0.8); opacity: 0.7; }
          50% { transform: translateX(8px) scale(1.6); opacity: 1; filter: drop-shadow(0 0 6px #ffffff); }
        }
        @keyframes urv-fly-comet {
          0% { transform: translateY(0px) scale(1); opacity: 0.9; }
          40% { transform: translateY(-16px) scale(0.4); opacity: 0; }
          41% { transform: translateY(12px) scale(0.4); opacity: 0; }
          100% { transform: translateY(0px) scale(1); opacity: 0.9; }
        }
        @keyframes urv-fly-chaos {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(5px, -6px) scale(1.3); }
          66% { transform: translate(-3px, -12px) scale(0.7); opacity: 0.5; }
        }
        
        .urv-origin { transform-origin: 64px 64px; }
        .urv-rainbow-engine { animation: urv-hue-shift 3s linear infinite; }
      `}</style>

      {/* The main engine applying the hue-rotation to everything inside */}
      <g className='urv-origin urv-rainbow-engine'>
        {/* Layer 1: Blurred glowing background aura to make it radiate */}
        <circle
          cx='64'
          cy='64'
          r='56'
          stroke='url(#urv-rainbow-1)'
          strokeWidth='6'
          filter='url(#urv-glow)'
          opacity='0.5'
          className='urv-origin'
          style={{ animation: 'urv-pulse 2s ease-in-out infinite' }}
        />

        {/* Layer 2: Fast spinning inner segmented tracks */}
        <g className='urv-origin' style={{ animation: 'urv-spin-cw 8s linear infinite' }}>
          <circle
            cx='64'
            cy='64'
            r='53'
            stroke='url(#urv-rainbow-1)'
            strokeWidth='1.5'
            strokeDasharray='10 5'
            fill='none'
          />
          <circle
            cx='64'
            cy='64'
            r='55'
            stroke='url(#urv-rainbow-2)'
            strokeWidth='1.5'
            strokeDasharray='4 8'
            fill='none'
          />
        </g>

        {/* Layer 3: Slower backward spinning thick dashed energy rings */}
        <g className='urv-origin' style={{ animation: 'urv-spin-ccw 12s linear infinite' }}>
          <circle
            cx='64'
            cy='64'
            r='57'
            stroke='url(#urv-rainbow-2)'
            strokeWidth='2'
            strokeDasharray='20 10 5 10'
            fill='none'
          />
          <circle
            cx='64'
            cy='64'
            r='59'
            stroke='url(#urv-rainbow-1)'
            strokeWidth='3'
            strokeDasharray='2 16'
            fill='none'
            opacity='0.9'
          />
        </g>

        {/* Layer 4: Intense Sunburst Rays shooting outwards */}
        <g className='urv-origin' style={{ animation: 'urv-spin-cw 20s linear infinite' }}>
          <circle
            cx='64'
            cy='64'
            r='57'
            stroke='url(#urv-rainbow-1)'
            strokeWidth='10'
            strokeDasharray='2 30'
            fill='none'
            opacity='0.9'
          />
          <circle
            cx='64'
            cy='64'
            r='59'
            stroke='url(#urv-rainbow-2)'
            strokeWidth='8'
            strokeDasharray='4 40'
            fill='none'
            opacity='0.8'
            style={{ transform: 'rotate(15deg)', transformOrigin: '64px 64px' }}
          />
        </g>

        {/* Layer 5: Advanced Floating Magical Rainbow Particles */}
        <g className='urv-origin' style={{ animation: 'urv-spin-ccw 22s linear infinite' }}>
          {particles.map((p, i) => {
            const animClass =
              p.type === 0 ? 'urv-fly-radial' : p.type === 1 ? 'urv-fly-comet' : 'urv-fly-chaos';
            const duration = p.type === 0 ? '4s' : p.type === 1 ? '2.5s' : '5s';

            return (
              <g key={`particle-wrapper-${i}`} transform={`translate(64, 64) rotate(${p.angle})`}>
                <g
                  style={{
                    animation: `${animClass} ${duration} ease-in-out infinite`,
                    animationDelay: `${p.delay}s`,
                  }}
                >
                  {/* Particle glow */}
                  <circle
                    cx={p.r}
                    cy='0'
                    r={p.size * 1.5}
                    fill={p.color}
                    filter='url(#urv-glow)'
                    opacity='0.8'
                  />
                  {/* Particle solid core */}
                  <circle cx={p.r} cy='0' r={p.size * 0.5} fill='#ffffff' />
                  {/* Tiny cross highlights for larger particles */}
                  {p.size > 2 && (
                    <path
                      d={`M ${p.r - p.size * 1.5} 0 L ${p.r + p.size * 1.5} 0 M ${p.r} ${-p.size * 1.5} L ${p.r} ${p.size * 1.5}`}
                      stroke='#ffffff'
                      strokeWidth='0.5'
                      opacity='0.9'
                    />
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
