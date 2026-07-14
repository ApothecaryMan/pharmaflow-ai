export function Crown() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Crown</title>
      <style>{`
        @keyframes crown-float { 0%, 100% { transform: translateY(-25px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(0.5deg); } }
        @keyframes gem-shimmer { 0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5)); } 50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(255,255,255,0.9)); } }
        .main-crown-group { transform-origin: 64px 35px; animation: crown-float 3.5s ease-in-out infinite; }
        .shimmering-gem { animation: gem-shimmer 2s ease-in-out infinite; }
      `}</style>
      <g transform='translate(0, -26)' className='main-crown-group'>
        <path
          d='M12,52 L20,20 L34,36 L48,12 L62,36 L76,20 L90,36 L104,12 L116,52 Z'
          fill='var(--svg-color, #F5D742)'
          stroke='var(--svg-color, #D4A017)'
          strokeWidth='1.5'
          opacity='0.85'
        />
        <rect
          x='12'
          y='44'
          width='104'
          height='10'
          rx='2'
          fill='var(--svg-color, #F5D742)'
          stroke='var(--svg-color, #D4A017)'
          strokeWidth='1'
          opacity='0.85'
        />
        <circle cx='34' cy='16' r='3' fill='#E85D5D' />
        <circle cx='64' cy='12' r='4' fill='#5DA8E8' />
        <circle cx='94' cy='16' r='3' fill='#5DE87A' />
        <circle cx='20' cy='48' r='2.5' fill='#E85D5D' />
        <circle cx='48' cy='48' r='2.5' fill='#5DA8E8' />
        <circle cx='64' cy='48' r='3' fill='#E85D5D' />
        <circle cx='80' cy='48' r='2.5' fill='#5DE87A' />
        <circle cx='108' cy='48' r='2.5' fill='#E85D5D' />
      </g>
    </svg>
  );
}
