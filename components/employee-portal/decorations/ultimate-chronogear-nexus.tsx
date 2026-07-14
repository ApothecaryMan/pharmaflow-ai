export function UltimateChronogearNexus() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Ultimate chronogear nexus</title>
      <style>{`
        @keyframes spin-cw { 100% { transform: rotate(360deg); } }
        @keyframes spin-ccw { 100% { transform: rotate(-360deg); } }
        @keyframes local-spin-cw { 100% { transform: rotate(360deg); } }
        @keyframes local-spin-ccw { 100% { transform: rotate(-360deg); } }
        @keyframes glow-pulse { 0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 2px #06B6D4); transform: scale(0.99); } 50% { opacity: 1; filter: drop-shadow(0 0 6px #22D3EE); transform: scale(1.01); } }
        .center-org { transform-box: view-box; transform-origin: 64px 64px; }
        .gear-slow { animation: spin-cw 20s linear infinite; }
        .gear-rev { animation: spin-ccw 16s linear infinite; }
        .cog-cw { animation: local-spin-cw 6s linear infinite; }
        .cog-ccw { animation: local-spin-ccw 6s linear infinite; }
        .time-sweep { animation: spin-cw 3s linear infinite; }
        .time-tick { animation: spin-cw 12s steps(12, end) infinite; }
        .power-glow { animation: glow-pulse 2s ease-in-out infinite; }
      `}</style>

      <defs>
        <g id='magic-cog'>
          <circle cx='0' cy='0' r='12' stroke='#92400E' strokeWidth='3.5' strokeDasharray='4 3' />
          <circle cx='0' cy='0' r='9' stroke='#F59E0B' strokeWidth='1.5' />
          <path
            d='M-9,0 L9,0 M0,-9 L0,9 M-6.3,-6.3 L6.3,6.3 M-6.3,6.3 L6.3,-6.3'
            stroke='#D97706'
            strokeWidth='1'
          />
          <circle cx='0' cy='0' r='3.5' fill='#0284C7' />
          <circle cx='0' cy='0' r='1.5' fill='#38BDF8' />
        </g>
      </defs>

      <g opacity='0.98'>
        <circle
          cx='64'
          cy='64'
          r='54'
          stroke='var(--svg-color, #06B6D4)'
          strokeWidth='2'
          opacity='0.4'
          className='power-glow center-org'
        />

        <g className='center-org gear-rev'>
          <circle cx='64' cy='64' r='58' stroke='#78350F' strokeWidth='6' strokeDasharray='6 6' />
          <circle cx='64' cy='64' r='55' stroke='#B45309' strokeWidth='2' />
        </g>

        <g className='center-org gear-slow'>
          <circle cx='64' cy='64' r='53' stroke='#0369A1' strokeWidth='2' strokeDasharray='10 6' />
          <circle cx='64' cy='64' r='53' stroke='#38BDF8' strokeWidth='0.8' />
          <circle
            cx='64'
            cy='64'
            r='51'
            stroke='#7C3AED'
            strokeWidth='1'
            strokeDasharray='2 4'
            opacity='0.8'
          />
        </g>

        <g transform='translate(23, 23)'>
          <g className='cog-cw' style={{ transformOrigin: '0px 0px' }}>
            <use href='#magic-cog' />
          </g>
        </g>
        <g transform='translate(105, 23)'>
          <g className='cog-ccw' style={{ transformOrigin: '0px 0px' }}>
            <use href='#magic-cog' />
          </g>
        </g>
        <g transform='translate(23, 105)'>
          <g className='cog-ccw' style={{ transformOrigin: '0px 0px' }}>
            <use href='#magic-cog' />
          </g>
        </g>
        <g transform='translate(105, 105)'>
          <g className='cog-cw' style={{ transformOrigin: '0px 0px' }}>
            <use href='#magic-cog' />
          </g>
        </g>

        <g
          className='center-org gear-slow'
          stroke='#67E8F9'
          strokeWidth='1'
          strokeLinecap='round'
          opacity='0.9'
        >
          <path d='M58,12 L61,18 M61,12 L58,18 M64,12 L64,18 M67,12 L67,18' />
          <path d='M111,61 L111,67 M114,61 L114,67 M117,61 L117,67' />
          <path d='M60,110 L62,116 L64,110 M67,110 L67,116' />
          <path d='M12,61 L12,67 M15,61 L18,67 M18,61 L15,67' />
        </g>

        <g className='center-org time-sweep'>
          <path
            d='M 64,4 A 60,60 0 0,1 124,64'
            stroke='var(--svg-color, #06B6D4)'
            strokeWidth='1'
            fill='none'
            strokeLinecap='round'
            opacity='0.4'
          />
          <path
            d='M 64,4 A 60,60 0 0,1 94,14'
            stroke='#22D3EE'
            strokeWidth='2.5'
            fill='none'
            strokeLinecap='round'
          />
          <path
            d='M 64,4 A 60,60 0 0,1 78,6'
            stroke='#FFF'
            strokeWidth='4'
            fill='none'
            strokeLinecap='round'
          />
          <circle cx='64' cy='4' r='3.5' fill='#FFF' />
          <circle cx='64' cy='4' r='7' fill='var(--svg-color, #22D3EE)' className='power-glow' />
        </g>

        <g className='center-org time-tick'>
          <polygon points='64,2 67,7 64,12 61,7' fill='#FFF' />
          <polygon points='64,2 67,7 64,12 61,7' fill='#F59E0B' opacity='0.7' />
          <circle cx='64' cy='7' r='1.5' fill='#0F172A' />
        </g>

        <g fill='#0F172A' stroke='var(--svg-color, #22D3EE)' strokeWidth='1.5'>
          <rect x='61' y='1' width='6' height='4' rx='1' />
          <rect x='61' y='123' width='6' height='4' rx='1' />
          <rect x='61' y='1' width='6' height='4' rx='1' transform='rotate(90, 64, 64)' />
          <rect x='61' y='123' width='6' height='4' rx='1' transform='rotate(90, 64, 64)' />
        </g>
      </g>
    </svg>
  );
}
