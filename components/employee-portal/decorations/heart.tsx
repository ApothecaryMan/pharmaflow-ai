export function Heart() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Heart</title>
      <g opacity='0.95'>
        <path
          d='M 14,50 Q 64,8 114,50'
          stroke='var(--svg-color, #FF4D6D)'
          strokeWidth='3'
          strokeLinecap='round'
          opacity='0.15'
          fill='none'
        />
        <g transform='translate(64, 12)'>
          <path
            d='M0,12 C-10,3 -14,-5 -7,-10 C-2,-13 0,-7 0,-7 C0,-7 2,-13 7,-10 C14,-5 10,3 0,12 Z'
            fill='var(--svg-color-dark, #C9184A)'
            opacity='0.3'
            transform='translate(0, 1)'
          />
          <path
            d='M0,12 C-10,3 -14,-5 -7,-10 C-2,-13 0,-7 0,-7 C0,-7 2,-13 7,-10 C14,-5 10,3 0,12 Z'
            fill='var(--svg-color, #FF4D6D)'
            stroke='#9B002A'
            strokeWidth='1'
          />
          <path d='M0,11 C-8,3 -11,-4 -6,-8 C-2,-11 0,-6 0,-6 Z' fill='#FFB3C1' opacity='0.6' />
          <circle cx='-3' cy='-4' r='1.5' fill='#FFF' opacity='0.8' />
        </g>
        <g transform='translate(28, 26) rotate(-15)'>
          <path
            d='M0,9 C-8,2 -10,-4 -5,-8 C-1,-10 0,-5 0,-5 C0,-5 1,-10 5,-8 C10,-4 8,2 0,9 Z'
            fill='var(--svg-color, #FF4D6D)'
            stroke='#9B002A'
            strokeWidth='0.8'
          />
          <path d='M0,8 C-6,2 -8,-3 -4,-6 C-1,-8 0,-4 0,-4 Z' fill='#FFB3C1' opacity='0.5' />
          <circle cx='-2' cy='-3' r='1' fill='#FFF' opacity='0.8' />
        </g>
        <g transform='translate(100, 26) rotate(15)'>
          <path
            d='M0,9 C-8,2 -10,-4 -5,-8 C-1,-10 0,-5 0,-5 C0,-5 1,-10 5,-8 C10,-4 8,2 0,9 Z'
            fill='var(--svg-color, #FF4D6D)'
            stroke='#9B002A'
            strokeWidth='0.8'
          />
          <path d='M0,8 C-6,2 -8,-3 -4,-6 C-1,-8 0,-4 0,-4 Z' fill='#FFB3C1' opacity='0.5' />
          <circle cx='-2' cy='-3' r='1' fill='#FFF' opacity='0.8' />
        </g>
        <g transform='translate(10, 54) rotate(-30)'>
          <path
            d='M0,8 C-7,2 -9,-3 -4,-7 C-1,-9 0,-4 0,-4 C0,-4 1,-9 4,-7 C9,-3 7,2 0,8 Z'
            fill='var(--svg-color, #FF4D6D)'
            stroke='#9B002A'
            strokeWidth='0.7'
          />
          <path d='M0,7 C-5,2 -7,-3 -3,-5 C-1,-7 0,-4 0,-4 Z' fill='#FFB3C1' opacity='0.5' />
          <circle cx='-1.5' cy='-2' r='0.8' fill='#FFF' />
        </g>
        <g transform='translate(118, 54) rotate(30)'>
          <path
            d='M0,8 C-7,2 -9,-3 -4,-7 C-1,-9 0,-4 0,-4 C0,-4 1,-9 4,-7 C9,-3 7,2 0,8 Z'
            fill='var(--svg-color, #FF4D6D)'
            stroke='#9B002A'
            strokeWidth='0.7'
          />
          <path d='M0,7 C-5,2 -7,-3 -3,-5 C-1,-7 0,-4 0,-4 Z' fill='#FFB3C1' opacity='0.5' />
          <circle cx='-1.5' cy='-2' r='0.8' fill='#FFF' />
        </g>
        <polygon points='46,16 48,18 46,20 44,18' fill='#FFF' opacity='0.8' />
        <polygon points='82,16 84,18 82,20 80,18' fill='#FFF' opacity='0.8' />
        <polygon points='16,36 17,37 16,38 15,37' fill='var(--svg-color, #FF4D6D)' />
        <polygon points='112,36 113,37 112,38 111,37' fill='var(--svg-color, #FF4D6D)' />
        <circle cx='64' cy='26' r='1.2' fill='#FFF' opacity='0.6' />
        <circle cx='38' cy='20' r='1.5' fill='var(--svg-color, #FF4D6D)' opacity='0.7' />
        <circle cx='90' cy='20' r='1.5' fill='var(--svg-color, #FF4D6D)' opacity='0.7' />
        <circle cx='18' cy='48' r='1' fill='#FFF' />
        <circle cx='110' cy='48' r='1' fill='#FFF' />
      </g>
    </svg>
  );
}
