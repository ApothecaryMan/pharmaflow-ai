export function StellarConstellations() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g opacity='0.98'>
        <g className='astral-origin spin-ring'>
          <circle cx='64' cy='64' r='54' stroke='var(--svg-color, #FBBF24)' strokeWidth='0.6' strokeDasharray='2 4' opacity='0.5' />
          <circle cx='64' cy='64' r='58' stroke='#FDE68A' strokeWidth='1.2' strokeDasharray='40 10 10 10' opacity='0.3' />
          <line x1='64' y1='2' x2='64' y2='6' stroke='#FBBF24' strokeWidth='1.5' />
          <line x1='64' y1='122' x2='64' y2='126' stroke='#FBBF24' strokeWidth='1.5' />
          <line x1='2' y1='64' x2='6' y2='64' stroke='#FBBF24' strokeWidth='1.5' />
          <line x1='122' y1='64' x2='126' y2='64' stroke='#FBBF24' strokeWidth='1.5' />
        </g>
        <g className='pulsing-line' stroke='var(--svg-color, #FDE047)' strokeWidth='0.8' strokeDasharray='3 3' fill='none' strokeLinecap='round'>
          <path d='M20,20 L45,8 L75,12' />
          <path d='M20,20 L10,45 L14,75 L28,108' />
          <path d='M108,20 L120,48 L102,75 L116,100 L85,115' />
          <path d='M10,45 L28,60 L14,75' strokeWidth='0.4' strokeDasharray='1 4' />
          <path d='M120,48 L98,55 L102,75' strokeWidth='0.4' strokeDasharray='1 4' />
        </g>
        <g fill='#FFFFFF' stroke='#F59E0B' strokeWidth='0.5'>
          <circle cx='45' cy='8' r='1.5' />
          <circle cx='75' cy='12' r='1.2' />
          <circle cx='10' cy='45' r='1.5' />
          <circle cx='14' cy='75' r='1.2' />
          <circle cx='28' cy='60' r='1' opacity='0.8' />
          <circle cx='120' cy='48' r='1.5' />
          <circle cx='102' cy='75' r='1.5' />
          <circle cx='85' cy='115' r='1.2' />
          <circle cx='98' cy='55' r='1' opacity='0.8' />
        </g>
        <g transform='translate(20, 20)' style={{ transformOrigin: '20px 20px' }} className='twinkle-slow'>
          <path d='M0,-12 Q0,0 12,0 Q0,0 0,12 Q0,0 -12,0 Q0,0 0,-12 Z' fill='#FFFFFF' />
          <path d='M0,-8 Q0,0 8,0 Q0,0 0,8 Q0,0 -8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FBBF24)' opacity='0.8' transform='rotate(45)' />
          <circle cx='0' cy='0' r='2' fill='#FFFFFF' />
        </g>
        <g transform='translate(108, 20)' style={{ transformOrigin: '108px 20px' }} className='twinkle-fast'>
          <circle cx='0' cy='0' r='14' fill='#FBBF24' opacity='0.15' />
          <path d='M0,-16 Q0,0 16,0 Q0,0 0,16 Q0,0 -16,0 Q0,0 0,-16 Z' fill='#FFFFFF' />
          <path d='M0,-10 Q0,0 10,0 Q0,0 0,10 Q0,0 -10,0 Q0,0 0,-10 Z' fill='var(--svg-color, #F59E0B)' opacity='0.9' transform='rotate(45)' />
          <circle cx='0' cy='0' r='2.5' fill='#FFFFFF' />
        </g>
        <g transform='translate(28, 108)' style={{ transformOrigin: '28px 108px' }} className='twinkle-fast'>
          <path d='M0,-10 Q0,0 10,0 Q0,0 0,10 Q0,0 -10,0 Q0,0 0,-10 Z' fill='#FFFFFF' />
          <path d='M0,-6 Q0,0 6,0 Q0,0 0,6 Q0,0 -6,0 Q0,0 0,-6 Z' fill='var(--svg-color, #FBBF24)' opacity='0.8' transform='rotate(45)' />
          <circle cx='0' cy='0' r='1.5' fill='#FFFFFF' />
        </g>
        <g transform='translate(116, 100)' style={{ transformOrigin: '116px 100px' }} className='twinkle-slow'>
          <path d='M0,-10 Q0,0 10,0 Q0,0 0,10 Q0,0 -10,0 Q0,0 0,-10 Z' fill='#FFFFFF' />
          <path d='M0,-6 Q0,0 6,0 Q0,0 0,6 Q0,0 -6,0 Q0,0 0,-6 Z' fill='var(--svg-color, #FBBF24)' opacity='0.8' transform='rotate(45)' />
          <circle cx='0' cy='0' r='1.5' fill='#FFFFFF' />
        </g>
        <g fill='#FEF08A'>
          <polygon points='54,1 55,3 54,5 53,3' className='twinkle-fast' />
          <polygon points='86,3 87,5 86,7 85,5' className='twinkle-slow' />
          <polygon points='4,60 5,62 4,64 3,62' opacity='0.7' />
          <polygon points='124,80 125,82 124,84 123,82' opacity='0.7' />
          <circle cx='60' cy='124' r='1' opacity='0.6' />
          <circle cx='40' cy='116' r='1.5' opacity='0.8' />
          <circle cx='96' cy='94' r='0.8' opacity='0.9' />
        </g>
      </g>
    </svg>
  );
}
