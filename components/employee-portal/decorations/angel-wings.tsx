export function AngelWings() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g opacity='0.95'>
        <g transform='translate(-13, 0)'>
          <g className='angel-wing-left'>
            <path
              d='M26,76 C14,54 -12,38 2,10 C10,-2 18,6 22,24 C26,42 28,62 26,76 Z'
              fill='var(--svg-color, #F0F8FF)'
              stroke='var(--svg-color-stroke, #CBD5E1)'
              strokeWidth='1'
              strokeLinejoin='round'
            />
            <path
              d='M24,60 C14,42 -4,28 6,14 C12,4 18,12 22,32 C24,46 25,54 24,60 Z'
              fill='#FFFFFF'
              stroke='#E2E8F0'
              strokeWidth='0.6'
            />
            <path
              d='M26,76 C20,88 6,102 2,112 C10,114 20,98 26,76 Z'
              fill='var(--svg-color, #F0F8FF)'
              stroke='var(--svg-color-stroke, #CBD5E1)'
              strokeWidth='0.8'
              opacity='0.8'
            />
            <path d='M24,50 C12,36 0,26 6,14' stroke='#E2E8F0' strokeWidth='0.6' strokeLinecap='round' />
            <path d='M25,65 C16,52 6,42 10,32' stroke='#E2E8F0' strokeWidth='0.5' strokeLinecap='round' />
          </g>
        </g>
        <g transform='translate(13, 0)'>
          <g className='angel-wing-right'>
            <path
              d='M102,76 C114,54 140,38 126,10 C118,-2 110,6 106,24 C102,42 100,62 102,76 Z'
              fill='var(--svg-color, #F0F8FF)'
              stroke='var(--svg-color-stroke, #CBD5E1)'
              strokeWidth='1'
              strokeLinejoin='round'
            />
            <path
              d='M104,60 C114,42 132,28 122,14 C116,4 110,12 106,32 C104,46 103,54 104,60 Z'
              fill='#FFFFFF'
              stroke='#E2E8F0'
              strokeWidth='0.6'
            />
            <path
              d='M102,76 C108,88 122,102 126,112 C118,114 108,98 102,76 Z'
              fill='var(--svg-color, #F0F8FF)'
              stroke='var(--svg-color-stroke, #CBD5E1)'
              strokeWidth='0.8'
              opacity='0.8'
            />
            <path d='M104,50 C116,36 128,26 122,14' stroke='#E2E8F0' strokeWidth='0.6' strokeLinecap='round' />
            <path d='M103,65 C112,52 122,42 118,32' stroke='#E2E8F0' strokeWidth='0.5' strokeLinecap='round' />
          </g>
        </g>
      </g>
    </svg>
  );
}
