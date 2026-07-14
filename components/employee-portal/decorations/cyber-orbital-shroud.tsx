export function CyberOrbitalShroud() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Cyber orbital shroud</title>
      <circle
        cx='64'
        cy='64'
        r='54'
        stroke='var(--svg-color, #00F0FF)'
        strokeWidth='10'
        opacity='0.15'
      />
      <circle
        cx='64'
        cy='64'
        r='54'
        stroke='var(--svg-color, #00F0FF)'
        strokeWidth='7'
        strokeDasharray='70 15'
        strokeLinecap='round'
        opacity='0.85'
      />
      <circle
        cx='64'
        cy='64'
        r='54'
        stroke='#FFFFFF'
        strokeWidth='1.5'
        strokeDasharray='40 45 60 25'
        opacity='0.9'
      />
      <g fill='#111827'>
        <circle cx='64' cy='10' r='1.5' />
        <circle cx='64' cy='118' r='1.5' />
        <circle cx='10' cy='64' r='1.5' />
        <circle cx='118' cy='64' r='1.5' />
        <circle cx='26' cy='26' r='1.2' fill='#FFF' />
        <circle cx='102' cy='26' r='1.2' fill='#FFF' />
        <circle cx='26' cy='102' r='1.2' fill='#FFF' />
        <circle cx='102' cy='102' r='1.2' fill='#FFF' />
      </g>
      <path
        d='M20,20 L14,26 M20,20 L26,14 M20,20 L12,12'
        stroke='#FFFFFF'
        strokeWidth='2'
        strokeLinecap='round'
        opacity='0.8'
      />
      <path
        d='M108,20 L114,26 M108,20 L102,14 M108,20 L116,12'
        stroke='#FFFFFF'
        strokeWidth='2'
        strokeLinecap='round'
        opacity='0.8'
      />
      <path
        d='M20,108 L14,102 M20,108 L26,114 M20,108 L12,116'
        stroke='#FFFFFF'
        strokeWidth='2'
        strokeLinecap='round'
        opacity='0.8'
      />
      <path
        d='M108,108 L114,102 M108,108 L102,114 M108,108 L116,116'
        stroke='#FFFFFF'
        strokeWidth='2'
        strokeLinecap='round'
        opacity='0.8'
      />
      <polygon points='64,1 67,7 64,6 61,7' fill='var(--svg-color, #00F0FF)' />
      <polygon points='64,127 67,121 64,122 61,121' fill='var(--svg-color, #00F0FF)' />
      <polygon points='1,64 7,67 6,64 7,61' fill='var(--svg-color, #00F0FF)' />
      <polygon points='127,64 121,67 122,64 121,61' fill='var(--svg-color, #00F0FF)' />
    </svg>
  );
}
