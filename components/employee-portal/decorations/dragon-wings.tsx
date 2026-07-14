export function DragonWings() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Dragon wings</title>
      <style>{`
        @keyframes dragon-flap-left { 0%, 100% { transform: scaleX(1) rotate(0deg); } 50% { transform: scaleX(0.72) rotate(6deg); } }
        @keyframes dragon-flap-right { 0%, 100% { transform: scaleX(1) rotate(0deg); } 50% { transform: scaleX(0.72) rotate(-6deg); } }
        .wing-group-left { transform-origin: 24px 82px; animation: dragon-flap-left 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
        .wing-group-right { transform-origin: 104px 82px; animation: dragon-flap-right 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
      `}</style>
      <g opacity='0.95'>
        <g className='wing-group-left'>
          <path
            d='M24,90 C18,74 16,50 22,26 C16,12 8,6 12,18 C8,34 2,46 0,56 C4,70 8,82 2,90 C8,98 16,98 24,90Z'
            fill='var(--svg-color, #DC2626)'
            stroke='var(--svg-color, #991B1B)'
            strokeWidth='1.2'
          />
          <path
            d='M22,26 C14,16 6,8 14,4 C18,2 22,8 26,16 C22,24 20,34 24,46 C18,38 18,30 22,26Z'
            fill='var(--svg-color, #B91C1C)'
            stroke='var(--svg-color, #7F1D1D)'
            strokeWidth='0.8'
          />
        </g>
        <g className='wing-group-right'>
          <path
            d='M104,90 C110,74 112,50 106,26 C112,12 120,6 116,18 C120,34 126,46 128,56 C124,70 120,82 126,90 C120,98 112,98 104,90Z'
            fill='var(--svg-color, #DC2626)'
            stroke='var(--svg-color, #991B1B)'
            strokeWidth='1.2'
          />
          <path
            d='M106,26 C114,16 122,8 114,4 C110,2 106,8 102,16 C106,24 108,34 104,46 C110,38 110,30 106,26Z'
            fill='var(--svg-color, #B91C1C)'
            stroke='var(--svg-color, #7F1D1D)'
            strokeWidth='0.8'
          />
        </g>
      </g>
    </svg>
  );
}
