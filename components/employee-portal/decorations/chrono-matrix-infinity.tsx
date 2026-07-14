export function ChronoMatrixInfinity() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Chrono matrix infinity</title>
      <g opacity='0.98'>
        <circle cx='64' cy='64' r='54' stroke='#4C1D95' strokeWidth='1.5' opacity='0.4' />
        <circle
          cx='64'
          cy='64'
          r='54'
          stroke='var(--svg-color, #F59E0B)'
          strokeWidth='1'
          strokeDasharray='1 5'
          opacity='0.7'
        />

        <circle
          cx='64'
          cy='64'
          r='58'
          stroke='#06B6D4'
          strokeWidth='1.2'
          strokeDasharray='40 80 60 30'
          strokeLinecap='round'
          opacity='0.6'
        />
        <circle
          cx='64'
          cy='64'
          r='51'
          stroke='#7C3AED'
          strokeWidth='0.8'
          strokeDasharray='10 15 30 10'
          opacity='0.5'
        />

        <g transform='translate(64, 12)'>
          <circle
            cx='0'
            cy='0'
            r='8'
            fill='var(--svg-color, #F59E0B)'
            opacity='0.15'
            filter='blur(1px)'
          />
          <path d='M-6,-8 L6,-8 L0,-1 Z' fill='#FFF' stroke='#78350F' strokeWidth='0.8' />
          <path d='M-4,-7 L4,-7 L0,-2 Z' fill='var(--svg-color, #F59E0B)' opacity='0.7' />
          <path d='M-6,6 L6,6 L0,-1 Z' fill='#FFF' stroke='#78350F' strokeWidth='0.8' />
          <path d='M-4,5 L4,5 L0,0 Z' fill='#FEF08A' />
          <circle cx='0' cy='-1' r='0.6' fill='#FFF' />
          <circle cx='0' cy='1' r='0.6' fill='#FFF' />
        </g>

        <g transform='translate(11, 52) rotate(-15)'>
          <polygon
            points='0,-22 -5,4 0,12 5,4'
            fill='#2E1065'
            opacity='0.4'
            transform='translate(1, 2)'
          />
          <polygon points='0,-22 -5,4 0,12' fill='#FFFFFF' />
          <polygon points='0,-22 5,4 0,12' fill='var(--svg-color, #F59E0B)' />
          <polygon points='0,-22 5,4 0,12' fill='#78350F' opacity='0.25' />
          <circle cx='0' cy='4' r='2' fill='#06B6D4' stroke='#FFF' strokeWidth='0.5' />
        </g>

        <g transform='translate(117, 76) rotate(165)'>
          <polygon
            points='0,-22 -5,4 0,12 5,4'
            fill='#2E1065'
            opacity='0.4'
            transform='translate(-1, 2)'
          />
          <polygon points='0,-22 -5,4 0,12' fill='#FFFFFF' />
          <polygon points='0,-22 5,4 0,12' fill='var(--svg-color, #F59E0B)' />
          <polygon points='0,-22 5,4 0,12' fill='#78350F' opacity='0.25' />
          <circle cx='0' cy='4' r='2' fill='#06B6D4' stroke='#FFF' strokeWidth='0.5' />
        </g>

        <g stroke='var(--svg-color, #F59E0B)' strokeWidth='0.8' strokeLinecap='round' opacity='0.6'>
          <path d='M100,16 L112,28 L104,40' fill='none' strokeDasharray='2 2' />
          <circle cx='112' cy='28' r='1' fill='#FFF' />
          <path d='M28,112 L16,100 L24,88' fill='none' strokeDasharray='2 2' />
          <circle cx='16' cy='100' r='1' fill='#FFF' />
        </g>

        <path d='M42,12 Q42,15 39,15 Q42,15 42,18 Q42,15 45,15 Q42,15 42,12 Z' fill='#FFF' />
        <path d='M86,12 Q86,15 83,15 Q86,15 86,18 Q86,15 89,15 Q86,15 86,12 Z' fill='#FFF' />
        <path d='M14,32 Q14,34 12,34 Q14,34 14,36 Q14,34 16,34 Q14,34 14,32 Z' fill='#06B6D4' />
        <path
          d='M114,96 Q114,98 112,98 Q114,98 114,100 Q114,98 116,98 Q114,98 114,96 Z'
          fill='#06B6D4'
        />

        <circle cx='64' cy='27' r='1' fill='#FFF' opacity='0.8' />
        <circle cx='30' cy='22' r='1.2' fill='var(--svg-color, #F59E0B)' />
        <circle cx='98' cy='22' r='1.2' fill='var(--svg-color, #F59E0B)' />
        <circle
          cx='64'
          cy='118'
          r='1.5'
          fill='var(--svg-color, #F59E0B)'
          stroke='#78350F'
          strokeWidth='0.5'
        />
        <circle cx='54' cy='122' r='0.8' fill='#06B6D4' />
        <circle cx='74' cy='122' r='0.8' fill='#06B6D4' />
        <circle cx='8' cy='70' r='1' fill='#FFF' />
        <circle cx='120' cy='58' r='1' fill='#FFF' />
      </g>
    </svg>
  );
}
