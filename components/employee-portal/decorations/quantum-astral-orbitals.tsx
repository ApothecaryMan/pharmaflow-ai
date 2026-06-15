export function QuantumAstralOrbitals() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g opacity='0.98'>
        <circle
          cx='64'
          cy='64'
          r='54'
          stroke='var(--svg-color, #06B6D4)'
          strokeWidth='1'
          strokeDasharray='2 6'
          opacity='0.6'
        />
        <circle cx='64' cy='64' r='58' stroke='#8B5CF6' strokeWidth='0.5' opacity='0.4' />
        <g transform='rotate(-15, 64, 64)'>
          <path
            d='M 124,64 A 60,18 0 0,0 4,64'
            stroke='var(--svg-color, #06B6D4)'
            strokeWidth='0.8'
            opacity='0.25'
          />
          <path
            d='M 4,64 A 60,18 0 0,0 124,64'
            stroke='var(--svg-color, #06B6D4)'
            strokeWidth='1.2'
            opacity='0.8'
          />
          <path
            d='M 64,82 A 60,18 0 0,0 124,64'
            stroke='var(--svg-color, #06B6D4)'
            strokeWidth='4'
            strokeLinecap='round'
            opacity='0.3'
          />
          <path
            d='M 64,82 A 60,18 0 0,0 124,64'
            stroke='#FFFFFF'
            strokeWidth='1.5'
            strokeLinecap='round'
            opacity='0.9'
          />
          <circle cx='94' cy='79.6' r='4' fill='var(--svg-color, #06B6D4)' opacity='0.5' />
          <circle cx='94' cy='79.6' r='1.5' fill='#FFFFFF' />
          <circle cx='100' cy='82' r='0.8' fill='#FFFFFF' />
        </g>
        <g transform='rotate(50, 64, 64)'>
          <path d='M 122,64 A 58,24 0 0,0 6,64' stroke='#D946EF' strokeWidth='0.8' opacity='0.25' />
          <path d='M 6,64 A 58,24 0 0,0 122,64' stroke='#D946EF' strokeWidth='1.2' opacity='0.8' />
          <path
            d='M 6,64 A 58,24 0 0,0 64,88'
            stroke='#D946EF'
            strokeWidth='4'
            strokeLinecap='round'
            opacity='0.3'
          />
          <path
            d='M 6,64 A 58,24 0 0,0 64,88'
            stroke='#FFFFFF'
            strokeWidth='1.5'
            strokeLinecap='round'
            opacity='0.9'
          />
          <circle cx='23' cy='81' r='3.5' fill='#D946EF' opacity='0.5' />
          <circle cx='23' cy='81' r='1.5' fill='#FFFFFF' />
        </g>
        <g transform='rotate(-75, 64, 64)'>
          <path d='M 120,64 A 56,14 0 0,0 8,64' stroke='#8B5CF6' strokeWidth='0.8' opacity='0.25' />
          <path d='M 8,64 A 56,14 0 0,0 120,64' stroke='#8B5CF6' strokeWidth='1.2' opacity='0.8' />
          <path
            d='M 64,78 A 56,14 0 0,0 120,64'
            stroke='#8B5CF6'
            strokeWidth='4'
            strokeLinecap='round'
            opacity='0.3'
          />
          <path
            d='M 64,78 A 56,14 0 0,0 120,64'
            stroke='#FFFFFF'
            strokeWidth='1.5'
            strokeLinecap='round'
            opacity='0.9'
          />
          <circle cx='112.5' cy='71' r='3.5' fill='#8B5CF6' opacity='0.5' />
          <circle cx='112.5' cy='71' r='1.5' fill='#FFFFFF' />
          <circle cx='103.6' cy='54.1' r='1' fill='#FFFFFF' opacity='0.6' />
        </g>
        <path
          d='M 8,64 Q 10,50 14,64 Q 10,78 8,64 Z'
          fill='var(--svg-color, #06B6D4)'
          opacity='0.8'
        />
        <path d='M 120,64 Q 118,50 114,64 Q 118,78 120,64 Z' fill='#D946EF' opacity='0.8' />
        <g fill='#FFFFFF'>
          <path d='M20,20 Q20,24 16,24 Q20,24 20,28 Q20,24 24,24 Q20,24 20,20 Z' opacity='0.9' />
          <path
            d='M108,108 Q108,112 104,112 Q108,112 108,116 Q108,112 112,112 Q108,112 108,108 Z'
            opacity='0.9'
          />
          <circle cx='30' cy='12' r='1' opacity='0.5' />
          <circle cx='100' cy='20' r='1.5' fill='var(--svg-color, #06B6D4)' opacity='0.7' />
          <circle cx='14' cy='90' r='1' fill='#D946EF' opacity='0.7' />
          <circle cx='90' cy='116' r='1.2' opacity='0.6' />
        </g>
      </g>
    </svg>
  );
}
