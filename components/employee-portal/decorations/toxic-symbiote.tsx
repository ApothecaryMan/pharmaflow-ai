export function ToxicSymbiote() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Toxic symbiote</title>
      <g opacity='0.98'>
        <circle cx='64' cy='64' r='54' stroke='#1F2937' strokeWidth='4' />
        <circle
          cx='64'
          cy='64'
          r='54'
          stroke='var(--svg-color, #22C55E)'
          strokeWidth='1.5'
          strokeDasharray='15 30 10 40 5 20'
          opacity='0.6'
        />
        <g fill='#030712'>
          <path d='M64,6 C80,8 96,16 108,28 C116,36 122,50 120,60 C114,46 100,32 86,22 C76,14 66,10 64,6 Z' />
          <path d='M70,8 Q85,25 110,40 Q100,25 80,12 Z' fill='#111827' />
          <path d='M64,122 C48,120 32,112 20,100 C12,92 6,78 8,68 C14,82 28,96 42,106 C52,114 62,118 64,122 Z' />
          <path d='M58,120 Q43,103 18,88 Q28,103 48,116 Z' fill='#111827' />
        </g>
        <g fill='#030712'>
          <path d='M80,14 Q88,-4 92,10 Q86,8 84,18 Z' />
          <path d='M96,20 Q110,6 106,24 Q100,20 94,26 Z' />
          <path d='M48,114 Q40,132 36,118 Q42,120 44,110 Z' />
          <path d='M32,108 Q18,122 22,104 Q28,108 34,102 Z' />
        </g>
        <g stroke='var(--svg-color, #22C55E)' strokeWidth='1.2' strokeLinecap='round' fill='none'>
          <path d='M78,16 Q90,26 102,40' />
          <path d='M90,26 Q100,20 106,24' strokeWidth='0.8' />
          <path d='M50,112 Q38,102 26,88' />
          <path d='M38,102 Q28,108 22,104' strokeWidth='0.8' />
        </g>
        <g fill='#030712'>
          <path d='M104,44 Q106,56 104,60 Q102,56 100,44 Z' />
          <path d='M24,84 Q22,72 24,68 Q26,72 28,84 Z' />
          <circle cx='104' cy='62' r='1.5' />
          <circle cx='24' cy='66' r='1.5' />
        </g>
        <circle cx='86' cy='12' r='2' fill='var(--svg-color, #22C55E)' opacity='0.9' />
        <circle cx='106' cy='16' r='1' fill='var(--svg-color, #22C55E)' opacity='0.6' />
        <circle cx='42' cy='116' r='2' fill='var(--svg-color, #22C55E)' opacity='0.9' />
        <circle cx='22' cy='112' r='1' fill='var(--svg-color, #22C55E)' opacity='0.6' />
        <path d='M96,30 Q100,28 104,32 Q100,32 96,30 Z' fill='#22C55E' />
        <path d='M32,98 Q28,100 24,96 Q28,96 32,98 Z' fill='#22C55E' />
      </g>
    </svg>
  );
}
