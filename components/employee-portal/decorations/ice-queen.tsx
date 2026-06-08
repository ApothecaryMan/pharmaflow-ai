export function IceQueen() {
  return (
    <svg viewBox='0 16 128 128' fill='none' overflow='visible' className='w-full h-full'>

      <g className='ice-tiara-group' opacity='0.3' filter='blur(2px)'>
        <path d='M 18,38 Q 64,24 110,38 L 116,20 L 88,14 L 64,2 L 40,14 L 12,20 Z' fill='var(--svg-color, #38BDF8)' />
      </g>

      <g className='ice-tiara-group'>
        <path
          d='M 18,36 Q 64,22 110,36 L 110,41 Q 64,26 18,41 Z'
          fill='#E2E8F0'
          stroke='#0284C7'
          strokeWidth='0.6'
        />

        <g>
          <polygon points='64,2 58,26 64,30' fill='#FFFFFF' stroke='#E0F2FE' strokeWidth='0.4' />
          <polygon points='64,2 70,26 64,30' fill='var(--svg-color, #38BDF8)' stroke='#0284C7' strokeWidth='0.4' />
        </g>

        <g>
          <polygon points='40,12 36,28 41,31' fill='#F0F9FF' />
          <polygon points='40,12 45,28 41,31' fill='#0284C7' opacity='0.7' />
        </g>

        <g>
          <polygon points='88,12 83,28 87,31' fill='#F0F9FF' />
          <polygon points='88,12 92,28 87,31' fill='#0284C7' opacity='0.7' />
        </g>

        <g>
          <polygon points='16,22 14,33 20,35' fill='#FFFFFF' />
          <polygon points='16,22 22,33 20,35' fill='var(--svg-color, #38BDF8)' opacity='0.6' />
        </g>

        <g>
          <polygon points='112,22 106,33 108,35' fill='#FFFFFF' />
          <polygon points='112,22 114,33 108,35' fill='var(--svg-color, #38BDF8)' opacity='0.6' />
        </g>

        <path d='M14,22 Q26,24 40,12 Q52,22 64,2 Q76,22 88,12 Q102,24 114,22' stroke='#E0F2FE' strokeWidth='0.8' opacity='0.5' fill='none' />
        <path d='M18,37 Q41,33 64,32 Q87,33 110,37' stroke='#FFFFFF' strokeWidth='0.6' opacity='0.8' fill='none' />

        <polygon points='64,31 66,33 64,35 62,33' fill='#FFFFFF' className='shimmering-frost' />
        <polygon points='37,32 39,34 37,36 35,34' fill='#E0F2FE' />
        <polygon points='91,32 93,34 91,36 89,34' fill='#E0F2FE' />
        <circle cx='23' cy='35' r='1' fill='#FFF' />
        <circle cx='105' cy='35' r='1' fill='#FFF' />
      </g>

      <g className='shimmering-frost'>
        <g transform='translate(14, 46)'>
          <polygon points='0,-6 -3,0 0,6 3,0' fill='#FFFFFF' className='pulsing-shard' />
        </g>
        <g transform='translate(114, 46)'>
          <polygon points='0,-6 -3,0 0,6 3,0' fill='var(--svg-color, #38BDF8)' className='pulsing-shard' />
        </g>

        <path d='M30,16 Q30,19 27,19 Q30,19 30,22 Q30,19 33,19 Q30,19 30,16 Z' fill='#FFFFFF' />
        <path d='M98,16 Q98,19 95,19 Q98,19 98,22 Q98,19 101,19 Q98,19 98,16 Z' fill='#FFFFFF' />
        <path d='M64,44 Q64,46 62,46 Q64,46 64,48 Q64,46 66,46 Q64,46 64,44 Z' fill='var(--svg-color, #38BDF8)' />

        <circle cx='50' cy='22' r='0.8' fill='#FFF' />
        <circle cx='78' cy='22' r='0.8' fill='#FFF' />
        <circle cx='8' cy='32' r='1.2' fill='#E0F2FE' />
        <circle cx='120' cy='32' r='1.2' fill='#E0F2FE' />
      </g>
    </svg>
  );
}
