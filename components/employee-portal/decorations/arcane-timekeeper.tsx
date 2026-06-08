export function ArcaneTimekeeper() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g opacity='0.98'>
        <circle cx='64' cy='64' r='58' stroke='#78350F' strokeWidth='4' strokeDasharray='6 6' />
        <circle cx='64' cy='64' r='58' stroke='#B45309' strokeWidth='1.5' strokeDasharray='6 6' />
        <circle cx='64' cy='64' r='54' stroke='#D97706' strokeWidth='2.5' />
        <circle cx='64' cy='64' r='51' stroke='#F59E0B' strokeWidth='1' opacity='0.7' />
        <circle cx='64' cy='64' r='48' stroke='var(--svg-color, #FCD34D)' strokeWidth='4' strokeDasharray='1 4' opacity='0.5' />
        <g fill='#F59E0B' stroke='#78350F' strokeWidth='0.5'>
          <polygon points='64,2 68,12 60,12' />
          <polygon points='64,126 68,116 60,116' />
          <polygon points='2,64 12,60 12,68' />
          <polygon points='126,64 116,60 116,68' />
        </g>
        <g transform='translate(24, 24)'>
          <circle cx='0' cy='0' r='12' stroke='#92400E' strokeWidth='3' strokeDasharray='4 3' />
          <circle cx='0' cy='0' r='9' stroke='#D97706' strokeWidth='1.5' />
          <line x1='-9' y1='0' x2='9' y2='0' stroke='#D97706' strokeWidth='1.5' />
          <line x1='0' y1='-9' x2='0' y2='9' stroke='#D97706' strokeWidth='1.5' />
          <circle cx='0' cy='0' r='3' fill='#22D3EE' opacity='0.9' />
          <circle cx='0' cy='0' r='1.5' fill='#FFF' />
        </g>
        <g transform='translate(104, 104)'>
          <circle cx='0' cy='0' r='12' stroke='#92400E' strokeWidth='3' strokeDasharray='4 3' />
          <circle cx='0' cy='0' r='9' stroke='#D97706' strokeWidth='1.5' />
          <line x1='-9' y1='0' x2='9' y2='0' stroke='#D97706' strokeWidth='1.5' />
          <line x1='0' y1='-9' x2='0' y2='9' stroke='#D97706' strokeWidth='1.5' />
          <circle cx='0' cy='0' r='3' fill='#22D3EE' opacity='0.9' />
          <circle cx='0' cy='0' r='1.5' fill='#FFF' />
        </g>
        <circle cx='64' cy='64' r='62' stroke='#22D3EE' strokeWidth='0.8' strokeDasharray='10 15 5 15' opacity='0.8' />
        <path d='M24,24 Q64,0 104,24' stroke='#06B6D4' strokeWidth='1.5' fill='none' strokeDasharray='4 4' opacity='0.6' />
        <path d='M24,104 Q64,128 104,104' stroke='#06B6D4' strokeWidth='1.5' fill='none' strokeDasharray='4 4' opacity='0.6' />
        <circle cx='40' cy='12' r='2' fill='#67E8F9' />
        <circle cx='88' cy='12' r='1.5' fill='#67E8F9' opacity='0.8' />
        <circle cx='12' cy='40' r='2' fill='#67E8F9' />
        <circle cx='116' cy='40' r='1.5' fill='#67E8F9' opacity='0.8' />
      </g>
    </svg>
  );
}
