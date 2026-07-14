export function LegendaryPhoenixAura() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Legendary phoenix aura</title>
      <g opacity='0.98'>
        <circle
          cx='64'
          cy='64'
          r='54'
          stroke='var(--svg-color, #F59E0B)'
          strokeWidth='2'
          opacity='0.3'
        />
        <circle
          cx='64'
          cy='64'
          r='56'
          stroke='#EF4444'
          strokeWidth='0.8'
          strokeDasharray='4 8'
          opacity='0.6'
        />
        <g transform='translate(64, 8)'>
          <path d='M0,-16 C14,-6 18,6 0,8 C-18,6 -14,-6 0,-16 Z' fill='#EF4444' opacity='0.5' />
          <path d='M0,-12 C8,-4 12,6 0,10 C-12,6 -8,-4 0,-12 Z' fill='#F97316' opacity='0.8' />
          <path d='M0,-8 C5,0 8,8 0,12 C-8,8 -5,0 0,-8 Z' fill='#FEF08A' />
          <path d='M2,2 Q10,-4 14,0 Q10,4 2,6 Z' fill='#F59E0B' />
          <path d='M-2,2 Q-10,-4 -14,0 Q-10,4 -2,6 Z' fill='#F59E0B' />
        </g>
        <g transform='translate(64, 116)'>
          <path d='M0,12 C8,4 12,-4 0,-10 C-12,-4 -8,4 0,12 Z' fill='#EF4444' />
          <path d='M0,8 C5,2 8,-4 0,-8 C-8,-4 -5,2 0,8 Z' fill='#F59E0B' />
          <path d='M4,4 C14,14 24,10 30,0 C20,8 10,6 2,-2 Z' fill='var(--svg-color, #F59E0B)' />
          <path
            d='M-4,4 C-14,14 -24,10 -30,0 C-20,8 -10,6 -2,-2 Z'
            fill='var(--svg-color, #F59E0B)'
          />
        </g>
        <g transform='translate(14, 64)'>
          <path d='M6,36 C-8,16 -12,-10 6,-32 C-10,-5 -5,16 10,32 Z' fill='#991B1B' opacity='0.9' />
          <path d='M8,30 C-4,15 -8,-5 8,-25 C-4,-5 0,15 12,25 Z' fill='#EF4444' />
          <path d='M10,24 C2,10 0,-2 10,-15 C2,0 4,10 12,20 Z' fill='#F59E0B' />
          <path d='M2,5 Q-12,0 -16,-10 Q-6,-2 4,0 Z' fill='#F59E0B' />
          <path d='M4,-10 Q-8,-15 -10,-25 Q-2,-15 6,-10 Z' fill='#FEF08A' />
        </g>
        <g transform='translate(114, 64)'>
          <path d='M-6,36 C8,16 12,-10 -6,-32 C10,-5 5,16 -10,32 Z' fill='#991B1B' opacity='0.9' />
          <path d='M-8,30 C4,15 8,-5 -8,-25 C4,-5 0,15 -12,25 Z' fill='#EF4444' />
          <path d='M-10,24 C-2,10 0,-2 -10,-15 C-2,0 -4,10 -12,20 Z' fill='#F59E0B' />
          <path d='M-2,5 Q12,0 16,-10 Q6,-2 -4,0 Z' fill='#F59E0B' />
          <path d='M-4,-10 Q8,-15 10,-25 Q2,-15 -6,-10 Z' fill='#FEF08A' />
        </g>
        <circle cx='20' cy='20' r='1.5' fill='#FEF08A' />
        <circle cx='108' cy='20' r='1.5' fill='#FEF08A' />
        <polygon points='30,100 32,96 28,96' fill='#F59E0B' />
        <polygon points='98,100 100,96 96,96' fill='#F59E0B' />
        <circle cx='10' cy='44' r='1' fill='#EF4444' />
        <circle cx='118' cy='44' r='1' fill='#EF4444' />
      </g>
    </svg>
  );
}
