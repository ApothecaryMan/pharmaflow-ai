export function Snowflake() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g opacity='0.95'>
        <g transform='translate(64, 12)'>
          <circle cx='0' cy='0' r='8' fill='#93C5FD' opacity='0.25' filter='blur(1px)' />
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <line
                x1='0'
                y1='0'
                x2='0'
                y2='-11'
                stroke='#FFFFFF'
                strokeWidth='1.2'
                strokeLinecap='round'
              />
              <line
                x1='0'
                y1='0'
                x2='0'
                y2='-11'
                stroke='var(--svg-color, #60A5FA)'
                strokeWidth='0.6'
                strokeLinecap='round'
              />
              <path
                d='M-3.5,-8 L0,-5.5 L3.5,-8'
                stroke='#FFFFFF'
                strokeWidth='1'
                strokeLinecap='round'
                fill='none'
              />
              <path
                d='M-2,-4.5 L0,-3 L2,-4.5'
                stroke='var(--svg-color, #60A5FA)'
                strokeWidth='0.8'
                strokeLinecap='round'
                fill='none'
              />
            </g>
          ))}
          <polygon points='0,-2.5 2.5,0 0,2.5 -2.5,0' fill='#FFFFFF' />
          <circle cx='0' cy='0' r='1' fill='var(--svg-color, #60A5FA)' />
        </g>
        <g transform='translate(26, 26) rotate(15)'>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <line
                x1='0'
                y1='0'
                x2='0'
                y2='-8'
                stroke='#FFFFFF'
                strokeWidth='1'
                strokeLinecap='round'
              />
              <path
                d='M-2.5,-5.5 L0,-3.5 L2.5,-5.5'
                stroke='var(--svg-color, #60A5FA)'
                strokeWidth='0.8'
                fill='none'
              />
            </g>
          ))}
          <circle cx='0' cy='0' r='1.2' fill='#FFFFFF' />
        </g>
        <g transform='translate(102, 26) rotate(-15)'>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <line
                x1='0'
                y1='0'
                x2='0'
                y2='-8'
                stroke='#FFFFFF'
                strokeWidth='1'
                strokeLinecap='round'
              />
              <path
                d='M-2.5,-5.5 L0,-3.5 L2.5,-5.5'
                stroke='var(--svg-color, #60A5FA)'
                strokeWidth='0.8'
                fill='none'
              />
            </g>
          ))}
          <circle cx='0' cy='0' r='1.2' fill='#FFFFFF' />
        </g>
        <g transform='translate(10, 52)'>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <line
                x1='0'
                y1='0'
                x2='0'
                y2='-6'
                stroke='var(--svg-color, #60A5FA)'
                strokeWidth='0.8'
              />
            </g>
          ))}
          <circle cx='0' cy='0' r='1' fill='#FFFFFF' />
        </g>
        <g transform='translate(118, 52)'>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <line
                x1='0'
                y1='0'
                x2='0'
                y2='-6'
                stroke='var(--svg-color, #60A5FA)'
                strokeWidth='0.8'
              />
            </g>
          ))}
          <circle cx='0' cy='0' r='1' fill='#FFFFFF' />
        </g>
        <path d='M44,18 Q44,21 41,21 Q44,21 44,24 Q44,21 47,21 Q44,21 44,18 Z' fill='#FFFFFF' />
        <path d='M84,18 Q84,21 81,21 Q84,21 84,24 Q84,21 87,21 Q84,21 84,18 Z' fill='#FFFFFF' />
        <path
          d='M16,36 Q16,38 14,38 Q16,38 16,40 Q16,38 18,38 Q16,38 16,36 Z'
          fill='var(--svg-color, #60A5FA)'
          opacity='0.7'
        />
        <path
          d='M112,36 Q112,38 110,38 Q112,38 112,40 Q112,38 114,38 Q112,38 112,36 Z'
          fill='var(--svg-color, #60A5FA)'
          opacity='0.7'
        />
        <circle cx='64' cy='27' r='1.2' fill='#FFFFFF' opacity='0.8' />
        <circle cx='34' cy='15' r='1.5' fill='var(--svg-color, #60A5FA)' />
        <circle cx='94' cy='15' r='1.5' fill='var(--svg-color, #60A5FA)' />
        <circle cx='20' cy='46' r='1' fill='#FFFFFF' />
        <circle cx='108' cy='46' r='1' fill='#FFFFFF' />
        <circle cx='54' cy='8' r='1' fill='#E0F2FE' />
        <circle cx='74' cy='8' r='1' fill='#E0F2FE' />
      </g>
    </svg>
  );
}
