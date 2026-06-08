export function StarHalo() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g transform='translate(0, -8)'>
        <path
          d='M 14,42 Q 64,10 114,42'
          stroke='var(--svg-color, #FFD700)'
          strokeWidth='4'
          strokeLinecap='round'
          opacity='0.15'
          fill='none'
        />
        <path
          d='M 14,42 Q 64,10 114,42'
          stroke='#FFF'
          strokeWidth='1'
          strokeLinecap='round'
          opacity='0.4'
          fill='none'
        />
        <circle cx='32' cy='22' r='1.5' fill='#FFF' opacity='0.7' />
        <circle cx='40' cy='16' r='1' fill='#FFE4E1' opacity='0.6' />
        <circle cx='54' cy='11' r='2' fill='var(--svg-color, #FFD700)' opacity='0.8' />
        <circle cx='74' cy='11' r='1.5' fill='#FFF' opacity='0.9' />
        <circle cx='88' cy='16' r='2' fill='var(--svg-color, #FFD700)' opacity='0.8' />
        <circle cx='96' cy='22' r='1' fill='#FFE4E1' opacity='0.6' />
        <g transform='translate(64, 10)'>
          <path d='M0,-14 Q0,0 -14,0 Q0,0 0,14 Q0,0 14,0 Q0,0 0,-14 Z' fill='var(--svg-color, #FFD700)' opacity='0.3' />
          <path d='M0,-12 Q0,0 -12,0 Q0,0 0,12 Q0,0 12,0 Q0,0 0,-12 Z' fill='#FFF' />
          <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' transform='rotate(45)' />
          <circle cx='0' cy='0' r='1.5' fill='#FFF' />
        </g>
        <g transform='translate(40, 19)'>
          <path d='M0,-9 Q0,0 -9,0 Q0,0 0,9 Q0,0 9,0 Q0,0 0,-9 Z' fill='var(--svg-color, #FFD700)' />
          <path d='M0,-7 Q0,0 -7,0 Q0,0 0,7 Q0,0 7,0 Q0,0 0,-7 Z' fill='#FFF' />
        </g>
        <g transform='translate(88, 19)'>
          <path d='M0,-9 Q0,0 -9,0 Q0,0 0,9 Q0,0 9,0 Q0,0 0,-9 Z' fill='var(--svg-color, #FFD700)' />
          <path d='M0,-7 Q0,0 -7,0 Q0,0 0,7 Q0,0 7,0 Q0,0 0,-7 Z' fill='#FFF' />
        </g>
        <g transform='translate(18, 38)'>
          <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' />
          <path d='M0,-5 Q0,0 -5,0 Q0,0 0,5 Q0,0 5,0 Q0,0 0,-5 Z' fill='#FFF' />
          <circle cx='-4' cy='4' r='0.6' fill='#FFF' />
        </g>
        <g transform='translate(110, 38)'>
          <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' />
          <path d='M0,-5 Q0,0 -5,0 Q0,0 0,5 Q0,0 5,0 Q0,0 0,-5 Z' fill='#FFF' />
          <circle cx='4' cy='4' r='0.6' fill='#FFF' />
        </g>
        <polygon points='53,22 55,24 53,26 51,24' fill='#FFF' opacity='0.9' />
        <polygon points='75,22 77,24 75,26 73,24' fill='#FFF' opacity='0.9' />
        <polygon points='26,27 27,28 26,29 25,28' fill='var(--svg-color, #FFD700)' />
        <polygon points='102,27 103,28 102,29 101,28' fill='var(--svg-color, #FFD700)' />
      </g>
    </svg>
  );
}
