export function CrystalBastion() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g opacity='0.98'>
        <circle
          cx='64'
          cy='64'
          r='54'
          stroke='var(--svg-color, #00F0FF)'
          strokeWidth='1'
          opacity='0.2'
        />
        <circle
          cx='64'
          cy='64'
          r='51'
          stroke='#6366F1'
          strokeWidth='0.6'
          strokeDasharray='4 8'
          opacity='0.4'
        />
        <path
          d='M 14,40 L 114,88 M 14,88 L 114,40'
          stroke='var(--svg-color, #00F0FF)'
          strokeWidth='0.4'
          opacity='0.15'
        />
        <path
          d='M 40,14 L 88,114 M 48,114 L 88,14'
          stroke='var(--svg-color, #00F0FF)'
          strokeWidth='0.4'
          opacity='0.15'
        />
        <g transform='translate(64, 10)'>
          <polygon points='0,-8 -5,2 0,10' fill='#FFF' />
          <polygon points='0,-8 5,2 0,10' fill='var(--svg-color, #00F0FF)' opacity='0.6' />
          <polygon points='0,-8 5,2 0,10' fill='#4338CA' opacity='0.3' />
        </g>
        <g transform='translate(64, 118)'>
          <polygon points='0,8 -5,-2 0,-10' fill='#FFF' />
          <polygon points='0,8 5,-2 0,-10' fill='var(--svg-color, #00F0FF)' opacity='0.6' />
          <polygon points='0,8 5,-2 0,-10' fill='#4338CA' opacity='0.3' />
        </g>
        <g transform='translate(10, 64)'>
          <polygon points='-8,0 2,-5 10,0' fill='#FFF' />
          <polygon points='-8,0 2,5 10,0' fill='var(--svg-color, #00F0FF)' opacity='0.6' />
          <polygon points='-8,0 2,5 10,0' fill='#4338CA' opacity='0.3' />
        </g>
        <g transform='translate(118, 64)'>
          <polygon points='8,0 -2,-5 -10,0' fill='#FFF' />
          <polygon points='8,0 -2,5 -10,0' fill='var(--svg-color, #00F0FF)' opacity='0.6' />
          <polygon points='8,0 -2,5 -10,0' fill='#4338CA' opacity='0.3' />
        </g>
        <g transform='translate(26, 26) rotate(45)'>
          <polygon points='0,-12 -4,0 0,8' fill='#FFF' />
          <polygon points='0,-12 4,0 0,8' fill='#6366F1' />
          <polygon points='-5,-4 -9,4 -4,8' fill='#00F0FF' opacity='0.7' />
        </g>
        <g transform='translate(102, 26) rotate(-45)'>
          <polygon points='0,-12 -4,0 0,8' fill='#FFF' />
          <polygon points='0,-12 4,0 0,8' fill='#6366F1' />
          <polygon points='5,-4 9,4 4,8' fill='#00F0FF' opacity='0.7' />
        </g>
        <g transform='translate(26, 102) rotate(135)'>
          <polygon points='0,-12 -4,0 0,8' fill='#FFF' />
          <polygon points='0,-12 4,0 0,8' fill='#6366F1' />
          <polygon points='-5,-4 -9,4 -4,8' fill='#00F0FF' opacity='0.7' />
        </g>
        <g transform='translate(102, 100) rotate(-135)'>
          <polygon points='0,-12 -4,0 0,8' fill='#FFF' />
          <polygon points='0,-12 4,0 0,8' fill='#6366F1' />
          <polygon points='5,-4 9,4 4,8' fill='#00F0FF' opacity='0.7' />
        </g>
        <polygon points='44,13 47,16 43,19 40,16' fill='#FFF' opacity='0.9' />
        <polygon points='84,13 87,16 83,19 80,16' fill='var(--svg-color, #00F0FF)' />
        <polygon points='13,44 16,47 19,43 16,40' fill='var(--svg-color, #00F0FF)' />
        <polygon points='115,44 112,47 109,43 112,40' fill='#FFF' opacity='0.9' />
        <polygon points='13,84 16,87 19,83 16,80' fill='#6366F1' />
        <polygon points='115,84 112,87 109,83 112,80' fill='#6366F1' />
        <polygon points='44,115 47,112 43,109 40,112' fill='var(--svg-color, #00F0FF)' />
        <polygon points='84,115 87,112 83,109 80,112' fill='#FFF' opacity='0.9' />
        <path d='M64,24 Q64,27 61,27 Q64,27 64,30 Q64,27 67,27 Q64,27 64,24 Z' fill='#FFF' />
        <path d='M64,98 Q64,101 61,101 Q64,101 64,104 Q64,101 67,101 Q64,101 64,98 Z' fill='#FFF' />
        <path
          d='M27,64 Q27,67 24,67 Q27,67 27,70 Q27,67 30,67 Q27,67 27,64 Z'
          fill='var(--svg-color, #00F0FF)'
        />
        <path
          d='M101,64 Q101,67 98,67 Q101,67 101,70 Q101,67 104,67 Q101,67 101,64 Z'
          fill='var(--svg-color, #00F0FF)'
        />
        <circle cx='54' cy='15' r='0.8' fill='#FFF' />
        <circle cx='74' cy='15' r='0.8' fill='#FFF' />
        <circle cx='15' cy='54' r='0.8' fill='#6366F1' />
        <circle cx='113' cy='54' r='0.8' fill='var(--svg-color, #00F0FF)' />
        <circle cx='15' cy='74' r='0.8' fill='var(--svg-color, #00F0FF)' />
        <circle cx='113' cy='74' r='0.8' fill='#6366F1' />
        <circle cx='54' cy='113' r='0.8' fill='#FFF' />
        <circle cx='74' cy='113' r='0.8' fill='#FFF' />
      </g>
    </svg>
  );
}
