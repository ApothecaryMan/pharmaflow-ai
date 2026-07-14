export function NeonCosmicVortex() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Neon cosmic vortex</title>
      <style>{`
        @keyframes vortex-spin-cw { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes vortex-spin-ccw { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        @keyframes particle-pulse { 0%, 100% { opacity: 0.5; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        .vortex-origin { transform-box: fill-box; transform-origin: 50% 50%; }
        .spin-fast { animation: vortex-spin-cw 4s linear infinite; }
        .spin-med-rev { animation: vortex-spin-ccw 6s linear infinite; }
        .spin-slow { animation: vortex-spin-cw 9s linear infinite; }
        .spin-slower-rev { animation: vortex-spin-ccw 12s linear infinite; }
        .pulse-glow { animation: particle-pulse 3s ease-in-out infinite; }
      `}</style>
      <g opacity='0.95'>
        <circle cx='64' cy='64' r='56' stroke='#5B21B6' strokeWidth='12' opacity='0.25' />
        <circle cx='64' cy='64' r='54' stroke='#D946EF' strokeWidth='8' opacity='0.2' />
        <circle cx='64' cy='64' r='58' stroke='#06B6D4' strokeWidth='6' opacity='0.15' />
        <g className='vortex-origin spin-slower-rev'>
          <circle
            cx='64'
            cy='64'
            r='57'
            stroke='#7C3AED'
            strokeWidth='4'
            strokeDasharray='40 80 20 60'
            strokeLinecap='round'
            opacity='0.7'
          />
          <circle
            cx='64'
            cy='64'
            r='52'
            stroke='#8B5CF6'
            strokeWidth='2'
            strokeDasharray='10 40 80 30'
            strokeLinecap='round'
            opacity='0.6'
          />
        </g>
        <g className='vortex-origin spin-slow'>
          <circle
            cx='64'
            cy='64'
            r='55'
            stroke='#E879F9'
            strokeWidth='3'
            strokeDasharray='60 30 10 80'
            strokeLinecap='round'
            opacity='0.9'
          />
          <circle
            cx='64'
            cy='64'
            r='60'
            stroke='#D946EF'
            strokeWidth='1.5'
            strokeDasharray='20 60 40 50'
            strokeLinecap='round'
            opacity='0.8'
          />
          <circle
            cx='64'
            cy='64'
            r='50'
            stroke='#F472B6'
            strokeWidth='2.5'
            strokeDasharray='15 90 30 70'
            strokeLinecap='round'
            opacity='0.85'
          />
        </g>
        <g className='vortex-origin spin-med-rev'>
          <circle
            cx='64'
            cy='64'
            r='58'
            stroke='#22D3EE'
            strokeWidth='2'
            strokeDasharray='30 70 15 50'
            strokeLinecap='round'
          />
          <circle
            cx='64'
            cy='64'
            r='53'
            stroke='#06B6D4'
            strokeWidth='3'
            strokeDasharray='5 40 80 60'
            strokeLinecap='round'
          />
          <circle
            cx='64'
            cy='64'
            r='62'
            stroke='#67E8F9'
            strokeWidth='1'
            strokeDasharray='50 100 10 40'
            strokeLinecap='round'
            opacity='0.7'
          />
        </g>
        <g className='vortex-origin spin-fast'>
          <circle
            cx='64'
            cy='64'
            r='56'
            stroke='#FFFFFF'
            strokeWidth='1.5'
            strokeDasharray='4 120 2 80'
            strokeLinecap='round'
            opacity='0.9'
          />
          <circle
            cx='64'
            cy='64'
            r='54'
            stroke='#FFFFFF'
            strokeWidth='1'
            strokeDasharray='10 150 4 60'
            strokeLinecap='round'
            opacity='0.7'
          />
        </g>
        <g className='vortex-origin spin-slow'>
          <circle cx='64' cy='6' r='1.5' fill='#22D3EE' className='pulse-glow' />
          <circle cx='118' cy='44' r='1' fill='#22D3EE' />
          <circle cx='18' cy='94' r='1.2' fill='#06B6D4' />
          <circle cx='98' cy='112' r='1' fill='#67E8F9' className='pulse-glow' />
          <circle cx='20' cy='30' r='1.5' fill='#E879F9' className='pulse-glow' />
          <circle cx='104' cy='24' r='1.2' fill='#D946EF' />
          <circle cx='12' cy='64' r='1' fill='#F472B6' />
          <circle cx='74' cy='120' r='1.5' fill='#E879F9' className='pulse-glow' />
        </g>
        <g className='vortex-origin spin-med-rev'>
          <circle cx='44' cy='10' r='1' fill='#FFFFFF' />
          <circle cx='110' cy='84' r='1.5' fill='#FFFFFF' className='pulse-glow' />
          <circle cx='34' cy='114' r='1' fill='#E879F9' />
          <circle cx='6' cy='44' r='1.2' fill='#22D3EE' />
          <circle cx='94' cy='12' r='1' fill='#D946EF' />
        </g>
        <circle cx='28' cy='28' r='0.8' fill='#FFFFFF' />
        <circle cx='100' cy='100' r='0.8' fill='#FFFFFF' />
        <circle cx='102' cy='36' r='1' fill='#FFFFFF' opacity='0.6' />
        <circle cx='26' cy='102' r='1' fill='#FFFFFF' opacity='0.6' />
      </g>
    </svg>
  );
}
